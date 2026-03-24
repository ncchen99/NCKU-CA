import { NextRequest } from "next/server";
import { getAllClubs } from "@/lib/firestore/clubs";

/**
 * GET /api/public/clubs?category=系學會
 * category 為社團「類別」中文名稱，須與 clubs.category 一致。
 */
export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category")?.trim();
    if (!category) {
      return Response.json(
        { error: "缺少 category 參數" },
        { status: 400 },
      );
    }

    const clubs = await getAllClubs({ category, isActive: true });
    return Response.json({
      clubs: clubs.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        category_code: c.category_code,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "無法取得社團列表",
      },
      { status: 500 },
    );
  }
}
