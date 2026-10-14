import type { Document } from "@/lib/types";

export type DisplayStatus = "hidden" | "scheduled" | "showing" | "ended";

// 日本時間の今日を YYYY-MM-DD で返す（viewer 向け RLS と同じ基準）。
export function todayInTokyo(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date()
  );
}

export function getDisplayStatus(
  doc: Pick<Document, "visible" | "display_start" | "display_end">,
  today = todayInTokyo()
): DisplayStatus {
  if (!doc.visible) return "hidden";
  if (doc.display_start && today < doc.display_start) return "scheduled";
  if (doc.display_end && today > doc.display_end) return "ended";
  return "showing";
}

// "2026-10-20" → "10/20"
export function formatShortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
