// PDF RAG Engine — text extraction, semantic chunking, curriculum parsing, retrieval
// Uses pdf-parse (dynamic import for Next.js App Router compatibility)
// Emergency Pivot: chunk-first RAG architecture; no raw full-text dump to LLM

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

// ─── Priority Page Ranges (경성대 편람 기준) ────────────────────────────────────
// These ranges receive boosted retrieval scores

const PRIORITY_PAGE_RANGES: Array<{ start: number; end: number; weight: number; label: string }> = [
  { start: 8,   end: 15,  weight: 3, label: "졸업학점_이수구조" },
  { start: 98,  end: 110, weight: 5, label: "소프트웨어학과_교육과정" },
  { start: 55,  end: 75,  weight: 2, label: "교양_편성표" },
];

function getPriorityScore(startPage: number, endPage: number): number {
  let score = 0;
  for (const range of PRIORITY_PAGE_RANGES) {
    // Overlap check
    if (startPage <= range.end && endPage >= range.start) {
      score = Math.max(score, range.weight);
    }
  }
  return score;
}

// ─── Topic Detection ──────────────────────────────────────────────────────────

const TOPIC_KEYWORD_MAP: Record<string, string[]> = {
  "학점이수구조":  ["학점이수", "졸업학점", "이수구조", "총학점", "이수기준"],
  "소프트웨어학과": ["소프트웨어학과", " EO", "QY", "교육과정", "전공기초", "전공선택"],
  "수강신청":     ["수강신청", "수강정정", "수강취소", "예비수강"],
  "졸업요건":     ["졸업요건", "졸업자격", "졸업학점", "졸업신청"],
  "교양편성":     ["교양필수", "교양선택", "교양편성", "자기관리", "디지털", "소통"],
  "전공필수":     ["전공필수", "EO203", "EO209", "전산수학", "리눅스"],
  "학과안내":     ["학과소개", "학과장", "교수진", "연락처"],
};

function detectTopics(text: string): string[] {
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORD_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.push(topic);
    }
  }
  return found;
}

// ─── Text Extraction ──────────────────────────────────────────────────────────

/**
 * Extracts text from a PDF buffer, returning per-page data.
 * Uses pdf-parse with pagerender callback for accurate per-page extraction.
 */
type PdfParseResult = { text: string; numpages: number };
type PdfParseOptions = { pagerender?: (pageData: unknown) => Promise<string> };
type PdfParseFn = (buffer: Buffer, options?: PdfParseOptions) => Promise<PdfParseResult>;

export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdf> {
  // Dynamic require avoids Next.js SSR build issues with pdf-parse
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as PdfParseFn;

  const pages: PageData[] = [];

  const options: PdfParseOptions = {
    // pagerender is called once per page during parsing
    pagerender: async (pageData: unknown) => {
      const pd = pageData as { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string }> }> };
      try {
        const content = await pd.getTextContent();
        const text = content.items.map((item) => item.str).join(" ").trim();
        pages.push({ pageNum: pd.pageIndex + 1, text });
      } catch {
        pages.push({ pageNum: pd.pageIndex + 1, text: "" });
      }
      return "";
    },
  };

  const result = await pdfParse(buffer, options);

  // pdf-parse's pagerender may not fire on all versions; fallback to splitting result.text
  if (pages.length === 0 && result.text) {
    const rawPages = result.text.split(/\f/).filter(Boolean);
    rawPages.forEach((t: string, i: number) => pages.push({ pageNum: i + 1, text: t.trim() }));
  }

  // Ensure pages are sorted by pageNum
  pages.sort((a, b) => a.pageNum - b.pageNum);

  return {
    pages,
    totalPages: result.numpages ?? pages.length,
    fullText: result.text ?? pages.map((p) => p.text).join("\n"),
  };
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Groups pages into fixed-size chunks with topic labels and priority scores.
 * Chunk size of 10 pages balances context richness vs LLM token cost.
 */
export function chunkPdfByPages(extracted: ExtractedPdf, chunkSize = 10): PdfChunk[] {
  const { pages } = extracted;
  const chunks: PdfChunk[] = [];

  for (let i = 0; i < pages.length; i += chunkSize) {
    const slice = pages.slice(i, i + chunkSize);
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

/** Simple TF-based keyword score (no embeddings required) */
function tfScore(text: string, query: string): number {
  const queryTerms = query.split(/\s+/).filter(Boolean);
  const textLower  = text.toLowerCase();
  return queryTerms.reduce((sum, term) => {
    const regex  = new RegExp(term.toLowerCase(), "g");
    const hits   = (textLower.match(regex) ?? []).length;
    return sum + hits;
  }, 0);
}

/**
 * Retrieves the top-K most relevant chunks for a given query.
 * Score = TF keyword score + priority page boost × 10.
 */
export function retrieveRelevantChunks(
  chunks: PdfChunk[],
  query: string,
  topK = 3
): PdfChunk[] {
  const scored = chunks.map((chunk) => ({
    chunk,
    score: tfScore(chunk.text, query) + chunk.priorityScore * 10,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

// ─── Curriculum Table Parser ──────────────────────────────────────────────────

const COURSE_REGEX =
  /\b([A-Z]{2,3}\d{3,4}[A-Z]?)\s+([\uAC00-\uD7A3A-Za-z0-9 &()·]+?)\s+(\d)\s+(전공필수|전공선택|전공기초|교양필수|교양선택|공통필수|공통선택)/g;

/**
 * Parses structured course rows from free text using curriculum table regex.
 * Targets patterns like: "EO203 전산수학 3 전공기초"
 */
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
      rows.push({
        code:     code.trim(),
        name:     name.trim(),
        credits:  parseInt(creditsStr, 10),
        category: category.trim(),
      });
    }
  }

  return rows;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Searches chunks for a specific course code and returns validation metadata.
 * Used to confirm EO203/EO209 were correctly read from the PDF.
 */
export function findCourseInChunks(
  chunks: PdfChunk[],
  courseCode: string
): ValidationResult {
  for (const chunk of chunks) {
    const idx = chunk.text.indexOf(courseCode);
    if (idx !== -1) {
      const contextStart = Math.max(0, idx - 40);
      const contextEnd   = Math.min(chunk.text.length, idx + 80);
      return {
        found:     true,
        pageRange: `${chunk.startPage}-${chunk.endPage}페이지`,
        context:   chunk.text.slice(contextStart, contextEnd).replace(/\s+/g, " ").trim(),
      };
    }
  }
  return { found: false };
}

// ─── LLM Context Builder ──────────────────────────────────────────────────────

/**
 * Builds a concise, LLM-ready curriculum context string from top chunks + parsed courses.
 * Injected as `timetableInfo` in the study plan prompt.
 */
export function buildCurriculumContext(
  chunks: PdfChunk[],
  courses: CourseRow[],
  universityId?: string
): string {
  const header = universityId
    ? `[${universityId} PDF 편람 분석 결과]`
    : "[PDF 편람 분석 결과]";

  const courseLines = courses.length > 0
    ? courses
        .slice(0, 60) // guard against token overflow
        .map((c) => `  ${c.code} ${c.name} ${c.credits}학점 (${c.category})`)
        .join("\n")
    : "  (구조적 파싱 결과 없음 — 청크 텍스트 직접 참조)";

  const chunkTexts = chunks
    .map((c) => `[${c.startPage}-${c.endPage}페이지]\n${c.text.slice(0, 800)}`)
    .join("\n\n---\n\n");

  return [
    header,
    "",
    "## 추출된 교과목 목록",
    courseLines,
    "",
    "## 관련 편람 내용 (상위 청크)",
    chunkTexts,
  ].join("\n");
}
