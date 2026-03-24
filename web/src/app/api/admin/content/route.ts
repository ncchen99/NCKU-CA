import { NextRequest } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getAllSiteContent, updateSiteContent, getUsersByIds } from "@/lib/firestore";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const content = await getAllSiteContent();
    const uids = [
      ...new Set(content.map((c) => c.updated_by).filter(Boolean)),
    ];
    const users = await getUsersByIds(uids);
    const nameByUid = new Map(users.map((u) => [u.uid, u.display_name]));
    const enriched = content.map((page) => ({
      ...page,
      updated_by_display_name: page.updated_by
        ? nameByUid.get(page.updated_by)
        : undefined,
    }));
    return Response.json({ content: enriched });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "取得網站內容失敗" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const { pageId, title, content_markdown, metadata } = await req.json();

    if (!pageId) {
      return Response.json(
        { error: "請提供 pageId" },
        { status: 400 }
      );
    }

    const data: { title?: string; content_markdown?: string; metadata?: Record<string, unknown> } = {};
    if (title !== undefined) data.title = title;
    if (content_markdown !== undefined) data.content_markdown = content_markdown;
    if (metadata !== undefined) data.metadata = metadata;

    await updateSiteContent(pageId, data, admin.uid);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新網站內容失敗" },
      { status: 500 }
    );
  }
}
