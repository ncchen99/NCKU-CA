import { verifyUserSession } from "@/lib/session-auth";
import {
  getForm,
  getFormResponseById,
  updateFormResponse,
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
  dep: DependsOn,
  answers: Record<string, unknown>,
): boolean {
  const depVal = answers[dep.field_id];
  let match = false;
  switch (dep.operator) {
    case "equals":
      match = depVal === dep.value;
      break;
    case "not_equals":
      match = depVal !== dep.value;
      break;
    case "contains":
      if (Array.isArray(depVal)) match = depVal.includes(dep.value);
      else if (typeof depVal === "string" && typeof dep.value === "string")
        match = depVal.includes(dep.value);
      break;
    case "is_empty":
      match = isEmptyValue(depVal);
      break;
    case "is_not_empty":
      match = !isEmptyValue(depVal);
      break;
  }
  return dep.action === "show" ? match : !match;
}

function shouldShow(field: FormField, answers: Record<string, unknown>): boolean {
  return !field.depends_on || evaluateDependsOn(field.depends_on, answers);
}

function sanitizeAnswers(
  fields: FormField[],
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = new Set(fields.map((f) => f.id));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!allowed.has(k)) continue;
    if (typeof v === "string") out[k] = v.trim();
    else if (Array.isArray(v))
      out[k] = v.map((x) => (typeof x === "string" ? x.trim() : x));
    else out[k] = v;
  }
  return out;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string; responseId: string }> },
) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { formId, responseId } = await params;
  try {
    const existing = await getFormResponseById(formId, responseId);
    if (!existing) {
      return Response.json({ error: "查無此回覆" }, { status: 404 });
    }
    if (existing.submitted_by_uid !== session.uid) {
      return Response.json({ error: "無權檢視此回覆" }, { status: 403 });
    }
    return Response.json({
      response_id: existing.id,
      club_id: existing.club_id,
      answers: existing.answers,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "讀取失敗" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ formId: string; responseId: string }> },
) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { formId, responseId } = await params;

  try {
    const body = (await request.json()) as {
      answers?: Record<string, unknown>;
    };
    const answers = body.answers;
    if (!answers || typeof answers !== "object") {
      return Response.json({ error: "缺少回答內容" }, { status: 400 });
    }

    const [form, existing] = await Promise.all([
      getForm(formId),
      getFormResponseById(formId, responseId),
    ]);

    if (!form) {
      return Response.json({ error: "查無此表單" }, { status: 404 });
    }
    if (!existing) {
      return Response.json({ error: "查無此回覆" }, { status: 404 });
    }
    if (existing.submitted_by_uid !== session.uid) {
      return Response.json(
        { error: "無權修改此回覆" },
        { status: 403 },
      );
    }

    const closesAt = anyTimestampToDate(form.closes_at);
    const isClosed =
      form.status === "closed" || (closesAt && closesAt < new Date());
    if (isClosed) {
      return Response.json(
        { error: "此表單已截止，無法修改" },
        { status: 403 },
      );
    }

    const fields = form.fields ?? [];
    const sanitized = sanitizeAnswers(fields, answers);

    for (const field of fields) {
      if (field.type === "section_header") continue;
      if (!shouldShow(field, sanitized)) continue;
      if (field.required && isEmptyValue(sanitized[field.id])) {
        return Response.json(
          { error: `${field.label} 為必填欄位` },
          { status: 400 },
        );
      }
    }

    await updateFormResponse(formId, responseId, sanitized);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("PATCH form response failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失敗" },
      { status: 500 },
    );
  }
}
