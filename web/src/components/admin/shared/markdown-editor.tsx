"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "輸入 Markdown 內容…",
  minHeight = "320px",
}: MarkdownEditorProps) {
  const [html, setHtml] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const render = useCallback(async (md: string) => {
    try {
      const result = await processor.process(md);
      setHtml(String(result));
    } catch {
      setHtml("<p class='text-red-500'>渲染失敗</p>");
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => render(value), 200);
    return () => clearTimeout(debounceRef.current);
  }, [value, render]);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        內容 (Markdown)
      </label>
      <div
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
        style={{ minHeight }}
      >
        <div className="flex flex-col">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            編輯
          </div>
          <div
            className="markdown-editor-wrapper flex-1 overflow-auto rounded-lg border border-border bg-neutral-50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30"
            style={{ minHeight }}
          >
            <Editor
              value={value}
              onValueChange={onChange}
              highlight={(code) => Prism.highlight(code, Prism.languages.markdown, "markdown")}
              textareaId="post-markdown-editor"
              placeholder={placeholder}
              padding={12}
              className="markdown-editor h-full min-h-full"
              style={{
                minHeight,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.7,
                background: "transparent",
              }}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            預覽
          </div>
          <div
            className="markdown-preview flex-1 overflow-y-auto rounded-lg border border-border bg-white px-4 py-3 text-sm leading-relaxed text-neutral-800"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
      <style>{`
        .markdown-editor textarea {
          outline: none;
          color: #111827;
          caret-color: #111827;
        }
        .markdown-editor pre {
          margin: 0;
        }
        .markdown-editor .token.title,
        .markdown-editor .token.important,
        .markdown-editor .token.bold {
          color: #1d4ed8;
          font-weight: 600;
        }
        .markdown-editor .token.italic {
          color: #7c3aed;
          font-style: italic;
        }
        .markdown-editor .token.url,
        .markdown-editor .token.link {
          color: #2563eb;
        }
        .markdown-editor .token.code,
        .markdown-editor .token.blockquote {
          color: #0f766e;
        }
        .markdown-editor .token.list,
        .markdown-editor .token.hr {
          color: #94a3b8;
        }
        .markdown-editor .token.punctuation {
          color: #64748b;
        }
        .markdown-preview h1 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.4em; line-height: 1.3; }
        .markdown-preview h2 { font-size: 1.25em; font-weight: 600; margin: 0.7em 0 0.3em; line-height: 1.3; }
        .markdown-preview h3 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.3em; }
        .markdown-preview p { margin: 0.75em 0; }
        .markdown-preview p + p { margin-top: 1em; }
        .markdown-preview ul, .markdown-preview ol { padding-left: 1.5em; margin: 0.5em 0; }
        .markdown-preview li { margin: 0.2em 0; }
        .markdown-preview ul { list-style-type: disc; }
        .markdown-preview ol { list-style-type: decimal; }
        .markdown-preview code { background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; font-family: ui-monospace, monospace; }
        .markdown-preview pre { background: #1e1e2e; color: #cdd6f4; padding: 1em; border-radius: 8px; overflow-x: auto; margin: 0.8em 0; }
        .markdown-preview pre code { background: transparent; padding: 0; color: inherit; }
        .markdown-preview blockquote { border-left: 3px solid #d4d4d8; padding-left: 1em; margin: 0.5em 0; color: #71717a; }
        .markdown-preview a { color: #2563eb; text-decoration: underline; }
        .markdown-preview hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1em 0; }
        .markdown-preview table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
        .markdown-preview th, .markdown-preview td { border: 1px solid #e5e7eb; padding: 0.4em 0.8em; text-align: left; }
        .markdown-preview th { background: #f9fafb; font-weight: 600; }
        .markdown-preview img { max-width: 100%; border-radius: 6px; }
      `}</style>
    </div>
  );
}
