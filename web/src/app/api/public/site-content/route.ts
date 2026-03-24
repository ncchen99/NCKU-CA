import { NextRequest } from "next/server";
import { getSiteContent } from "@/lib/firestore/site-content";

/**
 * GET /api/public/site-content?page_id=about
 * 返回公開的 CMS 頁面內容
 */
export async function GET(req: NextRequest) {
  try {
    const pageId = req.nextUrl.searchParams.get("page_id")?.trim();
    if (!pageId) {
      return Response.json(
        { error: "缺少 page_id 參數" },
        { status: 400 },
      );
    }

    const content = await getSiteContent(pageId);
    if (!content) {
      return Response.json({ content: null });
    }

    return Response.json({
      content: {
        id: content.id,
        title: content.title,
        content_markdown: content.content_markdown,
        metadata: content.metadata ?? null,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "無法取得頁面內容",
      },
      { status: 500 },
    );
  }
}
