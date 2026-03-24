import { NextRequest } from "next/server";
import { getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";

/**
 * GET /api/public/posts?category=news&page=1&per_page=6&tag=公告
 * 返回已發布的文章列表（公開 API）
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = sp.get("category")?.trim() || undefined;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page")) || 6));
    const tag = sp.get("tag")?.trim() || undefined;
    const offset = (page - 1) * perPage;

    const { posts, total } = await getPublishedPosts({
      category,
      limit: perPage,
      offset,
    });

    // 如果有 tag 篩選，在應用層過濾（Firestore 不支援陣列欄位的 == 查詢）
    const filtered = tag
      ? posts.filter((p) => p.tags?.includes(tag))
      : posts;

    const payload = filtered.map((p) => {
      const publishedAt = anyTimestampToDate(p.published_at);
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        category: p.category,
        cover_image_url: p.cover_image_url || null,
        tags: p.tags ?? [],
        excerpt: p.content_markdown?.substring(0, 120)?.replace(/[#*_>\-\[\]`]/g, "") || "",
        published_at_iso: publishedAt?.toISOString() ?? null,
        published_at_display: publishedAt
          ? publishedAt.toLocaleDateString("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
          : "—",
      };
    });

    return Response.json({
      posts: payload,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "無法取得文章列表",
      },
      { status: 500 },
    );
  }
}
