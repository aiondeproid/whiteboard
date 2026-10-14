"use client";

import { useActionState } from "react";
import {
  updateDocumentSettings,
  replaceDocumentFile,
  type DocumentFormState,
} from "./actions";
import { CATEGORIES } from "@/lib/category";
import type { DocumentCategory } from "@/lib/types";

const initialState: DocumentFormState = undefined;

const smallInputClass =
  "rounded-md border border-black/[.15] bg-white px-2 py-1 text-sm text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:[color-scheme:dark]";
const smallLabelClass = "text-xs text-black/70 dark:text-zinc-400";
const smallButtonClass =
  "cursor-pointer rounded-full border border-black/[.15] px-3 py-1 text-xs text-black disabled:cursor-wait disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50";

// 資料行の「編集」パネル: 表示期間・ラベルの保存と、PDF の差し替え。
export function DocumentSettings({
  deptSlug,
  documentId,
  displayStart,
  displayEnd,
  category,
}: {
  deptSlug: string;
  documentId: string;
  displayStart: string | null;
  displayEnd: string | null;
  category: DocumentCategory | null;
}) {
  return (
    <details className="group text-sm">
      <summary className="w-fit cursor-pointer text-xs text-black/70 select-none hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50">
        期間・ラベル・PDFを編集
      </summary>
      <div className="mt-3 flex flex-col gap-4 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
        <SettingsForm
          deptSlug={deptSlug}
          documentId={documentId}
          displayStart={displayStart}
          displayEnd={displayEnd}
          category={category}
        />
        <ReplaceFileForm deptSlug={deptSlug} documentId={documentId} />
      </div>
    </details>
  );
}

function SettingsForm({
  deptSlug,
  documentId,
  displayStart,
  displayEnd,
  category,
}: {
  deptSlug: string;
  documentId: string;
  displayStart: string | null;
  displayEnd: string | null;
  category: DocumentCategory | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateDocumentSettings.bind(null, deptSlug, documentId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <DateRangeInputs
        idPrefix={documentId}
        displayStart={displayStart}
        displayEnd={displayEnd}
      />
      <CategorySelect idPrefix={documentId} defaultValue={category} />
      <button type="submit" disabled={pending} className={smallButtonClass}>
        {pending ? "保存中..." : "保存"}
      </button>
      <FormMessage state={state} pending={pending} />
    </form>
  );
}

function ReplaceFileForm({
  deptSlug,
  documentId,
}: {
  deptSlug: string;
  documentId: string;
}) {
  const [state, formAction, pending] = useActionState(
    replaceDocumentFile.bind(null, deptSlug, documentId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${documentId}-file`} className={smallLabelClass}>
          PDFを差し替え
        </label>
        <input
          id={`${documentId}-file`}
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="cursor-pointer text-xs text-black file:mr-2 file:cursor-pointer file:rounded-full file:border file:border-black/[.15] file:bg-transparent file:px-3 file:py-1 file:text-xs file:text-black dark:text-zinc-50 dark:file:border-white/[.2] dark:file:text-zinc-50"
        />
      </div>
      <button type="submit" disabled={pending} className={smallButtonClass}>
        {pending ? "差し替え中..." : "差し替え"}
      </button>
      <FormMessage state={state} pending={pending} />
    </form>
  );
}

function FormMessage({
  state,
  pending,
}: {
  state: DocumentFormState;
  pending: boolean;
}) {
  if (state?.error) {
    return (
      <p className="w-full text-xs text-red-600" role="alert">
        {state.error}
      </p>
    );
  }
  if (state?.saved && !pending) {
    return (
      <p className="text-xs text-green-700 dark:text-green-400">保存しました</p>
    );
  }
  return null;
}

export function DateRangeInputs({
  idPrefix,
  displayStart = null,
  displayEnd = null,
}: {
  idPrefix: string;
  displayStart?: string | null;
  displayEnd?: string | null;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-start`} className={smallLabelClass}>
          表示開始日
        </label>
        <input
          id={`${idPrefix}-start`}
          name="display_start"
          type="date"
          defaultValue={displayStart ?? ""}
          className={smallInputClass}
        />
      </div>
      <span className="pb-1.5 text-sm text-black/50 dark:text-zinc-500">
        〜
      </span>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-end`} className={smallLabelClass}>
          表示終了日
        </label>
        <input
          id={`${idPrefix}-end`}
          name="display_end"
          type="date"
          defaultValue={displayEnd ?? ""}
          className={smallInputClass}
        />
      </div>
    </>
  );
}

export function CategorySelect({
  idPrefix,
  defaultValue = null,
}: {
  idPrefix: string;
  defaultValue?: DocumentCategory | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${idPrefix}-category`} className={smallLabelClass}>
        ラベル
      </label>
      <select
        id={`${idPrefix}-category`}
        name="category"
        defaultValue={defaultValue ?? ""}
        className={smallInputClass}
      >
        <option value="">なし</option>
        {Object.entries(CATEGORIES).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
