"use client";

import { useState, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import type { FormField as FormFieldType, DependsOn } from "@/types";

/* ─── Constants ─── */

const FIELD_TYPES: { value: FormFieldType["type"]; label: string }[] = [
  { value: "text", label: "單行文字" },
  { value: "textarea", label: "多行文字" },
  { value: "number", label: "數字" },
  { value: "email", label: "電子信箱" },
  { value: "phone", label: "電話號碼" },
  { value: "select", label: "下拉選單" },
  { value: "radio", label: "單選題" },
  { value: "checkbox", label: "多選題" },
  { value: "date", label: "日期" },
  { value: "file", label: "檔案上傳" },
  { value: "club_picker", label: "社團選擇" },
  { value: "section_header", label: "區段標題" },
];

const PREFILL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "不預填" },
  { value: "display_name", label: "使用者姓名" },
  { value: "email", label: "使用者 Email" },
  { value: "club_name", label: "社團名稱" },
  { value: "club_category", label: "社團類別" },
];

const OPERATOR_OPTIONS: {
  value: DependsOn["operator"];
  label: string;
}[] = [
  { value: "equals", label: "等於" },
  { value: "not_equals", label: "不等於" },
  { value: "contains", label: "包含" },
  { value: "is_empty", label: "為空" },
  { value: "is_not_empty", label: "不為空" },
];

const HAS_OPTIONS_TYPES: FormFieldType["type"][] = [
  "select",
  "radio",
  "checkbox",
];

/* ─── Types ─── */

interface FormFieldEditorProps {
  fields: FormFieldType[];
  onChange: (fields: FormFieldType[]) => void;
  allFieldIds?: string[];
}

/* ─── Helpers ─── */

function generateFieldId(
  existingIds: string[],
  type: FormFieldType["type"],
): string {
  let base = `field_${type}`;
  let num = 1;
  while (existingIds.includes(`${base}_${num}`)) num++;
  return `${base}_${num}`;
}

function createEmptyField(
  existingIds: string[],
  type: FormFieldType["type"] = "text",
  order: number,
): FormFieldType {
  return {
    id: generateFieldId(existingIds, type),
    type,
    label: "",
    required: false,
    order,
  };
}

/* ─── Shared CSS ─── */

const inputBase =
  "block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:bg-neutral-50 disabled:text-neutral-500";

const selectBase =
  "block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30";

/* ─── Inline Select (lightweight) ─── */

function InlineSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${selectBase} ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ─── Single Field Card ─── */

function FieldCard({
  field,
  index,
  total,
  allFieldIds,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: FormFieldType;
  index: number;
  total: number;
  allFieldIds: string[];
  onUpdate: (field: FormFieldType) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasOptions = HAS_OPTIONS_TYPES.includes(field.type);
  const isSection = field.type === "section_header";

  // Other field ids excluding current, for depends_on
  const otherFieldIds = allFieldIds.filter((id) => id !== field.id);

  function patch(updates: Partial<FormFieldType>) {
    onUpdate({ ...field, ...updates } as FormFieldType);
  }

  function handleTypeChange(newType: FormFieldType["type"]) {
    const updates: Partial<FormFieldType> = { type: newType };
    if (!HAS_OPTIONS_TYPES.includes(newType)) {
      updates.options = undefined;
    } else if (!field.options?.length) {
      updates.options = ["選項 1", "選項 2"];
    }
    if (newType === "section_header") {
      updates.required = false;
      updates.placeholder = undefined;
      updates.validation = undefined;
      updates.default_from_user = undefined;
    }
    patch(updates);
  }

  /* ── Options array editor ── */
  function handleAddOption() {
    const opts = [...(field.options ?? []), `選項 ${(field.options?.length ?? 0) + 1}`];
    patch({ options: opts });
  }

  function handleChangeOption(idx: number, value: string) {
    const opts = [...(field.options ?? [])];
    opts[idx] = value;
    patch({ options: opts });
  }

  function handleRemoveOption(idx: number) {
    const opts = [...(field.options ?? [])].filter((_, i) => i !== idx);
    patch({ options: opts });
  }

  /* ── DependsOn ── */
  const hasDep = !!field.depends_on;

  function toggleDependsOn() {
    if (hasDep) {
      patch({ depends_on: undefined });
    } else {
      patch({
        depends_on: {
          field_id: otherFieldIds[0] ?? "",
          operator: "equals",
          value: "",
          action: "show",
        },
      });
    }
  }

  function updateDep(dp: Partial<DependsOn>) {
    patch({ depends_on: { ...field.depends_on!, ...dp } });
  }

  const typeLabel =
    FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type;

  return (
    <div className="group rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(10,10,10,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(10,10,10,0.06)]">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <Bars3Icon className="h-4 w-4 shrink-0 text-neutral-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-neutral-950">
              {field.label || (isSection ? "（區段標題）" : "（未命名欄位）")}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
              {typeLabel}
            </span>
            {field.required && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                必填
              </span>
            )}
            {field.depends_on && (
              <EyeSlashIcon className="h-3.5 w-3.5 text-amber-500" title="條件顯示" />
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30"
            title="上移"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === total - 1}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30"
            title="下移"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="刪除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Label */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                標籤名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputBase}
                value={field.label}
                onChange={(e) => patch({ label: e.target.value })}
                placeholder={isSection ? "區段標題文字" : "欄位顯示名稱"}
              />
            </div>

            {/* Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                欄位類型
              </label>
              <InlineSelect
                value={field.type}
                onChange={(v) => handleTypeChange(v as FormFieldType["type"])}
                options={FIELD_TYPES}
              />
            </div>

            {/* Field ID */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                欄位 ID
              </label>
              <input
                type="text"
                className={`${inputBase} font-mono text-xs`}
                value={field.id}
                onChange={(e) => patch({ id: e.target.value.replace(/\s+/g, "_") })}
                placeholder="field_id"
              />
            </div>

            {/* Required + ReadOnly */}
            {!isSection && (
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => patch({ required: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary accent-primary"
                  />
                  必填
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={field.read_only_if_prefilled ?? false}
                    onChange={(e) =>
                      patch({ read_only_if_prefilled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border text-primary accent-primary"
                  />
                  預填後鎖定
                </label>
              </div>
            )}
          </div>

          {/* Placeholder */}
          {!isSection && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                輸入提示（Placeholder）
              </label>
              <input
                type="text"
                className={inputBase}
                value={field.placeholder ?? ""}
                onChange={(e) => patch({ placeholder: e.target.value || undefined })}
                placeholder="如：請輸入..."
              />
            </div>
          )}

          {/* Pre-fill */}
          {!isSection && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                自動預填
              </label>
              <InlineSelect
                value={field.default_from_user ?? ""}
                onChange={(v) =>
                  patch({ default_from_user: v || undefined })
                }
                options={PREFILL_OPTIONS}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                從使用者資料自動帶入欄位預設值
              </p>
            </div>
          )}

          {/* Options editor for select/radio/checkbox */}
          {hasOptions && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                選項列表
              </label>
              <div className="flex flex-col gap-2">
                {(field.options ?? []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-500">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      className={`${inputBase} flex-1`}
                      value={opt}
                      onChange={(e) => handleChangeOption(idx, e.target.value)}
                      placeholder={`選項 ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-1 inline-flex items-center gap-1 self-start rounded-lg px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  新增選項
                </button>
              </div>
            </div>
          )}

          {/* Validation */}
          {!isSection && field.type !== "file" && field.type !== "club_picker" && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                驗證規則
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {(field.type === "number" || field.type === "text" || field.type === "textarea") && (
                  <>
                    <div>
                      <label className="mb-1 block text-[11px] text-neutral-400">最小值 / 最短</label>
                      <input
                        type="number"
                        className={inputBase}
                        value={field.validation?.min ?? ""}
                        onChange={(e) =>
                          patch({
                            validation: {
                              ...field.validation,
                              min: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        placeholder="—"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-neutral-400">最大值 / 最長</label>
                      <input
                        type="number"
                        className={inputBase}
                        value={field.validation?.max ?? ""}
                        onChange={(e) =>
                          patch({
                            validation: {
                              ...field.validation,
                              max: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        placeholder="—"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-400">自訂錯誤訊息</label>
                  <input
                    type="text"
                    className={inputBase}
                    value={field.validation?.custom_message ?? ""}
                    onChange={(e) =>
                      patch({
                        validation: {
                          ...field.validation,
                          custom_message: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="驗證失敗時顯示的訊息"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional logic (depends_on) */}
          {!isSection && otherFieldIds.length > 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-neutral-50/50 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                <input
                  type="checkbox"
                  checked={hasDep}
                  onChange={toggleDependsOn}
                  className="h-4 w-4 rounded border-border text-primary accent-primary"
                />
                條件顯示（depends_on）
              </label>
              {hasDep && field.depends_on && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">依賴欄位</label>
                    <InlineSelect
                      value={field.depends_on.field_id}
                      onChange={(v) => updateDep({ field_id: v })}
                      options={otherFieldIds.map((id) => ({
                        value: id,
                        label: id,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">運算子</label>
                    <InlineSelect
                      value={field.depends_on.operator}
                      onChange={(v) =>
                        updateDep({ operator: v as DependsOn["operator"] })
                      }
                      options={OPERATOR_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">比對值</label>
                    <input
                      type="text"
                      className={inputBase}
                      value={String(field.depends_on.value ?? "")}
                      onChange={(e) => updateDep({ value: e.target.value })}
                      placeholder="比對值"
                      disabled={
                        field.depends_on.operator === "is_empty" ||
                        field.depends_on.operator === "is_not_empty"
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">動作</label>
                    <InlineSelect
                      value={field.depends_on.action}
                      onChange={(v) =>
                        updateDep({ action: v as DependsOn["action"] })
                      }
                      options={[
                        { value: "show", label: "顯示" },
                        { value: "hide", label: "隱藏" },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Editor ─── */

export function FormFieldEditor({
  fields,
  onChange,
}: FormFieldEditorProps) {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);
  const allFieldIds = sortedFields.map((f) => f.id);

  const handleUpdate = useCallback(
    (index: number, updatedField: FormFieldType) => {
      const next = [...fields];
      const realIndex = next.findIndex((f) => f.id === sortedFields[index].id);
      if (realIndex !== -1) next[realIndex] = updatedField;
      onChange(next);
    },
    [fields, sortedFields, onChange],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const target = sortedFields[index];
      const next = fields.filter((f) => f.id !== target.id);
      // Re-index the orders
      const reIndexed = next
        .sort((a, b) => a.order - b.order)
        .map((f, i) => ({ ...f, order: i }));
      onChange(reIndexed);
    },
    [fields, sortedFields, onChange],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...sortedFields];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next.map((f, i) => ({ ...f, order: i })));
    },
    [sortedFields, onChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= sortedFields.length - 1) return;
      const next = [...sortedFields];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next.map((f, i) => ({ ...f, order: i })));
    },
    [sortedFields, onChange],
  );

  const [addMenuOpen, setAddMenuOpen] = useState(false);

  function handleAddField(type: FormFieldType["type"]) {
    const maxOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.order)) + 1 : 0;
    const newField = createEmptyField(allFieldIds, type, maxOrder);
    onChange([...fields, newField]);
    setAddMenuOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-950">
          表單欄位
          <span className="ml-2 text-[11px] font-normal text-neutral-400">
            共 {fields.length} 個
          </span>
        </h3>
      </div>

      {/* Field list */}
      {sortedFields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-neutral-50 px-4 py-8 text-center">
          <p className="text-[13px] text-neutral-500">
            尚無欄位，點擊下方按鈕新增。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedFields.map((field, idx) => (
            <FieldCard
              key={field.id}
              field={field}
              index={idx}
              total={sortedFields.length}
              allFieldIds={allFieldIds}
              onUpdate={(f) => handleUpdate(idx, f)}
              onDelete={() => handleDelete(idx)}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
            />
          ))}
        </div>
      )}

      {/* Add button */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="w-full justify-center gap-1.5 border-dashed"
        >
          <PlusIcon className="h-4 w-4" />
          新增欄位
        </Button>
        {addMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setAddMenuOpen(false)}
            />
            <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[280px] overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-lg">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {FIELD_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => handleAddField(ft.value)}
                    className="rounded-lg px-3 py-2 text-left text-[12px] font-medium text-neutral-700 transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
