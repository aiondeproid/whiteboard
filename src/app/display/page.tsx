import Link from "next/link";
import { requireUser, getMemberBoard, getDepartments } from "@/lib/supabase/dal";
import { JoinBoardForm } from "./join-board-form";

export default async function DisplayHome() {
  await requireUser("/display/login");
  const board = await getMemberBoard();

  if (!board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-4 font-sans dark:bg-black">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          ボードに参加
        </h1>
        <p className="max-w-sm text-center text-sm text-black/60 dark:text-zinc-400">
          編集アプリ側で発行された参加コードを入力してください。
        </p>
        <JoinBoardForm />
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
            href={`/display/${dept.slug}`}
            className="flex items-center justify-center rounded-2xl border border-black/[.08] bg-white px-8 py-6 text-lg font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            {dept.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
