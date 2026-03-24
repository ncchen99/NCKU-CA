import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import {
  getClubsByIds,
  getDepositRecords,
  updateDepositStatus,
} from "@/lib/firestore";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const clubId = searchParams.get("clubId") ?? undefined;

    const records = await getDepositRecords({ status, clubId });
    const clubIds = [...new Set(records.map((r) => r.club_id).filter(Boolean))];
    const clubs = await getClubsByIds(clubIds);
    const nameByClubId = new Map(clubs.map((c) => [c.id, c.name]));
    const withNames = records.map((r) => ({
      ...r,
      club_name: r.club_id ? nameByClubId.get(r.club_id) : undefined,
    }));
    return NextResponse.json(withNames);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得保證金紀錄失敗" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { id, status } = await request.json();
    await updateDepositStatus(id, status, session.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新保證金狀態失敗" },
      { status: 500 }
    );
  }
}
