"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLongRightIcon } from "@heroicons/react/20/solid";

type ButtonVariant = "primary" | "ghost" | "outline" | "pill";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  asChild?: boolean;
  href?: string;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white h-[38px] rounded-full px-4 text-sm font-[550] hover:bg-primary-light active:bg-primary-dark",
  ghost:
    "bg-white border border-border text-neutral-700 h-[36px] rounded-full px-4 text-sm font-[450] hover:bg-neutral-50 active:bg-neutral-100",
  outline:
    "bg-transparent border border-white/40 text-white h-[28px] rounded-full px-2.5 text-[11px] font-[450] hover:bg-white/10",
  pill: "rounded-full text-xs h-[32px] px-3 font-[500] bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
};

const sizeOverrides: Record<ButtonSize, string> = {
  sm: "h-[32px] px-3 text-xs",
  md: "",
  lg: "h-[44px] px-6 text-base",
};

const pillActiveClass =
  "bg-primary text-white hover:bg-primary-light";

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      active = false,
      asChild = false,
      href,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none select-none";

    const variantCls = variantClasses[variant];
    const sizeCls = size !== "md" ? sizeOverrides[size] : "";
    const activeCls = variant === "pill" && active ? pillActiveClass : "";

    const combinedClassName =
      [base, variantCls, sizeCls, activeCls, className].filter(Boolean).join(" ");

    const content = children;

    if (href) {
      if (variant === "primary") {
        return (
          <span className="inline-flex p-px group">
            <Link href={href} className={combinedClassName}>
              {content}
            </Link>
          </span>
        );
      }
      return (
        <Link href={href} className={`${combinedClassName} group`}>
          {content}
        </Link>
      );
    }

    if (variant === "primary") {
      return (
        <span className="inline-flex p-px group">
          <button ref={ref} className={combinedClassName} {...props}>
            {content}
          </button>
        </span>
      );
    }

    return (
      <button ref={ref} className={`${combinedClassName} group`} {...props}>
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
