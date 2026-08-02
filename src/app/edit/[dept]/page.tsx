import { notFound, redirect } from "next/navigation";
import {
  getEditorBoard,
  getDepartmentBySlug,
  getDocuments,
  getDocumentPreviewUrl,
} from "@/lib/supabase/dal";
import { toggleVisible, deleteDocument } from "./actions";
import { AddDocumentForm } from "./add-document-form";

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;

  const department = await getDepartmentBySlug(dept);
  if (!department) notFound();

  const board = await getEditorBoard();
  if (!board) redirect("/edit");

  const documents = await getDocuments(board.id, department.id);
  const documentsWithPreview = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      previewUrl: await getDocumentPreviewUrl(doc.storage_path),
    }))
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        {department.name}
      </h1>

      <AddDocumentForm deptSlug={dept} />

      <ul className="flex flex-col gap-2">
        {documentsWithPreview.length === 0 && (
          <li className="text-sm text-black/50 dark:text-zinc-500">
            資料はまだありません。
          </li>
        )}
        {documentsWithPreview.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <span className="text-black dark:text-zinc-50">{doc.title}</span>
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
            <div className="flex items-center gap-2">
              <form action={toggleVisible.bind(null, dept, doc.id, !doc.visible)}>
                <button
                  type="submit"
                  className="rounded-full border border-black/[.15] px-3 py-1 text-xs text-black dark:border-white/[.2] dark:text-zinc-50"
                >
                  {doc.visible ? "表示中" : "非表示中"}
                </button>
              </form>
              <form
                action={deleteDocument.bind(null, dept, doc.id, doc.storage_path)}
              >
                <button
                  type="submit"
                  className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 dark:border-red-900"
                >
                  削除
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
