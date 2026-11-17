import type { Row as GetLogbookItem } from './model';

export type BimbinganCategory = { id: number; label: string };
export type BimbinganCategorySummary = BimbinganCategory & {
  count: number;
  presentationCount: number;
  presentedCount: number;
};

export function isBimbinganOperasiAction(action: Record<string, unknown> | null | undefined) {
  return /bimbingan[-_\s]*operasi/.test(
    `${action?.identifier ?? ''} ${action?.name ?? ''}`.toLowerCase(),
  );
}

export function summarizeBimbinganOperasiCategories(
  categories: BimbinganCategory[],
  records: GetLogbookItem[],
): BimbinganCategorySummary[] {
  const counts = new Map<number, number>();
  const presentationCounts = new Map<number, number>();
  const presentedCounts = new Map<number, number>();
  const seen=new Set<string>();
  for (const record of records) {
    if(!Number.isSafeInteger(Number(record.id))||Number(record.id)<=0)continue;
    if(seen.has(String(record.id)))continue;seen.add(String(record.id));
    const id = Number(record.id_category ?? record.m_action_category?.id);
    if (!Number.isFinite(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (record.is_presentation === true) {
      presentationCounts.set(id, (presentationCounts.get(id) ?? 0) + 1);
      if (record.verified === true || record.verified_status === 'verified') {
        presentedCounts.set(id, (presentedCounts.get(id) ?? 0) + 1);
      }
    }
  }
  return categories
    .map(category => ({
      ...category,
      count: counts.get(category.id) ?? 0,
      presentationCount: presentationCounts.get(category.id) ?? 0,
      presentedCount: presentedCounts.get(category.id) ?? 0,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}