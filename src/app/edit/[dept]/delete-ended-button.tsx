"use client";

import { useFormStatus } from "react-dom";

export function DeleteEndedButton({ count }: { count: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !confirm(
            `掲載終了の資料 ${count} 件を一覧から削除します（掲示履歴には残ります）。よろしいですか？`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="cursor-pointer rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 disabled:cursor-wait disabled:opacity-50 dark:border-red-900"
    >
      {pending ? "削除中..." : `掲載終了の資料を一括削除（${count}件）`}
    </button>
  );
}
