import { extractCustomClubName, NO_CLUB_ID } from "./club-name";
import type { DependsOn, FormField } from "@/types";

export class InvalidFormAnswersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFormAnswersError";
  }
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
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
  return !field.depends_on || evaluateDependsOn(field.depends_on, answers);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateStringPattern(field: FormField, value: string): string | null {
  if (!value || !field.validation?.pattern) return null;
  try {
    if (!new RegExp(field.validation.pattern).test(value)) {
      return field.validation.custom_message ?? `${field.label} 格式不正確`;
    }
  } catch {
    // Invalid administrator-authored patterns retain the existing no-op behavior.
  }
  return null;
}

function validateFieldValue(field: FormField, value: unknown): string | null {
  if (value === undefined) return null;

  if (field.type === "checkbox") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      return `${field.label} 格式不正確`;
    }
    if (value.some((item) => !field.options?.includes(item))) {
      return `${field.label} 選項無效`;
    }
    return null;
  }

  if (field.type === "number") {
    if (value === "") return null;
    if (typeof value !== "number" && typeof value !== "string") {
      return `${field.label} 必須是數字`;
    }
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
      return `${field.label} 必須是數字`;
    }
    if (
      field.validation?.min !== undefined &&
      numberValue < field.validation.min
    ) {
      return (
        field.validation.custom_message ??
        `${field.label} 不可小於 ${field.validation.min}`
      );
    }
    if (
      field.validation?.max !== undefined &&
      numberValue > field.validation.max
    ) {
      return (
        field.validation.custom_message ??
        `${field.label} 不可大於 ${field.validation.max}`
      );
    }
    return null;
  }

  if (typeof value !== "string") {
    return `${field.label} 格式不正確`;
  }
  if (!value) return null;

  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `${field.label} 格式不正確`;
  }
  if (field.type === "phone" && !/^[0-9+()\-\s]{6,20}$/.test(value)) {
    return `${field.label} 格式不正確`;
  }
  if (field.type === "date" && !isValidDate(value)) {
    return `${field.label} 格式不正確`;
  }
  const options =
    field.type === "radio" && field.options === undefined
      ? ["是", "否"]
      : field.options;
  if (
    (field.type === "select" || field.type === "radio") &&
    !options?.includes(value)
  ) {
    return `${field.label} 選項無效`;
  }
  if (field.type === "text" || field.type === "textarea") {
    if (
      field.validation?.min !== undefined &&
      value.length < field.validation.min
    ) {
      return (
        field.validation.custom_message ??
        `${field.label} 長度不可少於 ${field.validation.min}`
      );
    }
    if (
      field.validation?.max !== undefined &&
      value.length > field.validation.max
    ) {
      return (
        field.validation.custom_message ??
        `${field.label} 長度不可超過 ${field.validation.max}`
      );
    }
  }

  return validateStringPattern(field, value);
}

/**
 * Drops unknown/non-input keys and validates every submitted value against the
 * administrator-authored form schema. Requiredness only applies to visible fields.
 */
export function validateAndSanitizeFormAnswers(
  fields: FormField[],
  rawAnswers: unknown,
): Record<string, unknown> {
  if (
    typeof rawAnswers !== "object" ||
    rawAnswers === null ||
    Array.isArray(rawAnswers)
  ) {
    throw new InvalidFormAnswersError("缺少回答內容");
  }

  const inputFields = new Map(
    fields
      .filter((field) => field.type !== "section_header")
      .map((field) => [field.id, field]),
  );
  const answers: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(rawAnswers)) {
    const field = inputFields.get(key);
    if (!field) continue;

    const value =
      typeof rawValue === "string"
        ? rawValue.trim()
        : Array.isArray(rawValue)
          ? rawValue.map((item) =>
              typeof item === "string" ? item.trim() : item,
            )
          : rawValue;
    const invalidReason = validateFieldValue(field, value);
    if (invalidReason) throw new InvalidFormAnswersError(invalidReason);
    answers[key] = value;
  }

  for (const field of inputFields.values()) {
    if (!shouldShowField(field, answers)) continue;
    if (field.required && isEmptyValue(answers[field.id])) {
      throw new InvalidFormAnswersError(`${field.label} 為必填欄位`);
    }
  }

  return answers;
}

/** Resolve the stored club ID without trusting the request's top-level club_id. */
export function resolveSubmissionClubId(
  fields: FormField[],
  answers: Record<string, unknown>,
  userClubId?: string,
): string {
  const clubPicker = fields.find((field) => field.type === "club_picker");
  const selectedClubId = clubPicker ? answers[clubPicker.id] : undefined;
  if (typeof selectedClubId === "string" && selectedClubId.trim()) {
    return selectedClubId.trim();
  }
  return userClubId?.trim() || NO_CLUB_ID;
}

export function resolveSubmissionClub(
  fields: FormField[],
  answers: Record<string, unknown>,
  fallbackClubId?: string,
): { clubId: string; customClubName?: string } {
  const clubId = resolveSubmissionClubId(fields, answers, fallbackClubId);
  if (clubId !== NO_CLUB_ID) return { clubId };

  const customClubName = extractCustomClubName(fields, answers);
  if (customClubName) return { clubId, customClubName };

  if (!fields.some((field) => field.type === "club_picker")) {
    return { clubId };
  }

  throw new InvalidFormAnswersError(
    "選擇「無」時，請填寫有效的社團／組織名稱",
  );
}

/** All non-sentinel club IDs that must be checked at the write boundary. */
export function getSubmittedClubIds(
  fields: FormField[],
  answers: Record<string, unknown>,
  primaryClubId: string,
): string[] {
  const ids = new Set<string>();
  for (const field of fields) {
    if (field.type !== "club_picker") continue;
    const value = answers[field.id];
    if (typeof value === "string" && value && value !== NO_CLUB_ID) {
      ids.add(value);
    }
  }
  if (primaryClubId !== NO_CLUB_ID) ids.add(primaryClubId);
  return [...ids];
}
