import { ArrowLongRightIcon } from "@heroicons/react/20/solid";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

function SectionHeading({
  title,
  subtitle,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`flex items-baseline gap-2.5 ${className}`}>
      <h2 className="text-[22px] font-[700] tracking-tight text-neutral-950">
        {title}
      </h2>
      {subtitle && (
        <span className="text-sm font-[450] text-neutral-600">{subtitle}</span>
      )}
    </div>
  );
}

interface ViewAllLinkProps {
  href: string;
  label?: string;
  className?: string;
}

function ViewAllLink({
  href,
  label = "查看全部",
  className = "",
}: ViewAllLinkProps) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-1 text-sm font-[450] text-primary transition-colors hover:text-primary-dark ${className}`}
    >
      {label}
      <ArrowLongRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
    </a>
  );
}

export { SectionHeading, ViewAllLink };
export type { SectionHeadingProps, ViewAllLinkProps };
