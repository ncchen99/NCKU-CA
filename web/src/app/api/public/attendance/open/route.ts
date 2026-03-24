import { getAttendanceEventsOpenNow } from "@/lib/firestore/attendance";
import { anyTimestampToDate } from "@/lib/datetime";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    let user = null;

    // 1. Resolve User Session if exists
    if (session) {
      try {
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifySessionCookie(session);
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          let club_name = "";
          let club_category = null;

          if (data?.club_id) {
            const clubDoc = await adminDb.collection("clubs").doc(data.club_id).get();
            if (clubDoc.exists) {
              const clubData = clubDoc.data();
              club_name = clubData?.name || "";
              club_category = clubData?.category || null;
            }
          }

          user = {
            id: decoded.uid,
            display_name: data?.display_name || "",
            club_id: data?.club_id || "",
            club_name,
            club_category,
          };
        }
      } catch {
        // Ignore session verify errors
      }
    }

    // 2. Resolve Open Events
    const events = await getAttendanceEventsOpenNow();
    
    // 3. Map to Payload with attendance status
    const payload = await Promise.all(
      events.map(async (e) => {
        const closes = anyTimestampToDate(e.closes_at);
        const opens = anyTimestampToDate(e.opens_at);

        let is_attended = false;
        if (user?.club_id) {
          const snapshot = await adminDb
            .collection("attendance_events")
            .doc(e.id)
            .collection("records")
            .where("club_id", "==", user.club_id)
            .limit(1)
            .get();
          is_attended = !snapshot.empty;
        }

        return {
          id: e.id,
          title: e.title,
          description: e.description ?? null,
          closes_at_iso: closes?.toISOString() ?? null,
          opens_at_iso: opens?.toISOString() ?? null,
          is_attended,
        };
      })
    );

    return Response.json({ events: payload, user });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "無法取得開放中的點名活動",
      },
      { status: 500 },
    );
  }
}
