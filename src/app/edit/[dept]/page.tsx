import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEditorBoard,
  getDepartmentBySlug,
  getDocuments,
  getDocumentPreviewUrl,
} from "@/lib/supabase/dal";
import {
  toggleVisible,
  togglePinned,
  deleteDocument,
  deleteEndedDocuments,
} from "./actions";
import { AddDocumentForm } from "./add-document-form";
import { ToggleVisibleButton } from "./toggle-visible-button";
import { DocumentSettings } from "./document-settings";
import { DeleteEndedButton } from "./delete-ended-button";
import {
  formatShortDate,
  getDisplayStatus,
  isNew,
  todayInTokyo,
  type DisplayStatus,
} from "@/lib/schedule";
import { CATEGORIES } from "@/lib/category";

const STATUS_BADGE: Record<
  DisplayStatus,
  { label: string; className: string }
> = {
  showing: {
    label: "掲載中",
    className:
      "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  scheduled: {
    label: "予約中",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  ended: {
    label: "掲載終了",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  hidden: {
    label: "非表示",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;

  const department = await getDepartmentBySlug(dept);
  if (!department) notFound();

  const board = await getEditorBoard();

  const documents = await getDocuments(board.id, department.id);
  const today = todayInTokyo();
  const documentsWithPreview = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      previewUrl: await getDocumentPreviewUrl(doc.storage_path),
    }))
  );
  const endedCount = documents.filter(
    (doc) => doc.display_end && doc.display_end < today
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <Link
        href="/edit"
        className="inline-flex w-fit items-center gap-1 text-sm text-black/70 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← 資料ホームに戻る
      </Link>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        {department.name}
      </h1>

      <AddDocumentForm deptSlug={dept} />

      {endedCount > 0 && (
        <form
          action={deleteEndedDocuments.bind(null, dept)}
          className="flex justify-end"
        >
          <DeleteEndedButton count={endedCount} />
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {documentsWithPreview.length === 0 && (
          <li className="text-sm text-black/50 dark:text-zinc-500">
            資料はまだありません。
          </li>
        )}
        {documentsWithPreview.map((doc) => (
          <li
            key={doc.id}
            className={`flex flex-col gap-3 rounded-xl border bg-white px-4 py-3 dark:bg-zinc-900 ${
              doc.pinned
                ? "border-amber-300 dark:border-amber-700"
                : "border-black/[.08] dark:border-white/[.145]"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-black/50 dark:text-zinc-500">
                  No.{doc.serial_no}
                </span>
                {doc.category && (
                  <Badge className={CATEGORIES[doc.category].className}>
                    {CATEGORIES[doc.category].label}
                  </Badge>
                )}
                <span className="text-black dark:text-zinc-50">
                  {doc.title}
                </span>
                {isNew(doc, today) && (
                  <Badge className="bg-pink-100 font-semibold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                    NEW
                  </Badge>
                )}
                <StatusBadge doc={doc} today={today} />
                {doc.previewUrl && (
                  <a
                    href={doc.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline underline-offset-4 dark:text-blue-400"
                  >
                    プレビュー
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form
                  action={togglePinned.bind(null, dept, doc.id, !doc.pinned)}
                >
                  <button
                    type="submit"
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                      doc.pinned
                        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "border-black/[.15] text-black dark:border-white/[.2] dark:text-zinc-50"
                    }`}
                  >
                    {doc.pinned ? "ピン留め中" : "ピン留め"}
                  </button>
                </form>
                <form
                  action={toggleVisible.bind(null, dept, doc.id, !doc.visible)}
                >
                  <ToggleVisibleButton visible={doc.visible} />
                </form>
                <form action={deleteDocument.bind(null, dept, doc.id)}>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 dark:border-red-900"
                  >
                    削除
                  </button>
                </form>
              </div>
            </div>
            <DocumentSettings
              deptSlug={dept}
              documentId={doc.id}
              displayStart={doc.display_start}
              displayEnd={doc.display_end}
              category={doc.category}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({
  doc,
  today,
}: {
  doc: Parameters<typeof getDisplayStatus>[0];
  today: string;
}) {
  const badge = STATUS_BADGE[getDisplayStatus(doc, today)];
  const range =
    doc.display_start || doc.display_end
      ? `${doc.display_start ? formatShortDate(doc.display_start) : ""}〜${
          doc.display_end ? formatShortDate(doc.display_end) : ""
        }`
      : null;

  return (
    <Badge className={badge.className}>
      {badge.label}
      {range && ` ${range}`}
    </Badge>
  );
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${className}`}>
      {children}
    </span>
  );
}
