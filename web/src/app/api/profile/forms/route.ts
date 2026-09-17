import { anyTimestampToDate } from "@/lib/datetime";
import { getForm, getMyFormResponses } from "@/lib/firestore";
import { verifyUserSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const responses = await getMyFormResponses(session.uid);
    const formIds = [...new Set(responses.map((response) => response.form_id))];
    const forms = await Promise.all(formIds.map((formId) => getForm(formId)));
    const formsById = new Map(
      forms.filter((form) => form !== null).map((form) => [form.id, form]),
    );
    const now = new Date();

    return Response.json(
      {
        items: responses.map((response) => {
          const form = formsById.get(response.form_id);
          const closesAt = anyTimestampToDate(form?.closes_at);
          return {
            response_id: response.response_id,
            form_id: response.form_id,
            form_title: form?.title ?? "(已刪除的表單)",
            submitted_at_iso:
              anyTimestampToDate(response.submitted_at)?.toISOString() ?? null,
            closes_at_iso: closesAt?.toISOString() ?? null,
            editable:
              form?.status === "open" &&
              (closesAt === null || closesAt >= now),
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Profile form responses failed:", error);
    return Response.json({ error: "讀取表單記錄失敗" }, { status: 500 });
  }
}
