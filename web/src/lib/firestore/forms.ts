import { getAdminDb } from "@/lib/firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import { findClubNameField, NO_CLUB_ID } from "@/lib/club-name";
import { anyTimestampToDate } from "@/lib/datetime";
import {
  getSubmittedClubIds,
  getVisibleFormFields,
  InvalidFormAnswersError,
  resolveSubmissionClub,
  validateAndSanitizeFormAnswers,
} from "@/lib/form-response-validation";
import type { Form, FormResponse } from "@/types";

const COLLECTION = "forms";
const RESPONSES_SUB = "responses";
const PUBLIC_FORMS_REVALIDATE_SECONDS = 31_536_000;

async function queryFormById(formId: string): Promise<Form | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(formId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Form;
}

async function queryPublicFormIds(): Promise<string[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(COLLECTION).select().get();
  return snapshot.docs.map((doc) => doc.id);
}

export class DuplicateFormSubmissionError extends Error {
  constructor(message = "此社團已提交過此表單") {
    super(message);
    this.name = "DuplicateFormSubmissionError";
  }
}

export class InvalidClubSubmissionError extends Error {
  constructor(message = "所選社團無效或已停用") {
    super(message);
    this.name = "InvalidClubSubmissionError";
  }
}

export class FormNotOpenError extends Error {
  constructor(message = "此表單尚未開放或已截止") {
    super(message);
    this.name = "FormNotOpenError";
  }
}

export class FormResponseNotFoundError extends Error {
  constructor(message = "查無此回覆") {
    super(message);
    this.name = "FormResponseNotFoundError";
  }
}

export class ForbiddenFormResponseUpdateError extends Error {
  constructor(message = "無權修改此回覆") {
    super(message);
    this.name = "ForbiddenFormResponseUpdateError";
  }
}

async function assertActiveClubs(
  tx: FirebaseFirestore.Transaction,
  clubIds: string[],
): Promise<void> {
  if (clubIds.length === 0) return;
  // Firestore accepts path aliases and nested paths; club IDs must be single segments.
  if (clubIds.some((clubId) => clubId.includes("/"))) {
    throw new InvalidClubSubmissionError();
  }
  const db = getAdminDb();
  const snapshots = await tx.getAll(
    ...clubIds.map((clubId) => db.collection("clubs").doc(clubId)),
  );
  if (
    snapshots.some(
      (snapshot) =>
        !snapshot.exists || snapshot.data()?.is_active !== true,
    )
  ) {
    throw new InvalidClubSubmissionError();
  }
}

export async function getForm(formId: string): Promise<Form | null> {
  try {
    return queryFormById(formId);
  } catch (error) {
    throw new Error(
      `Failed to get form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getPublicFormById(formId: string): Promise<Form | null> {
  try {
    return unstable_cache(
      () => queryFormById(formId),
      ["forms:getPublicFormById", formId],
      {
        revalidate: PUBLIC_FORMS_REVALIDATE_SECONDS,
        tags: ["forms", `form:${formId}`],
      },
    )();
  } catch (error) {
    throw new Error(
      `Failed to get public form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getPublicFormIds(): Promise<string[]> {
  try {
    return unstable_cache(
      () => queryPublicFormIds(),
      ["forms:getPublicFormIds"],
      {
        revalidate: PUBLIC_FORMS_REVALIDATE_SECONDS,
        tags: ["forms"],
      },
    )();
  } catch (error) {
    throw new Error(
      `Failed to get public form IDs: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getOpenForms(): Promise<Form[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "open")
      .get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Form
    );
  } catch (error) {
    throw new Error(
      `Failed to get open forms: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getAllForms(
  options?: { status?: string; formType?: string }
): Promise<Form[]> {
  try {
    const db = getAdminDb();
    let query = db.collection(COLLECTION) as FirebaseFirestore.Query;

    if (options?.status) {
      query = query.where("status", "==", options.status);
    }
    if (options?.formType) {
      query = query.where("form_type", "==", options.formType);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Form
    );
  } catch (error) {
    throw new Error(
      `Failed to get all forms: ${error instanceof Error ? error.message : error}`
    );
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function getFormTitleMapByIds(
  formIds: string[]
): Promise<Map<string, string>> {
  try {
    const uniqueIds = [...new Set(formIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    const db = getAdminDb();
    const titleById = new Map<string, string>();

    for (const chunk of chunkArray(uniqueIds, 10)) {
      const snapshot = await db
        .collection(COLLECTION)
        .where(FieldPath.documentId(), "in", chunk)
        .get();

      for (const doc of snapshot.docs) {
        const title = doc.data().title;
        if (typeof title === "string" && title.trim()) {
          titleById.set(doc.id, title);
        }
      }
    }

    return titleById;
  } catch (error) {
    throw new Error(
      `Failed to get form titles by IDs: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function createForm(
  data: Omit<Form, "id" | "created_at">
): Promise<string> {
  try {
    const db = getAdminDb();
    const docRef = await db.collection(COLLECTION).add({
      ...data,
      created_at: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw new Error(
      `Failed to create form: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function updateForm(
  formId: string,
  data: Partial<Form>
): Promise<void> {
  try {
    const db = getAdminDb();
    const { id: _id, ...updateData } = data;
    await db.collection(COLLECTION).doc(formId).update(updateData);
  } catch (error) {
    throw new Error(
      `Failed to update form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function deleteForm(formId: string): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection(COLLECTION).doc(formId).delete();
  } catch (error) {
    throw new Error(
      `Failed to delete form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

/* ─── Form Responses (sub-collection) ─── */

export async function getFormResponses(
  formId: string,
  options?: { limit?: number }
): Promise<FormResponse[]> {
  try {
    const db = getAdminDb();
    let query = db
      .collection(COLLECTION)
      .doc(formId)
      .collection(RESPONSES_SUB)
      .orderBy("submitted_at", "desc") as FirebaseFirestore.Query;

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as FormResponse
    );
  } catch (error) {
    throw new Error(
      `Failed to get responses for form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * 查詢單一使用者跨所有表單的回覆。
 * 需要 Firestore collectionGroup 索引：responses.submitted_by_uid + responses.submitted_at(desc)。
 */
export async function getMyFormResponses(
  uid: string,
): Promise<Array<FormResponse & { response_id: string }>> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collectionGroup(RESPONSES_SUB)
      .where("submitted_by_uid", "==", uid)
      .orderBy("submitted_at", "desc")
      .get();
    return snapshot.docs.map(
      (doc) =>
        ({
          ...(doc.data() as FormResponse),
          id: doc.id,
          response_id: doc.id,
        }) as FormResponse & { response_id: string },
    );
  } catch (error) {
    throw new Error(
      `Failed to get form responses for user "${uid}": ${error instanceof Error ? error.message : error}`,
    );
  }
}

export async function getFormResponseById(
  formId: string,
  responseId: string,
): Promise<FormResponse | null> {
  try {
    const db = getAdminDb();
    const doc = await db
      .collection(COLLECTION)
      .doc(formId)
      .collection(RESPONSES_SUB)
      .doc(responseId)
      .get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as FormResponse;
  } catch (error) {
    throw new Error(
      `Failed to get response "${responseId}" for form "${formId}": ${error instanceof Error ? error.message : error}`,
    );
  }
}

export async function updateFormResponse(
  formId: string,
  responseId: string,
  rawAnswers: unknown,
  submittedByUid: string,
): Promise<void> {
  try {
    const db = getAdminDb();
    const formRef = db.collection(COLLECTION).doc(formId);
    const responseRef = formRef.collection(RESPONSES_SUB).doc(responseId);

    await db.runTransaction(async (tx) => {
      const [formSnapshot, responseSnapshot] = await Promise.all([
        tx.get(formRef),
        tx.get(responseRef),
      ]);
      if (!formSnapshot.exists) {
        throw new FormResponseNotFoundError("查無此表單");
      }
      if (!responseSnapshot.exists) throw new FormResponseNotFoundError();

      const response = responseSnapshot.data() as FormResponse;
      if (response.submitted_by_uid !== submittedByUid) {
        throw new ForbiddenFormResponseUpdateError();
      }

      const form = formSnapshot.data() as Form;
      const closesAt = anyTimestampToDate(form.closes_at);
      if (
        form.status !== "open" ||
        (closesAt !== null && closesAt < new Date())
      ) {
        throw new FormNotOpenError("此表單尚未開放或已截止，無法修改");
      }

      const fields = form.fields ?? [];
      const answers = validateAndSanitizeFormAnswers(fields, rawAnswers);
      const { clubId, customClubName } = resolveSubmissionClub(
        fields,
        answers,
        response.club_id,
        response.club_id === NO_CLUB_ID ? response.club_name_custom : undefined,
      );
      await assertActiveClubs(
        tx,
        getSubmittedClubIds(fields, answers, clubId),
      );

      const duplicateQuery = clubId === NO_CLUB_ID
        ? formRef
            .collection(RESPONSES_SUB)
            .where("submitted_by_uid", "==", submittedByUid)
        : formRef.collection(RESPONSES_SUB).where("club_id", "==", clubId);
      const duplicateSnapshot = await tx.get(duplicateQuery);
      if (duplicateSnapshot.docs.some((doc) => doc.id !== responseId)) {
        throw new DuplicateFormSubmissionError();
      }

      // Independent and legacy unspecified deposits are maintained by admins.
      const linkedDeposits = form.deposit_policy?.binding_mode === "linked_to_response"
        ? await tx.get(
            db
              .collection("deposit_records")
              .where("form_response_id", "==", responseId),
          )
        : null;
      // Without a visible name input, each legacy record keeps its own stored name.
      const clubNameUpdate = clubId === NO_CLUB_ID &&
        !findClubNameField(getVisibleFormFields(fields, answers))
        ? {}
        : { club_name_custom: customClubName ?? FieldValue.delete() };

      tx.update(responseRef, {
        answers,
        club_id: clubId,
        ...clubNameUpdate,
        updated_at: FieldValue.serverTimestamp(),
      });
      for (const deposit of linkedDeposits?.docs ?? []) {
        const linkedFormId = deposit.data().form_id;
        // A response ID alone cannot identify a legacy deposit's source form.
        if (linkedFormId !== formId) continue;
        tx.update(deposit.ref, {
          club_id: clubId,
          ...clubNameUpdate,
        });
      }
    });
  } catch (error) {
    if (
      error instanceof DuplicateFormSubmissionError ||
      error instanceof ForbiddenFormResponseUpdateError ||
      error instanceof FormNotOpenError ||
      error instanceof FormResponseNotFoundError ||
      error instanceof InvalidClubSubmissionError ||
      error instanceof InvalidFormAnswersError
    ) {
      throw error;
    }
    throw new Error(
      `Failed to update response "${responseId}" for form "${formId}": ${error instanceof Error ? error.message : error}`,
    );
  }
}

export async function getFormResponseByClub(
  formId: string,
  clubId: string
): Promise<FormResponse | null> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .doc(formId)
      .collection(RESPONSES_SUB)
      .where("club_id", "==", clubId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as FormResponse;
  } catch (error) {
    throw new Error(
      `Failed to get response for club "${clubId}" in form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function submitFormResponse(
  formId: string,
  data: Omit<FormResponse, "id" | "submitted_at" | "is_duplicate_attempt">,
  options?: {
    updatedByUid?: string;
  },
): Promise<string> {
  try {
    const db = getAdminDb();
    const responsesRef = db
      .collection(COLLECTION)
      .doc(formId)
      .collection(RESPONSES_SUB);
    const depositsRef = db.collection("deposit_records");

    return await db.runTransaction(async (tx) => {
      const formSnapshot = await tx.get(db.collection(COLLECTION).doc(formId));
      if (!formSnapshot.exists) throw new FormNotOpenError();
      const formData = formSnapshot.data() as Form;
      const closesAt = anyTimestampToDate(formData.closes_at);
      if (
        formData.status !== "open" ||
        (closesAt !== null && closesAt < new Date())
      ) {
        throw new FormNotOpenError();
      }

      const fields = formData.fields ?? [];
      const answers = validateAndSanitizeFormAnswers(fields, data.answers);
      const { clubId, customClubName } = resolveSubmissionClub(
        fields,
        answers,
        data.club_id,
      );
      await assertActiveClubs(
        tx,
        getSubmittedClubIds(fields, answers, clubId),
      );

      const checkQuery = clubId === NO_CLUB_ID
        ? responsesRef.where("submitted_by_uid", "==", data.submitted_by_uid).limit(1)
        : responsesRef.where("club_id", "==", clubId).limit(1);

      const existing = await tx.get(checkQuery);

      if (!existing.empty) {
        throw new DuplicateFormSubmissionError();
      }

      const newRef = responsesRef.doc();
      tx.set(newRef, {
        ...data,
        form_id: formId,
        submitted_by_uid: data.submitted_by_uid,
        answers,
        club_id: clubId,
        ...(customClubName ? { club_name_custom: customClubName } : {}),
        submitted_at: FieldValue.serverTimestamp(),
        is_duplicate_attempt: false,
      });

      const depositAmount = formData.deposit_policy?.amount;
      const requiresDeposit =
        formData.deposit_policy?.required === true &&
        typeof depositAmount === "number" &&
        Number.isFinite(depositAmount) &&
        depositAmount > 0;

      if (requiresDeposit) {
        const depositRef = depositsRef.doc();
        // 綁定資訊兩種 binding_mode 都寫入：紀錄本來就是由送出表單自動建立的，
        // 少了 form_id 會讓同一社團的多筆保證金在後台無法分辨來源。
        const depositPayload: Record<string, unknown> = {
          club_id: clubId,
          ...(customClubName ? { club_name_custom: customClubName } : {}),
          form_id: formId,
          form_response_id: newRef.id,
          status: "pending_payment",
          amount: depositAmount,
          created_at: FieldValue.serverTimestamp(),
          updated_by: options?.updatedByUid ?? data.submitted_by_uid,
        };

        tx.set(depositRef, depositPayload);
      }

      return newRef.id;
    });
  } catch (error) {
    if (
      error instanceof DuplicateFormSubmissionError ||
      error instanceof InvalidClubSubmissionError ||
      error instanceof FormNotOpenError ||
      error instanceof InvalidFormAnswersError
    ) {
      throw error;
    }
    throw new Error(
      `Failed to submit response for form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}
