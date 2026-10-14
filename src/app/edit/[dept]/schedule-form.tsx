"use client";

import { useActionState } from "react";
import { updateSchedule, type ScheduleState } from "./actions";

const initialState: ScheduleState = undefined;

export function ScheduleForm({
  deptSlug,
  documentId,
  displayStart,
  displayEnd,
}: {
  deptSlug: string;
  documentId: string;
  displayStart: string | null;
  displayEnd: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateSchedule.bind(null, deptSlug, documentId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <DateRangeInputs
        idPrefix={documentId}
        displayStart={displayStart}
        displayEnd={displayEnd}
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-full border border-black/[.15] px-3 py-1 text-xs text-black disabled:cursor-wait disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50"
      >
        {pending ? "保存中..." : "期間を保存"}
      </button>
      {state?.error && (
        <p className="w-full text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.saved && !pending && (
        <p className="text-xs text-green-700 dark:text-green-400">
          保存しました
        </p>
      )}
    </form>
  );
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
  const inputClass =
    "rounded-md border border-black/[.15] bg-white px-2 py-1 text-sm text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50 dark:[color-scheme:dark]";

  return (
    <>
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${idPrefix}-start`}
          className="text-xs text-black/70 dark:text-zinc-400"
        >
          表示開始日
        </label>
        <input
          id={`${idPrefix}-start`}
          name="display_start"
          type="date"
          defaultValue={displayStart ?? ""}
          className={inputClass}
        />
      </div>
      <span className="pb-1.5 text-sm text-black/50 dark:text-zinc-500">
        〜
      </span>
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${idPrefix}-end`}
          className="text-xs text-black/70 dark:text-zinc-400"
        >
          表示終了日
        </label>
        <input
          id={`${idPrefix}-end`}
          name="display_end"
          type="date"
          defaultValue={displayEnd ?? ""}
          className={inputClass}
        />
      </div>
    </>
  );
}
