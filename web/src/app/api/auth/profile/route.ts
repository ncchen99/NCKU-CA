import { NextResponse } from "next/server";
import { verifyUserSession } from "@/lib/session-auth";
import { getUser, createOrUpdateUser } from "@/lib/firestore/users";
import { getClub } from "@/lib/firestore/clubs";
import type { User } from "@/types";

export async function GET() {
  const session = await verifyUserSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "無法讀取個人資料" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await verifyUserSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      display_name?: string;
      club_id?: string;
      position_title?: string;
      department_grade?: string;
      profile_completed?: boolean;
    };

    const display_name = body.display_name?.trim();
    const club_id = body.club_id?.trim();

    if (!display_name) {
      return NextResponse.json({ error: "請填寫姓名" }, { status: 400 });
    }
    if (!club_id) {
      return NextResponse.json({ error: "請選擇所屬社團" }, { status: 400 });
    }

    const club = await getClub(club_id);
    if (!club || !club.is_active) {
      return NextResponse.json(
        { error: "所選社團無效或已停用" },
        { status: 400 },
      );
    }

    const patch: Partial<User> = {
      display_name,
      email: session.email,
      club_id,
      position_title: body.position_title?.trim() || undefined,
      department_grade: body.department_grade?.trim() || undefined,
      profile_completed: body.profile_completed !== false,
    };

    const existing = await getUser(session.uid);
    const role = existing?.role ?? "club_member";

    await createOrUpdateUser(session.uid, {
      ...patch,
      role,
    });

    const updated = await getUser(session.uid);
    return NextResponse.json({
      user: updated
        ? { ...updated, club_name: club.name }
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "無法更新個人資料" },
      { status: 500 },
    );
  }
}
