import type { Document } from "@/lib/types";

export type DisplayStatus = "hidden" | "scheduled" | "showing" | "ended";

// 表示開始日（未設定なら登録日）から何日間 NEW 扱いにするか。display_documents ビューと揃える。
export const NEW_DAYS = 3;

// 日本時間での日付を YYYY-MM-DD で返す（viewer 向け RLS と同じ基準）。
export function toTokyoDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    date
  );
}

export function todayInTokyo(): string {
  return toTokyoDate(new Date());
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000;
}

export function isNew(
  doc: Pick<Document, "display_start" | "created_at">,
  today = todayInTokyo()
): boolean {
  const start = doc.display_start ?? toTokyoDate(new Date(doc.created_at));
  const days = daysBetween(start, today);
  return days >= 0 && days < NEW_DAYS;
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

// "2026-10-20" → "2026/10/20"
export function formatDate(date: string): string {
  return date.replaceAll("-", "/");
}

// 履歴に出す実際の表示期間。開始は表示開始日（未設定なら登録日）、
// 終了は表示終了日と削除日の早いほう（どちらも無ければ null = 継続中）。
export function getEffectivePeriod(
  doc: Pick<
    Document,
    "display_start" | "display_end" | "created_at" | "deleted_at"
  >
): { start: string; end: string | null } {
  const start = doc.display_start ?? toTokyoDate(new Date(doc.created_at));
  const deleted = doc.deleted_at ? toTokyoDate(new Date(doc.deleted_at)) : null;
  const ends = [doc.display_end, deleted].filter((d): d is string => !!d);
  const end = ends.length > 0 ? ends.sort()[0] : null;
  return { start, end };
}

const STATUS_LABEL: Record<DisplayStatus, string> = {
  showing: "掲載中",
  scheduled: "予約中",
  ended: "掲載終了",
  hidden: "非表示",
};

// 掲示履歴に出す状態（削除済みを含む）。
export function getHistoryStatusLabel(
  doc: Pick<
    Document,
    "visible" | "display_start" | "display_end" | "deleted_at"
  >,
  today = todayInTokyo()
): string {
  if (doc.deleted_at) return "削除済み";
  return STATUS_LABEL[getDisplayStatus(doc, today)];
}

// ISO 日時 → 日本時間の "2026/10/14 18:07"
export function formatDateTimeInTokyo(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
