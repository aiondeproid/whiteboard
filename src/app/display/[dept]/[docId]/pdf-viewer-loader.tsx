"use client";

import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <p className="flex-1 p-8 text-center text-sm text-black/50 dark:text-zinc-500">
      読み込み中...
    </p>
  ),
});

export function PdfViewerLoader({ url }: { url: string }) {
  return <PdfViewer url={url} />;
}
