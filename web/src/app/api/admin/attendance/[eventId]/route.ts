import { NextRequest } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import {
  getAttendanceEvent,
  updateAttendanceEvent,
  getAttendanceRecords,
  getAttendanceStats,
  getExpectedClubsForAttendanceEvent,
} from "@/lib/firestore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const { eventId } = await params;
    const [event, records, stats] = await Promise.all([
      getAttendanceEvent(eventId),
      getAttendanceRecords(eventId),
      getAttendanceStats(eventId),
    ]);

    if (!event) {
      return Response.json(
        { error: "找不到此點名活動" },
        { status: 404 }
      );
    }

    const includeClubStatuses =
      req.nextUrl.searchParams.get("includeClubStatuses") === "true";
    let clubStatuses: Array<{
      clubId: string;
      clubName: string;
      category: string;
      checkedIn: boolean;
      checkedInAt?: unknown;
    }> = [];

    if (includeClubStatuses) {
      const expectedClubs = await getExpectedClubsForAttendanceEvent(event);

      const nonDuplicateRecords = records.filter(
        (record) => !record.is_duplicate_attempt,
      );
      const checkedAtMap = new Map(
        nonDuplicateRecords.map((record) => [record.club_id, record.checked_in_at]),
      );
      const checkedSet = new Set(nonDuplicateRecords.map((record) => record.club_id));

      clubStatuses = expectedClubs.map((club) => ({
        clubId: club.id,
        clubName: club.name,
        category: club.category,
        checkedIn: checkedSet.has(club.id),
        checkedInAt: checkedAtMap.get(club.id),
      }));
    }

    return Response.json({ event, records, stats, clubStatuses });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "取得點名活動詳情失敗" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const { eventId } = await params;
    const body = await req.json();
    await updateAttendanceEvent(eventId, body);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新點名活動失敗" },
      { status: 500 }
    );
  }
}
