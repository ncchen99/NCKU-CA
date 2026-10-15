import { NextResponse } from "next/server";
import { getSearchIndexPayload } from "@/lib/search/load-index";

export const dynamic = "force-dynamic";

/**
 * 全站搜尋索引（公開資料：已發布文章、法規、頁面、開放中表單）。
 * 由瀏覽器下載後在本機搜尋；資料本身快取於 Data Cache，CDN 再短暫快取回應。
 */
export async function GET() {
  try {
    const payload = await getSearchIndexPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to build search index:", error);
    return NextResponse.json(
      { error: "搜尋索引暫時無法使用" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
