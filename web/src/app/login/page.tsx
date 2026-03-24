import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

export const metadata: Metadata = {
  title: "登入",
  description: "登入成功大學社團聯合會數位平台。僅限 @gs.ncku.edu.tw 帳號。",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo & title */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">社</span>
            </div>
          </Link>
          <h1 className="mt-5 text-[20px] font-bold tracking-tight text-neutral-950">
            成功大學社團聯合會
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            NCKU NCA 數位平台
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.08),0_2px_8px_rgba(10,10,10,0.04)]">
          <h2 className="text-center text-[15px] font-semibold text-neutral-950">
            登入系統
          </h2>
          <p className="mt-1.5 text-center text-[13px] text-neutral-500">
            使用您的成功大學 Google 帳號登入
          </p>

          <button className="mt-6 flex h-[42px] w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[14px] font-[550] text-white transition-colors hover:bg-primary-light active:bg-primary-dark">
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
            </svg>
            以 Google 帳號登入
          </button>

          <p className="mt-4 text-center text-[12px] text-neutral-400">
            僅限 <span className="font-mono">@gs.ncku.edu.tw</span> 帳號
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-1 text-[13px] text-neutral-500 transition-colors hover:text-neutral-950"
          >
            <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
