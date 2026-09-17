import { verifyUserSession } from "@/lib/session-auth";
import {
  DuplicateFormSubmissionError,
  ForbiddenFormResponseUpdateError,
  FormNotOpenError,
  FormResponseNotFoundError,
  getFormResponseById,
  InvalidClubSubmissionError,
  updateFormResponse,
} from "@/lib/firestore/forms";
import { InvalidFormAnswersError } from "@/lib/form-response-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string; responseId: string }> },
) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { formId, responseId } = await params;
  try {
    const existing = await getFormResponseById(formId, responseId);
    if (!existing) {
      return Response.json({ error: "查無此回覆" }, { status: 404 });
    }
    if (existing.submitted_by_uid !== session.uid) {
      return Response.json({ error: "無權檢視此回覆" }, { status: 403 });
    }
    return Response.json({
      response_id: existing.id,
      club_id: existing.club_id,
      answers: existing.answers,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "讀取失敗" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ formId: string; responseId: string }> },
) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { formId, responseId } = await params;

  try {
    const body = (await request.json()) as { answers?: unknown };
    await updateFormResponse(formId, responseId, body.answers, session.uid);

    return Response.json({ ok: true });
  } catch (error) {
    if (
      error instanceof InvalidFormAnswersError ||
      error instanceof InvalidClubSubmissionError
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof FormResponseNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof ForbiddenFormResponseUpdateError ||
      error instanceof FormNotOpenError
    ) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof DuplicateFormSubmissionError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("PATCH form response failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失敗" },
      { status: 500 },
    );
  }
}
