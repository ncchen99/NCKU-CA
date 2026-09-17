import { anyTimestampToDate } from "@/lib/datetime";
import {
  getAttendanceEventsOpenNow,
  hasUserAttendedEvent,
} from "@/lib/firestore";
import { verifyUserSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [events, session] = await Promise.all([
      getAttendanceEventsOpenNow(),
      verifyUserSession(),
    ]);
    const attendedEventIds = new Set(
      session
        ? (
            await Promise.all(
              events.map(async (event) => ({
                eventId: event.id,
                attended: await hasUserAttendedEvent(event.id, session.uid),
              })),
            )
          )
            .filter(({ attended }) => attended)
            .map(({ eventId }) => eventId)
        : [],
    );

    const publicEvents = events
      .map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description ?? null,
        opens_at_iso: anyTimestampToDate(event.opens_at)?.toISOString() ?? null,
        closes_at_iso:
          anyTimestampToDate(event.closes_at)?.toISOString() ?? null,
        is_attended: attendedEventIds.has(event.id),
      }))
      .sort((a, b) => {
        const aOpensAt = a.opens_at_iso ? Date.parse(a.opens_at_iso) : 0;
        const bOpensAt = b.opens_at_iso ? Date.parse(b.opens_at_iso) : 0;
        return bOpensAt - aOpensAt;
      });

    return Response.json(
      { events: publicEvents },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Public attendance events failed:", error);
    return Response.json(
      { error: "取得點名活動失敗" },
      { status: 500 },
    );
  }
}
