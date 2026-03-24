"use client";

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

const modalSizeClass: Record<"default" | "wide", string> = {
  default: "max-w-[480px]",
  wide: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** 寬版適合表格、大量內容；預設為窄版對話框 */
  size?: "default" | "wide";
  preventClose?: boolean;
}

function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
  size = "default",
  preventClose = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) onClose();
    },
    [onClose, preventClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current && !preventClose) onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative mx-4 w-full ${modalSizeClass[size]} bg-white rounded-xl shadow-[0_0_0_1px_rgba(10,10,10,0.10),0_8px_40px_rgba(10,10,10,0.12)] ${className}`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 className="text-lg font-[600] tracking-tight text-neutral-950">
              {title}
            </h3>
            {!preventClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="關閉"
              >
                <XMarkIcon className="size-5" />
              </button>
            )}
          </div>
        )}
        {!title && !preventClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <XMarkIcon className="size-5" />
          </button>
        )}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export { Modal };
export type { ModalProps };
