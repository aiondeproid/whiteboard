import Link from "next/link";
import {
  getEditorBoard,
  getDepartments,
  getDocumentHistory,
  getDocumentPreviewUrls,
} from "@/lib/supabase/dal";
import {
  formatDate,
  getEffectivePeriod,
  getHistoryStatusLabel,
  todayInTokyo,
} from "@/lib/schedule";
import { CATEGORIES } from "@/lib/category";
import { restoreDocument } from "./actions";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const { dept } = await searchParams;
  const board = await getEditorBoard();
  const departments = await getDepartments();
  const selected = departments.find((d) => d.slug === dept) ?? null;

  const allDocuments = await getDocumentHistory(board.id);
  const documents = selected
    ? allDocuments.filter((doc) => doc.department_id === selected.id)
    : allDocuments;
  const previewUrls = await getDocumentPreviewUrls(
    documents.map((doc) => doc.storage_path)
  );
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  const today = todayInTokyo();

  const filterClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${
      active
        ? "border-foreground bg-foreground text-background"
        : "border-black/[.15] text-black hover:bg-black/[.04] dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/[.06]"
    }`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
      <Link
        href="/edit"
        className="inline-flex w-fit items-center gap-1 text-sm text-black/70 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← 資料ホームに戻る
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          掲示履歴
        </h1>
        {/* ファイルのダウンロードなので Link ではなく素の a（プリフェッチさせない） */}
        <a
          href={`/edit/history/export${selected ? `?dept=${selected.slug}` : ""}`}
          className="rounded-full bg-foreground px-4 py-2 text-xs text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          CSVでダウンロード{selected && `（${selected.name}）`}
        </a>
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/edit/history" className={filterClass(!selected)}>
          すべて
        </Link>
        {departments.map((d) => (
          <Link
            key={d.id}
            href={`/edit/history?dept=${d.slug}`}
            className={filterClass(selected?.id === d.id)}
          >
            {d.name}
          </Link>
        ))}
      </nav>

      {documents.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-zinc-500">
          履歴はまだありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-900">
          <table className="w-full text-left text-sm text-black dark:text-zinc-50">
            <thead className="border-b border-black/[.08] text-xs text-black/60 dark:border-white/[.145] dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-normal">No.</th>
                <th className="px-3 py-2 font-normal">タイトル</th>
                <th className="px-3 py-2 font-normal">部</th>
                <th className="px-3 py-2 font-normal">表示期間</th>
                <th className="px-3 py-2 font-normal">状態</th>
                <th className="px-3 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const period = getEffectivePeriod(doc);
                const previewUrl = previewUrls.get(doc.storage_path);
                return (
                  <tr
                    key={doc.id}
                    className={`border-b border-black/[.06] last:border-0 dark:border-white/[.08] ${
                      doc.deleted_at ? "text-black/50 dark:text-zinc-500" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {doc.serial_no}
                    </td>
                    <td className="px-3 py-2">
                      {doc.category && (
                        <span
                          className={`mr-2 rounded-full px-2 py-0.5 text-xs ${CATEGORIES[doc.category].className}`}
                        >
                          {CATEGORIES[doc.category].label}
                        </span>
                      )}
                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          {doc.title}
                        </a>
                      ) : (
                        doc.title
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {departmentName.get(doc.department_id)}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {formatDate(period.start)} 〜{" "}
                      {period.end ? formatDate(period.end) : "継続中"}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {getHistoryStatusLabel(doc, today)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {doc.deleted_at && (
                        <form action={restoreDocument.bind(null, doc.id)}>
                          <button
                            type="submit"
                            className="cursor-pointer rounded-full border border-black/[.15] px-3 py-1 text-xs whitespace-nowrap text-black dark:border-white/[.2] dark:text-zinc-50"
                          >
                            一覧に戻す
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
