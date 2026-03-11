// Utilities for JSON, CSV, and PDF export of study plan data

import type { StudyPlan, StudyPlanResult } from '@/types';

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function planToCsvRows(plan: StudyPlan): string[] {
  const rows: string[] = [];
  const safeLabel = plan.label ?? '';
  rows.push(`"${safeLabel}","전략","${plan.strategy ?? ''}","","","",""`);
  for (const course of plan.courses ?? []) {
    rows.push(
      `"${safeLabel}","과목","${course.name}","${course.credits ?? ''}","${course.day ?? ''}","${course.time ?? ''}","${course.note ?? ''}"`
    );
  }
  return rows;
}

export function downloadCSV(result: StudyPlanResult, filename: string): void {
  const header = ['플랜', '항목', '내용', '학점', '요일', '시간', '비고'];
  const rows: string[] = [header.join(',')];

  for (const plan of result.plans ?? []) {
    rows.push(...planToCsvRows(plan));
  }

  const csv = rows.join('\n');
  // BOM for Excel UTF-8 recognition
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── html2canvas capture helper ───────────────────────────────────────────────

const HTML2CANVAS_TIMEOUT_MS = 20_000;

/**
 * Capture an HTMLElement to a canvas with transparency / blank-output fixes:
 *   - backgroundColor "#ffffff" enforced (dark-mode safe)
 *   - allowTaint:true prevents tainted-canvas errors from local blobs
 *   - foreignObjectRendering:false avoids webkit blank-frame bug
 *   - windowWidth/Height matches document dimensions (prevents layout shift)
 *   - onclone strips dark-mode class so Tailwind light theme is used
 */
async function captureElement(
  el: HTMLElement,
  html2canvas: (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>,
): Promise<HTMLCanvasElement | null> {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    console.warn("[captureElement] Element has zero dimensions — skipping");
    return null;
  }
  // Wait for layout/font rendering to settle before capture
  await new Promise((r) => setTimeout(r, 1500));
  try {
    return await Promise.race([
      html2canvas(el, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        imageTimeout: 8_000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        onclone: (clonedDoc: Document) => {
          clonedDoc.body.style.background = "#ffffff";
          clonedDoc.body.style.backgroundColor = "white";
          clonedDoc.documentElement.style.background = "#ffffff";
          clonedDoc.documentElement.style.backgroundColor = "white";
          clonedDoc.documentElement.classList.remove("dark");
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("html2canvas timeout")), HTML2CANVAS_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn("[captureElement] Capture failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── PDF Export (html2canvas + jsPDF) ─────────────────────────────────────────

/**
 * Capture each HTMLElement with html2canvas, compose into a single multi-page
 * A4 PDF using jsPDF. White background enforced for dark-mode safety.
 */
export async function downloadAllPdf(
  elements: HTMLElement[],
  filename = "smartstudy-plan.pdf",
): Promise<void> {
  if (elements.length === 0) return;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const A4_W = 210;   // mm
  const A4_H = 297;   // mm
  const MARGIN = 10;  // mm
  const USABLE_W = A4_W - MARGIN * 2;
  const USABLE_H = A4_H - MARGIN * 2;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let firstPage = true;

  for (const el of elements) {
    const canvas = await captureElement(el, html2canvas as unknown as (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>);
    if (!canvas) continue;

    const pxPerMm = canvas.width / USABLE_W;
    const sliceHeightPx = Math.floor(USABLE_H * pxPerMm);
    const pageCount = Math.ceil(canvas.height / sliceHeightPx);

    for (let page = 0; page < pageCount; page++) {
      const srcY = page * sliceHeightPx;
      const srcH = Math.min(sliceHeightPx, canvas.height - srcY);

      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = srcH;
      const ctx = slice.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
      }

      const sliceData = slice.toDataURL("image/jpeg", 0.88);
      const sliceH = srcH / pxPerMm;

      if (!firstPage) doc.addPage();
      doc.addImage(sliceData, "JPEG", MARGIN, MARGIN, USABLE_W, sliceH);
      firstPage = false;
    }
  }

  doc.save(filename);
}

// ─── PNG Export ────────────────────────────────────────────────────────────────

/**
 * Capture a single HTMLElement to a PNG and trigger browser download.
 */
export async function downloadPng(
  element: HTMLElement,
  filename = "smartstudy-plan.png",
): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await captureElement(
    element,
    html2canvas as unknown as (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>,
  );
  if (!canvas) return;
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
