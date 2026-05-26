import { NextRequest } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getAttendanceRecords, checkIn } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const { eventId } = await params;
    const records = await getAttendanceRecords(eventId);
    return Response.json({ records }, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "取得點名紀錄失敗" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const { eventId } = await params;
    const { club_id, reason } = await req.json();

    if (!club_id) {
      return Response.json(
        { error: "請提供 club_id" },
        { status: 400 }
      );
    }

    const recordId = await checkIn(eventId, {
      club_id,
      user_uid: admin.uid,
      device_info: reason ?? "管理員手動簽到",
    });

    return Response.json({ id: recordId }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "手動簽到失敗" },
      { status: 500 }
    );
  }
}
