// PDF RAG Engine — text extraction (pdf2json), semantic chunking, curriculum parsing, retrieval
// Uses pdf2json (Node.js native, no browser APIs — fixes DOMMatrix is not defined from pdfjs)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageData {
  pageNum: number;
  text: string;
}

export interface PdfChunk {
  chunkIndex: number;
  startPage: number;
  endPage: number;
  text: string;
  topics: string[];
  /** Priority boost score (higher = more relevant to curriculum) */
  priorityScore: number;
}

export interface ExtractedPdf {
  pages: PageData[];
  totalPages: number;
  fullText: string;
}

export interface CourseRow {
  code: string;
  name: string;
  credits: number;
  category: string;
  year?: string;
  semester?: string;
}

export interface ValidationResult {
  found: boolean;
  pageRange?: string;
  context?: string;
}

// ─── pdf2json internal types ──────────────────────────────────────────────────

interface PDF2JsonTextRun  { T: string }               // URL-encoded text fragment
interface PDF2JsonText     { x: number; y: number; R: PDF2JsonTextRun[] }
interface PDF2JsonPage     { Texts: PDF2JsonText[] }
interface PDF2JsonData     { Pages: PDF2JsonPage[] }

// ─── Priority Page Ranges (경성대 편람 기준) ────────────────────────────────────

const PRIORITY_PAGE_RANGES: Array<{ start: number; end: number; weight: number }> = [
  { start: 8,   end: 15,  weight: 3 },   // 졸업학점 이수구조
  { start: 98,  end: 110, weight: 5 },   // 소프트웨어학과 교육과정 ← 102페이지
  { start: 55,  end: 75,  weight: 2 },   // 교양 편성표
];

function getPriorityScore(start: number, end: number): number {
  let score = 0;
  for (const r of PRIORITY_PAGE_RANGES) {
    if (start <= r.end && end >= r.start) score = Math.max(score, r.weight);
  }
  return score;
}

// ─── Topic Detection ──────────────────────────────────────────────────────────

const TOPIC_KEYWORD_MAP: Record<string, string[]> = {
  "학점이수구조":   ["학점이수", "졸업학점", "이수구조", "총학점"],
  "소프트웨어학과": ["소프트웨어학과", " EO", "QY", "교육과정", "전공기초", "전공선택"],
  "수강신청":      ["수강신청", "수강정정", "수강취소"],
  "졸업요건":      ["졸업요건", "졸업자격", "졸업학점", "졸업신청"],
  "교양편성":      ["교양필수", "교양선택", "교양편성", "자기관리", "디지털", "소통"],
  "전공필수":      ["전공필수", "EO203", "EO209", "전산수학", "리눅스"],
};

function detectTopics(text: string): string[] {
  return Object.entries(TOPIC_KEYWORD_MAP)
    .filter(([, kws]) => kws.some((kw) => text.includes(kw)))
    .map(([topic]) => topic);
}

// ─── Text Cleaning (strip pdf2json noise, compress whitespace) ────────────────

/**
 * Remove pdf2json encoding artefacts and collapse whitespace.
 * Reduces raw page text weight by ~30-50% without losing curriculum keywords.
 */
function cleanPageText(raw: string): string {
  return raw
    .replace(/%[0-9A-Fa-f]{2}/g, "")   // residual URL-encoded bytes
    .replace(/[^\uAC00-\uD7A3A-Za-z0-9\s()·&,.\-:]/g, " ") // non-curriculum chars → space
    .replace(/\s{2,}/g, " ")            // collapse runs of whitespace
    .trim();
}

// ─── Text Extraction (pdf2json — no browser API deps) ─────────────────────────

function decodePdfText(encoded: string): string {
  try { return decodeURIComponent(encoded); } catch { return encoded; }
}

/**
 * Extracts per-page text from a PDF buffer using pdf2json.
 * pdf2json is pure Node.js and does NOT use pdfjs-dist/canvas/DOMMatrix.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdf> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFParser = require("pdf2json") as new () => {
    on(event: "pdfParser_dataReady", cb: (data: PDF2JsonData) => void): void;
    on(event: "pdfParser_dataError", cb: (e: { parserError: Error | string }) => void): void;
    parseBuffer(buf: Buffer): void;
  };

  const pdfData = await new Promise<PDF2JsonData>((resolve, reject) => {
    const parser = new PDFParser();
    parser.on("pdfParser_dataError", (e) => {
      reject(new Error(typeof e.parserError === "string" ? e.parserError : e.parserError?.message ?? "PDF 파싱 실패"));
    });
    parser.on("pdfParser_dataReady", resolve);
    parser.parseBuffer(buffer);
  });

  const pages: PageData[] = pdfData.Pages.map((page, i) => {
    // Sort by y (row) then x (column) to preserve reading order
    const sorted = [...page.Texts].sort((a, b) => a.y - b.y || a.x - b.x);
    const raw = sorted
      .map((t) => t.R.map((r) => decodePdfText(r.T)).join(""))
      .join(" ");
    const text = cleanPageText(raw); // strip noise, compress whitespace
    return { pageNum: i + 1, text };
  });

  const fullText = pages.map((p) => p.text).join("\n");

  return { pages, totalPages: pages.length, fullText };
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

export function chunkPdfByPages(extracted: ExtractedPdf, chunkSize = 10): PdfChunk[] {
  const { pages } = extracted;
  const chunks: PdfChunk[] = [];

  for (let i = 0; i < pages.length; i += chunkSize) {
    const slice     = pages.slice(i, i + chunkSize);
    const startPage = slice[0].pageNum;
    const endPage   = slice[slice.length - 1].pageNum;
    const text      = slice.map((p) => p.text).join("\n");

    chunks.push({
      chunkIndex:    Math.floor(i / chunkSize),
      startPage,
      endPage,
      text,
      topics:        detectTopics(text),
      priorityScore: getPriorityScore(startPage, endPage),
    });
  }

  return chunks;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

function tfScore(text: string, query: string): number {
  const terms = query.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  return terms.reduce((sum, t) => {
    const hits = (lower.match(new RegExp(t.toLowerCase(), "g")) ?? []).length;
    return sum + hits;
  }, 0);
}

export function retrieveRelevantChunks(chunks: PdfChunk[], query: string, topK = 3): PdfChunk[] {
  return [...chunks]
    .map((c) => ({ c, score: tfScore(c.text, query) + c.priorityScore * 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.c);
}

// ─── Curriculum Table Parser ──────────────────────────────────────────────────

const COURSE_REGEX =
  /\b([A-Z]{2,3}\d{3,4}[A-Z]?)\s+([\uAC00-\uD7A3A-Za-z0-9 &()·]+?)\s+(\d)\s+(전공필수|전공선택|전공기초|교양필수|교양선택|공통필수|공통선택)/g;

export function parseCurriculumTable(text: string): CourseRow[] {
  const rows: CourseRow[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  COURSE_REGEX.lastIndex = 0;

  while ((match = COURSE_REGEX.exec(text)) !== null) {
    const [, code, name, creditsStr, category] = match;
    const key = `${code}-${name.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push({ code: code.trim(), name: name.trim(), credits: parseInt(creditsStr, 10), category: category.trim() });
    }
  }
  return rows;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function findCourseInChunks(chunks: PdfChunk[], courseCode: string): ValidationResult {
  for (const chunk of chunks) {
    const idx = chunk.text.indexOf(courseCode);
    if (idx !== -1) {
      const ctx = chunk.text.slice(Math.max(0, idx - 40), Math.min(chunk.text.length, idx + 80));
      return { found: true, pageRange: `${chunk.startPage}-${chunk.endPage}페이지`, context: ctx.replace(/\s+/g, " ").trim() };
    }
  }
  return { found: false };
}

// ─── Curriculum Line Slicer (Noise Reduction) ────────────────────────────────
//
// Keeps only lines likely to be curriculum data: course codes, 이수구분 labels,
// 학점/강의 columns. Drops 학칙, 인사말, 공지사항, 대학 소개 boilerplate.

const CURRICULUM_LINE_KEYWORDS = [
  "교과목명", "학수번호", "이수구분", "학점", "강의", "실습",
  "전공필수", "전공선택", "전공기초", "전공심화",
  "교양필수", "교양선택", "공통필수", "공통선택",
  "이수학점", "졸업학점", "졸업요건", "이수구조",
  "전산수학", "리눅스", "소프트웨어", " EO", " QY",
];

const COURSE_CODE_RE = /\b[A-Z]{2,3}\d{3,4}[A-Z]?\b/;

/**
 * Filter text to only curriculum-relevant lines — reduces noise fed to the AI.
 */
export function sliceCurriculumLines(text: string): string {
  return text
    .split(/[\n\r]+/)
    .filter((line) => {
      const t = line.trim();
      if (t.length < 4) return false;
      return CURRICULUM_LINE_KEYWORDS.some((kw) => t.includes(kw)) || COURSE_CODE_RE.test(t);
    })
    .join("\n");
}

// ─── LLM Context Builder ──────────────────────────────────────────────────────

export function buildCurriculumContext(chunks: PdfChunk[], courses: CourseRow[], universityId?: string): string {
  const header    = universityId ? `[${universityId} PDF 편람 분석 결과]` : "[PDF 편람 분석 결과]";
  const courseLines = courses.length > 0
    ? courses.slice(0, 60).map((c) => `  ${c.code} ${c.name} ${c.credits}학점 (${c.category})`).join("\n")
    : "  (구조적 파싱 결과 없음 — 청크 텍스트 직접 참조)";

  // Apply noise-reduction slicing before sending chunk text to AI
  const chunkTexts = chunks
    .map((c) => {
      const filtered = sliceCurriculumLines(c.text);
      // Use filtered if substantial; fallback to raw truncation
      const display  = filtered.length > 80 ? filtered.slice(0, 900) : c.text.slice(0, 800);
      return `[${c.startPage}-${c.endPage}페이지]\n${display}`;
    })
    .join("\n\n---\n\n");

  return [header, "", "## 추출된 교과목 목록", courseLines, "", "## 관련 편람 내용 (노이즈 필터 적용)", chunkTexts].join("\n");
}
