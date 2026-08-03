import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMemberBoard,
  getDepartmentBySlug,
  getVisibleDocuments,
  getDocumentPreviewUrl,
} from "@/lib/supabase/dal";
import { PdfThumbnailLoader } from "./pdf-thumbnail-loader";

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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        {department.name}
      </h1>

      {documentsWithPreview.length === 0 && (
        <p className="text-sm text-black/50 dark:text-zinc-500">
          資料はまだありません。
        </p>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {documentsWithPreview.map((doc) => (
          <Link
            key={doc.id}
            href={`/display/${dept}/${doc.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-3 text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            <span className="truncate text-center text-sm font-medium">
              {doc.title}
            </span>
            <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border border-black/[.08] bg-zinc-50 dark:border-white/[.1] dark:bg-black">
              {doc.previewUrl && <PdfThumbnailLoader url={doc.previewUrl} />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
