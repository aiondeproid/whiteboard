"use client";

import dynamic from "next/dynamic";

const PdfThumbnail = dynamic(() => import("./pdf-thumbnail"), {
  ssr: false,
  loading: () => (
    <span className="text-xs text-black/40 dark:text-zinc-600">
      読み込み中
    </span>
  ),
});

export function PdfThumbnailLoader({ url }: { url: string }) {
  return <PdfThumbnail url={url} />;
}
