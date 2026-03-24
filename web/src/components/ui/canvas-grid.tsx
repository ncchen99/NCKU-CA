interface CanvasGridProps {
  className?: string;
  topFadeClassName?: string;
  bottomFadeClassName?: string;
  heightClassName?: string;
}

function CanvasGrid({
  className = "",
  topFadeClassName = "bg-gradient-to-b from-white to-transparent",
  bottomFadeClassName = "bg-gradient-to-t from-white to-transparent",
  heightClassName = "h-28",
}: CanvasGridProps) {
  return (
    <div
      className={`relative w-full overflow-hidden ${heightClassName} ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-border) 0px, var(--color-border) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(0deg, var(--color-border) 0px, var(--color-border) 1px, transparent 1px, transparent 48px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className={`absolute inset-x-0 top-0 h-1/2 ${topFadeClassName}`} />
      <div className={`absolute inset-x-0 bottom-0 h-1/2 ${bottomFadeClassName}`} />
    </div>
  );
}

export { CanvasGrid };
export type { CanvasGridProps };
