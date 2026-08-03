import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMemberBoard,
  getDepartmentBySlug,
  getVisibleDocument,
  getDocumentPreviewUrl,
} from "@/lib/supabase/dal";
import { PdfViewerLoader } from "./pdf-viewer-loader";

// Longer-lived than the edit app's preview link: a kiosk may leave one PDF
// open for a while, and pdf.js re-fetches page ranges as the viewer scrolls.
const VIEWER_URL_TTL_SECONDS = 3600;

export default async function DisplayDocumentPage({
  params,
}: {
  params: Promise<{ dept: string; docId: string }>;
}) {
  const { dept, docId } = await params;

  const department = await getDepartmentBySlug(dept);
  if (!department) notFound();

  const board = await getMemberBoard();
  if (!board) redirect("/display");

  const doc = await getVisibleDocument(board.id, department.id, docId);
  if (!doc) notFound();

  const previewUrl = await getDocumentPreviewUrl(
    doc.storage_path,
    VIEWER_URL_TTL_SECONDS
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link
          href={`/display/${dept}`}
          className="text-sm text-black/60 underline underline-offset-4 dark:text-zinc-400"
        >
          ← {department.name}に戻る
        </Link>
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
          {doc.title}
        </h1>
      </div>

      {previewUrl ? (
        <PdfViewerLoader url={previewUrl} />
      ) : (
        <p className="p-8 text-center text-sm text-red-600" role="alert">
          PDFを読み込めませんでした。
        </p>
      )}
    </div>
  );
}
