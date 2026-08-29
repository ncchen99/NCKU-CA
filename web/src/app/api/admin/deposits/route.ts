import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import {
  getClubsByIds,
  getDepositBindingMeta,
  getDepositRecords,
  getFormTitleMapByIds,
  syncMissingLinkedDepositRecords,
  updateDepositStatus,
} from "@/lib/firestore";
import { resolveClubDisplayName } from "@/lib/club-name";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const clubId = searchParams.get("clubId") ?? undefined;

    let records = await getDepositRecords({ status, clubId });
    if (!status && !clubId && records.length === 0) {
      await syncMissingLinkedDepositRecords();
      records = await getDepositRecords({ status, clubId });
    }

    const clubIds = [...new Set(records.map((r) => r.club_id).filter(Boolean))];
    const clubs = await getClubsByIds(clubIds);
    const nameByClubId = new Map(clubs.map((c) => [c.id, c.name]));
    const formTitleById = await getFormTitleMapByIds(
      records
        .map((r) => r.form_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );
    let bindingMetaByDepositId = new Map<
      string,
      { form_id?: string; form_title?: string }
    >();
    try {
      bindingMetaByDepositId = await getDepositBindingMeta(records);
    } catch {
      // Keep main list available even if optional binding metadata cannot be resolved.
    }
    const withNames = records.map((r) => ({
      ...r,
      club_name: resolveClubDisplayName(r, (id) => nameByClubId.get(id)),
      form_id: bindingMetaByDepositId.get(r.id)?.form_id ?? r.form_id,
      form_title:
        (r.form_id ? formTitleById.get(r.form_id) : undefined) ??
        bindingMetaByDepositId.get(r.id)?.form_title,
    }));
    return NextResponse.json(withNames);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得保證金紀錄失敗" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { id, status } = await request.json();
    await updateDepositStatus(id, status, session.uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新保證金狀態失敗" },
      { status: 500 }
    );
  }
}
