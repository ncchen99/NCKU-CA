import { NextRequest } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getAllUsers, getClubsByIds, createOrUpdateUser } from "@/lib/firestore";
import { getAdminAuth } from "@/lib/firebase-admin";
import type { User } from "@/types";

type UpdateUserPayload = {
  uid?: string;
  role?: User["role"];
  club_id?: User["club_id"];
};

export const dynamic = "force-dynamic";

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
      club_name: u.club_id
        ? u.club_id === "none"
          ? "無"
          : nameByClubId.get(u.club_id)
        : undefined,
    }));
    return Response.json({ users: enriched }, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
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
    const { uid, role, club_id } = (await req.json()) as UpdateUserPayload;

    if (!uid) {
      return Response.json(
        { error: "請提供 uid" },
        { status: 400 }
      );
    }

    const updates: Partial<User> = {};

    if (role) {
      if (role !== "admin" && role !== "club_member") {
        return Response.json(
          { error: "role 必須為 admin 或 club_member" },
          { status: 400 }
        );
      }
      updates.role = role;
      // 同步更新 Firebase Auth Custom Claims
      await getAdminAuth().setCustomUserClaims(uid, { role });
    }

    if (club_id !== undefined) {
      updates.club_id = club_id;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: "未提供需要更新的欄位" },
        { status: 400 }
      );
    }

    await createOrUpdateUser(uid, updates);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新使用者資料失敗" },
      { status: 500 }
    );
  }
}
