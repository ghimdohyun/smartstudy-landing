// PDF extraction endpoint — multipart POST, returns structured curriculum data
// Max 20 MB. Returns: totalPages, chunkCount, courses, validation, curriculumText

export const maxDuration = 60; // allow up to 60s for large PDF parsing

import { NextRequest, NextResponse } from "next/server";
import {
  extractPdfText,
  chunkPdfByPages,
  retrieveRelevantChunks,
  parseCurriculumTable,
  findCourseInChunks,
  buildCurriculumContext,
} from "@/lib/pdf-engine";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const CURRICULUM_QUERY =
  "소프트웨어학과 교육과정 전공필수 전공기초 전공선택 EO203 EO209 졸업학점";

/** Validation course codes to check post-extraction */
const VALIDATE_CODES = ["EO203", "EO209"];

export async function POST(req: NextRequest) {
  // ── 1. Parse multipart form data ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data 형식이 필요합니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }

  // ── 2. Size guard ─────────────────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `PDF 크기가 너무 큽니다. 최대 ${MAX_BYTES / 1024 / 1024}MB까지 허용됩니다.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(arrayBuffer);

  // ── 3. Extract text per-page ──────────────────────────────────────────────
  let extracted;
  try {
    extracted = await extractPdfText(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "PDF 파싱 오류";
    return NextResponse.json({ error: `PDF 텍스트 추출 실패: ${msg}` }, { status: 422 });
  }

  // ── 4. Chunk + Retrieve ───────────────────────────────────────────────────
  const chunks   = chunkPdfByPages(extracted, 10);
  const topChunks = retrieveRelevantChunks(chunks, CURRICULUM_QUERY, 5);

  // ── 5. Parse curriculum table ─────────────────────────────────────────────
  const courses = parseCurriculumTable(extracted.fullText);

  // ── 6. Validation ─────────────────────────────────────────────────────────
  const validation: Record<string, { found: boolean; pageRange?: string; context?: string }> = {};
  for (const code of VALIDATE_CODES) {
    validation[code] = findCourseInChunks(chunks, code);
  }

  // ── 7. Build LLM-ready curriculum context ─────────────────────────────────
  const universityId = (formData.get("universityId") as string | null) ?? undefined;
  const curriculumText = buildCurriculumContext(topChunks, courses, universityId);

  return NextResponse.json({
    totalPages:    extracted.totalPages,
    chunkCount:    chunks.length,
    courseCount:   courses.length,
    courses:       courses.slice(0, 100), // cap for response size
    validation,
    curriculumText,
  });
}
