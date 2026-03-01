// Study plan input form — shadcn Tabs + DnD ImageDropZone + Button, dark mode aware
"use client";

import { useState, useRef, useCallback } from "react";
import type { StudyPlanInput } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Image Drop Zone (multi-image) ────────────────────────────────────────────
// Internally manages string[] of base64/URL sources.
// Joins with "|||" → parent receives single imageUrl string for API compat.

const MAX_IMAGES = 20;

interface DropZoneProps {
  value: string;            // "|||"-joined composite string
  onChange: (url: string) => void;
}

function ImageDropZone({ value, onChange }: DropZoneProps) {
  // Decompose stored value into individual URLs
  const items: string[] = value
    ? value.split("|||").map((s) => s.trim()).filter(Boolean)
    : [];

  const [dragging, setDragging] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pushItems = useCallback(
    (newItems: string[]) => {
      const merged = [...items, ...newItems].slice(0, MAX_IMAGES);
      onChange(merged.join("|||"));
    },
    [items, onChange]
  );

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(next.join("|||"));
  };

  const readFiles = useCallback(
    (files: FileList) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      const remaining = MAX_IMAGES - items.length;
      const toRead = imageFiles.slice(0, remaining);

      const promises = toRead.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      );

      Promise.all(promises).then((dataUrls) => {
        pushItems(dataUrls);
        setUrlMode(false);
      });
    },
    [items.length, pushItems]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) readFiles(e.dataTransfer.files);
    },
    [readFiles]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      readFiles(e.target.files);
      e.target.value = ""; // allow re-selecting same file
    }
  };

  const onUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      pushItems([trimmed]);
      setUrlInput("");
      setUrlMode(false);
    }
  };

  const canAddMore = items.length < MAX_IMAGES;

  return (
    <div>
      {/* ── Thumbnail grid (when at least one image is set) ── */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {items.map((src, idx) => (
            <div
              key={idx}
              className={cn(
                "relative rounded-xl overflow-hidden",
                "border border-emerald-200 dark:border-emerald-800",
                "bg-black/5 dark:bg-black/20",
                "shadow-[0_4px_12px_rgba(16,185,129,0.1)]"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`시간표 미리보기 ${idx + 1}`}
                className="w-full h-28 object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end px-2 py-1.5">
                <p className="text-white text-[10px] font-semibold flex-1 truncate">
                  {src.startsWith("data:") ? `✓ 이미지 ${idx + 1}` : src}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="w-5 h-5 rounded-full bg-white/25 hover:bg-red-500/70 text-white text-[10px] flex items-center justify-center transition-colors ml-1"
                  aria-label="이미지 제거"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Drop zone (shown when can add more) ── */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label="이미지 업로드 영역"
          className={cn(
            "relative flex flex-col items-center justify-center",
            "rounded-2xl border-2 border-dashed cursor-pointer select-none",
            "transition-all duration-300 px-4 py-5 text-center",
            items.length > 0 ? "min-h-[100px]" : "min-h-[148px]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
            dragging
              ? [
                  "border-emerald-400 scale-[1.02]",
                  "bg-gradient-to-br from-emerald-50/90 via-indigo-50/80 to-violet-50/70",
                  "dark:from-emerald-950/60 dark:via-indigo-950/50 dark:to-violet-950/40",
                ]
              : [
                  "border-gray-200 dark:border-gray-700",
                  "bg-gradient-to-br from-gray-50/60 to-slate-50/60",
                  "dark:from-neutral-800/60 dark:to-neutral-900/60",
                  "hover:border-emerald-300 hover:from-emerald-50/40 hover:to-indigo-50/40",
                  "dark:hover:border-emerald-700 dark:hover:from-emerald-950/30 dark:hover:to-indigo-950/30",
                ]
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        >
          {/* Monet glow ring */}
          {dragging && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow:
                  "0 0 0 3px rgba(16,185,129,0.5), 0 0 40px rgba(99,102,241,0.2), 0 0 80px rgba(16,185,129,0.1)",
                animation: "monetGlow 1.4s ease-in-out infinite",
              }}
            />
          )}

          {/* Floating particles on drag */}
          {dragging && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-emerald-400/30"
                  style={{
                    width: `${6 + i * 3}px`,
                    height: `${6 + i * 3}px`,
                    left: `${10 + i * 16}%`,
                    animation: `floatUp ${1.2 + i * 0.2}s ease-in-out infinite ${i * 0.18}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Icon */}
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5",
              "transition-all duration-300 shadow-md",
              dragging
                ? "bg-gradient-to-br from-emerald-400 via-indigo-500 to-violet-600 scale-110 shadow-[0_8px_28px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-700 dark:to-neutral-600"
            )}
          >
            <svg
              className={cn("w-6 h-6 transition-colors duration-300", dragging ? "text-white" : "text-gray-400")}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <p className={cn(
            "text-[15px] font-bold mb-1 transition-all duration-300",
            dragging ? "text-emerald-600 dark:text-emerald-300 scale-105" : "text-gray-700 dark:text-gray-200"
          )}>
            {dragging
              ? "놓으면 업로드됩니다!"
              : items.length > 0
              ? `이미지 추가 (${items.length}/${MAX_IMAGES})`
              : "시간표 이미지 드래그 또는 클릭"}
          </p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500">
            PNG · JPG · WEBP · 최대 {MAX_IMAGES}장까지 동시 분석
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* URL divider */}
      <div className="flex items-center gap-2 mt-3 mb-2">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium px-1 select-none">
          또는 URL 직접 입력
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {urlMode ? (
        <div className="flex gap-2">
          <Input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onUrlSubmit()}
            placeholder="https://example.com/timetable.png"
            className="flex-1 text-[15px] text-black placeholder:text-gray-400 bg-white border-gray-300 focus:border-emerald-400"
            autoFocus
          />
          <Button type="button" size="sm" onClick={onUrlSubmit}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold">
            확인
          </Button>
          <Button type="button" size="sm" variant="outline"
            onClick={() => setUrlMode(false)} className="shrink-0 rounded-xl text-black">
            취소
          </Button>
        </div>
      ) : (
        canAddMore && (
          <button
            type="button"
            onClick={() => setUrlMode(true)}
            className="w-full text-center text-[13px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold py-1 transition-colors"
          >
            URL로 입력하기 →
          </button>
        )
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes monetGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes floatUp {
          0% { transform: translateY(120%) scale(0.6); opacity: 0; }
          40% { opacity: 0.7; }
          100% { transform: translateY(-30px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface Props {
  onSubmit: (input: StudyPlanInput) => void;
  loading: boolean;
  status: string;
  error: string | null;
}

export default function StudyPlanForm({
  onSubmit,
  loading,
  status,
  error,
}: Props) {
  const [mode, setMode] = useState<"plans" | "year">("plans");
  const [studentInfo, setStudentInfo] = useState("");
  const [timetableInfo, setTimetableInfo] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = () => {
    onSubmit({ studentInfo, timetableInfo, imageUrl, mode });
  };

  const isPlansMode = mode === "plans";

  /* shared textarea style — always black text, larger font */
  const textareaClass = cn(
    "w-full px-3 py-2.5 text-[15px] rounded-xl resize-vertical",
    "border border-gray-200 dark:border-gray-700",
    "bg-white dark:bg-neutral-800",
    "text-black",                     // [Typography] forced black
    "placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400",
    "transition-colors"
  );

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex justify-center mb-4">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "plans" | "year")}
        >
          <TabsList className="rounded-full px-1 shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
            <TabsTrigger
              value="plans"
              className="rounded-full text-[14px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-[0_6px_12px_rgba(16,185,129,0.35)]"
            >
              수강 계획표 (Plan A~D)
            </TabsTrigger>
            <TabsTrigger
              value="year"
              className="rounded-full text-[14px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-[0_6px_12px_rgba(16,185,129,0.35)]"
            >
              1년 학습 계획표
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_18px_40px_rgba(15,23,42,0.09)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.3)] p-5">
        {/* Title row */}
        <div className="flex items-center mb-3">
          <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mr-2 shrink-0">
            <span className="text-base text-emerald-500">★</span>
          </div>
          <h2 className="text-[18px] font-bold text-gray-900 dark:text-gray-100 m-0">
            {isPlansMode ? "수강 계획표 입력" : "1년 학습 계획표 입력"}
          </h2>
        </div>

        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-3">
          {isPlansMode
            ? "아래 두 칸에 내용을 최대한 자세히 적을수록 더 정확한 수강 계획 4안이 만들어집니다."
            : "1년 동안의 목표, 시간표, 동아리/인턴 계획 등을 적으면 학습 로드맵을 생성합니다."}
        </p>

        {/* Student info */}
        <div className="mt-3">
          <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            학생 정보
          </label>
          <textarea
            rows={4}
            value={studentInfo}
            onChange={(e) => setStudentInfo(e.target.value)}
            placeholder={"- 학교/학과/학년\n- 이번 학기 목표 학점\n- 진로/관심 분야 등"}
            className={textareaClass}
          />
        </div>

        {/* Timetable info */}
        <div className="mt-3">
          <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            시간표/지침서 설명
          </label>
          <textarea
            rows={4}
            value={timetableInfo}
            onChange={(e) => setTimetableInfo(e.target.value)}
            placeholder={
              "- 현재(또는 희망) 시간표\n- 꼭 듣고 싶은/피하고 싶은 과목\n- 기타 조건 등을 적어주세요."
            }
            className={textareaClass}
          />
        </div>

        {/* Image upload — required */}
        <div className="mt-4">
          <label className="block text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            시간표 이미지{" "}
            <span className="text-red-500 font-bold">*</span>
            <span className="ml-1.5 text-[11px] font-normal text-red-400">(필수)</span>
          </label>
          <ImageDropZone value={imageUrl} onChange={setImageUrl} />
        </div>

        {/* Submit */}
        <div className="mt-5">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "w-full rounded-full text-[15px] font-bold py-5",
              loading
                ? "bg-gray-400 cursor-not-allowed shadow-none"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-[0_12px_22px_rgba(16,185,129,0.35)]"
            )}
          >
            {loading ? "생성 중..." : "AI 결과 생성하기"}
          </Button>

          {(status || error) && (
            <p
              className={cn(
                "mt-2 text-[13px]",
                error ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {error ?? status}
            </p>
          )}
        </div>

        {/* Info hint */}
        <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-[12px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
          {isPlansMode ? (
            <>
              • Plan A~D는 서로 다른 전략의 시간표를 제안합니다.
              <br />• 1년 계획(yearPlan)에는 1학기/2학기 목표와 추천 과목이 함께 들어갑니다.
            </>
          ) : (
            <>
              • 1학기/2학기 별 학습 목표와 전략, 주간 루틴, 마일스톤, 리스크 대응까지 JSON으로 내려갑니다.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
