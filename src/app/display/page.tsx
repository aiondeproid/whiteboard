import { requireUser, getMemberBoard } from "@/lib/supabase/dal";
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-4 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        {board.name} に参加済み
      </h1>
      <p className="max-w-sm text-center text-sm text-black/60 dark:text-zinc-400">
        資料ホーム（部の選択）は次のステップで実装予定です。
      </p>
    </div>
  );
}
