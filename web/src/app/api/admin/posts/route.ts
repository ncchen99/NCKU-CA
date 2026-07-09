import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getAllPosts, createPost, getUsersByIds } from "@/lib/firestore";
import { revalidatePostPaths } from "@/lib/isr";
import type { Post } from "@/types";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const result = await getAllPosts({ status, category });
    const uids = [
      ...new Set(result.posts.map((p) => p.author_uid).filter(Boolean)),
    ];
    const authors = await getUsersByIds(uids);
    const nameByUid = new Map(authors.map((u) => [u.uid, u.display_name]));
    const posts = result.posts.map((p) => ({
      ...p,
      author_display_name: p.author_uid
        ? nameByUid.get(p.author_uid)
        : undefined,
    }));
    return NextResponse.json({ posts, total: result.total });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得文章失敗" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { title, slug, category, content_markdown, tags, status, cover_image_url } = body;

    if (!slug || typeof slug !== "string" || !/^[a-zA-Z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug 格式錯誤，僅能包含英文字母、數字及連字號 (-)" },
        { status: 400 }
      );
    }

    const id = await createPost({
      title,
      slug,
      category,
      content_markdown,
      tags: tags ?? [],
      status: status ?? "draft",
      cover_image_url: cover_image_url ?? null,
      author_uid: session.uid,
    });

    const createdPost = {
      slug,
      category,
    } as Pick<Post, "slug" | "category">;
    revalidatePostPaths(undefined, createdPost);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "建立文章失敗" },
      { status: 500 }
    );
  }
}
