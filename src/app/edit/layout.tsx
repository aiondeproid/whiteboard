import Link from "next/link";
import { getUser, getEditorBoard } from "@/lib/supabase/dal";
import { signOut } from "./actions";

export default async function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const board = user ? await getEditorBoard() : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 dark:border-white/[.145]">
        <Link
          href="/edit"
          className="text-sm font-semibold text-black dark:text-zinc-50"
        >
          編集アプリ
        </Link>
        <div className="flex items-center gap-4 text-sm text-black/70 dark:text-zinc-400">
          {board && (
            <span>
              {board.name} ・ 参加コード:{" "}
              <span className="font-mono">{board.join_code}</span>
            </span>
          )}
          {user && (
            <form action={signOut}>
              <button type="submit" className="underline underline-offset-4">
                ログアウト
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
