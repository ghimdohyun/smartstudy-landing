// PDF extraction endpoint — JSON POST (base64), returns structured curriculum data
// Switched from multipart FormData to JSON+base64 to bypass Next.js multipart body parser limits.
// req.json() respects experimental.serverActions.bodySizeLimit (20mb in next.config.ts).

export const maxDuration = 60; // allow up to 60s for large PDF parsing
export const runtime = "nodejs"; // explicit Node.js runtime (no Edge body size limits)

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

const VALIDATE_CODES = ["EO203", "EO209"];

export async function POST(req: NextRequest) {
  // ── 1. Parse JSON body (base64 file) ──────────────────────────────────────
  // FormData multipart is NOT used — Next.js internal multipart parser ignores
  // experimental.serverActions.bodySizeLimit and uses a lower internal limit,
  // causing 413 even for small files. JSON bodies respect bodySizeLimit correctly.
  let body: { fileBase64?: string; universityId?: string };
  try {
    body = await req.json() as { fileBase64?: string; universityId?: string };
  } catch {
    return NextResponse.json({ error: "JSON 형식이 필요합니다. (fileBase64 필드)" }, { status: 400 });
  }

  const { fileBase64, universityId } = body;

  if (!fileBase64 || typeof fileBase64 !== "string") {
    return NextResponse.json({ error: "fileBase64 필드가 필요합니다." }, { status: 400 });
  }

  // ── 2. Decode base64 → Buffer ─────────────────────────────────────────────
  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    return NextResponse.json({ error: "base64 디코딩 실패. 올바른 PDF 파일인지 확인하세요." }, { status: 400 });
  }

  // ── 3. Size guard (post-decode check on actual bytes) ─────────────────────
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `PDF 크기가 너무 큽니다. 최대 ${MAX_BYTES / 1024 / 1024}MB까지 허용됩니다.` },
      { status: 413 }
    );
  }

  // ── 4. Extract text per-page ──────────────────────────────────────────────
  let extracted;
  try {
    extracted = await extractPdfText(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "PDF 파싱 오류";
    return NextResponse.json({ error: `PDF 텍스트 추출 실패: ${msg}` }, { status: 422 });
  }

  // ── 5. Chunk + Retrieve ───────────────────────────────────────────────────
  const chunks    = chunkPdfByPages(extracted, 10);
  const topChunks = retrieveRelevantChunks(chunks, CURRICULUM_QUERY, 5);

  // ── 6. Parse curriculum table ─────────────────────────────────────────────
  const courses = parseCurriculumTable(extracted.fullText);

  // ── 7. Validation ─────────────────────────────────────────────────────────
  const validation: Record<string, { found: boolean; pageRange?: string; context?: string }> = {};
  for (const code of VALIDATE_CODES) {
    validation[code] = findCourseInChunks(chunks, code);
  }

  // ── 8. Build LLM-ready curriculum context ─────────────────────────────────
  const curriculumText = buildCurriculumContext(topChunks, courses, universityId);

  return NextResponse.json({
    totalPages:    extracted.totalPages,
    chunkCount:    chunks.length,
    courseCount:   courses.length,
    courses:       courses.slice(0, 100),
    validation,
    curriculumText,
  });
}
