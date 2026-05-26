import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getAllForms, createForm } from "@/lib/firestore";
import { revalidateFormPaths } from "@/lib/isr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const formType = searchParams.get("formType") ?? undefined;

    const forms = await getAllForms({ status, formType });
    return NextResponse.json(forms, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得表單失敗" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const id = await createForm(body);
    revalidateFormPaths(id);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "建立表單失敗" },
      { status: 500 }
    );
  }
}
