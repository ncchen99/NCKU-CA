import type { Timestamp } from "firebase/firestore";

/* ─── User ─── */
export interface User {
  uid: string;
  display_name: string;
  email: string;
  role: "admin" | "club_member";
  club_id?: string;
  /** 由管理 API 依 club_id 解析，僅供顯示 */
  club_name?: string;
  created_at: Timestamp;
}

/* ─── Post ─── */
export interface Post {
  id: string;
  title: string;
  slug: string;
  category: "news" | "activity_review";
  cover_image_url: string;
  content_markdown: string;
  tags: string[];
  status: "draft" | "published";
  published_at: Timestamp;
  updated_at: Timestamp;
  author_uid: string;
  /** 由管理 API 依 author_uid 解析，僅供顯示 */
  author_display_name?: string;
}

/* ─── Club ─── */
export interface Club {
  id: string;
  name: string;
  name_en?: string;
  short_name?: string;
  category: string;
  category_code: string;
  status?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  email?: string;
  description?: string;
  established_year?: number;
  is_active: boolean;
  import_source: "manual" | "yaml_import" | "json_import";
  raw_data?: Record<string, unknown>;
  imported_at: Timestamp;
  website_url?: string;
}

/* ─── Site Content ─── */
export interface SiteContent {
  id: string;
  title: string;
  content_markdown: string;
  metadata?: Record<string, unknown>;
  updated_at: Timestamp;
  updated_by: string;
  /** 由管理 API 依 updated_by 解析，僅供顯示 */
  updated_by_display_name?: string;
}

/* ─── Form ─── */
export interface DependsOn {
  field_id: string;
  operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
  value: unknown;
  action: "show" | "hide";
}

export interface FormField {
  id: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "phone"
    | "select"
    | "radio"
    | "checkbox"
    | "date"
    | "file"
    | "club_picker"
    | "section_header";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom_message?: string;
  };
  depends_on?: DependsOn;
  default_from_user?: string;
  read_only_if_prefilled?: boolean;
  order: number;
}

export interface DepositPolicy {
  required: boolean;
  amount?: number;
  binding_mode: "linked_to_response" | "independent";
  refund_rule?: string;
}

export interface Form {
  id: string;
  title: string;
  description: string;
  form_type:
    | "expo_registration"
    | "winter_association_registration"
    | "general_registration"
    | "attendance_survey"
    | "custom";
  status: "draft" | "open" | "closed";
  settings: Record<string, unknown>;
  deposit_policy: DepositPolicy;
  fields: FormField[];
  created_by: string;
  created_at: Timestamp;
  closes_at?: Timestamp;
  revalidate_path?: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  club_id: string;
  submitted_by_uid: string;
  answers: Record<string, unknown>;
  submitted_at: Timestamp;
  is_duplicate_attempt: boolean;
}

/* ─── Deposit ─── */
export interface DepositRecord {
  id: string;
  club_id: string;
  /** 由管理 API 依 club_id 解析，僅供顯示 */
  club_name?: string;
  form_response_id?: string;
  status: "pending_payment" | "paid" | "returned";
  amount: number;
  paid_at?: Timestamp;
  returned_at?: Timestamp;
  notes?: string;
  updated_by: string;
}

/* ─── Attendance ─── */
export interface AttendanceEvent {
  id: string;
  title: string;
  description?: string;
  status: "upcoming" | "open" | "closed";
  expected_clubs: string[];
  opens_at: Timestamp;
  closes_at: Timestamp;
  created_by: string;
}

export interface AttendanceRecord {
  id: string;
  club_id: string;
  user_uid: string;
  checked_in_at: Timestamp;
  device_info?: string;
  is_duplicate_attempt: boolean;
}
