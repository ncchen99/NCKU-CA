import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getPostById, updatePost, deletePost, getUsersByIds } from "@/lib/firestore";

type RouteContext = { params: Promise<{ postId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { postId } = await context.params;
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }
    const authors = post.author_uid
      ? await getUsersByIds([post.author_uid])
      : [];
    const author_display_name = authors[0]?.display_name;
    return NextResponse.json({ ...post, author_display_name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得文章失敗" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { postId } = await context.params;
    const body = await request.json();
    await updatePost(postId, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新文章失敗" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { postId } = await context.params;
    await deletePost(postId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "刪除文章失敗" },
      { status: 500 }
    );
  }
}
