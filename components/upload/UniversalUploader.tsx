"use client";

/**
 * UniversalUploader — v2 멀티 파일 업로더
 *
 * 두 개의 드롭존을 제공합니다:
 *   1. PDF 편람 (졸업요건 테이블을 1순위 지식으로 로드)
 *   2. 시간표 이미지 (에브리타임 캡처, AI Vision 분석용)
 *
 * PDF 텍스트는 브라우저에서 직접 추출(pdfjs-dist)하므로 서버 업로드 불필요.
 * 이미지는 base64로 변환 후 콜백으로 전달.
 */

import { useCallback, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import academicRules from "@/lib/data/academic-rules.json";

// ─── Public Types ─────────────────────────────────────────────────────────────

/** Structured knowledge extracted from an uploaded PDF curriculum guide. */
export interface PdfKnowledge {
  /** Full raw text extracted from all pages. */
  rawText: string;
  /** Total page count. */
  totalPages: number;
  /**
   * Course codes and names found in the graduation-requirement sections of
   * the PDF. Used by GraduationRiskBanner for real-time diff.
   */
  graduationRequired: string[];
  /** Graduation credit total parsed from the PDF, if found. */
  graduationCredits: number | null;
}

/** Single image payload ready for AI vision extraction. */
export interface ImagePayload {
  /** Raw base64 string (no data-URL prefix). */
  base64: string;
  fileName: string;
  /** Object-URL for preview thumbnail. */
  preview: string;
}

interface Props {
  /** Called when a PDF has been parsed and knowledge extracted. */
  onPdfLoaded?: (knowledge: PdfKnowledge) => void;
  /** Called when one or more images have been base64-encoded. */
  onImagesLoaded?: (images: ImagePayload[]) => void;
  className?: string;
}

// ─── PDF Knowledge Extractors ─────────────────────────────────────────────────

const ACADEMIC_CODES = new Set(
  (academicRules.courses as Array<{ code: string }>).map(c => c.code)
);

/**
 * Extract graduation-required course codes/names from raw PDF text.
 *
 * Strategy:
 * 1. Direct match against known EO/GE course codes from academic-rules.json.
 * 2. Keyword extraction near 졸업 요건 / 필수 이수 headers.
 */
function extractGraduationRequired(text: string): string[] {
  const found = new Set<string>();

  // Pass 1: match known academic-rules codes anywhere in the text
  for (const code of ACADEMIC_CODES) {
    if (text.includes(code)) found.add(code);
  }

  // Pass 2: near-header extraction
  const lines = text.split(/\n|\r/);
  let inSection = false;
  for (const line of lines) {
    if (/졸업\s*요건|졸업\s*필수|이수\s*기준|필수\s*이수/.test(line)) {
      inSection = true;
    }
    if (inSection) {
      const codeMatches = line.match(/EO\d{3}|GE-\w+/g) ?? [];
      for (const m of codeMatches) found.add(m);
      // Stop section after a blank line or new header
      if (/^[\s\-=]{3,}$/.test(line) && found.size > 0) inSection = false;
    }
  }

  return [...found];
}

function extractGraduationCredits(text: string): number | null {
  const m = text.match(/졸업\s*(?:이수\s*)?학점[:\s：]*(\d{2,3})/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

type ZoneState = "idle" | "loading" | "done" | "error";

export default function UniversalUploader({ onPdfLoaded, onImagesLoaded, className }: Props) {
  const [pdfState, setPdfState]       = useState<ZoneState>("idle");
  const [imageState, setImageState]   = useState<ZoneState>("idle");
  const [pdfName, setPdfName]         = useState("");
  const [pdfProgress, setPdfProgress] = useState(0);
  const [imageCount, setImageCount]   = useState(0);
  const [pdfKnowledge, setPdfKnowledge] = useState<PdfKnowledge | null>(null);
  const [dragOver, setDragOver]       = useState<"pdf" | "image" | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // ── PDF Processing ──────────────────────────────────────────────────────────

  const processPdf = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) return;
    setPdfState("loading");
    setPdfName(file.name);
    setPdfProgress(0);

    try {
      const pdfjs = await import("pdfjs-dist");
      // Use CDN worker to avoid Next.js bundling complexity
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      let fullText = "";

      for (let p = 1; p <= totalPages; p++) {
        const page    = await pdf.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: unknown) => (item as { str?: string }).str ?? "")
          .join(" ");
        fullText += pageText + "\n";
        setPdfProgress(Math.round((p / totalPages) * 100));
      }

      const graduationRequired = extractGraduationRequired(fullText);
      const graduationCredits  = extractGraduationCredits(fullText);
      const knowledge: PdfKnowledge = { rawText: fullText, totalPages, graduationRequired, graduationCredits };

      setPdfKnowledge(knowledge);
      setPdfState("done");
      onPdfLoaded?.(knowledge);
    } catch (err) {
      console.error("[UniversalUploader] PDF parse error:", err);
      setPdfState("error");
    }
  }, [onPdfLoaded]);

  // ── Image Processing ─────────────────────────────────────────────────────────

  const processImages = useCallback(async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/")).slice(0, 20);
    if (imgs.length === 0) return;
    setImageState("loading");

    const payloads: ImagePayload[] = await Promise.all(
      imgs.map(async file => {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = e => resolve(((e.target?.result as string) ?? "").split(",")[1] ?? "");
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { base64, fileName: file.name, preview: URL.createObjectURL(file) };
      })
    );

    setImageCount(payloads.length);
    setImageState("done");
    onImagesLoaded?.(payloads);
  }, [onImagesLoaded]);

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (zone: "pdf" | "image") => async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const files = Array.from(e.dataTransfer.files);
      if (zone === "pdf") {
        const pdf = files.find(f => f.name.toLowerCase().endsWith(".pdf"));
        if (pdf) processPdf(pdf);
      } else {
        await processImages(files);
      }
    },
    [processPdf, processImages]
  );

  // ── Graduation required preview ──────────────────────────────────────────

  const previewCodes = useMemo(() => {
    if (!pdfKnowledge) return [];
    return pdfKnowledge.graduationRequired.slice(0, 14);
  }, [pdfKnowledge]);

  const extraCount = pdfKnowledge ? Math.max(0, pdfKnowledge.graduationRequired.length - 14) : 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>

      {/* ── PDF Zone ──────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="PDF 편람 업로드 드롭존"
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-all duration-200 select-none",
          dragOver === "pdf"
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[1.01]"
            : pdfState === "done"
            ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
            : pdfState === "error"
            ? "border-red-400 bg-red-50/40 dark:bg-red-950/20"
            : "border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10",
        )}
        onDragOver={e => { e.preventDefault(); setDragOver("pdf"); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={handleDrop("pdf")}
        onClick={() => pdfInputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && pdfInputRef.current?.click()}
      >
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) processPdf(f); }}
        />

        {/* 1순위 지식 badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-700/40 uppercase tracking-wider">
            1순위 지식
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-1 transition-all",
            pdfState === "done"  ? "bg-emerald-100 dark:bg-emerald-900/30" :
            pdfState === "error" ? "bg-red-100 dark:bg-red-900/30"         :
                                   "bg-indigo-100 dark:bg-indigo-900/30",
          )}>
            {pdfState === "done"    ? "✅"
              : pdfState === "loading" ? "⏳"
              : pdfState === "error"   ? "❌"
              : "📄"}
          </div>

          <div>
            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
              {pdfState === "done" ? "편람 로드 완료" : "PDF 편람 업로드"}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {pdfState === "idle"    && "졸업요건 테이블을 최우선 지식으로 로드합니다"}
              {pdfState === "loading" && `분석 중... ${pdfProgress}%`}
              {pdfState === "done"    && pdfName}
              {pdfState === "error"   && "오류 발생 — 다시 클릭하세요"}
            </p>
          </div>

          {/* Progress bar */}
          {pdfState === "loading" && (
            <div className="w-full bg-indigo-100 dark:bg-indigo-900/40 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
          )}

          {/* Extracted graduation requirements preview */}
          {pdfState === "done" && pdfKnowledge && previewCodes.length > 0 && (
            <div className="w-full mt-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-emerald-200/60 dark:border-emerald-800/40 text-left">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wider">
                졸업 필수 — PDF 추출 결과
              </p>
              <div className="flex flex-wrap gap-1">
                {previewCodes.map((code, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-200/60 dark:border-emerald-700/40"
                  >
                    {code}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    +{extraCount}개
                  </span>
                )}
              </div>
              {pdfKnowledge.graduationCredits != null && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                  졸업 학점:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {pdfKnowledge.graduationCredits}학점
                  </strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Image Zone ────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="시간표 이미지 업로드 드롭존"
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-all duration-200 select-none",
          dragOver === "image"
            ? "border-violet-500 bg-violet-50/70 dark:bg-violet-950/40 scale-[1.01]"
            : imageState === "done"
            ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
            : "border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600 bg-violet-50/20 dark:bg-violet-950/10",
        )}
        onDragOver={e => { e.preventDefault(); setDragOver("image"); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={handleDrop("image")}
        onClick={() => imgInputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && imgInputRef.current?.click()}
      >
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={e => { if (e.target.files) processImages(Array.from(e.target.files)); }}
        />

        {/* AI Vision badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300 border border-violet-200/60 dark:border-violet-700/40 uppercase tracking-wider">
            AI Vision
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-1 transition-all",
            imageState === "done"    ? "bg-emerald-100 dark:bg-emerald-900/30" :
            imageState === "loading" ? "bg-violet-100 dark:bg-violet-900/30 animate-pulse" :
                                       "bg-violet-100 dark:bg-violet-900/30",
          )}>
            {imageState === "done" ? "✅" : imageState === "loading" ? "⏳" : "🖼️"}
          </div>

          <div>
            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
              {imageState === "done"
                ? `${imageCount}개 이미지 준비됨`
                : "시간표 이미지 업로드"}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {imageState === "idle"    && "에브리타임 시간표 캡처 · 최대 20장"}
              {imageState === "loading" && "이미지 처리 중..."}
              {imageState === "done"    && "AI Vision 분석 준비 완료"}
            </p>
          </div>

          {/* Image thumbnails strip */}
          {imageState === "done" && imageCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: Math.min(imageCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700 flex items-center justify-center text-[10px] text-violet-500"
                >
                  {i + 1}
                </div>
              ))}
              {imageCount > 5 && (
                <span className="text-[10px] text-slate-400">+{imageCount - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
