// StudyPlanForm — clean white theme + pdf2json-based PDF engine + EO209 agent log
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { StudyPlanInput } from "@/types";
import { cn } from "@/lib/utils";

// ─── Agent Progress Log (light emerald) ───────────────────────────────────────

const PDF_STEPS = [
  { text: "PDF 파일 수신 중...",                       highlight: false },
  { text: "텍스트 레이어 추출 중...",                    highlight: false },
  { text: "편람 청크 분할 및 인덱싱 중...",              highlight: false },
  { text: "소프트웨어학과 커리큘럼 탐색 중...",           highlight: false },
  { text: "리눅스시스템(EO209) 필수 조건 확인 중...",     highlight: true  }, // ← EO209 강조
  { text: "AI 컨텍스트 구성 완료",                      highlight: false },
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

// ─── PDF Drop Zone (white theme, pdf2json engine, base64 JSON) ─────────────────

interface PdfExtractResult {
  totalPages: number;
  chunkCount: number;
  courseCount: number;
  curriculumText: string;
  validation: Record<string, { found: boolean; pageRange?: string }>;
}

interface PdfDropZoneProps { universityId?: string; onExtracted: (r: PdfExtractResult) => void }

function PdfDropZone({ universityId, onExtracted }: PdfDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [done,     setDone]     = useState(false);
  const [result,   setResult]   = useState<PdfExtractResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_PDF_BYTES = 20 * 1024 * 1024;

  // FileReader → base64 (browser-safe, no Node.js Buffer)
  const readAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("파일 읽기 실패"));
      reader.readAsDataURL(file);
    });

  const uploadPdf = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("PDF 파일만 업로드할 수 있습니다."); return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("파일이 너무 큽니다. 20MB 이하의 PDF를 업로드해주세요."); return;
    }
    setFetching(true); setDone(false); setError(null); setResult(null);
    try {
      // base64 JSON — bypasses multipart parser limits (413 원천 차단)
      const fileBase64 = await readAsBase64(file);
      const res = await fetch("/api/pdf-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, universityId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? `오류 ${res.status}`);
      }
      const data = await res.json() as PdfExtractResult;
      setResult(data); onExtracted(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF 분석 실패");
    } finally {
      setFetching(false); setDone(true);
    }
  }, [universityId, onExtracted]);

  // Success result card
  if (result && done) {
    const eo203 = result.validation?.["EO203"];
    const eo209 = result.validation?.["EO209"];
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[13px] font-semibold text-emerald-800">
            {result.totalPages}페이지 분석 완료 · 과목 {result.courseCount}개 · {result.chunkCount}청크
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
                  : "bg-red-50 text-red-600 border-red-200"
              )}>
                {code as string} {val.found ? `✓ ${val.pageRange ?? ""}` : "✗ 미발견"}
              </span>
            ) : null;
          })}
        </div>
        <button type="button" onClick={() => { setResult(null); setDone(false); setError(null); }}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">다른 PDF 업로드</button>
        <AgentProgressLog active={false} done={true} />
      </div>
    );
  }

  return (
    <div>
      <div role="button" tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }}
        onClick={() => !fetching && fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !fetching && fileRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center min-h-[100px] rounded-xl border-2 border-dashed",
          "cursor-pointer transition-all duration-200 select-none text-center px-3 py-4",
          fetching && "pointer-events-none",
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 bg-gray-50/60"
        )}>
        {fetching ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-[13px] text-indigo-600 font-medium">PDF 분석 중...</span>
          </div>
        ) : (
          <>
            <span className="text-2xl mb-1">📄</span>
            <p className="text-[13px] text-gray-600 font-medium">
              {dragging ? "PDF를 여기에 놓으세요" : "경성대 편람 PDF 드래그 또는 클릭"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">PDF · 최대 20MB · 텍스트 추출 + RAG 분석</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); e.target.value = ""; }} />
      </div>

      <AgentProgressLog active={fetching} done={done} />

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
            ? "Plan A~D · 21학점 · EO203(전산수학) + EO209(리눅스시스템) 포함 · 금요일 공강"
            : "1학기/2학기 목표 · 주간 루틴 · 마일스톤 · 리스크 대응 포함"}
        </p>
      </div>
    </div>
  );
}
