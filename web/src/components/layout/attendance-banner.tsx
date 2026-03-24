"use client";

import Link from "next/link";
import { ArrowLongRightIcon } from "@heroicons/react/20/solid";

interface AttendanceBannerProps {
  eventName: string;
  deadline: string;
}

export function AttendanceBanner({
  eventName,
  deadline,
}: AttendanceBannerProps) {
  return (
    <div className="bg-primary">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 lg:px-8">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Live pulse dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>

          <span className="truncate text-[13px] text-white">
            {eventName}
            <span className="ml-2 text-white/60">截止 {deadline}</span>
          </span>
        </div>

        <Link
          href="/attendance"
          className="group flex h-7 shrink-0 items-center gap-1 rounded-full border border-white/30 px-3 text-[12px] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/10"
        >
          立即前往點名
          <ArrowLongRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
