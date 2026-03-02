// Utilities for JSON and CSV export of study plan data

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
