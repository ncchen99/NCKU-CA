import { verifyUserSession } from "@/lib/session-auth";
import {
  DuplicateFormSubmissionError,
  getForm,
  submitFormResponse,
} from "@/lib/firestore/forms";
import { anyTimestampToDate } from "@/lib/datetime";
import type { DependsOn, FormField } from "@/types";

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function evaluateDependsOn(
  dependsOn: DependsOn,
  answers: Record<string, unknown>,
): boolean {
  const depVal = answers[dependsOn.field_id];
  const { operator, value, action } = dependsOn;

  let match = false;
  switch (operator) {
    case "equals":
      match = depVal === value;
      break;
    case "not_equals":
      match = depVal !== value;
      break;
    case "contains":
      if (Array.isArray(depVal)) {
        match = depVal.includes(value);
      } else if (typeof depVal === "string" && typeof value === "string") {
        match = depVal.includes(value);
      }
      break;
    case "is_empty":
      match = isEmptyValue(depVal);
      break;
    case "is_not_empty":
      match = !isEmptyValue(depVal);
      break;
  }

  return action === "show" ? match : !match;
}

function shouldShowField(
  field: FormField,
  answers: Record<string, unknown>,
): boolean {
  if (!field.depends_on) return true;
  return evaluateDependsOn(field.depends_on, answers);
}

function validateField(
  field: FormField,
  rawValue: unknown,
): string | null {
  if (isEmptyValue(rawValue)) return null;

  const value = rawValue;

  if (field.type === "email") {
    if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${field.label} 格式不正確`;
    }
  }

  if (field.type === "phone") {
    if (typeof value !== "string" || !/^[0-9+()\-\s]{6,20}$/.test(value)) {
      return `${field.label} 格式不正確`;
    }
  }

  if (field.type === "number") {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) {
      return `${field.label} 必須是數字`;
    }
    if (field.validation?.min !== undefined && num < field.validation.min) {
      return field.validation.custom_message ?? `${field.label} 不可小於 ${field.validation.min}`;
    }
    if (field.validation?.max !== undefined && num > field.validation.max) {
      return field.validation.custom_message ?? `${field.label} 不可大於 ${field.validation.max}`;
    }
  }

  if ((field.type === "select" || field.type === "radio") && field.options?.length) {
    if (typeof value !== "string" || !field.options.includes(value)) {
      return `${field.label} 選項無效`;
    }
  }

  if (field.type === "checkbox") {
    if (!Array.isArray(value)) {
      return `${field.label} 格式不正確`;
    }
    if (field.options?.length) {
      const invalid = value.some((v) => !field.options!.includes(String(v)));
      if (invalid) {
        return `${field.label} 選項無效`;
      }
    }
  }

  if (field.validation?.pattern && typeof value === "string") {
    try {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return field.validation.custom_message ?? `${field.label} 格式不正確`;
      }
    } catch {
      // ignore invalid pattern in schema
    }
  }

  return null;
}

function sanitizeAnswers(
  fields: FormField[],
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const fieldIdSet = new Set(fields.map((f) => f.id));
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (!fieldIdSet.has(key)) continue;
    if (typeof value === "string") {
      sanitized[key] = value.trim();
      continue;
    }
    if (Array.isArray(value)) {
      sanitized[key] = value.map((v) => (typeof v === "string" ? v.trim() : v));
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { formId } = await params;

  try {
    const body = (await request.json()) as {
      club_id?: string;
      answers?: Record<string, unknown>;
    };

    const clubId = body.club_id?.trim();
    const answers = body.answers;

    if (!clubId) {
      return Response.json({ error: "缺少 club_id" }, { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return Response.json({ error: "缺少回答內容" }, { status: 400 });
    }

    // 驗證表單是否存在且開放
    const form = await getForm(formId);
    if (!form) {
      return Response.json({ error: "查無此表單" }, { status: 404 });
    }

    const closesAt = anyTimestampToDate(form.closes_at);
    const isClosed =
      form.status === "closed" || (closesAt && closesAt < new Date());

    if (isClosed) {
      return Response.json({ error: "此表單已截止" }, { status: 403 });
    }

    const fields = form.fields ?? [];
    const sanitizedAnswers = sanitizeAnswers(fields, answers);

    // 驗證可見欄位與必填欄位
    for (const field of fields) {
      if (field.type === "section_header") continue;
      if (!shouldShowField(field, sanitizedAnswers)) continue;

      const val = sanitizedAnswers[field.id];

      if (field.required && isEmptyValue(val)) {
        return Response.json(
          { error: `${field.label} 為必填欄位` },
          { status: 400 }
        );
      }

      const invalidReason = validateField(field, val);
      if (invalidReason) {
        return Response.json({ error: invalidReason }, { status: 400 });
      }
    }

    const responseId = await submitFormResponse(formId, {
      form_id: formId,
      club_id: clubId,
      submitted_by_uid: session.uid,
      answers: sanitizedAnswers,
    }, {
      depositPolicy: form.deposit_policy,
      formFields: fields,
      updatedByUid: session.uid,
    });

    return Response.json({ ok: true, response_id: responseId });
  } catch (error) {
    if (error instanceof DuplicateFormSubmissionError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Form submit error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "送出表單失敗",
      },
      { status: 500 }
    );
  }
}
