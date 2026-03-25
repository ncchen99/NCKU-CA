"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { ClubSearchSelect } from "@/components/shared/club-search-select";
import type { FormField } from "@/types";

/* ─── 欄位型別中文 ─── */
const fieldTypeLabels: Record<string, string> = {
  text: "文字輸入",
  email: "電子信箱",
  phone: "電話號碼",
  number: "數字",
  select: "下拉選單",
  radio: "單選題",
  checkbox: "多選題",
  textarea: "長文字",
  date: "日期",
  file: "檔案上傳",
  club_picker: "社團選擇",
  section_header: "",
};

/* ─── 解析 default_from_user 值 ─── */
function resolveDefault(
  field: FormField,
  user: { display_name: string; email: string; club_id?: string; club_name?: string; club_category?: string } | null
): string {
  if (!user || !field.default_from_user) return "";
  const map: Record<string, string> = {
    display_name: user.display_name || "",
    email: user.email || "",
    club_name: user.club_name || "",
    club_id: user.club_id || "",
    club_category: user.club_category || "",
  };
  return map[field.default_from_user] ?? "";
}

/* ─── 單一欄位 renderer ─── */
function FormFieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
}) {
  const inputClasses =
    "flex h-10 w-full items-center rounded-lg border bg-white px-3 text-[13px] text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary " +
    (error ? "border-red-400" : "border-border");

  if (field.type === "section_header") {
    return (
      <div className="border-b border-border pb-2 pt-4">
        <h3 className="text-[15px] font-semibold text-neutral-950">
          {field.label}
        </h3>
      </div>
    );
  }

  const strVal = (value ?? "") as string;

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-neutral-950">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          className={
            "w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[96px] resize-y " +
            (error ? "border-red-400" : "border-border")
          }
          placeholder={field.placeholder || fieldTypeLabels[field.type]}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "club_picker" ? (
        <ClubSearchSelect
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={field.placeholder || "請選擇您的社團"}
          allowClear={false}
          error={!!error}
        />
      ) : field.type === "select" ? (
        <select
          className={inputClasses}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {field.placeholder || "請選擇..."}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "radio" ? (
        <div className="flex flex-wrap items-center gap-4 py-1">
          {(field.options ?? ["是", "否"]).map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-1.5 text-[13px] text-neutral-700"
            >
              <input
                type="radio"
                name={field.id}
                className="h-4 w-4 accent-primary"
                checked={strVal === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="flex flex-wrap items-center gap-4 py-1">
          {(field.options ?? []).map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt);
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-1.5 text-[13px] text-neutral-700"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary rounded"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      onChange(arr.filter((v) => v !== opt));
                    } else {
                      onChange([...arr, opt]);
                    }
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      ) : field.type === "date" ? (
        <input
          type="date"
          className={inputClasses}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "number" ? (
        <input
          type="number"
          className={inputClasses}
          placeholder={field.placeholder || fieldTypeLabels[field.type]}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      ) : field.type === "email" ? (
        <input
          type="email"
          className={inputClasses}
          placeholder={field.placeholder || fieldTypeLabels[field.type]}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "phone" ? (
        <input
          type="tel"
          className={inputClasses}
          placeholder={field.placeholder || fieldTypeLabels[field.type]}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={inputClasses}
          placeholder={field.placeholder || fieldTypeLabels[field.type] || field.type}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && (
        <p className="mt-1 text-[12px] text-red-500">{error}</p>
      )}
    </div>
  );
}

/* ─── 主元件 ─── */
export function FormClient({
  formId,
  fields,
}: {
  formId: string;
  fields: FormField[];
}) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);

  // 回答 state：{ [field.id]: value }
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // 依據登入使用者自動帶入預設值
  useEffect(() => {
    if (!user || prefilled) return;

    const defaults: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.default_from_user) {
        // club_picker 特殊處理：帶入 club_id
        if (field.type === "club_picker" && field.default_from_user === "club_name") {
          defaults[field.id] = user.club_id || "";
        } else {
          const resolved = resolveDefault(field, user);
          if (resolved) {
            defaults[field.id] = resolved;
          }
        }
      }
    }

    if (Object.keys(defaults).length > 0) {
      setAnswers((prev) => {
        const merged = { ...defaults };
        // 保留使用者已手動修改的值
        for (const [k, v] of Object.entries(prev)) {
          if (v !== "" && v !== undefined) {
            merged[k] = v;
          }
        }
        return merged;
      });
    }
    setPrefilled(true);
  }, [user, fields, prefilled]);

  const setAnswer = useCallback(
    (fieldId: string, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [fieldId]: value }));
      // 清除 error
      setErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    },
    [],
  );

  // 依條件邏輯判斷是否顯示欄位
  const shouldShow = useCallback(
    (field: FormField): boolean => {
      if (!field.depends_on) return true;
      const depVal = answers[field.depends_on.field_id];
      const { operator, value, action } = field.depends_on;

      let match = false;
      switch (operator) {
        case "equals":
          match = depVal === value;
          break;
        case "not_equals":
          match = depVal !== value;
          break;
        case "contains":
          match =
            typeof depVal === "string" &&
            typeof value === "string" &&
            depVal.includes(value);
          break;
        case "is_empty":
          match = depVal === "" || depVal == null;
          break;
        case "is_not_empty":
          match = depVal !== "" && depVal != null;
          break;
      }

      return action === "show" ? match : !match;
    },
    [answers],
  );

  // 驗證
  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const field of fields) {
      if (!shouldShow(field)) continue;
      if (field.type === "section_header") continue;
      const val = answers[field.id];
      if (field.required) {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          errs[field.id] = `${field.label} 為必填欄位`;
        }
      }
      if (field.type === "email" && val && typeof val === "string") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errs[field.id] = "請輸入有效的 Email";
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!user) return;
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      // 取得 club_id：如果有 club_picker 欄位就用它的值，否則用使用者的 club_id
      let clubId = user.club_id || "";
      const clubField = fields.find((f) => f.type === "club_picker");
      if (clubField && answers[clubField.id]) {
        clubId = answers[clubField.id] as string;
      }

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_id: clubId,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "送出表單失敗");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "送出表單失敗");
    } finally {
      setSubmitting(false);
    }
  }

  // 提交成功畫面
  if (submitted) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-[0_0_0_1px_rgba(10,10,10,0.08)] text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-neutral-950">表單已送出</h2>
        <p className="mt-2 text-[14px] text-neutral-600">
          感謝您的填寫！我們已收到您的回覆。
        </p>
      </div>
    );
  }

  // 載入中
  if (authLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
        <div className="flex flex-col gap-5">
          {fields.map((field) => (
            <div key={field.id} className="animate-pulse">
              <div className="mb-1.5 h-4 w-24 rounded bg-neutral-100" />
              <div className="h-10 rounded-lg bg-neutral-50" />
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <p className="text-[12px] text-neutral-400">登入狀態檢查中...</p>
          <div className="h-[38px] w-[90px] rounded-full bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  // 未登入
  if (!user) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
        <div className="flex flex-col gap-5">
          {fields.map((field) => {
            if (field.type === "section_header") {
              return (
                <div key={field.id} className="border-b border-border pb-2 pt-4">
                  <h3 className="text-[15px] font-semibold text-neutral-950">{field.label}</h3>
                </div>
              );
            }
            return (
              <div key={field.id}>
                <label className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-neutral-950">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <div className="h-24 rounded-lg border border-border bg-neutral-100 px-3 py-2 cursor-not-allowed">
                    <span className="text-[13px] text-neutral-400">
                      {field.placeholder || fieldTypeLabels[field.type]}
                    </span>
                  </div>
                ) : field.type === "radio" ? (
                  <div className="flex flex-wrap items-center gap-4 py-1 opacity-50">
                    {(field.options ?? ["是", "否"]).map((opt) => (
                      <label key={opt} className="flex items-center gap-1.5 text-[13px] text-neutral-400">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300">
                          <span className="h-1.5 w-1.5 rounded-full" />
                        </span>
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : field.type === "checkbox" ? (
                  <div className="flex flex-wrap items-center gap-4 py-1 opacity-50">
                    {(field.options ?? []).map((opt) => (
                      <label key={opt} className="flex items-center gap-1.5 text-[13px] text-neutral-400">
                        <span className="flex h-4 w-4 items-center justify-center rounded border border-neutral-300">
                          <span className="h-2 w-2" />
                        </span>
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-10 items-center rounded-lg border border-border bg-neutral-100 px-3 cursor-not-allowed">
                    <span className="text-[13px] text-neutral-400">
                      {field.placeholder || fieldTypeLabels[field.type] || field.type}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <p className="text-[12px] text-neutral-400">請先登入後再填寫表單</p>
          <a
            href={loginHref}
            className="inline-flex h-[38px] items-center rounded-full bg-primary px-5 text-[14px] font-[550] text-white transition-colors hover:bg-primary-light"
          >
            登入以提交
          </a>
        </div>
      </div>
    );
  }

  // 已登入 → 互動式表單
  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
      <div className="flex flex-col gap-5">
        {fields.map((field) => {
          if (!shouldShow(field)) return null;
          return (
            <FormFieldInput
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(val) => setAnswer(field.id, val)}
              error={errors[field.id]}
            />
          );
        })}
        {fields.length === 0 && (
          <p className="py-4 text-center text-[13px] text-neutral-500">
            此表單目前尚無欄位。管理員可在後台設定表單欄位。
          </p>
        )}
      </div>

      {submitError && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-700 ring-1 ring-inset ring-red-200">
          {submitError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <p className="text-[12px] text-neutral-400">
          已登入為{" "}
          <span className="font-medium text-neutral-700">
            {user.display_name || user.email}
          </span>
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex h-[38px] items-center rounded-full bg-primary px-5 text-[14px] font-[550] text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "送出中..." : "送出表單"}
        </button>
      </div>
    </div>
  );
}
