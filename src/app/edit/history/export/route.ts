import { type NextRequest } from "next/server";
import {
  getEditorBoard,
  getDepartments,
  getDocumentHistory,
} from "@/lib/supabase/dal";
import {
  formatDate,
  formatDateTimeInTokyo,
  getEffectivePeriod,
  getHistoryStatusLabel,
  todayInTokyo,
} from "@/lib/schedule";
import { CATEGORIES } from "@/lib/category";

// 掲示履歴を CSV で返す。?dept=slug で部を絞り込み（履歴ページと同じ）。
// Excel でそのまま開けるよう UTF-8 BOM + CRLF。
export async function GET(request: NextRequest) {
  const board = await getEditorBoard();
  const departments = await getDepartments();
  const dept = request.nextUrl.searchParams.get("dept");
  const selected = departments.find((d) => d.slug === dept) ?? null;

  const allDocuments = await getDocumentHistory(board.id);
  const documents = selected
    ? allDocuments.filter((doc) => doc.department_id === selected.id)
    : allDocuments;
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  const today = todayInTokyo();

  const header = [
    "No.",
    "タイトル",
    "部",
    "ラベル",
    "表示開始日",
    "表示終了日",
    "状態",
    "ピン留め",
    "登録日時",
    "削除日時",
  ];
  const rows = documents.map((doc) => {
    const period = getEffectivePeriod(doc);
    return [
      String(doc.serial_no),
      doc.title,
      departmentName.get(doc.department_id) ?? "",
      doc.category ? CATEGORIES[doc.category].label : "",
      formatDate(period.start),
      period.end ? formatDate(period.end) : "継続中",
      getHistoryStatusLabel(doc, today),
      doc.pinned ? "○" : "",
      formatDateTimeInTokyo(doc.created_at),
      doc.deleted_at ? formatDateTimeInTokyo(doc.deleted_at) : "",
    ];
  });

  const csv =
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(toCsvField).join(",")).join("\r\n") +
    "\r\n";

  const filename = `掲示履歴${selected ? `_${selected.name}` : ""}_${today.replaceAll("-", "")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="history.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

function toCsvField(value: string): string {
  // Excel で数式として解釈されないよう、= + - @ で始まる値は ' を前置する。
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
