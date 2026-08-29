import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getFormResponses, getAllClubs, getUser } from "@/lib/firestore";
import { resolveClubDisplayName } from "@/lib/club-name";

type RouteContext = { params: Promise<{ formId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { formId } = await context.params;
    const [responses, clubs] = await Promise.all([
      getFormResponses(formId),
      getAllClubs(),
    ]);

    const clubNameById = new Map(clubs.map((c) => [c.id, c.name]));

    // Collect unique UIDs for batch lookup
    const uids = [...new Set(responses.map((r) => r.submitted_by_uid).filter(Boolean))];
    const userNameByUid = new Map<string, string>();
    const userClubNameByUid = new Map<string, string>();
    await Promise.all(
      uids.map(async (uid) => {
        try {
          const user = await getUser(uid);
          if (user?.display_name) {
            userNameByUid.set(uid, user.display_name);
          }
          if (user?.club_name) {
            userClubNameByUid.set(uid, user.club_name);
          }
        } catch {
          /* ignore */
        }
      })
    );

    const enriched = responses.map((r) => ({
      ...r,
      club_name:
        resolveClubDisplayName(r, (id) => clubNameById.get(id)) ??
        (r.submitted_by_uid ? userClubNameByUid.get(r.submitted_by_uid) : undefined),
      submitted_by_name: r.submitted_by_uid
        ? userNameByUid.get(r.submitted_by_uid)
        : undefined,
    }));

    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得表單回應失敗" },
      { status: 500 }
    );
  }
}
