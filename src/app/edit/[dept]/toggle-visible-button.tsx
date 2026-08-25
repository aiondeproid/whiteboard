"use client";

import { useFormStatus } from "react-dom";

export function ToggleVisibleButton({ visible }: { visible: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-full border border-black/[.15] px-3 py-1 text-xs text-black disabled:cursor-wait disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50"
    >
      {visible ? "表示中" : "非表示中"}
    </button>
  );
}
