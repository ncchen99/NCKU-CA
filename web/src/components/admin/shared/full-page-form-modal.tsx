"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface FullPageFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  wide?: boolean;
}

export function FullPageFormModal({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel = "儲存",
  cancelLabel = "取消",
  loading = false,
  wide = false,
}: FullPageFormModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleCancel = () => {
    setConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    setConfirmOpen(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 md:p-10">
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.10),0_8px_40px_rgba(10,10,10,0.12)] ${wide ? "max-w-5xl" : "max-w-2xl"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">{children}</div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <Button type="submit" disabled={loading}>
              {loading ? "處理中…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} preventClose>
        <div className="flex flex-col items-center text-center pt-6">
          <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
            確定要離開嗎？
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            尚未儲存的內容將會遺失。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              繼續編輯
            </button>
            <Button
              onClick={handleConfirmClose}
              className="!bg-red-600 hover:!bg-red-700 active:!bg-red-800"
            >
              離開
            </Button>
          </div>
        </div>
      </Modal>
    </div>,
    document.body,
  );
}
