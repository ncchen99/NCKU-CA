import assert from "node:assert/strict";
import test from "node:test";
import {
  getSubmittedClubIds,
  InvalidFormAnswersError,
  resolveSubmissionClub,
  resolveSubmissionClubId,
  validateAndSanitizeFormAnswers,
} from "../src/lib/form-response-validation";
import type { FormField } from "../src/types";

function field(
  id: string,
  type: FormField["type"],
  overrides: Partial<FormField> = {},
): FormField {
  return {
    id,
    type,
    label: id,
    required: false,
    order: 0,
    ...overrides,
  };
}

test("sanitizes schema fields and drops unknown or section values", () => {
  const fields = [
    field("name", "text"),
    field("heading", "section_header"),
  ];

  assert.deepEqual(
    validateAndSanitizeFormAnswers(fields, {
      name: "  NCKU  ",
      heading: "forged",
      unknown: "forged",
    }),
    { name: "NCKU" },
  );
});

test("rejects non-object answer payloads and malformed known fields", () => {
  const fields = [field("name", "text")];

  for (const value of [null, [], "text", { name: { nested: true } }]) {
    assert.throws(
      () => validateAndSanitizeFormAnswers(fields, value),
      InvalidFormAnswersError,
    );
  }
});

test("validates required conditional fields only while visible", () => {
  const fields = [
    field("kind", "radio", { options: ["club", "other"], required: true }),
    field("other_name", "text", {
      required: true,
      depends_on: {
        field_id: "kind",
        operator: "equals",
        value: "other",
        action: "show",
      },
    }),
  ];

  assert.deepEqual(validateAndSanitizeFormAnswers(fields, { kind: "club" }), {
    kind: "club",
  });
  assert.throws(
    () => validateAndSanitizeFormAnswers(fields, { kind: "other" }),
    /other_name 為必填欄位/,
  );
});

test("enforces configured values, lengths, dates, and option shapes", () => {
  assert.throws(
    () =>
      validateAndSanitizeFormAnswers(
        [field("name", "text", { validation: { min: 3, max: 5 } })],
        { name: "ab" },
      ),
    /長度不可少於 3/,
  );
  assert.deepEqual(
    validateAndSanitizeFormAnswers(
      [field("count", "number", { validation: { min: 1, max: 3 } })],
      { count: "2" },
    ),
    { count: "2" },
  );
  assert.throws(
    () =>
      validateAndSanitizeFormAnswers([field("day", "date")], {
        day: "2026-02-30",
      }),
    /格式不正確/,
  );
  assert.throws(
    () =>
      validateAndSanitizeFormAnswers(
        [field("choices", "checkbox", { options: ["A", "B"] })],
        { choices: ["A", 1] },
      ),
    /格式不正確/,
  );

  for (const type of ["select", "radio"] as const) {
    assert.throws(
      () =>
        validateAndSanitizeFormAnswers([field("choice", type)], {
          choice: "forged",
        }),
      /選項無效/,
    );
  }
  for (const choice of ["是", "否"]) {
    assert.deepEqual(
      validateAndSanitizeFormAnswers([field("choice", "radio")], {
        choice,
      }),
      { choice },
    );
  }
  assert.throws(
    () =>
      validateAndSanitizeFormAnswers(
        [field("choice", "radio", { options: [] })],
        { choice: "是" },
      ),
    /選項無效/,
  );
  assert.throws(
    () =>
      validateAndSanitizeFormAnswers(
        [field("choices", "checkbox", { options: [] })],
        { choices: ["forged"] },
      ),
    /選項無效/,
  );
  assert.deepEqual(
    validateAndSanitizeFormAnswers(
      [field("choice", "select"), field("choices", "checkbox")],
      { choice: "", choices: [] },
    ),
    { choice: "", choices: [] },
  );
  assert.throws(
    () =>
      validateAndSanitizeFormAnswers(
        [field("choice", "radio", { required: true, options: [] })],
        { choice: "" },
      ),
    /為必填欄位/,
  );
});

test("derives the stored club ID from the picker, then the server profile", () => {
  const picker = field("club_name", "club_picker");

  assert.equal(
    resolveSubmissionClubId([picker], { club_name: " club-a " }, "club-b"),
    "club-a",
  );
  assert.equal(resolveSubmissionClubId([], {}, " club-b "), "club-b");
  assert.equal(resolveSubmissionClubId([], {}, ""), "none");
});

test("requires a real custom organization name for the none sentinel", () => {
  const fields = [
    field("club_name", "club_picker"),
    field("club_name_custom", "text"),
  ];

  for (const customName of [undefined, "", " none "]) {
    assert.throws(
      () =>
        resolveSubmissionClub(
          fields,
          {
            club_name: "none",
            ...(customName === undefined
              ? {}
              : { club_name_custom: customName }),
          },
        ),
      /有效的社團／組織名稱/,
    );
  }
  assert.deepEqual(
    resolveSubmissionClub(fields, {
      club_name: "none",
      club_name_custom: "  測試組織  ",
    }),
    { clubId: "none", customClubName: "測試組織" },
  );
  assert.deepEqual(resolveSubmissionClub([], {}, "none"), { clubId: "none" });
  assert.deepEqual(
    resolveSubmissionClub(
      [field("club_name", "text")],
      { club_name: "  舊制自填組織  " },
      "none",
    ),
    { clubId: "none", customClubName: "舊制自填組織" },
  );
});

test("collects every non-sentinel club picker for active-club checks", () => {
  const fields = [
    field("primary", "club_picker"),
    field("secondary", "club_picker"),
    field("optional", "club_picker"),
  ];

  assert.deepEqual(
    getSubmittedClubIds(
      fields,
      { primary: "club-a", secondary: "club-b", optional: "none" },
      "club-a",
    ),
    ["club-a", "club-b"],
  );
});

test("number patterns apply to strings and numbers after ordinary numeric checks", () => {
  const fields = [field("count", "number", {
    validation: { min: 1, max: 100, pattern: "^[0-9]+$", custom_message: "請填整數" },
  })];
  for (const count of ["1.5", 1.5, "1e2", "+2", "invalid", Infinity, 0, 101]) {
    assert.throws(() => validateAndSanitizeFormAnswers(fields, { count }), InvalidFormAnswersError);
  }
  assert.throws(() => validateAndSanitizeFormAnswers(fields, { count: "1.5" }), /請填整數/);
  for (const count of ["2", 2, "100", ""]) {
    assert.deepEqual(validateAndSanitizeFormAnswers(fields, { count }), { count });
  }
  for (const pattern of [undefined, "["]) {
    assert.deepEqual(validateAndSanitizeFormAnswers([
      field("count", "number", { validation: { pattern } }),
    ], { count: "1.5" }), { count: "1.5" });
  }
});

test("an empty custom message never disables configured validation", () => {
  for (const [type, validation, value] of [
    ["number", { pattern: "^[0-9]+$" }, "1.5"],
    ["number", { min: 2 }, "1"],
    ["number", { max: 2 }, "3"],
    ["text", { pattern: "^[a-z]+$" }, "1"],
    ["text", { min: 2 }, "a"],
    ["text", { max: 2 }, "abc"],
  ] as const) {
    assert.throws(() => validateAndSanitizeFormAnswers([
      field("value", type, { validation: { ...validation, custom_message: "" } }),
    ], { value }), InvalidFormAnswersError);
  }
});
