import { anyTimestampToDate } from "@/lib/datetime";
import {
  getAttendanceEventsByIds,
  getClubsByIds,
  getMyAttendanceRecords,
} from "@/lib/firestore";
import { verifyUserSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const records = await getMyAttendanceRecords(session.uid);
    const eventIds = [...new Set(records.map((record) => record.event_id))];
    const clubIds = [...new Set(records.map((record) => record.club_id))];
    const [events, clubs] = await Promise.all([
      getAttendanceEventsByIds(eventIds),
      getClubsByIds(clubIds),
    ]);
    const clubNames = new Map(clubs.map((club) => [club.id, club.name]));

    return Response.json(
      {
        items: records.map((record) => ({
          id: record.id,
          event_id: record.event_id,
          event_title: events.get(record.event_id)?.title ?? "(已刪除的點名)",
          club_id: record.club_id,
          club_name: clubNames.get(record.club_id) ?? record.club_id,
          checked_in_at_iso:
            anyTimestampToDate(record.checked_in_at)?.toISOString() ?? null,
          is_duplicate_attempt: record.is_duplicate_attempt,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Profile attendance failed:", error);
    return Response.json({ error: "讀取點名記錄失敗" }, { status: 500 });
  }
}
