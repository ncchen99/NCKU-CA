import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import {
  ChevronDownIcon,
  BoldIcon,
  CodeBracketIcon,
  SquaresPlusIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  ChatBubbleBottomCenterTextIcon,
  MinusIcon,
  TableCellsIcon,
} from "@heroicons/react/20/solid";
import { uploadAdminImage } from "@/lib/admin-image-upload";
import { useTranslations } from "next-intl";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  forms?: { id: string; title: string }[];
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(
    rehypeSanitize,
    {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        img: [
          ...(defaultSchema.attributes?.img ?? []),
          ["className"],
        ],
      },
    },
  )
  .use(rehypeStringify);

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = "320px",
  forms = [],
}: MarkdownEditorProps) {
  const t = useTranslations("adminMarkdownEditor");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const [html, setHtml] = useState("");
  const [formMenuOpen, setFormMenuOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const render = useCallback(async (md: string) => {
    try {
      const result = await processor.process(md);
      setHtml(String(result));
    } catch {
      setHtml(`<p class='text-red-500'>${t("renderFailed")}</p>`);
    }
  }, [t]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => render(value), 200);
    return () => clearTimeout(debounceRef.current);
  }, [value, render]);

  useEffect(() => {
    if (!formMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFormMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [formMenuOpen]);

  const insertText = (before: string, after: string = "") => {
    const textarea = document.getElementById("post-markdown-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);
    const selectedText = text.substring(start, end);

    const newValue = beforeText + before + selectedText + after + afterText;
    onChange(newValue);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const uploadImage = async (file: File) => {
    setImageUploadError("");
    setImageUploading(true);
    try {
      const data = await uploadAdminImage(file);

      const alt = file.name.replace(/\.[^/.]+$/, "") || t("imageAlt");
      insertText(`![${alt}](${data.url})`);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : t("imageUploadFailed"));
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  return (
    <div ref={containerRef}>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("label")}
      </label>
      <div
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
        style={{ minHeight }}
      >
        <div className="flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              {t("editor")}
            </div>
          </div>
          <div
            className="group/editor relative flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-neutral-50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30"
            style={{ minHeight }}
          >
            <div className="flex-1 overflow-auto">
              <Editor
                value={value}
                onValueChange={onChange}
                highlight={(code) => Prism.highlight(code, Prism.languages.markdown, "markdown")}
                textareaId="post-markdown-editor"
                placeholder={resolvedPlaceholder}
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

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 border-t border-border bg-white p-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file);
                }}
              />
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => insertText("## ")}
                  title={t("toolbar.h2")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <span className="text-[14px] font-bold">H2</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertText("### ")}
                  title={t("toolbar.h3")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <span className="text-[12px] font-bold">H3</span>
                </button>
              </div>

              <div className="mx-1 h-4 w-px bg-border" />

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => insertText("**", "**")}
                  title={t("toolbar.bold")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <BoldIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText("*", "*")}
                  title={t("toolbar.italic")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ItalicIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText("```\n", "\n```")}
                  title={t("toolbar.codeBlock")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <CodeBracketIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText("[", "](url)")}
                  title={t("toolbar.link")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mx-1 h-4 w-px bg-border" />

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => insertText("- ")}
                  title={t("toolbar.bulletList")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText("1. ")}
                  title={t("toolbar.numberList")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <NumberedListIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText("> ")}
                  title={t("toolbar.quote")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mx-1 h-4 w-px bg-border" />

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => insertText("\n---\n")}
                  title={t("toolbar.hr")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertText(t("tableTemplate"))}
                  title={t("toolbar.table")}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <TableCellsIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title={t("toolbar.image")}
                  disabled={imageUploading}
                  className="flex h-8 items-center justify-center gap-1 rounded px-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PhotoIcon className="h-4 w-4" />
                  {imageUploading ? (
                    <ArrowUpTrayIcon className="h-4 w-4 animate-bounce" />
                  ) : (
                    <span className="text-[11px] font-medium">{t("toolbar.upload")}</span>
                  )}
                </button>
              </div>

              <div className="mx-1 h-4 w-px bg-border" />

              {/* Form Selection */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFormMenuOpen(!formMenuOpen)}
                  className={`flex h-8 items-center gap-1 rounded bg-neutral-50 px-2 text-[12px] font-medium transition-colors hover:bg-neutral-100 ${formMenuOpen ? 'bg-neutral-100 text-primary' : 'text-neutral-600'}`}
                >
                  <SquaresPlusIcon className="h-4 w-4" />
                  {t("toolbar.embedForm")}
                  <ChevronDownIcon className={`h-3 w-3 transition-transform ${formMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {formMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
                    <div className="border-b border-border bg-neutral-50/50 px-3 py-1.5 text-[11px] font-semibold text-neutral-400">
                      {t("formMenu.title")}
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {forms.length === 0 ? (
                        <div className="px-3 py-2 text-[12px] text-neutral-400 text-center">{t("formMenu.empty")}</div>
                      ) : (
                        forms.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              insertText(`\n\n[${t("formMenu.linkPrefix")}${f.title}](/forms/${f.id} "form-embed")\n`);
                              setFormMenuOpen(false);
                            }}
                            className="flex w-full px-3 py-2 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 hover:text-primary transition-colors"
                          >
                            {f.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {imageUploadError && (
              <div className="border-t border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                {imageUploadError}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            {t("preview")}
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
          outline: none !important;
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

