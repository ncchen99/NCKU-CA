import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "neutral" | "primary";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-red-50 text-red-700 ring-red-600/20",
  neutral: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
  primary: "bg-primary/10 text-primary ring-primary/20",
};

function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-mono font-[500] uppercase tracking-wide ring-1 ring-inset ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
