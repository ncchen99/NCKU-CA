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

function makeActivityRegistrationFields(): Omit<FormField, "order">[] {
  return [
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
  ];
}

/**
 * A. 社團博覽會報名（含保證金）
 */
const expoRegistration: FormTemplate = {
  key: "expo_registration",
  label: "社團博覽會報名",
  description:
    "114學年度下學期【社團博覽會】暨【動態舞台】報名表單。報名至 02/09 止，請準時完成。報名費 500 元（已繳社聯會費可免繳），保證金 1500 元。社博日期 2026/03/03-2026/03/04。⚠ 社博期間嚴禁私自使用明火，如有需求需提前通報並完成申請。結果將於截止後公告於粉專與平台。社博團隊信箱：nca.ncku@gmail.com，粉專：成大社團博覽會 NCKU Club Festival。",
  form_type: "expo_registration",
  deposit_required: true,
  deposit_amount: 1500,
  binding_mode: "linked_to_response",
  fields: [
    makeField("club_name", "club_picker", "社團名稱", {
      required: true,
      default_from_user: "club_name",
      placeholder: "請選擇您的社團",
    }),
    makeField("contact_email", "email", "電子郵件地址", {
      required: true,
      default_from_user: "email",
      placeholder: "請輸入電子郵件",
    }),
    makeField("club_category", "select", "社團所屬性質", {
      required: true,
      options: [
        "綜合性社團",
        "學藝性社團",
        "康樂性社團",
        "體能性社團",
        "服務性社團",
        "聯誼性社團",
        "非社團之校內學生團體（包含學生自治組織、校隊、學生參賽團隊等）",
        "非校內、非學生團體（包含校內行政單位、廠商等）",
        "其他",
      ],
    }),
    makeField("contact_name", "text", "聯絡人 / 姓名", {
      required: true,
      default_from_user: "display_name",
      placeholder: "請輸入聯絡人姓名",
    }),
    makeField("contact_phone", "phone", "聯絡人 / 手機", {
      required: true,
      placeholder: "請輸入手機號碼",
    }),
    makeField("contact_facebook_url", "text", "聯絡人 / FB網址", {
      required: true,
      placeholder: "https://facebook.com/...",
    }),
    makeField("join_expo_booth", "radio", "是否參與社團博覽會【擺攤部分】", {
      required: true,
      options: ["是", "否"],
    }),
    makeField("join_dynamic_stage", "radio", "是否參與【動態舞台】", {
      required: true,
      options: ["是", "否"],
    }),
    makeField("booth_special_requirements", "textarea", "攤位特殊需求告知", {
      required: true,
      placeholder:
        "如場地須平坦、遠離音源、希望與某社團連攤，或第二天需提早離開，請於此說明。",
    }),
    makeField("fire_safety_ack", "checkbox", "明火與安全規範確認", {
      required: true,
      options: ["我已了解社博期間不得私自使用明火，若有需求會事先通報並完成申請"],
    }),
    makeField("notes", "textarea", "其他補充", {
      placeholder: "其他需要主辦單位協助或注意事項（選填）",
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
 * D. 寒假場協報名（含保證金）
 */
const winterAssociation: FormTemplate = {
  key: "winter_association_registration",
  label: "寒假場協報名",
  description: "寒假場協專用報名模板，含保證金收退流程。",
  form_type: "winter_association_registration",
  deposit_required: true,
  deposit_amount: 500,
  binding_mode: "linked_to_response",
  fields: makeActivityRegistrationFields(),
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
