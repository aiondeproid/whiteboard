"use client";

import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const THUMBNAIL_WIDTH = 260;

export default function PdfThumbnail({ url }: { url: string }) {
  return (
    <Document
      file={url}
      loading={
        <span className="text-xs text-black/40 dark:text-zinc-600">
          読み込み中
        </span>
      }
      error={<span className="text-xs text-red-600">読み込み失敗</span>}
    >
      <Page
        pageNumber={1}
        width={THUMBNAIL_WIDTH}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}
