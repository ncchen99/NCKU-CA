import { getClientDb } from "@/lib/firebase";
import type {
    AttendanceEvent,
    AttendanceRecord,
    Club,
    DepositRecord,
    Form,
    FormResponse,
    Post,
    SiteContent,
    User,
} from "@/types";

type PostCategory = "news" | "activity_review";

interface PublicPostItem {
    id: string;
    slug: string;
    title: string;
    category: string;
    tags: string[];
    excerpt: string;
    cover_image_url: string | null;
    published_at_display: string;
}

interface PublicPostResult {
    posts: PublicPostItem[];
    total: number;
    totalPages: number;
}

export interface PublicOpenAttendanceEvent {
    id: string;
    title: string;
    description?: string | null;
    closes_at_iso: string | null;
    opens_at_iso: string | null;
    is_attended?: boolean;
}

function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (typeof value === "object" && value !== null && "toDate" in value) {
        try {
            const d = (value as { toDate: () => Date }).toDate();
            return Number.isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }
    if (typeof value === "string") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "object" && value !== null) {
        const sec =
            typeof (value as { seconds?: unknown }).seconds === "number"
                ? ((value as { seconds: number }).seconds as number)
                : typeof (value as { _seconds?: unknown })._seconds === "number"
                    ? ((value as { _seconds: number })._seconds as number)
                    : null;
        if (sec != null) {
            const d = new Date(sec * 1000);
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }
    return null;
}

function tsValue(obj: unknown, key: string): number {
    if (!obj || typeof obj !== "object") return 0;
    return toDate((obj as Record<string, unknown>)[key])?.getTime() ?? 0;
}

function sortByRecency<T>(a: T, b: T, keys: string[]): number {
    const pick = (o: T) => {
        for (const k of keys) {
            const v = tsValue(o, k);
            if (v) return v;
        }
        return 0;
    };
    return pick(b) - pick(a);
}

export async function getPublicPosts(options: {
    category: PostCategory;
    page: number;
    perPage: number;
    tag?: string;
}): Promise<PublicPostResult> {
    const { collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where } =
        await import("firebase/firestore");
    const db = await getClientDb();

    const safePage = Math.max(1, options.page);
    const safePerPage = Math.min(50, Math.max(1, options.perPage));

    const constraints: Parameters<typeof query>[1][] = [
        where("status", "==", "published"),
        where("category", "==", options.category),
    ];
    if (options.tag) {
        constraints.push(where("tags", "array-contains", options.tag));
    }

    const baseQuery = query(collection(db, "posts"), ...constraints);
    const countSnapshot = await getCountFromServer(baseQuery);
    const total = countSnapshot.data().count;

    let pageQuery = query(baseQuery, orderBy("published_at", "desc"), limit(safePerPage));

    if (safePage > 1) {
        const offsetSize = (safePage - 1) * safePerPage;
        const offsetSnapshot = await getDocs(
            query(baseQuery, orderBy("published_at", "desc"), limit(offsetSize)),
        );
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        if (lastDoc) {
            pageQuery = query(
                baseQuery,
                orderBy("published_at", "desc"),
                startAfter(lastDoc),
                limit(safePerPage),
            );
        }
    }

    const snapshot = await getDocs(pageQuery);
    const posts = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const publishedAt = toDate(data.published_at);
        const markdown = typeof data.content_markdown === "string" ? data.content_markdown : "";
        return {
            id: doc.id,
            slug: typeof data.slug === "string" ? data.slug : doc.id,
            title: typeof data.title === "string" ? data.title : "(未命名)",
            category: typeof data.category === "string" ? data.category : "",
            cover_image_url:
                typeof data.cover_image_url === "string" && data.cover_image_url.length > 0
                    ? data.cover_image_url
                    : null,
            tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t)) : [],
            excerpt: markdown.substring(0, 120).replace(/[#*_>\-\[\]`]/g, ""),
            published_at_display: publishedAt
                ? publishedAt.toLocaleDateString("zh-TW", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                })
                : "—",
        };
    });

    return {
        posts,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePerPage)),
    };
}

export interface ClubOption {
    id: string;
    name: string;
    category: string;
    category_code?: string;
}

export interface AdminClubItem {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    category_code: string;
    status?: string;
    email?: string;
    description?: string;
    is_active: boolean;
    import_source: string;
    imported_at: unknown;
    website_url?: string;
}

export async function getActiveClubs(category?: string): Promise<ClubOption[]> {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const db = await getClientDb();

    const clauses: Parameters<typeof query>[1][] = [where("is_active", "==", true)];
    if (category) clauses.push(where("category", "==", category));

    const snapshot = await getDocs(query(collection(db, "clubs"), ...clauses));
    return snapshot.docs
        .map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                name: typeof data.name === "string" ? data.name : doc.id,
                category: typeof data.category === "string" ? data.category : "",
                category_code:
                    typeof data.category_code === "string" ? data.category_code : undefined,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

export async function getAdminClubs(options?: {
    category?: string;
    isActive?: boolean;
}): Promise<AdminClubItem[]> {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const db = await getClientDb();

    const clauses: Parameters<typeof query>[1][] = [];
    if (options?.category) clauses.push(where("category", "==", options.category));
    if (options?.isActive !== undefined) clauses.push(where("is_active", "==", options.isActive));

    const clubsQuery =
        clauses.length > 0
            ? query(collection(db, "clubs"), ...clauses)
            : query(collection(db, "clubs"));

    const snapshot = await getDocs(clubsQuery);
    return snapshot.docs
        .map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                id: doc.id,
                name: typeof data.name === "string" ? data.name : doc.id,
                name_en: typeof data.name_en === "string" ? data.name_en : undefined,
                category: typeof data.category === "string" ? data.category : "",
                category_code:
                    typeof data.category_code === "string" ? data.category_code : "",
                status: typeof data.status === "string" ? data.status : undefined,
                email: typeof data.email === "string" ? data.email : undefined,
                description:
                    typeof data.description === "string" ? data.description : undefined,
                is_active: Boolean(data.is_active),
                import_source:
                    typeof data.import_source === "string" ? data.import_source : "manual",
                imported_at: data.imported_at ?? null,
                website_url:
                    typeof data.website_url === "string" ? data.website_url : undefined,
            } as AdminClubItem;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

/**
 * 公開頁面使用：以前端 Firestore 直接讀取目前可簽到事件，
 * 並可選擇性回傳當前使用者是否已簽到。
 */
export async function getOpenAttendanceEvents(options?: {
    userUid?: string;
}): Promise<PublicOpenAttendanceEvent[]> {
    const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
    const db = await getClientDb();
    const now = new Date();

    const snapshot = await getDocs(
        query(collection(db, "attendance_events"), where("status", "==", "open")),
    );

    const events: PublicOpenAttendanceEvent[] = [];

    for (const eventDoc of snapshot.docs) {
        const data = eventDoc.data() as Record<string, unknown>;
        const opensAt = toDate(data.opens_at);
        const closesAt = toDate(data.closes_at);
        if (!opensAt || !closesAt) continue;
        if (now < opensAt || now > closesAt) continue;

        let isAttended = false;
        if (options?.userUid) {
            const recordSnapshot = await getDocs(
                query(
                    collection(db, "attendance_events", eventDoc.id, "records"),
                    where("user_uid", "==", options.userUid),
                    limit(1),
                ),
            );
            isAttended = !recordSnapshot.empty;
        }

        events.push({
            id: eventDoc.id,
            title: typeof data.title === "string" ? data.title : "",
            description:
                typeof data.description === "string" ? data.description : null,
            opens_at_iso: opensAt.toISOString(),
            closes_at_iso: closesAt.toISOString(),
            is_attended: isAttended,
        });
    }

    return events.sort((a, b) => {
        const aOpen = a.opens_at_iso ? new Date(a.opens_at_iso).getTime() : 0;
        const bOpen = b.opens_at_iso ? new Date(b.opens_at_iso).getTime() : 0;
        return bOpen - aOpen;
    });
}

export interface ProfileUser extends Pick<
    User,
    "display_name" | "club_id" | "position_title" | "department_grade" | "profile_completed"
> {
    club_name?: string;
    club_category?: string;
}

export async function getProfileUser(uid: string): Promise<ProfileUser | null> {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getClientDb();
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return null;

    const userData = userSnap.data() as Record<string, unknown>;
    const profile: ProfileUser = {
        display_name: typeof userData.display_name === "string" ? userData.display_name : "",
        club_id: typeof userData.club_id === "string" ? userData.club_id : "",
        position_title:
            typeof userData.position_title === "string" ? userData.position_title : undefined,
        department_grade:
            typeof userData.department_grade === "string" ? userData.department_grade : undefined,
        profile_completed:
            typeof userData.profile_completed === "boolean" ? userData.profile_completed : undefined,
    };

    if (profile.club_id) {
        const clubSnap = await getDoc(doc(db, "clubs", profile.club_id));
        if (clubSnap.exists()) {
            const clubData = clubSnap.data() as Record<string, unknown>;
            profile.club_name =
                typeof clubData.name === "string" ? clubData.name : undefined;
            profile.club_category =
                typeof clubData.category === "string" ? clubData.category : undefined;
        }
    }

    return profile;
}

export async function saveProfileUser(params: {
    uid: string;
    email: string;
    displayName: string;
    clubId: string;
    positionTitle?: string;
    departmentGrade?: string;
    profileCompleted?: boolean;
}): Promise<void> {
    const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    const db = await getClientDb();
    const ref = doc(db, "users", params.uid);
    const existing = await getDoc(ref);

    const commonPatch = {
        display_name: params.displayName,
        club_id: params.clubId,
        position_title: params.positionTitle ?? "",
        department_grade: params.departmentGrade ?? "",
        profile_completed: params.profileCompleted !== false,
    };

    if (existing.exists()) {
        await updateDoc(ref, commonPatch);
        return;
    }

    await setDoc(ref, {
        uid: params.uid,
        email: params.email,
        role: "club_member",
        created_at: serverTimestamp(),
        ...commonPatch,
    });
}

// ─────────────────────────────────────────────
// 個人歷史頁：直連 Firestore 取代 /api/me/*
// ─────────────────────────────────────────────

export interface MyAttendanceItem {
    id: string;
    event_id: string;
    event_title: string;
    club_id: string;
    club_name: string;
    checked_in_at_iso: string | null;
    is_duplicate_attempt: boolean;
}

export async function getMyAttendanceItems(uid: string): Promise<MyAttendanceItem[]> {
    const { collectionGroup, getDocs, orderBy, query, where, documentId, collection } =
        await import("firebase/firestore");
    const db = await getClientDb();

    const recordsSnap = await getDocs(
        query(
            collectionGroup(db, "records"),
            where("user_uid", "==", uid),
            orderBy("checked_in_at", "desc"),
        ),
    );

    type RecordRow = {
        id: string;
        event_id: string;
        club_id: string;
        is_duplicate_attempt: boolean;
        checked_in_at: unknown;
    };
    const rows: RecordRow[] = recordsSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
            id: d.id,
            event_id: d.ref.parent.parent?.id ?? "",
            club_id: typeof data.club_id === "string" ? data.club_id : "",
            is_duplicate_attempt: Boolean(data.is_duplicate_attempt),
            checked_in_at: data.checked_in_at,
        };
    });

    const eventIds = [...new Set(rows.map((r) => r.event_id).filter(Boolean))];
    const eventTitles = new Map<string, string>();
    for (let i = 0; i < eventIds.length; i += 10) {
        const chunk = eventIds.slice(i, i + 10);
        if (chunk.length === 0) break;
        const snap = await getDocs(
            query(collection(db, "attendance_events"), where(documentId(), "in", chunk)),
        );
        for (const doc of snap.docs) {
            const t = (doc.data() as { title?: unknown }).title;
            if (typeof t === "string") eventTitles.set(doc.id, t);
        }
    }

    const clubsSnap = await getDocs(collection(db, "clubs"));
    const clubNames = new Map<string, string>();
    for (const c of clubsSnap.docs) {
        const n = (c.data() as { name?: unknown }).name;
        if (typeof n === "string") clubNames.set(c.id, n);
    }

    return rows.map((r) => ({
        id: r.id,
        event_id: r.event_id,
        event_title: eventTitles.get(r.event_id) ?? "(已刪除的點名)",
        club_id: r.club_id,
        club_name: clubNames.get(r.club_id) ?? r.club_id,
        checked_in_at_iso: toDate(r.checked_in_at)?.toISOString() ?? null,
        is_duplicate_attempt: r.is_duplicate_attempt,
    }));
}

export interface MyFormResponseItem {
    response_id: string;
    form_id: string;
    form_title: string;
    submitted_at_iso: string | null;
    closes_at_iso: string | null;
    editable: boolean;
}

export async function getMyFormResponseItems(uid: string): Promise<MyFormResponseItem[]> {
    const { collectionGroup, getDocs, orderBy, query, where, documentId, collection } =
        await import("firebase/firestore");
    const db = await getClientDb();

    const responsesSnap = await getDocs(
        query(
            collectionGroup(db, "responses"),
            where("submitted_by_uid", "==", uid),
            orderBy("submitted_at", "desc"),
        ),
    );

    type ResponseRow = {
        response_id: string;
        form_id: string;
        submitted_at: unknown;
    };
    const rows: ResponseRow[] = responsesSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
            response_id: d.id,
            form_id: d.ref.parent.parent?.id ?? "",
            submitted_at: data.submitted_at,
        };
    });

    const formIds = [...new Set(rows.map((r) => r.form_id).filter(Boolean))];
    const formMeta = new Map<
        string,
        { title: string; closes_at: unknown; status: string }
    >();
    for (let i = 0; i < formIds.length; i += 10) {
        const chunk = formIds.slice(i, i + 10);
        if (chunk.length === 0) break;
        const snap = await getDocs(
            query(collection(db, "forms"), where(documentId(), "in", chunk)),
        );
        for (const doc of snap.docs) {
            const data = doc.data() as Record<string, unknown>;
            formMeta.set(doc.id, {
                title: typeof data.title === "string" ? data.title : "",
                closes_at: data.closes_at,
                status: typeof data.status === "string" ? data.status : "draft",
            });
        }
    }

    const now = new Date();
    return rows.map((r) => {
        const meta = formMeta.get(r.form_id);
        const closesAt = toDate(meta?.closes_at);
        const closed =
            meta?.status === "closed" || (closesAt ? closesAt < now : false);
        return {
            response_id: r.response_id,
            form_id: r.form_id,
            form_title: meta?.title || "(已刪除的表單)",
            submitted_at_iso: toDate(r.submitted_at)?.toISOString() ?? null,
            closes_at_iso: closesAt?.toISOString() ?? null,
            editable: !closed,
        };
    });
}

// ─────────────────────────────────────────────
// Admin GET helpers — 直連 Firestore 取代 /api/admin/* GET
// 寫入仍走 admin route 以同步觸發 ISR revalidate。
// ─────────────────────────────────────────────

async function fetchByIdsChunked<T>(
    collectionName: string,
    ids: string[],
    mapper: (id: string, data: Record<string, unknown>) => T,
): Promise<Map<string, T>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const out = new Map<string, T>();
    if (unique.length === 0) return out;

    const { collection, documentId, getDocs, query, where } = await import(
        "firebase/firestore"
    );
    const db = await getClientDb();
    for (let i = 0; i < unique.length; i += 10) {
        const chunk = unique.slice(i, i + 10);
        const snap = await getDocs(
            query(collection(db, collectionName), where(documentId(), "in", chunk)),
        );
        for (const doc of snap.docs) {
            out.set(doc.id, mapper(doc.id, doc.data() as Record<string, unknown>));
        }
    }
    return out;
}

export interface AdminUserItem extends User {
    club_name?: string;
}

export async function getAdminUsers(role?: string): Promise<AdminUserItem[]> {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const db = await getClientDb();
    const baseRef = collection(db, "users");
    const usersSnap = await getDocs(
        role ? query(baseRef, where("role", "==", role)) : baseRef,
    );
    const users = usersSnap.docs.map(
        (d) => ({ uid: d.id, ...(d.data() as Omit<User, "uid">) }) as User,
    );
    const clubIds = users.map((u) => u.club_id).filter((x): x is string => !!x);
    const clubNames = await fetchByIdsChunked("clubs", clubIds, (_id, data) =>
        typeof data.name === "string" ? data.name : "",
    );
    return users.map((u) => ({
        ...u,
        club_name: u.club_id ? clubNames.get(u.club_id) || undefined : undefined,
    }));
}

export interface AdminSiteContentItem extends SiteContent {
    updated_by_display_name?: string;
}

export async function getAdminSiteContent(): Promise<AdminSiteContentItem[]> {
    const { collection, getDocs } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getDocs(collection(db, "site_content"));
    const pages = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<SiteContent, "id">) }) as SiteContent,
    );
    const editorIds = pages
        .map((p) => p.updated_by)
        .filter((x): x is string => !!x);
    const editorNames = await fetchByIdsChunked("users", editorIds, (_id, data) =>
        typeof data.display_name === "string" ? data.display_name : "",
    );
    return pages.map((p) => ({
        ...p,
        updated_by_display_name: p.updated_by
            ? editorNames.get(p.updated_by) || undefined
            : undefined,
    }));
}

export interface AdminPostItem extends Post {
    author_display_name?: string;
}

export async function getAdminPosts(options?: {
    status?: string;
    category?: string;
}): Promise<AdminPostItem[]> {
    const { collection, getDocs, query, where } = await import(
        "firebase/firestore"
    );
    const db = await getClientDb();
    const clauses: Parameters<typeof query>[1][] = [];
    if (options?.status) clauses.push(where("status", "==", options.status));
    if (options?.category) clauses.push(where("category", "==", options.category));
    // 不用 orderBy(created_at)：Firestore 會排除缺欄位的舊文件，改為 client 排序。
    const snap =
        clauses.length > 0
            ? await getDocs(query(collection(db, "posts"), ...clauses))
            : await getDocs(collection(db, "posts"));
    const posts = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Post, "id">) }) as Post)
        .sort((a, b) => sortByRecency(a, b, ["created_at", "published_at", "updated_at"]));
    const authorIds = posts
        .map((p) => p.author_uid)
        .filter((x): x is string => !!x);
    const authorNames = await fetchByIdsChunked("users", authorIds, (_id, data) =>
        typeof data.display_name === "string" ? data.display_name : "",
    );
    return posts.map((p) => ({
        ...p,
        author_display_name: p.author_uid
            ? authorNames.get(p.author_uid) || undefined
            : undefined,
    }));
}

export async function getAdminPostById(id: string): Promise<Post | null> {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getDoc(doc(db, "posts", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Post, "id">) } as Post;
}

export async function getAdminPostTags(): Promise<
    Array<{ tag: string; count: number }>
> {
    const { collection, getDocs } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getDocs(collection(db, "posts"));
    const counter = new Map<string, number>();
    for (const d of snap.docs) {
        const tags = (d.data() as { tags?: unknown }).tags;
        if (!Array.isArray(tags)) continue;
        for (const t of tags) {
            if (typeof t !== "string" || !t.trim()) continue;
            counter.set(t, (counter.get(t) ?? 0) + 1);
        }
    }
    return [...counter.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
}

export async function getAdminForms(options?: {
    status?: string;
    formType?: string;
}): Promise<Form[]> {
    const { collection, getDocs, query, where } = await import(
        "firebase/firestore"
    );
    const db = await getClientDb();
    const clauses: Parameters<typeof query>[1][] = [];
    if (options?.status) clauses.push(where("status", "==", options.status));
    if (options?.formType) clauses.push(where("form_type", "==", options.formType));
    const snap =
        clauses.length > 0
            ? await getDocs(query(collection(db, "forms"), ...clauses))
            : await getDocs(collection(db, "forms"));
    return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Form, "id">) }) as Form)
        .sort((a, b) => sortByRecency(a, b, ["created_at", "opens_at", "updated_at"]));
}

export async function getAdminFormById(id: string): Promise<Form | null> {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getDoc(doc(db, "forms", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Form, "id">) } as Form;
}

export interface AdminFormResponseItem extends FormResponse {
    club_name?: string;
}

export async function getAdminFormResponses(
    formId: string,
): Promise<AdminFormResponseItem[]> {
    const { collection, getDocs, orderBy, query } = await import(
        "firebase/firestore"
    );
    const db = await getClientDb();
    const snap = await getDocs(
        query(
            collection(db, "forms", formId, "responses"),
            orderBy("submitted_at", "desc"),
        ),
    );
    const responses = snap.docs.map(
        (d) =>
            ({ id: d.id, ...(d.data() as Omit<FormResponse, "id">) }) as FormResponse,
    );
    const clubIds = responses
        .map((r) => r.club_id)
        .filter((x): x is string => !!x);
    const clubNames = await fetchByIdsChunked("clubs", clubIds, (_id, data) =>
        typeof data.name === "string" ? data.name : "",
    );
    return responses.map((r) => ({
        ...r,
        club_name: r.club_id ? clubNames.get(r.club_id) || undefined : undefined,
    }));
}

export async function getAdminFormResponseCount(formId: string): Promise<number> {
    const { collection, getCountFromServer } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getCountFromServer(
        collection(db, "forms", formId, "responses"),
    );
    return snap.data().count;
}

export interface AdminDepositItem extends DepositRecord {
    club_name?: string;
    form_title?: string;
}

export async function getAdminDeposits(options?: {
    status?: string;
    clubId?: string;
}): Promise<AdminDepositItem[]> {
    const { collection, getDocs, query, where } = await import(
        "firebase/firestore"
    );
    const db = await getClientDb();
    const clauses: Parameters<typeof query>[1][] = [];
    if (options?.status) clauses.push(where("status", "==", options.status));
    if (options?.clubId) clauses.push(where("club_id", "==", options.clubId));
    const snap =
        clauses.length > 0
            ? await getDocs(query(collection(db, "deposit_records"), ...clauses))
            : await getDocs(collection(db, "deposit_records"));
    const records = snap.docs
        .map(
            (d) =>
                ({ id: d.id, ...(d.data() as Omit<DepositRecord, "id">) }) as DepositRecord,
        )
        .sort((a, b) => sortByRecency(a, b, ["created_at", "updated_at"]));
    const clubIds = records
        .map((r) => r.club_id)
        .filter((x): x is string => !!x);
    const formIds = records
        .map((r) => r.form_id)
        .filter((x): x is string => !!x);
    const [clubNames, formTitles] = await Promise.all([
        fetchByIdsChunked("clubs", clubIds, (_id, data) =>
            typeof data.name === "string" ? data.name : "",
        ),
        fetchByIdsChunked("forms", formIds, (_id, data) =>
            typeof data.title === "string" ? data.title : "",
        ),
    ]);
    return records.map((r) => ({
        ...r,
        club_name: r.club_id ? clubNames.get(r.club_id) || undefined : undefined,
        form_title: r.form_id ? formTitles.get(r.form_id) || undefined : undefined,
    }));
}

export async function getAdminAttendanceEvents(): Promise<AttendanceEvent[]> {
    const { collection, getDocs } = await import("firebase/firestore");
    const db = await getClientDb();
    // 不用 orderBy(created_at)：Firestore 會過濾掉缺欄位的文件，
    // 早期建立的點名活動可能沒有 created_at。改為取回全部後在 client 排序。
    const snap = await getDocs(collection(db, "attendance_events"));
    const events = snap.docs.map(
        (d) =>
            ({
                id: d.id,
                ...(d.data() as Omit<AttendanceEvent, "id">),
            }) as AttendanceEvent,
    );
    return events.sort((a, b) => {
        const aTs =
            toDate((a as unknown as { created_at?: unknown }).created_at)?.getTime() ??
            toDate((a as unknown as { opens_at?: unknown }).opens_at)?.getTime() ??
            0;
        const bTs =
            toDate((b as unknown as { created_at?: unknown }).created_at)?.getTime() ??
            toDate((b as unknown as { opens_at?: unknown }).opens_at)?.getTime() ??
            0;
        return bTs - aTs;
    });
}

export async function getAdminAttendanceEvent(
    eventId: string,
): Promise<AttendanceEvent | null> {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getDoc(doc(db, "attendance_events", eventId));
    if (!snap.exists()) return null;
    return {
        id: snap.id,
        ...(snap.data() as Omit<AttendanceEvent, "id">),
    } as AttendanceEvent;
}

export async function getAdminAttendanceRecords(
    eventId: string,
): Promise<AttendanceRecord[]> {
    const { collection, getDocs, orderBy, query } = await import(
        "firebase/firestore"
    );
    const db = await getClientDb();
    const snap = await getDocs(
        query(
            collection(db, "attendance_events", eventId, "records"),
            orderBy("checked_in_at", "desc"),
        ),
    );
    return snap.docs.map(
        (d) =>
            ({
                id: d.id,
                ...(d.data() as Omit<AttendanceRecord, "id">),
            }) as AttendanceRecord,
    );
}

export async function getAdminAttendanceRecordCount(
    eventId: string,
): Promise<number> {
    const { collection, getCountFromServer } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getCountFromServer(
        collection(db, "attendance_events", eventId, "records"),
    );
    return snap.data().count;
}

export interface AdminAttendanceStats {
    total: number;
    checkedIn: number;
}

export interface AdminAttendanceClubStatus {
    clubId: string;
    clubName: string;
    category: string;
    checkedIn: boolean;
    checkedInAt?: unknown;
}

export interface AdminAttendanceEventDetail {
    event: AttendanceEvent;
    records: AttendanceRecord[];
    stats: AdminAttendanceStats;
    clubStatuses: AdminAttendanceClubStatus[];
}

export async function getAdminAttendanceStats(
    event: Pick<AttendanceEvent, "id" | "expected_clubs">,
): Promise<AdminAttendanceStats> {
    const { collection, getCountFromServer, getDocs, query, where } =
        await import("firebase/firestore");
    const db = await getClientDb();

    const categories = [...new Set(event.expected_clubs ?? [])].filter(Boolean);
    const expected = new Set<string>();
    for (const category of categories) {
        const snap = await getDocs(
            query(
                collection(db, "clubs"),
                where("category", "==", category),
                where("is_active", "==", true),
            ),
        );
        for (const d of snap.docs) expected.add(d.id);
    }

    const countSnap = await getCountFromServer(
        query(
            collection(db, "attendance_events", event.id, "records"),
            where("is_duplicate_attempt", "==", false),
        ),
    );
    return { total: expected.size, checkedIn: countSnap.data().count };
}

export interface AdminDashboardData {
    clubsCount: number;
    openFormsCount: number;
    pendingDeposits: {
        count: number;
        total: number;
        records: AdminDepositItem[];
    };
    latestResponses: Array<
        FormResponse & { form_id: string; form_title?: string; club_name?: string }
    >;
    openAttendanceEvents: Array<
        AttendanceEvent & { stats: AdminAttendanceStats }
    >;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    const {
        collection,
        getCountFromServer,
        getDocs,
        limit,
        orderBy,
        query,
        where,
    } = await import("firebase/firestore");
    const db = await getClientDb();

    const [clubsCountSnap, openFormsSnap, pendingDepositsRaw, allFormsSnap, allEventsSnap] =
        await Promise.all([
            getCountFromServer(collection(db, "clubs")),
            getDocs(query(collection(db, "forms"), where("status", "==", "open"))),
            getAdminDeposits({ status: "pending_payment" }),
            getDocs(collection(db, "forms")),
            getDocs(collection(db, "attendance_events")),
        ]);

    const pendingDepositTotal = pendingDepositsRaw.reduce(
        (sum, d) => sum + (typeof d.amount === "number" ? d.amount : 0),
        0,
    );

    // Latest 5 responses across all forms (best-effort 20 most-recent per form).
    const responsesByForm = await Promise.all(
        allFormsSnap.docs.map(async (formDoc) => {
            const formId = formDoc.id;
            const formTitle = (formDoc.data() as { title?: unknown }).title;
            try {
                const snap = await getDocs(
                    query(
                        collection(db, "forms", formId, "responses"),
                        orderBy("submitted_at", "desc"),
                        limit(20),
                    ),
                );
                return snap.docs.map((d) => ({
                    ...(d.data() as FormResponse),
                    id: d.id,
                    form_id: formId,
                    form_title: typeof formTitle === "string" ? formTitle : undefined,
                }));
            } catch {
                return [];
            }
        }),
    );

    const clubNames = await getAllClubLite();

    const allResponses = responsesByForm
        .flat()
        .filter((r) => !r.is_duplicate_attempt)
        .sort(
            (a, b) =>
                (toDate(b.submitted_at)?.getTime() ?? 0) -
                (toDate(a.submitted_at)?.getTime() ?? 0),
        )
        .slice(0, 5)
        .map((r) => ({
            ...r,
            club_name: r.club_id ? clubNames.get(r.club_id)?.name : undefined,
        }));

    const allEvents = allEventsSnap.docs.map(
        (d) =>
            ({
                id: d.id,
                ...(d.data() as Omit<AttendanceEvent, "id">),
            }) as AttendanceEvent,
    );

    const now = new Date();
    const isToday = (date: Date | null) => {
        if (!date) return false;
        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        );
    };

    // Filter events: either the event is currently "open", OR it was held today (opens_at or closes_at is today).
    const filteredEvents = allEvents.filter((event) => {
        if (event.status === "open") return true;
        const opensAt = toDate(event.opens_at);
        const closesAt = toDate(event.closes_at);
        return isToday(opensAt) || isToday(closesAt);
    });

    // Sort events:
    // 1. "open" events first
    // 2. then by opens_at descending (latest first)
    filteredEvents.sort((a, b) => {
        if (a.status === "open" && b.status !== "open") return -1;
        if (a.status !== "open" && b.status === "open") return 1;
        const aTs = toDate(a.opens_at)?.getTime() ?? 0;
        const bTs = toDate(b.opens_at)?.getTime() ?? 0;
        return bTs - aTs;
    });

    const eventsWithStats = await Promise.all(
        filteredEvents.map(async (event) => ({
            ...event,
            stats: await getAdminAttendanceStats(event),
        })),
    );

    return {
        clubsCount: clubsCountSnap.data().count,
        openFormsCount: openFormsSnap.size,
        pendingDeposits: {
            count: pendingDepositsRaw.length,
            total: pendingDepositTotal,
            records: pendingDepositsRaw,
        },
        latestResponses: allResponses,
        openAttendanceEvents: eventsWithStats,
    };
}

export async function getAdminAttendanceEventDetail(
    eventId: string,
    options?: { includeClubStatuses?: boolean },
): Promise<AdminAttendanceEventDetail | null> {
    const event = await getAdminAttendanceEvent(eventId);
    if (!event) return null;
    const [records, stats] = await Promise.all([
        getAdminAttendanceRecords(eventId),
        getAdminAttendanceStats(event),
    ]);

    let clubStatuses: AdminAttendanceClubStatus[] = [];
    if (options?.includeClubStatuses) {
        const { collection, getDocs, query, where } = await import(
            "firebase/firestore"
        );
        const db = await getClientDb();
        const categories = [...new Set(event.expected_clubs ?? [])].filter(Boolean);
        const seenClubs = new Map<string, Club>();
        for (const category of categories) {
            const snap = await getDocs(
                query(
                    collection(db, "clubs"),
                    where("category", "==", category),
                    where("is_active", "==", true),
                ),
            );
            for (const d of snap.docs) {
                if (seenClubs.has(d.id)) continue;
                seenClubs.set(d.id, {
                    id: d.id,
                    ...(d.data() as Omit<Club, "id">),
                } as Club);
            }
        }

        const nonDup = records.filter((r) => !r.is_duplicate_attempt);
        const checkedAt = new Map(nonDup.map((r) => [r.club_id, r.checked_in_at]));
        const checkedSet = new Set(nonDup.map((r) => r.club_id));

        clubStatuses = [...seenClubs.values()].map((c) => ({
            clubId: c.id,
            clubName: c.name,
            category: c.category,
            checkedIn: checkedSet.has(c.id),
            checkedInAt: checkedAt.get(c.id),
        }));
    }

    return { event, records, stats, clubStatuses };
}

export interface AdminClubLite {
    id: string;
    name: string;
}

export async function getAllClubLite(): Promise<Map<string, AdminClubLite>> {
    const { collection, getDocs } = await import("firebase/firestore");
    const db = await getClientDb();
    const snap = await getDocs(collection(db, "clubs"));
    const map = new Map<string, AdminClubLite>();
    for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        map.set(d.id, {
            id: d.id,
            name: typeof data.name === "string" ? data.name : d.id,
        });
    }
    return map;
}
