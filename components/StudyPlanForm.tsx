// StudyPlanForm — Manus-style command interface
// Dark-first design: deep gradient card, terminal labels, agent progress log for PDF
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { StudyPlanInput } from "@/types";
import { cn } from "@/lib/utils";

// ─── Agent Progress Log ────────────────────────────────────────────────────────

const PDF_STEPS = [
  "PDF 파일 수신 중...",
  "텍스트 레이어 추출 중...",
  "편람 청크 분할 및 인덱싱 중...",
  "소프트웨어학과 커리큘럼 탐색 중...",
  "리눅스시스템(EO209) 필수 조건 확인 중...",
  "AI 컨텍스트 구성 완료",
];

const STEP_INTERVAL_MS = 1100;

interface AgentLogProps {
  active: boolean; // true while fetch is in progress
  done: boolean;   // true when fetch completed
}

function AgentProgressLog({ active, done }: AgentLogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!active) { setCurrentStep(0); return; }
    const id = setInterval(() => {
      setCurrentStep((s) => (s < PDF_STEPS.length - 1 ? s + 1 : s));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  // On done, advance to last step
  useEffect(() => {
    if (done) setCurrentStep(PDF_STEPS.length - 1);
  }, [done]);

  if (!active && !done) return null;

  return (
    <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/80 px-4 py-3 font-mono text-[12px]">
      {PDF_STEPS.map((step, i) => {
        const isCompleted = done || i < currentStep;
        const isCurrent   = !done && i === currentStep;
        return (
          <div key={i} className={cn("flex items-center gap-2.5 py-0.5 transition-opacity duration-300",
            i > currentStep && !done ? "opacity-30" : "opacity-100"
          )}>
            <span className={cn("w-3.5 text-center shrink-0",
              isCompleted ? "text-emerald-400" : isCurrent ? "text-yellow-400 animate-pulse" : "text-slate-600"
            )}>
              {isCompleted ? "✓" : isCurrent ? "●" : "○"}
            </span>
            <span className={cn(
              isCompleted ? "text-emerald-300" : isCurrent ? "text-yellow-300" : "text-slate-500"
            )}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Image Drop Zone ───────────────────────────────────────────────────────────

const MAX_IMAGES = 20;

interface ImageDropZoneProps {
  value: string;
  onChange: (url: string) => void;
}

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
    const toRead = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_IMAGES - items.length);
    Promise.all(toRead.map((f) => new Promise<string>((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as string);
      r.readAsDataURL(f);
    }))).then(push);
  }, [items.length, push]);

  return (
    <div>
      {/* Thumbnail grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {items.map((src, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-20 object-contain bg-slate-900" />
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx).join("|||"))}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-800/80 text-slate-300 text-[9px] flex items-center justify-center hover:bg-red-600/80">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {items.length < MAX_IMAGES && (
        <div
          role="button" tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) readFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center min-h-[90px] rounded-lg border-2 border-dashed",
            "cursor-pointer transition-all duration-200 select-none text-center px-3 py-4",
            dragging
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-slate-700 hover:border-slate-500 bg-slate-900/40"
          )}
        >
          <span className="text-2xl mb-1">🖼</span>
          <p className="text-[12px] text-slate-400">
            {dragging ? "놓으면 업로드" : items.length ? `이미지 추가 (${items.length}/${MAX_IMAGES})` : "드래그 또는 클릭"}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">PNG · JPG · WEBP</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) { readFiles(e.target.files); e.target.value = ""; }}} />
        </div>
      )}

      {/* URL input */}
      <div className="flex items-center gap-2 mt-2">
        {urlMode ? (
          <>
            <input type="url" value={urlInput} autoFocus placeholder="https://..." onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && urlInput.trim()) { push([urlInput.trim()]); setUrlInput(""); setUrlMode(false); }}}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button type="button" onClick={() => { if (urlInput.trim()) { push([urlInput.trim()]); setUrlInput(""); setUrlMode(false); }}}
              className="text-[11px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold">확인</button>
            <button type="button" onClick={() => setUrlMode(false)} className="text-[11px] px-2 py-1.5 text-slate-400 hover:text-slate-200">취소</button>
          </>
        ) : (
          items.length < MAX_IMAGES && (
            <button type="button" onClick={() => setUrlMode(true)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">URL로 입력 →</button>
          )
        )}
      </div>
    </div>
  );
}

// ─── PDF Drop Zone (Manus agent style) ────────────────────────────────────────

interface PdfExtractResult {
  totalPages: number;
  chunkCount: number;
  courseCount: number;
  curriculumText: string;
  validation: Record<string, { found: boolean; pageRange?: string }>;
}

interface PdfDropZoneProps {
  universityId?: string;
  onExtracted: (r: PdfExtractResult) => void;
}

function PdfDropZone({ universityId, onExtracted }: PdfDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [done,     setDone]     = useState(false);
  const [result,   setResult]   = useState<PdfExtractResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_PDF_BYTES = 20 * 1024 * 1024;

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
      setResult(data);
      onExtracted(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF 분석 실패");
    } finally {
      setFetching(false); setDone(true);
    }
  }, [universityId, onExtracted]);

  // Success state
  if (result && done) {
    const eo203 = result.validation?.["EO203"];
    const eo209 = result.validation?.["EO209"];
    return (
      <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-[13px] font-semibold text-emerald-300">
            {result.totalPages}페이지 완료 · 과목 {result.courseCount}개 추출 · {result.chunkCount}청크
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[["EO203", eo203], ["EO209", eo209]].map(([code, v]) => {
            const val = v as { found: boolean; pageRange?: string } | undefined;
            return val ? (
              <span key={code as string} className={cn("text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full",
                val.found ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-400")}>
                {code as string} {val.found ? `✓ ${val.pageRange ?? ""}` : "✗ 미발견"}
              </span>
            ) : null;
          })}
        </div>
        <button type="button" onClick={() => { setResult(null); setDone(false); setError(null); }}
          className="mt-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">다른 PDF 업로드</button>
        <AgentProgressLog active={false} done={true} />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button" tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }}
        onClick={() => !fetching && fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !fetching && fileRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center min-h-[90px] rounded-lg border-2 border-dashed",
          "cursor-pointer transition-all duration-200 select-none text-center px-3 py-4",
          fetching && "pointer-events-none",
          dragging ? "border-indigo-500 bg-indigo-500/5"
            : "border-slate-700 hover:border-slate-500 bg-slate-900/40"
        )}
      >
        {fetching ? (
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <span className="text-[12px] text-indigo-400 font-mono">분석 중...</span>
          </div>
        ) : (
          <>
            <span className="text-2xl mb-1">📄</span>
            <p className="text-[12px] text-slate-400">{dragging ? "PDF를 여기에 놓으세요" : "편람 PDF 드래그 또는 클릭"}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">PDF · 최대 20MB</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); e.target.value = ""; }} />
      </div>

      <AgentProgressLog active={fetching} done={done} />

      {error && <p className="mt-2 text-[11px] text-red-400 font-mono">{error}</p>}
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
  const [mode,         setMode]         = useState<"plans" | "year">("plans");
  const [studentInfo,  setStudentInfo]  = useState("");
  const [timetableInfo,setTimetableInfo]= useState("");
  const [imageUrl,     setImageUrl]     = useState("");
  const [uploadMode,   setUploadMode]   = useState<"image" | "pdf">("image");
  const [pdfMode,      setPdfMode]      = useState(false);

  const universityId =
    typeof window !== "undefined"
      ? (localStorage.getItem("smartstudy_university") ?? undefined)
      : undefined;

  const handlePdfExtracted = useCallback((r: PdfExtractResult) => {
    setTimetableInfo(r.curriculumText);
    setPdfMode(true);
  }, []);

  const handleModeSwitch = (m: "image" | "pdf") => {
    setUploadMode(m);
    if (m === "image") setPdfMode(false);
  };

  const handleSubmit = () =>
    onSubmit({ studentInfo, timetableInfo, imageUrl, mode, universityId, pdfMode });

  /* shared input style */
  const inputBase = cn(
    "w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-4 py-3",
    "text-[14px] text-slate-100 placeholder:text-slate-600",
    "focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/20",
    "resize-vertical transition-colors font-sans"
  );

  return (
    <div className="w-full">
      {/* Mode toggle pills */}
      <div className="flex items-center gap-2 mb-5 justify-center">
        {(["plans", "year"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all",
              mode === m
                ? "bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                : "text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500"
            )}>
            {m === "plans" ? "수강 계획표 (A~D)" : "1년 로드맵"}
          </button>
        ))}
      </div>

      {/* Command card */}
      <div className={cn(
        "rounded-2xl border border-slate-800",
        "bg-gradient-to-b from-slate-900 to-slate-950",
        "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        "p-5 space-y-4"
      )}>

        {/* ─ Student Info ─ */}
        <div>
          <label className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-2">
            <span className="text-emerald-500">›</span> 학생 정보
          </label>
          <textarea rows={4} value={studentInfo} onChange={(e) => setStudentInfo(e.target.value)}
            placeholder={"학교 / 학과 / 학년\n이번 학기 목표 학점\n진로 · 관심 분야"}
            className={inputBase}
          />
        </div>

        {/* ─ Timetable Info ─ */}
        <div>
          <label className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-2">
            <span className="text-emerald-500">›</span> 시간표 / 수강 조건
            {pdfMode && (
              <span className="ml-auto text-[10px] font-sans text-emerald-400 normal-case tracking-normal">
                ✓ PDF에서 자동 입력됨
              </span>
            )}
          </label>
          <textarea rows={pdfMode ? 3 : 4} value={timetableInfo} readOnly={pdfMode}
            onChange={(e) => setTimetableInfo(e.target.value)}
            placeholder={pdfMode ? "PDF 분석 결과가 입력되었습니다." : "희망 시간표 / 피하고 싶은 과목 / 기타 조건"}
            className={cn(inputBase, pdfMode && "opacity-50 cursor-default")}
          />
        </div>

        {/* ─ Upload zone ─ */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <label className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              <span className="text-emerald-500">›</span> 자료 업로드
            </label>
            <div className="ml-auto flex rounded-lg overflow-hidden border border-slate-700 text-[11px] font-semibold">
              {(["image", "pdf"] as const).map((m) => (
                <button key={m} type="button" onClick={() => handleModeSwitch(m)}
                  className={cn("px-3 py-1 transition-colors",
                    m === "pdf" && "border-l border-slate-700",
                    uploadMode === m
                      ? m === "pdf" ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"
                      : "text-slate-500 hover:text-slate-300"
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

        {/* ─ Submit ─ */}
        <button type="button" onClick={handleSubmit} disabled={loading}
          className={cn(
            "w-full py-3.5 rounded-xl text-[14px] font-bold tracking-wide transition-all",
            loading
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : cn(
                "bg-emerald-500 hover:bg-emerald-400 text-white",
                "shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)]"
              )
          )}>
          {loading ? "분석 중..." : "AI 계획 생성하기  →"}
        </button>

        {(status || error) && (
          <p className={cn("text-[12px] font-mono text-center",
            error ? "text-red-400" : "text-slate-500")}>
            {error ?? status}
          </p>
        )}

        {/* Info chip */}
        <p className="text-[11px] text-slate-600 text-center leading-relaxed">
          {mode === "plans"
            ? "Plan A~D — 각기 다른 전략의 21학점 시간표 · EO203 + EO209 포함 · 금요일 공강"
            : "1학기/2학기 목표 · 주간 루틴 · 마일스톤 · 리스크 대응 포함"}
        </p>
      </div>
    </div>
  );
}
