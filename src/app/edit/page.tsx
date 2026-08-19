import Link from "next/link";
import { requireUser, getEditorBoard, getDepartments } from "@/lib/supabase/dal";
import { JoinAsEditorForm } from "./join-as-editor-form";

export default async function EditHome() {
  await requireUser();
  const board = await getEditorBoard();

  if (!board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-4 font-sans dark:bg-black">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          編集者として参加
        </h1>
        <p className="max-w-sm text-center text-sm text-black/60 dark:text-zinc-400">
          社内の共有ボードに編集者として参加するには、招待コードを入力してください。
        </p>
        <JoinAsEditorForm />
      </div>
    );
  }

  const departments = await getDepartments();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 p-4 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        資料ホーム
      </h1>
      <div className="grid grid-cols-2 gap-4">
        {departments.map((dept) => (
          <Link
            key={dept.id}
            href={`/edit/${dept.slug}`}
            className="flex items-center justify-center rounded-2xl border border-black/[.08] bg-white px-8 py-6 text-lg font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            {dept.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
