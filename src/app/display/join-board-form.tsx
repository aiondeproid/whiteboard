"use client";

import { useActionState } from "react";
import { joinBoard, type JoinBoardState } from "./actions";

const initialState: JoinBoardState = undefined;

export function JoinBoardForm() {
  const [state, formAction, pending] = useActionState(
    joinBoard,
    initialState
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm text-black dark:text-zinc-50">
          参加コード
        </label>
        <input
          id="code"
          name="code"
          required
          placeholder="例: A1B2C3"
          autoCapitalize="characters"
          className="rounded-md border border-black/[.15] bg-white px-3 py-2 font-mono uppercase text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
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
        {pending ? "参加中..." : "参加する"}
      </button>
    </form>
  );
}
