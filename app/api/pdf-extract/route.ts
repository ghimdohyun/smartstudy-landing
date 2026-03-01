// PDF extract endpoint — receives PRE-EXTRACTED page texts from the browser (pdfjs-dist client-side).
// The client runs pdfjs in the browser, filters curriculum pages, and sends only the text.
// This eliminates the 413 problem entirely: no binary PDF upload, just small JSON text payload.

export const maxDuration = 60;
export const runtime    = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  chunkPdfByPages,
  retrieveRelevantChunks,
  parseCurriculumTable,
  findCourseInChunks,
  buildCurriculumContext,
} from "@/lib/pdf-engine";
import type { ExtractedPdf } from "@/lib/pdf-engine";

// Max size of incoming JSON text payload (the text is already tiny compared to the PDF)
const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2 MB text max (a 200-page handbook = ~500 KB text)

const CURRICULUM_QUERY =
  "소프트웨어학과 교육과정 전공필수 전공기초 전공선택 EO203 EO209 졸업학점";

const VALIDATE_CODES = ["EO203", "EO209"];

interface PageEntry { pageNum: number; text: string }

export async function POST(req: NextRequest) {
  // ── 1. Parse JSON body (pre-extracted text from browser pdfjs) ─────────────
  let body: { pageTexts?: PageEntry[]; totalPages?: number; universityId?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON 형식이 필요합니다." }, { status: 400 });
  }

  const { pageTexts, totalPages, universityId } = body;

  if (!Array.isArray(pageTexts) || pageTexts.length === 0) {
    return NextResponse.json(
      { error: "pageTexts 배열이 필요합니다. 클라이언트에서 PDF 텍스트를 추출한 후 전송하세요." },
      { status: 400 },
    );
  }

  // ── 2. Text payload size guard ─────────────────────────────────────────────
  const textBytes = Buffer.byteLength(JSON.stringify(pageTexts), "utf8");
  if (textBytes > MAX_TEXT_BYTES) {
    return NextResponse.json(
      {
        error:
          "추출된 텍스트가 너무 큽니다. " +
          "소프트웨어학과 교육과정 페이지(예: 98-115페이지)만 선별하여 올려주세요.",
      },
      { status: 413 },
    );
  }

  // ── 3. Build ExtractedPdf from client-supplied page texts ─────────────────
  // No pdf2json needed — the browser already did the extraction.
  const extracted: ExtractedPdf = {
    pages:      pageTexts.map((p) => ({ pageNum: p.pageNum, text: p.text })),
    totalPages: totalPages ?? pageTexts.length,
    fullText:   pageTexts.map((p) => p.text).join("\n"),
  };

  // ── 4. Guard: empty / unrecognised text ───────────────────────────────────
  if (extracted.fullText.trim().length < 50) {
    return NextResponse.json(
      {
        error:
          "PDF에서 텍스트를 추출할 수 없습니다. " +
          "스캔된 이미지 PDF이거나 텍스트 레이어가 없는 파일입니다.",
      },
      { status: 422 },
    );
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
