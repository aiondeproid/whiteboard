"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, signup, type AuthFormState } from "./actions";

const initialState: AuthFormState = undefined;

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, pending] = useActionState(
    mode === "login" ? login : signup,
    initialState
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-4 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        表示アプリ
      </h1>
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-sm text-black dark:text-zinc-50"
          >
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-black/[.15] bg-white px-3 py-2 text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-sm text-black dark:text-zinc-50"
          >
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="rounded-md border border-black/[.15] bg-white px-3 py-2 text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="text-sm text-emerald-600" role="status">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {pending ? "処理中..." : mode === "login" ? "ログイン" : "新規登録"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="text-sm text-black underline underline-offset-4 dark:text-zinc-50"
      >
        {mode === "login" ? "アカウントを作成する" : "ログインする"}
      </button>
      <Link href="/" className="text-sm text-black/60 dark:text-zinc-400">
        トップに戻る
      </Link>
    </div>
  );
}
