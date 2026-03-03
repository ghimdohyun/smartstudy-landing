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

// ── Safety limits ─────────────────────────────────────────────────────────────
const MAX_TEXT_BYTES = 1 * 1024 * 1024; // 1 MB hard cap (tightened from 2 MB)
const MAX_PAGES      = 300;             // Sanity: reject unreasonably large page arrays

const CURRICULUM_QUERY =
  "소프트웨어학과 교육과정 전공필수 전공기초 전공선택 EO203 EO209 졸업학점";

const VALIDATE_CODES = ["EO203", "EO209"];

interface PageEntry { pageNum: number; text: string }

/**
 * Server-side whitelist sanitizer (defence-in-depth after client sanitize).
 * Keeps only: printable ASCII + Korean Hangul + whitespace.
 */
function serverSanitize(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw
    .replace(/[^\x20-\x7E\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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

  // ── 2. Sanity: page count cap ─────────────────────────────────────────────
  if (pageTexts.length > MAX_PAGES) {
    return NextResponse.json(
      { error: `페이지 수가 너무 많습니다 (최대 ${MAX_PAGES}). 커리큘럼 페이지만 선별해 주세요.` },
      { status: 413 },
    );
  }

  // ── 3. Server-level sanitize each page text (second-pass defence) ─────────
  const sanitizedPages: PageEntry[] = pageTexts.map((p) => ({
    pageNum: typeof p.pageNum === "number" ? p.pageNum : 0,
    text:    serverSanitize(String(p.text ?? "")),
  }));

  // ── 4. Text payload size guard (measured AFTER sanitize) ──────────────────
  const textBytes = Buffer.byteLength(JSON.stringify(sanitizedPages), "utf8");
  if (textBytes > MAX_TEXT_BYTES) {
    return NextResponse.json(
      {
        error:
          "추출된 텍스트가 너무 큽니다 (1MB 초과). " +
          "커리큘럼 페이지(전공·교양 편성표 구간)만 선별하여 올려주세요.",
      },
      { status: 413 },
    );
  }

  // ── 5. Build ExtractedPdf + process — wrapped for graceful fallback ────────
  try {
    const extracted: ExtractedPdf = {
      pages:      sanitizedPages.map((p) => ({ pageNum: p.pageNum, text: p.text })),
      totalPages: totalPages ?? sanitizedPages.length,
      fullText:   sanitizedPages.map((p) => p.text).join("\n"),
    };

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

    // ── 6. Chunk + Retrieve ─────────────────────────────────────────────────
    const chunks    = chunkPdfByPages(extracted, 10);
    const topChunks = retrieveRelevantChunks(chunks, CURRICULUM_QUERY, 5);

    // ── 7. Parse curriculum table ───────────────────────────────────────────
    const courses = parseCurriculumTable(extracted.fullText);

    // ── 8. Validation ───────────────────────────────────────────────────────
    const validation: Record<string, { found: boolean; pageRange?: string; context?: string }> = {};
    for (const code of VALIDATE_CODES) {
      validation[code] = findCourseInChunks(chunks, code);
    }

    // ── 9. Build LLM-ready curriculum context ───────────────────────────────
    const curriculumText = buildCurriculumContext(topChunks, courses, universityId);

    return NextResponse.json({
      totalPages:    extracted.totalPages,
      chunkCount:    chunks.length,
      courseCount:   courses.length,
      courses:       courses.slice(0, 100),
      validation,
      curriculumText,
    });

  } catch (processError: unknown) {
    // Graceful fallback — never crash the client
    const msg = processError instanceof Error ? processError.message : "처리 오류";
    console.error("[pdf-extract] processing error:", msg);
    return NextResponse.json(
      { error: `PDF 분석 중 오류가 발생했습니다: ${msg}. 텍스트를 직접 입력해 주세요.` },
      { status: 500 },
    );
  }
}
