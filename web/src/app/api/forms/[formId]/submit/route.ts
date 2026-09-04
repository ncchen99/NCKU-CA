import { verifyUserSession } from "@/lib/session-auth";
import {
  DuplicateFormSubmissionError,
  FormNotOpenError,
  getForm,
  InvalidClubSubmissionError,
  submitFormResponse,
} from "@/lib/firestore/forms";
import { getUser } from "@/lib/firestore/users";
import {
  InvalidFormAnswersError,
  resolveSubmissionClubId,
  validateAndSanitizeFormAnswers,
} from "@/lib/form-response-validation";
import { anyTimestampToDate } from "@/lib/datetime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  const session = await verifyUserSession();
  if (!session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { formId } = await params;

  try {
    const body = (await request.json()) as {
      answers?: unknown;
    };

    // 驗證表單是否存在且開放
    const [form, user] = await Promise.all([
      getForm(formId),
      getUser(session.uid),
    ]);
    if (!form) {
      return Response.json({ error: "查無此表單" }, { status: 404 });
    }

    const closesAt = anyTimestampToDate(form.closes_at);
    const isClosed = form.status !== "open" || (closesAt && closesAt < new Date());

    if (isClosed) {
      return Response.json({ error: "此表單尚未開放或已截止" }, { status: 403 });
    }

    const fields = form.fields ?? [];
    const sanitizedAnswers = validateAndSanitizeFormAnswers(fields, body.answers);
    const clubId = resolveSubmissionClubId(
      fields,
      sanitizedAnswers,
      user?.club_id,
    );

    const responseId = await submitFormResponse(formId, {
      form_id: formId,
      club_id: clubId,
      submitted_by_uid: session.uid,
      answers: sanitizedAnswers,
    }, {
      updatedByUid: session.uid,
    });

    return Response.json({ ok: true, response_id: responseId });
  } catch (error) {
    if (error instanceof DuplicateFormSubmissionError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof InvalidFormAnswersError ||
      error instanceof InvalidClubSubmissionError
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof FormNotOpenError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("Form submit error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "送出表單失敗",
      },
      { status: 500 }
    );
  }
}
