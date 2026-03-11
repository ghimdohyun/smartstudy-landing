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

/** Timeout (ms) before aborting a single html2canvas capture */
const HTML2CANVAS_TIMEOUT_MS = 20_000;

/**
 * Capture an HTMLElement to a canvas.
 * Fixes for transparency / blank output:
 *   - backgroundColor "#ffffff" enforced
 *   - allowTaint:true prevents tainted-canvas errors from local blobs
 *   - windowWidth matches document scroll width (prevents layout shift)
 *   - foreignObjectRendering:false avoids webkit blank-frame bug
 *   - scrollX/scrollY=0 anchors capture at document origin
 */
async function captureElement(
  el: HTMLElement,
  html2canvas: (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>,
): Promise<HTMLCanvasElement | null> {
  // Force element to be visible and measurable before capturing
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    console.warn("[captureElement] Element has zero dimensions — skipping");
    return null;
  }

  // Wait for all layout/text/font rendering to settle before capture.
  // This prevents the blank-page issue caused by capturing mid-paint.
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
          // Explicitly set both background shorthand and backgroundColor
          // to prevent any transparent pixel leak in the cloned DOM
          clonedDoc.body.style.background = "#ffffff";
          clonedDoc.body.style.backgroundColor = "white";
          clonedDoc.documentElement.style.background = "#ffffff";
          clonedDoc.documentElement.style.backgroundColor = "white";
          clonedDoc.documentElement.classList.remove("dark");
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("html2canvas timeout")),
          HTML2CANVAS_TIMEOUT_MS,
        )
      ),
    ]);
  } catch (err) {
    console.warn("[captureElement] Capture failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── PDF Export (html2canvas + jsPDF) ─────────────────────────────────────────

/**
 * Capture each provided HTMLElement with html2canvas, then compose into a
 * single multi-page A4 PDF using jsPDF. White background enforced for dark-mode.
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

  const A4_W = 210; // mm
  const A4_H = 297; // mm
  const MARGIN = 10; // mm

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let firstPage = true;

  for (const el of elements) {
    const canvas = await captureElement(el, html2canvas as unknown as (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>);
    if (!canvas) continue;

    const usableW = A4_W - MARGIN * 2;
    const usableH = A4_H - MARGIN * 2;

    const widthRatio = usableW / canvas.width;
    const scaledH = canvas.height * widthRatio;

    if (scaledH <= usableH) {
      const imgData = canvas.toDataURL("image/jpeg", 0.88);
      if (!firstPage) doc.addPage();
      doc.addImage(imgData, "JPEG", MARGIN, MARGIN, usableW, scaledH);
      firstPage = false;
    } else {
      const segCanvasH = Math.floor(usableH / widthRatio);
      const totalSegments = Math.ceil(canvas.height / segCanvasH);

      for (let seg = 0; seg < totalSegments; seg++) {
        const srcY = seg * segCanvasH;
        const srcH = Math.min(segCanvasH, canvas.height - srcY);

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = srcH;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        }
        const segData = tempCanvas.toDataURL("image/jpeg", 0.88);
        const segImgH = srcH * widthRatio;

        if (!firstPage || seg > 0) doc.addPage();
        doc.addImage(segData, "JPEG", MARGIN, MARGIN, usableW, segImgH);
        firstPage = false;
      }
    }
  }

  doc.save(filename);
}

// ─── PNG Export (html2canvas → image/png download) ────────────────────────────

/**
 * Capture a single HTMLElement to a PNG file and trigger browser download.
 * Uses the same captureElement helper as PDF export for consistent rendering.
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
  if (!canvas) {
    console.warn("[downloadPng] Capture returned null — aborting");
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
