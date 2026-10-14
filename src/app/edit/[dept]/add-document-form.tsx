"use client";

import { useActionState } from "react";
import { addDocument, type AddDocumentState } from "./actions";
import { DateRangeInputs } from "./schedule-form";

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
          className="cursor-pointer text-sm text-black file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:text-background file:transition-colors hover:file:bg-[#383838] dark:text-zinc-50 dark:hover:file:bg-[#ccc]"
        />
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm text-black dark:text-zinc-50">
          表示期間
          <span className="ml-2 text-xs text-black/50 dark:text-zinc-500">
            任意・空欄なら無期限
          </span>
        </legend>
        <div className="flex flex-wrap items-end gap-2">
          <DateRangeInputs idPrefix="new" />
        </div>
      </fieldset>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc] cursor-pointer"
      >
        {pending ? "アップロード中..." : "資料を追加"}
      </button>
    </form>
  );
}
