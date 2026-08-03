import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMemberBoard,
  getDepartmentBySlug,
  getVisibleDocuments,
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        {department.name}
      </h1>

      <ul className="flex flex-col gap-2">
        {documents.length === 0 && (
          <li className="text-sm text-black/50 dark:text-zinc-500">
            資料はまだありません。
          </li>
        )}
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/display/${dept}/${doc.id}`}
              className="flex items-center rounded-xl border border-black/[.08] bg-white px-4 py-3 text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
            >
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
