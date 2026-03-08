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
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const usableW = A4_W - MARGIN * 2;
    const usableH = A4_H - MARGIN * 2;

    // Scale canvas to fit within usable area (maintain aspect ratio)
    const ratio = canvas.width / canvas.height;
    let imgW = usableW;
    let imgH = usableW / ratio;
    if (imgH > usableH) {
      imgH = usableH;
      imgW = usableH * ratio;
    }

    if (!firstPage) doc.addPage();
    doc.addImage(imgData, "PNG", MARGIN, MARGIN, imgW, imgH);
    firstPage = false;
  }

  doc.save(filename);
}
