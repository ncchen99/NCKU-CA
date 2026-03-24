import { NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getPostTagAggregates } from "@/lib/firestore/posts";

/**
 * 回傳系統內文章標籤使用統計（依使用次數由高到低），供後臺推薦標籤使用。
 */
export async function GET() {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const tags = await getPostTagAggregates();
    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得標籤統計失敗" },
      { status: 500 },
    );
  }
}
