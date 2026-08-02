import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        電子掲示板
      </h1>
      <div className="flex gap-4">
        <Link
          href="/edit"
          className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          編集アプリ
        </Link>
        <Link
          href="/display"
          className="rounded-full border border-solid border-black/[.08] px-6 py-3 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          表示アプリ
        </Link>
      </div>
    </div>
  );
}
