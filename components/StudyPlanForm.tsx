// StudyPlanForm — clean white theme, image-based input only
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { StudyPlanInput } from "@/types";
import { cn } from "@/lib/utils";

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

// ─── Main Form ─────────────────────────────────────────────────────────────────

interface Props {
  onSubmit: (input: StudyPlanInput) => void;
  loading: boolean;
  status: string;
  error: string | null;
  onFormChange?: (studentInfo: string, timetableInfo: string, hasImage: boolean) => void;
}

export default function StudyPlanForm({ onSubmit, loading, status, error, onFormChange }: Props) {
  const [mode,          setMode]          = useState<"plans" | "year">("plans");
  const [studentInfo,   setStudentInfo]   = useState("");
  const [timetableInfo, setTimetableInfo] = useState("");
  const [imageUrl,      setImageUrl]      = useState("");

  const universityId =
    typeof window !== "undefined"
      ? (localStorage.getItem("smartstudy_university") ?? undefined)
      : undefined;

  // Notify parent of input changes for live risk detection
  useEffect(() => {
    onFormChange?.(studentInfo, timetableInfo, !!imageUrl);
  }, [studentInfo, timetableInfo, imageUrl, onFormChange]);

  const handleSubmit = () =>
    onSubmit({ studentInfo, timetableInfo, imageUrl, mode, universityId });

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

      {/* Form panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(15,23,42,0.07)] p-6 space-y-5">

        {/* Student info — WEIGHT=MAX */}
        <div>
          <label className={labelClass}>
            학생 정보
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
              ★ 최우선 가이드라인
            </span>
          </label>
          <textarea rows={4} value={studentInfo} onChange={(e) => setStudentInfo(e.target.value)}
            placeholder={"- 학교 / 학과 / 학년 (예: 경성대 소프트웨어학과 2학년)\n- 이번 학기 목표 학점\n- 진로 · 관심 분야\n→ 이미지보다 이 내용이 최우선 반영됩니다"}
            className={cn(textareaClass, "border-amber-200 focus:border-amber-400 focus:ring-amber-400/25")}
          />
        </div>

        {/* Timetable info */}
        <div>
          <label className={labelClass}>
            수강 조건 / 희망 시간표
            <span className="ml-1.5 text-[11px] font-normal text-gray-400">(선택)</span>
          </label>
          <textarea rows={3} value={timetableInfo}
            onChange={(e) => setTimetableInfo(e.target.value)}
            placeholder={"- 꼭 듣고 싶은 / 피하고 싶은 과목\n- 희망 공강일\n- 기타 특이사항"}
            className={textareaClass}
          />
        </div>

        {/* Image upload */}
        <div>
          <p className="text-[13px] font-semibold text-slate-700 mb-1.5">
            시간표 이미지 <span className="text-[11px] font-normal text-gray-400">(선택 · 에브리타임 캡처 등)</span>
          </p>
          <ImageDropZone value={imageUrl} onChange={setImageUrl} />
        </div>

        {/* Submit */}
        <button type="button" onClick={handleSubmit} disabled={loading || !studentInfo.trim()}
          className={cn(
            "w-full py-3.5 rounded-xl text-[15px] font-bold transition-all",
            loading || !studentInfo.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_6px_18px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
          )}>
          {loading ? "생성 중..." : "AI 결과 생성하기"}
        </button>

        {!studentInfo.trim() && (
          <p className="text-[11px] text-amber-500 text-center">학생 정보를 입력해야 생성 가능합니다.</p>
        )}

        {(status || error) && (
          <p className={cn("text-[12px] text-center", error ? "text-red-500 font-medium" : "text-gray-500")}>
            {error ?? status}
          </p>
        )}

        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          {mode === "plans"
            ? "Plan A~D · 전공필수 + 교양 균형 · 공강일 확보 · AI 최적화 수강 전략"
            : "1학기/2학기 목표 · 주간 루틴 · 마일스톤 · 리스크 대응 포함"}
        </p>
      </div>
    </div>
  );
}
