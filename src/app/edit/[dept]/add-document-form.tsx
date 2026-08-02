"use client";

import { useActionState } from "react";
import { addDocument, type AddDocumentState } from "./actions";

const initialState: AddDocumentState = undefined;

export function AddDocumentForm({ deptSlug }: { deptSlug: string }) {
  const [state, formAction, pending] = useActionState(
    addDocument.bind(null, deptSlug),
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-black dark:text-zinc-50">
          タイトル
        </label>
        <input
          id="title"
          name="title"
          required
          className="rounded-md border border-black/[.15] bg-white px-3 py-2 text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm text-black dark:text-zinc-50">
          PDFファイル
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="text-sm text-black dark:text-zinc-50"
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
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending ? "アップロード中..." : "資料を追加"}
      </button>
    </form>
  );
}
