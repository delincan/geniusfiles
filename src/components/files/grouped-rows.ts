import type { FileGroup } from "@/lib/files/image-groups";

export type GroupedRow<T> =
  | { key: string; label: string; items: null; height: number }
  | { key: string; items: T[]; height: number };

/** Reserve the entire gallery extent, while mounting only visible rows. */
export function buildGroupedRows<T>(groups: FileGroup<T>[], columns: number, rowHeight: number) {
  const rows: GroupedRow<T>[] = [];
  for (const group of groups) {
    if (group.label)
      rows.push({ key: `heading:${group.key}`, label: group.label, items: null, height: 30 });
    for (let index = 0; index < group.items.length; index += columns) {
      rows.push({
        key: `row:${group.key}:${index}`,
        items: group.items.slice(index, index + columns),
        height: rowHeight,
      });
    }
  }
  return rows;
}
