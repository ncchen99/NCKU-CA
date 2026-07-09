import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getPostById, updatePost, deletePost, getUsersByIds } from "@/lib/firestore";
import { revalidatePostPaths } from "@/lib/isr";

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
    const previousPost = await getPostById(postId);
    const body = await request.json();

    if (body.slug !== undefined && (typeof body.slug !== "string" || !/^[a-zA-Z0-9-]+$/.test(body.slug))) {
      return NextResponse.json(
        { error: "Slug 格式錯誤，僅能包含英文字母、數字及連字號 (-)" },
        { status: 400 }
      );
    }

    await updatePost(postId, body);

    const nextPost = {
      slug: typeof body.slug === "string" ? body.slug : previousPost?.slug,
      category:
        typeof body.category === "string" ? body.category : previousPost?.category,
    };
    revalidatePostPaths(previousPost, nextPost);

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
    const previousPost = await getPostById(postId);
    await deletePost(postId);
    revalidatePostPaths(previousPost, undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "刪除文章失敗" },
      { status: 500 }
    );
  }
}
