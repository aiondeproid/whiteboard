import type { DocumentCategory } from "@/lib/types";

// 重要度ラベル。値は documents.category の CHECK 制約と揃える。
export const CATEGORIES: Record<
  DocumentCategory,
  { label: string; className: string }
> = {
  urgent: {
    label: "緊急",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  notice: {
    label: "周知",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  routine: {
    label: "定期",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export function isCategory(value: string): value is DocumentCategory {
  return value in CATEGORIES;
}
