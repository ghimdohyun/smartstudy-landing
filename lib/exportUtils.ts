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

// ─── PDF Export (html2canvas + jsPDF) ─────────────────────────────────────────

/**
 * Capture each provided HTMLElement with html2canvas (scale=2 for retina), then
 * compose them into a single multi-page A4 PDF using jsPDF.
 * Each element gets its own page. White background is enforced for dark-mode safety.
 */
/** Timeout (ms) before aborting a single html2canvas capture */
const HTML2CANVAS_TIMEOUT_MS = 20_000;

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
    // ── AbortSignal + timeout race — prevents infinite hang ──────────────
    let canvas: HTMLCanvasElement;
    try {
      canvas = await Promise.race([
        html2canvas(el, {
          scale: 1.5,           // ↓ from 2: faster render, lower memory
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          imageTimeout: 8_000, // abort stuck cross-origin image loads
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("html2canvas timeout")),
            HTML2CANVAS_TIMEOUT_MS,
          )
        ),
      ]);
    } catch (err) {
      console.warn("[downloadAllPdf] element capture skipped:", err instanceof Error ? err.message : err);
      continue; // skip this element — don't block rest of PDF
    }

    const usableW = A4_W - MARGIN * 2;
    const usableH = A4_H - MARGIN * 2;

    // Scale to fit width first, then check if height overflows
    const widthRatio = usableW / canvas.width;
    const scaledH = canvas.height * widthRatio; // total rendered height in mm

    if (scaledH <= usableH) {
      // Fits in a single page — JPEG stream: ~3× smaller than PNG, instant encode
      const imgData = canvas.toDataURL("image/jpeg", 0.88);
      if (!firstPage) doc.addPage();
      doc.addImage(imgData, "JPEG", MARGIN, MARGIN, usableW, scaledH);
      firstPage = false;
    } else {
      // Auto page-split: slice canvas into A4-sized segments
      // Each segment covers `segCanvasH` pixels of canvas height
      const segCanvasH = Math.floor(usableH / widthRatio); // px per A4 page
      const totalSegments = Math.ceil(canvas.height / segCanvasH);

      for (let seg = 0; seg < totalSegments; seg++) {
        const srcY = seg * segCanvasH;
        const srcH = Math.min(segCanvasH, canvas.height - srcY);

        // Crop canvas segment into a temporary canvas
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = srcH;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        }
        // JPEG streaming — avoids base64 bloat that stalls large multi-page PDFs
        const segData = tempCanvas.toDataURL("image/jpeg", 0.88);
        const segImgH = srcH * widthRatio; // actual mm height of this segment

        if (!firstPage || seg > 0) doc.addPage();
        doc.addImage(segData, "JPEG", MARGIN, MARGIN, usableW, segImgH);
        firstPage = false;
      }
    }
  }

  doc.save(filename);
}
