"use client";

import { useState } from "react";
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { FORM_TEMPLATES, type FormTemplate } from "@/lib/form-templates";

interface FormTemplatePickerProps {
  onSelect: (template: FormTemplate) => void;
  onSkip: () => void;
}

const templateIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  expo_registration: ClipboardDocumentListIcon,
  winter_association_registration: ClipboardDocumentListIcon,
  general_registration: DocumentTextIcon,
  attendance_survey: CheckCircleIcon,
};

export function FormTemplatePicker({
  onSelect,
  onSkip,
}: FormTemplatePickerProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-neutral-950">
          選擇模板
        </h3>
        <p className="mt-1 text-[13px] text-neutral-500">
          從預設模板開始可快速建立表單，或選擇「空白表單」自行設定。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FORM_TEMPLATES.map((tpl) => {
          const Icon = templateIcons[tpl.key] ?? DocumentTextIcon;
          const isSelected = selectedKey === tpl.key;
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setSelectedKey(tpl.key)}
              className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20"
                  : "border-border hover:border-neutral-300 hover:bg-neutral-50/50"
              }`}
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-neutral-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[13px] font-semibold ${
                    isSelected ? "text-primary" : "text-neutral-900"
                  }`}
                >
                  {tpl.label}
                </p>
                <p className="mt-0.5 text-[12px] text-neutral-500 line-clamp-2">
                  {tpl.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                    {tpl.fields.length} 個欄位
                  </span>
                  {tpl.deposit_required && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      含保證金
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-700"
        >
          空白表單（不套用模板）
        </button>
        <button
          type="button"
          onClick={() => {
            const tpl = FORM_TEMPLATES.find((t) => t.key === selectedKey);
            if (tpl) onSelect(tpl);
          }}
          disabled={!selectedKey}
          className="inline-flex h-[36px] items-center rounded-full bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-40 disabled:pointer-events-none"
        >
          使用此模板
        </button>
      </div>
    </div>
  );
}
