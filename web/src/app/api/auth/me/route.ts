import { NextResponse } from "next/server";
import { verifyUserSession } from "@/lib/session-auth";
import { getUser } from "@/lib/firestore/users";
import { getClub } from "@/lib/firestore/clubs";

export async function GET() {
  const session = await verifyUserSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const user = await getUser(session.uid);
    let club_name: string | undefined;
    let club_category: string | undefined;
    if (user?.club_id) {
      const club = await getClub(user.club_id);
      club_name = club?.name;
      club_category = club?.category;
    }
    return NextResponse.json({
      user: user
        ? {
            ...user,
            club_name: club_name ?? user.club_name,
            club_category,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "無法讀取使用者" }, { status: 500 });
  }
}
