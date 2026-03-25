"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export interface AppSelectOption {
  value: string;
  label: string;
}

export type AppSelectProps = {
  value: string | number | readonly string[] | undefined;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  "aria-invalid"?: boolean;
};

const triggerBase =
  "flex w-full min-h-[2.5rem] items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left text-sm text-neutral-950 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500";

function coerceValue(v: AppSelectProps["value"]): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v[0] ?? "";
  return String(v);
}

export function AppSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder = "請選擇",
  className = "",
  invalid,
  id,
  name,
  autoFocus,
  searchable = false,
  searchPlaceholder = "搜尋...",
  "aria-invalid": ariaInvalid,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const controlId = id ?? `app-select-${generatedId}`;
  const listboxId = `${controlId}-listbox`;

  const stringValue = coerceValue(value);
  const selected = options.find((o) => o.value === stringValue);
  const displayLabel = selected?.label ?? placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    const q = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchTerm, searchable]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setSearchTerm("");
  }, []);

  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const measure = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const below = window.innerHeight - r.bottom - gap;
    const above = r.top - gap;
    const maxOpen = 280;
    const flip = below < 150 && above > below;
    const maxHeight = Math.min(
      maxOpen,
      Math.max(120, flip ? above - 8 : below - 8),
    );
    const top = flip ? r.top - gap - maxHeight : r.bottom + gap;
    setMenuPos({
      top,
      left: r.left,
      width: r.width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    // Focus search input when opening
    if (searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }

    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure, searchable, closeMenu]);

  const invalidCls =
    invalid || ariaInvalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "";

  const menu =
    open &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          maxHeight: menuPos.maxHeight,
          zIndex: 100,
        }}
        className="flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-lg ring-1 ring-black/5"
      >
        {searchable && (
          <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-2 py-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border-none bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-1 focus:ring-primary/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={controlId}
          className="flex-1 overflow-y-auto py-1"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-neutral-400">
              沒有相符的選項
            </li>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === stringValue;
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50 ${isSelected
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-neutral-800"
                      }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(opt.value);
                      closeMenu();
                    }}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>,
      document.body,
    );

  return (
    <div className={`relative w-full ${className}`}>
      {name ? (
        <input type="hidden" name={name} value={stringValue} readOnly />
      ) : null}
      <button
        ref={btnRef}
        type="button"
        id={controlId}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-invalid={invalid || ariaInvalid ? "true" : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${triggerBase} ${invalidCls}`}
      >
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
