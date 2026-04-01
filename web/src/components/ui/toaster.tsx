"use client";

import { useToastStore } from "./use-toast";
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export function Toaster() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-black/5 animate-in slide-in-from-bottom sm:slide-in-from-right"
        >
          {toast.type === "success" && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
          {toast.type === "error" && <XCircleIcon className="h-5 w-5 text-red-500" />}
          {(!toast.type || toast.type === "info") && <InformationCircleIcon className="h-5 w-5 text-blue-500" />}
          <p className="text-sm font-medium text-neutral-900">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
