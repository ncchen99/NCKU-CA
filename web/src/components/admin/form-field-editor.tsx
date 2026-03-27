"use client";

import { useMemo, useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import type { FormField as FormFieldType, DependsOn } from "@/types";
import { useTranslations } from "next-intl";

/* ─── Constants ─── */

const FIELD_TYPES: FormFieldType["type"][] = [
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "select",
  "radio",
  "checkbox",
  "date",
  "file",
  "club_picker",
  "section_header",
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
  const base = `field_${type}`;
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
    <AppSelect
      value={value}
      onChange={onChange}
      options={options}
      className={className}
    />
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
  const t = useTranslations("adminFormFieldEditor");
  const [expanded, setExpanded] = useState(true);
  const hasOptions = HAS_OPTIONS_TYPES.includes(field.type);
  const isSection = field.type === "section_header";

  const fieldTypeOptions = useMemo(
    () => FIELD_TYPES.map((value) => ({ value, label: t(`types.${value}`) })),
    [t],
  );

  const prefillOptions = useMemo(
    () => [
      { value: "", label: t("prefill.none") },
      { value: "display_name", label: t("prefill.displayName") },
      { value: "email", label: t("prefill.email") },
      { value: "club_name", label: t("prefill.clubName") },
      { value: "club_category", label: t("prefill.clubCategory") },
    ],
    [t],
  );

  const operatorOptions: { value: DependsOn["operator"]; label: string }[] = useMemo(
    () => [
      { value: "equals", label: t("operators.equals") },
      { value: "not_equals", label: t("operators.notEquals") },
      { value: "contains", label: t("operators.contains") },
      { value: "is_empty", label: t("operators.isEmpty") },
      { value: "is_not_empty", label: t("operators.isNotEmpty") },
    ],
    [t],
  );

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
      updates.options = [t("defaults.option", { index: 1 }), t("defaults.option", { index: 2 })];
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
    const opts = [...(field.options ?? []), t("defaults.option", { index: (field.options?.length ?? 0) + 1 })];
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

  const typeLabel = t(`types.${field.type}`);

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
              {field.label || (isSection ? t("unnamed.section") : t("unnamed.field"))}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
              {typeLabel}
            </span>
            {field.required && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                {t("badges.required")}
              </span>
            )}
            {field.depends_on && (
              <EyeSlashIcon className="h-3.5 w-3.5 text-amber-500" title={t("depends.title")} />
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
            title={t("actions.moveUp")}
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
            title={t("actions.moveDown")}
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
            title={t("actions.delete")}
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
                {t("form.label")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputBase}
                value={field.label}
                onChange={(e) => patch({ label: e.target.value })}
                placeholder={isSection ? t("form.sectionPlaceholder") : t("form.fieldPlaceholder")}
              />
            </div>

            {/* Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                {t("form.type")}
              </label>
              <InlineSelect
                value={field.type}
                onChange={(v) => handleTypeChange(v as FormFieldType["type"])}
                options={fieldTypeOptions}
              />
            </div>

            {/* Field ID */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                {t("form.id")}
              </label>
              <input
                type="text"
                className={`${inputBase} font-mono text-xs`}
                value={field.id}
                onChange={(e) => patch({ id: e.target.value.replace(/\s+/g, "_") })}
                placeholder={t("form.idPlaceholder")}
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
                  {t("form.required")}
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
                  {t("form.lockIfPrefilled")}
                </label>
              </div>
            )}
          </div>

          {/* Placeholder */}
          {!isSection && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                {t("form.placeholder")}
              </label>
              <input
                type="text"
                className={inputBase}
                value={field.placeholder ?? ""}
                onChange={(e) => patch({ placeholder: e.target.value || undefined })}
                placeholder={t("form.placeholderHint")}
              />
            </div>
          )}

          {/* Pre-fill */}
          {!isSection && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                {t("form.prefill")}
              </label>
              <InlineSelect
                value={field.default_from_user ?? ""}
                onChange={(v) =>
                  patch({ default_from_user: v || undefined })
                }
                options={prefillOptions}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                {t("form.prefillHint")}
              </p>
            </div>
          )}

          {/* Options editor for select/radio/checkbox */}
          {hasOptions && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                {t("form.options")}
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
                      placeholder={t("defaults.option", { index: idx + 1 })}
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
                  {t("actions.addOption")}
                </button>
              </div>
            </div>
          )}

          {/* Validation */}
          {!isSection && field.type !== "file" && field.type !== "club_picker" && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                {t("validation.title")}
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {(field.type === "number" || field.type === "text" || field.type === "textarea") && (
                  <>
                    <div>
                      <label className="mb-1 block text-[11px] text-neutral-400">{t("validation.min")}</label>
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
                      <label className="mb-1 block text-[11px] text-neutral-400">{t("validation.max")}</label>
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
                  <label className="mb-1 block text-[11px] text-neutral-400">{t("validation.customMessage")}</label>
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
                    placeholder={t("validation.customMessagePlaceholder")}
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
                {t("depends.title")}
              </label>
              {hasDep && field.depends_on && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">{t("depends.field")}</label>
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
                    <label className="mb-1 block text-[11px] text-neutral-400">{t("depends.operator")}</label>
                    <InlineSelect
                      value={field.depends_on.operator}
                      onChange={(v) =>
                        updateDep({ operator: v as DependsOn["operator"] })
                      }
                      options={operatorOptions}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">{t("depends.value")}</label>
                    <input
                      type="text"
                      className={inputBase}
                      value={String(field.depends_on.value ?? "")}
                      onChange={(e) => updateDep({ value: e.target.value })}
                      placeholder={t("depends.value")}
                      disabled={
                        field.depends_on.operator === "is_empty" ||
                        field.depends_on.operator === "is_not_empty"
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-neutral-400">{t("depends.action")}</label>
                    <InlineSelect
                      value={field.depends_on.action}
                      onChange={(v) =>
                        updateDep({ action: v as DependsOn["action"] })
                      }
                      options={[
                        { value: "show", label: t("depends.show") },
                        { value: "hide", label: t("depends.hide") },
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
  const t = useTranslations("adminFormFieldEditor");
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);
  const allFieldIds = sortedFields.map((f) => f.id);

  function handleUpdate(index: number, updatedField: FormFieldType) {
    const next = [...fields];
    const realIndex = next.findIndex((f) => f.id === sortedFields[index].id);
    if (realIndex !== -1) next[realIndex] = updatedField;
    onChange(next);
  }

  function handleDelete(index: number) {
    const target = sortedFields[index];
    const next = fields.filter((f) => f.id !== target.id);
    // Re-index the orders
    const reIndexed = next
      .sort((a, b) => a.order - b.order)
      .map((f, i) => ({ ...f, order: i }));
    onChange(reIndexed);
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...sortedFields];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next.map((f, i) => ({ ...f, order: i })));
  }

  function handleMoveDown(index: number) {
    if (index >= sortedFields.length - 1) return;
    const next = [...sortedFields];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((f, i) => ({ ...f, order: i })));
  }

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
          {t("title")}
          <span className="ml-2 text-[11px] font-normal text-neutral-400">
            {t("count", { count: fields.length })}
          </span>
        </h3>
      </div>

      {/* Field list */}
      {sortedFields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-neutral-50 px-4 py-8 text-center">
          <p className="text-[13px] text-neutral-500">
            {t("empty")}
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
          variant="ghost"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="w-full justify-center gap-1.5 border-dashed"
        >
          <PlusIcon className="h-4 w-4" />
          {t("actions.addField")}
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
                    key={ft}
                    type="button"
                    onClick={() => handleAddField(ft)}
                    className="rounded-lg px-3 py-2 text-left text-[12px] font-medium text-neutral-700 transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {t(`types.${ft}`)}
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
