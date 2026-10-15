export type SearchDocType = "news" | "activity" | "charter" | "page" | "form";

/** 搜尋索引中的單一項目（文章、法規條文、頁面或表單）。 */
export interface SearchDocument {
  id: string;
  type: SearchDocType;
  title: string;
  url: string;
  /** 已去除 Markdown 語法、空白已壓縮的純文字內文 */
  text: string;
  /** 所屬文件／章節，例如「組織章程 › 第二章 會員」 */
  parent?: string;
  tags?: string[];
  /** 不顯示、僅供比對的別名（例如「第17條」對應「第十七條」） */
  keywords?: string;
  /** YYYY-MM-DD */
  date?: string;
}

export interface SearchIndexPayload {
  version: 1;
  generated_at: string;
  documents: SearchDocument[];
}

export const SEARCH_DOC_TYPE_LABELS: Record<SearchDocType, string> = {
  news: "最新消息",
  activity: "活動回顧",
  charter: "法規",
  page: "頁面",
  form: "表單",
};
