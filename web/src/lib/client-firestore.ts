import { getClientDb } from "@/lib/firebase";
import type { User } from "@/types";

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
