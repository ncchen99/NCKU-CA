import { verifyUserSession } from "@/lib/session-auth";
import {
  getAttendanceEvent,
  checkIn,
  getExpectedClubsForAttendanceEvent,
} from "@/lib/firestore";

export async function POST(request: Request) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      event_id?: string;
      club_id?: string;
      passcode?: string;
    };
    const eventId = body.event_id?.trim();
    const clubId = body.club_id?.trim();
    if (!eventId || !clubId) {
      return Response.json(
        { error: "缺少 event_id 或 club_id" },
        { status: 400 },
      );
    }

    const event = await getAttendanceEvent(eventId);
    if (!event) {
      return Response.json({ error: "查無此點名活動" }, { status: 404 });
    }

    const now = new Date();
    const toDate = (val: unknown): Date | null => {
      if (val == null) return null;
      if (typeof val === "object" && val !== null && "toDate" in val) {
        try {
          return (val as { toDate: () => Date }).toDate();
        } catch {
          return null;
        }
      }
      if (typeof val === "string") return new Date(val);
      if (typeof val === "object" && val !== null) {
        const o = val as Record<string, unknown>;
        const sec =
          typeof o._seconds === "number"
            ? o._seconds
            : typeof o.seconds === "number"
              ? o.seconds
              : null;
        if (sec != null) return new Date(sec * 1000);
      }
      return null;
    };
    const opensAt = toDate(event.opens_at);
    const closesAt = toDate(event.closes_at);
    if (!opensAt || !closesAt || now < opensAt || now > closesAt) {
      return Response.json(
        { error: "此點名活動目前未開放" },
        { status: 403 },
      );
    }

    if (event.passcode) {
      if (
        !body.passcode ||
        body.passcode.trim() !== event.passcode.trim()
      ) {
        return Response.json(
          { error: "點名密碼錯誤" },
          { status: 400 },
        );
      }
    }

    const expected = await getExpectedClubsForAttendanceEvent(event);
    const allowedIds = new Set(expected.map((c) => c.id));
    if (!allowedIds.has(clubId)) {
      return Response.json(
        { error: "所選社團不在本次點名範圍內" },
        { status: 400 },
      );
    }

    const recordId = await checkIn(eventId, {
      club_id: clubId,
      user_uid: session.uid,
      device_info: "web",
    });

    return Response.json({ ok: true, record_id: recordId });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "簽到失敗",
      },
      { status: 500 },
    );
  }
}
