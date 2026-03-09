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
 * Capture each HTMLElement with html2canvas (scale=2, white bg) then compose into
 * an A4 multi-page PDF. Tall elements are sliced across pages so text is never
 * shrunk to illegibility.
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
  const USABLE_W = A4_W - MARGIN * 2; // 190 mm
  const USABLE_H = A4_H - MARGIN * 2; // 277 mm

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let firstPage = true;

  for (const el of elements) {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    // Pixels per mm when the canvas is fitted to usable page width
    const pxPerMm = canvas.width / USABLE_W;
    // How many canvas-px fit in one A4 page height
    const sliceHeightPx = Math.floor(USABLE_H * pxPerMm);
    const pageCount = Math.ceil(canvas.height / sliceHeightPx);

    for (let page = 0; page < pageCount; page++) {
      const srcY = page * sliceHeightPx;
      const srcH = Math.min(sliceHeightPx, canvas.height - srcY);

      // Create an off-screen canvas for this slice
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = srcH;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const sliceData = slice.toDataURL("image/png");
      const sliceH = srcH / pxPerMm; // mm height of this slice

      if (!firstPage) doc.addPage();
      doc.addImage(sliceData, "PNG", MARGIN, MARGIN, USABLE_W, sliceH);
      firstPage = false;
    }
  }

  doc.save(filename);
}
