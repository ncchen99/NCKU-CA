import { NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import {
  getAllClubs,
  getOpenForms,
  getDepositRecords,
  getAllForms,
  getFormResponses,
  getOpenAttendanceEvents,
  getAttendanceStats,
} from "@/lib/firestore";

export async function GET() {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const [clubs, openForms, pendingDeposits, forms, openEvents] =
      await Promise.all([
        getAllClubs(),
        getOpenForms(),
        getDepositRecords({ status: "pending_payment" }),
        getAllForms(),
        getOpenAttendanceEvents(),
      ]);

    const pendingDepositTotal = pendingDeposits.reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0
    );

    const clubNameById = new Map(clubs.map((c) => [c.id, c.name]));

    const pendingWithNames = pendingDeposits.map((d) => ({
      ...d,
      club_name: d.club_id ? clubNameById.get(d.club_id) : undefined,
    }));

    // Collect recent responses across all forms, then pick latest 5
    const responsesByForm = await Promise.all(
      forms.map(async (form) => {
        const responses = await getFormResponses(form.id);
        return responses.map((r) => ({ ...r, form_id: form.id, form_title: form.title }));
      })
    );
    const allResponses = responsesByForm
      .flat()
      .sort((a, b) => {
        const aTime = a.submitted_at;
        const bTime = b.submitted_at;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return String(bTime) > String(aTime) ? 1 : -1;
      })
      .slice(0, 5)
      .map((r) => ({
        ...r,
        club_name: r.club_id ? clubNameById.get(r.club_id) : undefined,
      }));

    const eventsWithStats = await Promise.all(
      openEvents.map(async (event) => {
        const stats = await getAttendanceStats(event.id);
        return { ...event, stats };
      })
    );

    return NextResponse.json({
      clubsCount: clubs.length,
      openFormsCount: openForms.length,
      pendingDeposits: {
        count: pendingWithNames.length,
        total: pendingDepositTotal,
        records: pendingWithNames,
      },
      latestResponses: allResponses,
      openAttendanceEvents: eventsWithStats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得統計資料失敗" },
      { status: 500 }
    );
  }
}
