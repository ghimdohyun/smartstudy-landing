// StudyPlanForm — clean white theme + pdf2json-based PDF engine + EO209 agent log
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { StudyPlanInput } from "@/types";
import { cn } from "@/lib/utils";

// ─── Agent Progress Log (light emerald) ───────────────────────────────────────

const PDF_STEPS = [
  { text: "PDF 파일 분석 중...",               highlight: false },
  { text: "텍스트 레이어 추출 중...",           highlight: false },
  { text: "편람 청크 분할 및 인덱싱 중...",     highlight: false },
  { text: "교육과정 커리큘럼 탐색 중...",       highlight: false },
  { text: "전공필수 이수 조건 확인 중...",       highlight: true  },
  { text: "AI 컨텍스트 구성 완료",              highlight: false },
];

const STEP_INTERVAL_MS = 1100;

interface AgentLogProps { active: boolean; done: boolean }

function AgentProgressLog({ active, done }: AgentLogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!active) { setCurrentStep(0); return; }
    const id = setInterval(() => setCurrentStep((s) => s < PDF_STEPS.length - 1 ? s + 1 : s), STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => { if (done) setCurrentStep(PDF_STEPS.length - 1); }, [done]);

  if (!active && !done) return null;

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px]">
      {PDF_STEPS.map(({ text, highlight }, i) => {
        const isCompleted = done || i < currentStep;
        const isCurrent   = !done && i === currentStep;
        const isPending   = !done && i > currentStep;
        return (
          <div key={i} className={cn(
            "flex items-center gap-2.5 py-[3px] transition-opacity duration-300",
            isPending && "opacity-35"
          )}>
            <span className={cn("w-3.5 text-center shrink-0 font-semibold",
              isCompleted ? "text-emerald-600"
                : isCurrent  ? "text-emerald-700 animate-pulse"
                : "text-emerald-300"
            )}>
              {isCompleted ? "✓" : isCurrent ? "●" : "○"}
            </span>
            <span className={cn(
              "font-sans",
              isCompleted ? "text-emerald-700"
                : isCurrent  ? cn("text-emerald-900 font-semibold", highlight && "underline decoration-emerald-400 decoration-dotted")
                : "text-emerald-400",
              // EO209 step always slightly bolder when active/done
              highlight && !isPending && "font-semibold"
            )}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Image Drop Zone ───────────────────────────────────────────────────────────

const MAX_IMAGES = 20;

interface ImageDropZoneProps { value: string; onChange: (url: string) => void }

function ImageDropZone({ value, onChange }: ImageDropZoneProps) {
  const items = value ? value.split("|||").map((s) => s.trim()).filter(Boolean) : [];
  const [dragging, setDragging] = useState(false);
  const [urlMode,  setUrlMode]  = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const push = useCallback((newItems: string[]) => {
    onChange([...items, ...newItems].slice(0, MAX_IMAGES).join("|||"));
  }, [items, onChange]);

  const readFiles = useCallback((files: FileList) => {
    const toRead = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, MAX_IMAGES - items.length);
    Promise.all(toRead.map((f) => new Promise<string>((res) => {
      const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(f);
    }))).then(push);
  }, [items.length, push]);

  return (
    <div>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {items.map((src, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-20 object-contain bg-gray-50" />
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx).join("|||"))}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/90 text-gray-500 text-[9px] flex items-center justify-center hover:bg-red-100 hover:text-red-600 shadow-sm">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length < MAX_IMAGES && (
        <div role="button" tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) readFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center min-h-[100px] rounded-xl border-2 border-dashed",
            "cursor-pointer transition-all duration-200 select-none text-center px-3 py-4",
            dragging
              ? "border-emerald-400 bg-emerald-50"
              : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 bg-gray-50/60"
          )}>
          <span className="text-2xl mb-1">🖼</span>
          <p className="text-[13px] text-gray-600 font-medium">
            {dragging ? "여기에 놓으세요" : items.length ? `이미지 추가 (${items.length}/${MAX_IMAGES})` : "시간표 이미지 드래그 또는 클릭"}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">PNG · JPG · WEBP · 최대 {MAX_IMAGES}장</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) { readFiles(e.target.files); e.target.value = ""; }}} />
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        {urlMode ? (
          <>
            <input type="url" value={urlInput} autoFocus placeholder="https://..."
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && urlInput.trim()) { push([urlInput.trim()]); setUrlInput(""); setUrlMode(false); }}}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400"
            />
            <button type="button" onClick={() => { if (urlInput.trim()) { push([urlInput.trim()]); setUrlInput(""); setUrlMode(false); }}}
              className="text-[12px] px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold">확인</button>
            <button type="button" onClick={() => setUrlMode(false)}
              className="text-[12px] px-2 py-1.5 text-gray-400 hover:text-gray-600">취소</button>
          </>
        ) : (
          items.length < MAX_IMAGES && (
            <button type="button" onClick={() => setUrlMode(true)}
              className="text-[12px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors">URL로 입력 →</button>
          )
        )}
      </div>
    </div>
  );
}

// ─── PDF Drop Zone (client-side pdfjs extraction — no binary upload, no 413) ───
//
// Architecture: pdfjs-dist runs IN THE BROWSER.
//   1. Extract text page-by-page (shows progress)
//   2. Filter only curriculum-relevant pages (keyword match)
//   3. POST only the tiny filtered text to /api/pdf-extract
//   → Server receives ~KB of text instead of MB of binary → 413 impossible

const CURRICULUM_KEYWORDS = [
  "소프트웨어학과", "교육과정", "전공필수", "전공선택", "전공기초",
  "교양필수", "교양선택", "학점이수", "졸업학점", "이수구분",
  "공통필수", " EO2", "학수번호", "이수학점", "소프트웨어",
];

interface PageEntry { pageNum: number; text: string }

interface PdfExtractResult {
  totalPages: number;
  chunkCount: number;
  courseCount: number;
  curriculumText: string;
  validation: Record<string, { found: boolean; pageRange?: string }>;
}

interface PdfDropZoneProps { universityId?: string; onExtracted: (r: PdfExtractResult) => void }

type Phase = "idle" | "extracting" | "sending" | "done" | "error";

function PdfDropZone({ universityId, onExtracted }: PdfDropZoneProps) {
  const [dragging,  setDragging]  = useState(false);
  const [phase,     setPhase]     = useState<Phase>("idle");
  const [progress,  setProgress]  = useState<{ cur: number; total: number } | null>(null);
  const [result,    setResult]    = useState<PdfExtractResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Sanitize extracted text: remove invalid Unicode, surrogates, PUA chars that cause JSON parse errors */
  const sanitizeText = (raw: string): string => {
    return raw
      // Remove null bytes and C0/C1 control chars (except tab, LF, CR)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
      // Remove lone UTF-16 surrogates (would silently corrupt JSON.stringify)
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
      // Remove Private Use Area characters that render as garbled glyphs (e.g. 㳼)
      .replace(/[\uE000-\uF8FF]/g, "")
      // Remove rare CJK Compatibility/Extension ranges that aren't real Hangul/Hanja
      .replace(/[\u2E80-\u2EFF\u3000-\u303F\uFFF0-\uFFFF]/g, " ")
      // Collapse multiple whitespace
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  /** Extract text client-side with pdfjs-dist, filter to curriculum pages only */
  const extractClientSide = async (
    file: File,
    onProgress: (cur: number, total: number) => void,
  ): Promise<{ pageTexts: PageEntry[]; totalPages: number }> => {
    // Dynamic import: keeps pdfjs out of SSR bundle
    const pdfjs = await import("pdfjs-dist");
    // Worker served from unpkg CDN — no webpack config needed, always version-matched
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;
    const pageTexts: PageEntry[] = [];

    for (let p = 1; p <= totalPages; p++) {
      onProgress(p, totalPages);
      const page    = await pdf.getPage(p);
      const content = await page.getTextContent();
      const rawText = (content.items as Array<{ str?: string }>)
        .map((it) => it.str ?? "")
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim();
      // Sanitize: strip surrogates, PUA chars, control chars that break JSON
      const text = sanitizeText(rawText);
      // Keep only pages containing curriculum keywords — drops table-of-contents, photos, etc.
      if (text.length > 30 && CURRICULUM_KEYWORDS.some((kw) => text.includes(kw))) {
        pageTexts.push({ pageNum: p, text });
      }
    }
    return { pageTexts, totalPages };
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("PDF 파일만 업로드할 수 있습니다."); return;
    }
    setPhase("extracting"); setProgress(null); setError(null); setResult(null);
    try {
      // ── Phase 1: browser extracts text (no upload, no 413) ───────────────
      const { pageTexts, totalPages } = await extractClientSide(
        file,
        (cur, total) => setProgress({ cur, total }),
      );

      if (pageTexts.length === 0) {
        throw new Error(
          "커리큘럼 관련 페이지를 찾을 수 없습니다. " +
          "스캔 이미지 PDF이거나 텍스트 레이어가 없는 파일일 수 있습니다.",
        );
      }

      // ── Phase 2: send only the filtered text (KB-sized) to server ────────
      setPhase("sending");
      const res = await fetch("/api/pdf-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageTexts, totalPages, universityId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? `서버 오류 ${res.status}`);
      }
      const data = await res.json() as PdfExtractResult;
      setResult(data); onExtracted(data);
      setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF 분석 실패");
      setPhase("error");
    }
  }, [universityId, onExtracted]);

  // ── Success card ──────────────────────────────────────────────────────────
  if (phase === "done" && result) {
    const eo203 = result.validation?.["EO203"];
    const eo209 = result.validation?.["EO209"];
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[13px] font-semibold text-emerald-800">
            분석 완료 · 전체 {result.totalPages}페이지 중 커리큘럼 {result.chunkCount}청크 · 과목 {result.courseCount}개
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[["EO203", eo203], ["EO209", eo209]].map(([code, v]) => {
            const val = v as { found: boolean; pageRange?: string } | undefined;
            return val ? (
              <span key={code as string} className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border font-mono",
                val.found
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                  : "bg-red-50 text-red-600 border-red-200",
              )}>
                {code as string} {val.found ? `✓ ${val.pageRange ?? ""}` : "✗ 미발견"}
              </span>
            ) : null;
          })}
        </div>
        <button type="button"
          onClick={() => { setResult(null); setPhase("idle"); setError(null); setProgress(null); }}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
          다른 PDF 업로드
        </button>
      </div>
    );
  }

  // ── Extraction / sending progress ─────────────────────────────────────────
  if (phase === "extracting" || phase === "sending") {
    const pct = progress ? Math.round((progress.cur / progress.total) * 100) : 0;
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
          <p className="text-[13px] font-semibold text-indigo-800">
            {phase === "extracting"
              ? progress
                ? `브라우저에서 직접 텍스트를 추출 중입니다... (${progress.cur} / ${progress.total}페이지)`
                : "PDF를 여는 중..."
              : "핵심 커리큘럼 페이지를 서버로 전송 중..."}
          </p>
        </div>
        {phase === "extracting" && progress && (
          <>
            <div className="w-full h-1.5 rounded-full bg-indigo-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-indigo-500">
              파일이 서버로 업로드되지 않습니다 — 브라우저에서 직접 처리 중
            </p>
          </>
        )}
      </div>
    );
  }

  // ── Drop zone (idle / error) ──────────────────────────────────────────────
  return (
    <div>
      <div role="button" tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center min-h-[100px] rounded-xl border-2 border-dashed",
          "cursor-pointer transition-all duration-200 select-none text-center px-3 py-4",
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 bg-gray-50/60",
        )}>
        <span className="text-2xl mb-1">📄</span>
        <p className="text-[13px] text-gray-600 font-medium">
          {dragging ? "PDF를 여기에 놓으세요" : "편람 PDF 드래그 또는 클릭"}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">PDF · 용량 무제한 · 브라우저 직접 추출 (서버 전송 없음)</p>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>

      {error && (
        <p className="mt-2 text-[12px] text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────

interface Props {
  onSubmit: (input: StudyPlanInput) => void;
  loading: boolean;
  status: string;
  error: string | null;
}

export default function StudyPlanForm({ onSubmit, loading, status, error }: Props) {
  const [mode,          setMode]          = useState<"plans" | "year">("plans");
  const [studentInfo,   setStudentInfo]   = useState("");
  const [timetableInfo, setTimetableInfo] = useState("");
  const [imageUrl,      setImageUrl]      = useState("");
  const [uploadMode,    setUploadMode]    = useState<"image" | "pdf">("image");
  const [pdfMode,       setPdfMode]       = useState(false);

  const universityId =
    typeof window !== "undefined"
      ? (localStorage.getItem("smartstudy_university") ?? undefined)
      : undefined;

  const handlePdfExtracted = useCallback((r: PdfExtractResult) => {
    setTimetableInfo(r.curriculumText); setPdfMode(true);
  }, []);

  const handleModeSwitch = (m: "image" | "pdf") => {
    setUploadMode(m); if (m === "image") setPdfMode(false);
  };

  const handleSubmit = () =>
    onSubmit({ studentInfo, timetableInfo, imageUrl, mode, universityId, pdfMode });

  const textareaClass = cn(
    "w-full px-3.5 py-3 text-[14px] rounded-xl resize-vertical",
    "border border-gray-200",
    "bg-gray-50 text-slate-900 placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-400",
    "transition-colors"
  );

  const labelClass = "block text-[13px] font-semibold text-slate-700 mb-1.5";

  return (
    <div className="w-full">
      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mb-5">
        {(["plans", "year"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn(
              "px-5 py-2 rounded-full text-[13px] font-semibold transition-all",
              mode === m
                ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                : "text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 bg-white"
            )}>
            {m === "plans" ? "수강 계획표 (Plan A~D)" : "1년 학습 로드맵"}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(15,23,42,0.07)] p-6 space-y-5">

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <span className="text-emerald-500 text-sm">★</span>
          </div>
          <h2 className="text-[17px] font-bold text-slate-900 m-0">
            {mode === "plans" ? "수강 계획표 입력" : "1년 학습 계획표 입력"}
          </h2>
        </div>

        <p className="text-[13px] text-gray-500">
          {mode === "plans"
            ? "정보를 자세히 입력할수록 더 정확한 Plan A~D가 생성됩니다."
            : "목표, 시간표, 활동 계획을 입력하면 1년 학습 로드맵을 제안합니다."}
        </p>

        {/* Student info */}
        <div>
          <label className={labelClass}>학생 정보</label>
          <textarea rows={4} value={studentInfo} onChange={(e) => setStudentInfo(e.target.value)}
            placeholder={"- 학교 / 학과 / 학년\n- 이번 학기 목표 학점\n- 진로 · 관심 분야"}
            className={textareaClass}
          />
        </div>

        {/* Timetable info */}
        <div>
          <label className={labelClass}>
            시간표 / 수강 조건
            {pdfMode && (
              <span className="ml-2 text-[11px] font-normal text-emerald-600">✓ PDF에서 자동 입력됨</span>
            )}
          </label>
          <textarea rows={pdfMode ? 3 : 4} value={timetableInfo} readOnly={pdfMode}
            onChange={(e) => setTimetableInfo(e.target.value)}
            placeholder={pdfMode ? "PDF 분석 결과가 자동으로 입력되었습니다." : "- 희망 시간표\n- 꼭 듣고 싶은 / 피하고 싶은 과목\n- 기타 조건"}
            className={cn(textareaClass, pdfMode && "opacity-50 cursor-default")}
          />
        </div>

        {/* Upload zone */}
        <div>
          <div className="flex items-center mb-2">
            <label className={labelClass + " mb-0"}>자료 업로드</label>
            {/* Toggle */}
            <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden text-[12px] font-semibold">
              {(["image", "pdf"] as const).map((m) => (
                <button key={m} type="button" onClick={() => handleModeSwitch(m)}
                  className={cn("px-3 py-1.5 transition-colors",
                    m === "pdf" && "border-l border-gray-200",
                    uploadMode === m
                      ? m === "pdf" ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white"
                      : "text-gray-500 hover:text-gray-700 bg-white"
                  )}>
                  {m === "image" ? "🖼 이미지" : "📄 PDF 편람"}
                </button>
              ))}
            </div>
          </div>

          {uploadMode === "image"
            ? <ImageDropZone value={imageUrl} onChange={setImageUrl} />
            : <PdfDropZone universityId={universityId} onExtracted={handlePdfExtracted} />
          }
        </div>

        {/* Submit */}
        <button type="button" onClick={handleSubmit} disabled={loading}
          className={cn(
            "w-full py-3.5 rounded-xl text-[15px] font-bold transition-all",
            loading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_6px_18px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
          )}>
          {loading ? "생성 중..." : "AI 결과 생성하기"}
        </button>

        {(status || error) && (
          <p className={cn("text-[12px] text-center", error ? "text-red-500 font-medium" : "text-gray-500")}>
            {error ?? status}
          </p>
        )}

        {/* Info note */}
        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          {mode === "plans"
            ? "Plan A~D · 전공필수 + 교양 균형 · 공강일 확보 · AI 최적화 수강 전략"
            : "1학기/2학기 목표 · 주간 루틴 · 마일스톤 · 리스크 대응 포함"}
        </p>
      </div>
    </div>
  );
}
