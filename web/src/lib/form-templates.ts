import type { FormField } from "@/types";

/** 表單模板定義 */
export interface FormTemplate {
  key: string;
  label: string;
  description: string;
  form_type: string;
  deposit_required: boolean;
  deposit_amount?: number;
  binding_mode: "linked_to_response" | "independent";
  fields: Omit<FormField, "order">[];
}

function makeField(
  id: string,
  type: FormField["type"],
  label: string,
  opts?: Partial<FormField>,
): Omit<FormField, "order"> {
  return {
    id,
    type,
    label,
    required: false,
    ...opts,
  };
}

/**
 * A. 社博 / 寒假場協報名（含保證金）
 */
const expoRegistration: FormTemplate = {
  key: "expo_registration",
  label: "社博 / 寒假場協報名",
  description: "含保證金收退流程的活動報名表單。適用於社團博覽會及寒假場地協調。",
  form_type: "expo_registration",
  deposit_required: true,
  deposit_amount: 500,
  binding_mode: "linked_to_response",
  fields: [
    makeField("club_name", "club_picker", "社團名稱", {
      required: true,
      default_from_user: "club_name",
      placeholder: "請選擇您的社團",
    }),
    makeField("contact_name", "text", "聯絡人姓名", {
      required: true,
      default_from_user: "display_name",
      placeholder: "請輸入聯絡人姓名",
    }),
    makeField("contact_email", "email", "聯絡 Email", {
      required: true,
      default_from_user: "email",
      placeholder: "請輸入聯絡 Email",
    }),
    makeField("contact_phone", "phone", "聯絡電話", {
      placeholder: "請輸入聯絡電話（選填）",
    }),
    makeField("activity_name", "text", "活動名稱", {
      required: true,
      placeholder: "請輸入活動名稱",
    }),
    makeField("facebook_url", "text", "臉書網址", {
      placeholder: "https://facebook.com/...",
    }),
    makeField("activity_section", "section_header", "活動資訊"),
    makeField("activity_date_start", "date", "活動開始日期", {
      required: true,
    }),
    makeField("activity_date_end", "date", "活動結束日期", {
      required: true,
    }),
    makeField("notes", "textarea", "備註", {
      placeholder: "其他補充說明（選填）",
    }),
  ],
};

/**
 * B. 普通報名問卷（無保證金）
 */
const generalRegistration: FormTemplate = {
  key: "general_registration",
  label: "普通報名問卷",
  description: "一般用途的報名表單，不含保證金流程。",
  form_type: "general_registration",
  deposit_required: false,
  binding_mode: "independent",
  fields: [
    makeField("club_name", "club_picker", "社團名稱", {
      required: true,
      default_from_user: "club_name",
      placeholder: "請選擇您的社團",
    }),
    makeField("contact_name", "text", "聯絡人姓名", {
      required: true,
      default_from_user: "display_name",
      placeholder: "請輸入聯絡人姓名",
    }),
    makeField("contact_email", "email", "聯絡 Email", {
      required: true,
      default_from_user: "email",
      placeholder: "請輸入聯絡 Email",
    }),
    makeField("notes", "textarea", "備註", {
      placeholder: "其他補充說明（選填）",
    }),
  ],
};

/**
 * C. 期初社代會出席調查（快速填寫型）
 */
const attendanceSurvey: FormTemplate = {
  key: "attendance_survey",
  label: "期初社代會出席調查",
  description: "可從使用者資料自動帶入預設值的快速填寫型問卷。",
  form_type: "attendance_survey",
  deposit_required: false,
  binding_mode: "independent",
  fields: [
    makeField("club_name", "club_picker", "社團名稱", {
      required: true,
      default_from_user: "club_name",
      placeholder: "請選擇您的社團",
    }),
    makeField("club_category", "text", "社團性質", {
      default_from_user: "club_category",
      placeholder: "如：學術性、藝文性等",
    }),
    makeField("representative_name", "text", "代表姓名", {
      required: true,
      default_from_user: "display_name",
      placeholder: "請輸入代表姓名",
    }),
    makeField("representative_email", "email", "代表 Email", {
      required: true,
      default_from_user: "email",
      placeholder: "請輸入代表 Email",
    }),
    makeField("representative_title", "text", "代表職稱", {
      placeholder: "如：會長、副會長",
    }),
    makeField("will_attend", "radio", "是否出席", {
      required: true,
      options: ["出席", "不出席", "委託代理"],
    }),
    makeField("proxy_name", "text", "代理人姓名", {
      placeholder: "如選擇委託代理，請填寫",
      depends_on: {
        field_id: "will_attend",
        operator: "equals",
        value: "委託代理",
        action: "show",
      },
    }),
    makeField("extra_notes", "textarea", "補充說明", {
      placeholder: "其他補充說明（選填）",
    }),
  ],
};

/**
 * D. 寒假場協報名（與社博共用欄位）
 */
const winterAssociation: FormTemplate = {
  key: "winter_association_registration",
  label: "寒假場協報名",
  description: "與社博報名共用欄位模板，含保證金收退流程。",
  form_type: "winter_association_registration",
  deposit_required: true,
  deposit_amount: 500,
  binding_mode: "linked_to_response",
  fields: expoRegistration.fields,
};

/** 所有可用模板 */
export const FORM_TEMPLATES: FormTemplate[] = [
  expoRegistration,
  winterAssociation,
  generalRegistration,
  attendanceSurvey,
];

/** 根據 key 取得模板 */
export function getFormTemplate(key: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.key === key);
}
