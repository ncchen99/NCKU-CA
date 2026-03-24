import { NextRequest } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getAllUsers, getClubsByIds, updateUserRole } from "@/lib/firestore";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const role = req.nextUrl.searchParams.get("role") ?? undefined;
    const users = await getAllUsers({ role });
    const clubIds = [
      ...new Set(users.map((u) => u.club_id).filter(Boolean)),
    ] as string[];
    const clubs = await getClubsByIds(clubIds);
    const nameByClubId = new Map(clubs.map((c) => [c.id, c.name]));
    const enriched = users.map((u) => ({
      ...u,
      club_name: u.club_id ? nameByClubId.get(u.club_id) : undefined,
    }));
    return Response.json({ users: enriched });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "取得使用者列表失敗" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return unauthorizedResponse();

  try {
    const { uid, role } = await req.json();

    if (!uid || !role) {
      return Response.json(
        { error: "請提供 uid 和 role" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "club_member") {
      return Response.json(
        { error: "role 必須為 admin 或 club_member" },
        { status: 400 }
      );
    }

    await updateUserRole(uid, role);
    await getAdminAuth().setCustomUserClaims(uid, { role });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新使用者角色失敗" },
      { status: 500 }
    );
  }
}
