"use client";

import { useActionState } from "react";
import { createBoard, type CreateBoardState } from "./actions";

const initialState: CreateBoardState = undefined;

export function CreateBoardForm() {
  const [state, formAction, pending] = useActionState(
    createBoard,
    initialState
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-black dark:text-zinc-50">
          ボード名
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="例: 〇〇工場 掲示板"
          className="rounded-md border border-black/[.15] bg-white px-3 py-2 text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending ? "作成中..." : "ボードを作成"}
      </button>
    </form>
  );
}
