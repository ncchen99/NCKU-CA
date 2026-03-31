"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";

interface TocItem {
    id: string;
    text: string;
    depth: number;
}

interface CmsMarkdownWithTocClientProps {
    html: string;
    toc: TocItem[];
}

export function CmsMarkdownWithTocClient({ html, toc }: CmsMarkdownWithTocClientProps) {
    const contentRef = useRef<HTMLDivElement | null>(null);

    const handleSectionClick = useCallback(async (rawId: string) => {
        const sectionId = decodeURIComponent(rawId.trim());
        if (!sectionId) return;

        const sectionElement = document.getElementById(sectionId);
        if (!sectionElement) return;

        const headerElement = document.querySelector("header");
        const headerHeight =
            headerElement instanceof HTMLElement
                ? headerElement.getBoundingClientRect().height
                : 0;
        const scrollPadding = 12;
        const targetTop =
            window.scrollY +
            sectionElement.getBoundingClientRect().top -
            headerHeight -
            scrollPadding;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });

        const hash = `#${encodeURIComponent(sectionId)}`;
        const sectionUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);

        try {
            await navigator.clipboard.writeText(sectionUrl);
            toast("已經複製此連結", "success");
        } catch {
            toast("已經複製此連結", "success");
        }
    }, []);

    useEffect(() => {
        const contentElement = contentRef.current;
        if (!contentElement) return;

        const onHeadingAnchorClick = (event: MouseEvent) => {
            const targetNode = event.target;
            const clickTarget =
                targetNode instanceof Element
                    ? targetNode
                    : targetNode instanceof Node
                        ? targetNode.parentElement
                        : null;
            if (!clickTarget) return;

            const anchor = clickTarget.closest<HTMLAnchorElement>("a.anchor-link[href^='#']");
            if (anchor) {
                const href = anchor.getAttribute("href");
                if (!href) return;
                event.preventDefault();
                void handleSectionClick(href.slice(1));
                return;
            }

            const heading = clickTarget.closest<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]");
            if (!heading?.id) return;

            event.preventDefault();
            void handleSectionClick(heading.id);
        };

        contentElement.addEventListener("click", onHeadingAnchorClick);
        return () => {
            contentElement.removeEventListener("click", onHeadingAnchorClick);
        };
    }, [handleSectionClick]);

    return (
        <div className="flex gap-12 lg:gap-16">
            <div className="min-w-0 flex-1">
                <div
                    ref={contentRef}
                    className="cms-markdown max-w-[65ch] lg:max-w-[84ch] text-[15px] leading-[28px] text-neutral-700"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            <nav className="hidden w-56 shrink-0 lg:block">
                <div className="sticky top-20">
                    <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-neutral-950">
                        目錄
                    </h2>
                    {toc.length === 0 ? (
                        <p className="mt-4 text-[13px] text-neutral-500">
                            請在內容中使用 ##、### 標題以產生目錄。
                        </p>
                    ) : (
                        <ul className="mt-4 flex flex-col gap-1">
                            {toc.map((item) => (
                                <li key={`${item.id}-${item.text}`}>
                                    <a
                                        href={`#${item.id}`}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            void handleSectionClick(item.id);
                                        }}
                                        className={`block rounded-md px-3 py-2 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950 ${item.depth === 3 ? "pl-6" : ""
                                            }`}
                                    >
                                        {item.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </nav>
        </div>
    );
}
