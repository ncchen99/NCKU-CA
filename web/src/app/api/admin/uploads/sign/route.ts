import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { presignPublicObjectPut } from "@/lib/cloudflare-r2";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
    "image/webp",
    "image/jpeg",
    "image/png",
    "image/gif",
]);

function sanitizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
}

function extensionFor(contentType: string): string {
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/png") return "png";
    if (contentType === "image/gif") return "gif";
    return "webp";
}

/**
 * Issue a short-lived presigned PUT URL so the browser can upload an
 * admin image directly to R2. Server enforces admin auth, size, and
 * content-type; image bytes never traverse this function.
 */
export async function POST(request: NextRequest) {
    const admin = await verifyAdmin();
    if (!admin) return unauthorizedResponse();

    try {
        const body = (await request.json()) as {
            fileName?: string;
            contentType?: string;
            size?: number;
        };

        const contentType = (body.contentType ?? "").trim();
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
            return NextResponse.json(
                { error: "僅支援 webp/jpeg/png/gif 圖片" },
                { status: 400 },
            );
        }

        const size = Number(body.size ?? 0);
        if (!Number.isFinite(size) || size <= 0) {
            return NextResponse.json({ error: "請提供圖片大小" }, { status: 400 });
        }
        if (size > MAX_IMAGE_SIZE_BYTES) {
            return NextResponse.json(
                { error: "圖片大小不可超過 4MB" },
                { status: 400 },
            );
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const safeName = sanitizeName(body.fileName || "image") || "image";
        const ext = extensionFor(contentType);
        const objectKey = `posts/${yyyy}/${mm}/${Date.now()}-${safeName}.${ext}`;

        const presigned = await presignPublicObjectPut({
            key: objectKey,
            contentType,
            maxSizeBytes: size,
            expiresInSeconds: 300,
        });

        return NextResponse.json(presigned);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "簽發上傳網址失敗",
            },
            { status: 500 },
        );
    }
}
