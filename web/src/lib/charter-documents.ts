/**
 * 法規列表相關頁面：對應 Firestore `site_content` 文件 ID。
 * 管理員於「網站內容」編輯同 ID 之頁面即可顯示 Markdown。
 */
export const CHARTER_NAV_LABEL = "法規列表";

export const CHARTER_DOCUMENTS = [
  {
    slug: "charter",
    title: "組織章程",
    description: "社團聯合會組織章程全文與修訂紀錄。",
  },
  {
    slug: "election-rules",
    title: "選舉罷免辦法",
    description: "本會會長、副會長及學生代表之選舉與罷免規範。",
  },
  {
    slug: "activity-center-rules",
    title: "場地管理辦法",
    description: "國立成功大學學生活動中心暨芸青軒管理辦法。",
  },
  {
    slug: "deposit-rules",
    title: "保證金管理規則",
    description: "社團保證金之繳交、退還及管理相關規範。",
  },
] as const;

export type CharterDocumentSlug = (typeof CHARTER_DOCUMENTS)[number]["slug"];
