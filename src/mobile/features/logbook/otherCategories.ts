import {
  enabled,
  getDynamicCategories,
  type DynamicLogbookAction,
} from "./dynamicLogbookForm";
import type { CategoryAggregate } from "./categoryAggregates";
export type CategoryGroup = number | "other";
export function otherCategoryIds(action: DynamicLogbookAction): Set<number> {
  return new Set(
    getDynamicCategories(action)
      .filter((c) => c.is_other)
      .map((c) => c.id),
  );
}
export function groupedCategoryCards(
  action: DynamicLogbookAction,
  counts: CategoryAggregate[],
): Array<Omit<CategoryAggregate, "id"> & { id: CategoryGroup }> {
  const ids = otherCategoryIds(action),
    ordinary = counts.filter((c) => !ids.has(c.id)),
    others = counts.filter((c) => ids.has(c.id));
  return ids.size || enabled(action.allow_other_categories)
    ? [
        ...ordinary,
        {
          id: "other",
          label: "Lainnya",
          count: others.reduce((s, c) => s + c.count, 0),
          presentation: others.reduce((s, c) => s + c.presentation, 0),
          presented: others.reduce((s, c) => s + c.presented, 0),
        },
      ]
    : ordinary;
}
export function mergeSavedCategory(
  action: DynamicLogbookAction,
  raw: Record<string, unknown>,
  scope: { id_client: number; id_action: number },
): DynamicLogbookAction {
  const id = Number(raw.id),
    name = raw.name;
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof name !== "string" ||
    !name.trim() ||
    !enabled(raw.required_asm) ||
    (raw.id_client != null && Number(raw.id_client) !== scope.id_client) ||
    (raw.id_action != null && Number(raw.id_action) !== scope.id_action)
  )
    throw new Error(
      "Kategori tersimpan tidak valid atau bukan milik aktivitas ini. Muat ulang metadata sebelum melanjutkan.",
    );
  const source =
    ["categories", "m_action_category", "action_categories"].find((k) =>
      Array.isArray(action[k]),
    ) ?? "categories";
  const rows = Array.isArray(action[source])
    ? (action[source] as Record<string, unknown>[])
    : [];
  return {
    ...action,
    [source]: [
      ...rows.filter(
        (c) =>
          Number(
            c.id_category ??
              c.id_action_category ??
              c.id ??
              (c.m_action_category as Record<string, unknown> | undefined)?.id,
          ) !== id,
      ),
      raw,
    ],
  };
}
