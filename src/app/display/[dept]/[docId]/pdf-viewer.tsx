"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

export default function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-4">
      <div className="w-full flex-1 overflow-auto rounded-xl border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-900">
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600" role="alert">
            PDFを読み込めませんでした。
          </p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setLoadError(true)}
            loading={
              <p className="p-8 text-center text-sm text-black/50 dark:text-zinc-500">
                読み込み中...
              </p>
            }
            className="flex justify-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="rounded-full border border-black/[.15] px-4 py-2 text-sm text-black disabled:opacity-40 dark:border-white/[.2] dark:text-zinc-50"
          >
            前へ
          </button>
          <span className="text-sm text-black dark:text-zinc-50">
            {numPages ? `${pageNumber} / ${numPages}` : "-"}
          </span>
          <button
            type="button"
            onClick={() =>
              setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p))
            }
            disabled={!numPages || pageNumber >= numPages}
            className="rounded-full border border-black/[.15] px-4 py-2 text-sm text-black disabled:opacity-40 dark:border-white/[.2] dark:text-zinc-50"
          >
            次へ
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
            disabled={scale <= MIN_SCALE}
            className="rounded-full border border-black/[.15] px-3 py-1 text-xs text-black disabled:opacity-40 dark:border-white/[.2] dark:text-zinc-50"
          >
            縮小
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
            disabled={scale >= MAX_SCALE}
            className="rounded-full border border-black/[.15] px-3 py-1 text-xs text-black disabled:opacity-40 dark:border-white/[.2] dark:text-zinc-50"
          >
            拡大
          </button>
        </div>
      </div>
    </div>
  );
}
