import { notFound, redirect } from "next/navigation";
import {
  getMemberBoard,
  getDepartmentBySlug,
  getVisibleDocuments,
  getDocumentPreviewUrl,
} from "@/lib/supabase/dal";

export default async function DisplayDepartmentPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;

  const department = await getDepartmentBySlug(dept);
  if (!department) notFound();

  const board = await getMemberBoard();
  if (!board) redirect("/display");

  const documents = await getVisibleDocuments(board.id, department.id);
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

      <ul className="flex flex-col gap-2">
        {documentsWithPreview.length === 0 && (
          <li className="text-sm text-black/50 dark:text-zinc-500">
            資料はまだありません。
          </li>
        )}
        {documentsWithPreview.map((doc) =>
          doc.previewUrl ? (
            <li key={doc.id}>
              <a
                href={doc.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center rounded-xl border border-black/[.08] bg-white px-4 py-3 text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
              >
                {doc.title}
              </a>
            </li>
          ) : (
            <li
              key={doc.id}
              className="flex items-center rounded-xl border border-black/[.08] bg-white px-4 py-3 text-black/50 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-500"
            >
              {doc.title}（表示できません）
            </li>
          )
        )}
      </ul>
    </div>
  );
}
