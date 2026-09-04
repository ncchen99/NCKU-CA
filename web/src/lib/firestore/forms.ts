import { getAdminDb } from "@/lib/firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import { extractCustomClubName, isUnresolvedClubId } from "@/lib/club-name";
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
  const snapshot = await db
    .collection(COLLECTION)
    .where("status", "in", ["open", "closed"])
    .select()
    .get();
  return snapshot.docs.map((doc) => doc.id);
}

async function queryPublicFormById(formId: string): Promise<Form | null> {
  const form = await queryFormById(formId);
  return form?.status === "open" || form?.status === "closed" ? form : null;
}

export class DuplicateFormSubmissionError extends Error {
  constructor(message = "此社團已提交過此表單") {
    super(message);
    this.name = "DuplicateFormSubmissionError";
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
      () => queryPublicFormById(formId),
      ["forms:getPublicFormById:v2", formId],
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
      ["forms:getPublicFormIds:v2"],
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
  answers: Record<string, unknown>,
  options?: {
    /** 表單欄位定義，用於解析使用者自填的社團名稱 */
    formFields?: Form["fields"];
    /** 回覆既有的 club_id，用於判斷是否需要改用自填名稱 */
    clubId?: string;
  },
): Promise<void> {
  try {
    const db = getAdminDb();
    const update: Record<string, unknown> = {
      answers,
      updated_at: FieldValue.serverTimestamp(),
    };

    // 系統帶不出社團時，自填的「社團名稱」欄位就是社團名稱來源，
    // 使用者改動該欄位時需一併更新回覆與綁定的保證金紀錄。
    const needsCustomName = isUnresolvedClubId(options?.clubId);
    const customClubName = needsCustomName
      ? extractCustomClubName(options?.formFields, answers)
      : undefined;

    // 只在解析得到名稱時覆寫；解析不到就保留既有值，
    // 避免舊回覆（自填欄位尚未存在）被編輯時把回填的名稱清掉。
    if (needsCustomName && customClubName) {
      update.club_name_custom = customClubName;
    }

    await db
      .collection(COLLECTION)
      .doc(formId)
      .collection(RESPONSES_SUB)
      .doc(responseId)
      .update(update);

    if (needsCustomName && customClubName) {
      const linkedDeposits = await db
        .collection("deposit_records")
        .where("form_response_id", "==", responseId)
        .get();

      await Promise.all(
        linkedDeposits.docs.map((doc) =>
          doc.ref.update({ club_name_custom: customClubName }),
        ),
      );
    }
  } catch (error) {
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
    depositPolicy?: Form["deposit_policy"];
    /** 表單欄位定義，用於解析使用者自填的社團名稱 */
    formFields?: Form["fields"];
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
      const checkQuery = data.club_id === "none"
        ? responsesRef.where("submitted_by_uid", "==", data.submitted_by_uid).limit(1)
        : responsesRef.where("club_id", "==", data.club_id).limit(1);

      const existing = await tx.get(checkQuery);

      if (!existing.empty) {
        throw new DuplicateFormSubmissionError();
      }

      // 系統帶不出社團（不在 clubs 名單內的試辦社團／學生組織）時，
      // 以使用者自填的「社團名稱」欄位作為社團名稱來源。
      const customClubName = isUnresolvedClubId(data.club_id)
        ? extractCustomClubName(options?.formFields, data.answers)
        : undefined;

      const newRef = responsesRef.doc();
      tx.set(newRef, {
        ...data,
        ...(customClubName ? { club_name_custom: customClubName } : {}),
        submitted_at: FieldValue.serverTimestamp(),
        is_duplicate_attempt: false,
      });

      const depositAmount = options?.depositPolicy?.amount;
      const requiresDeposit =
        options?.depositPolicy?.required === true &&
        typeof depositAmount === "number" &&
        Number.isFinite(depositAmount) &&
        depositAmount > 0;

      if (requiresDeposit) {
        const depositRef = depositsRef.doc();
        // 綁定資訊兩種 binding_mode 都寫入：紀錄本來就是由送出表單自動建立的，
        // 少了 form_id 會讓同一社團的多筆保證金在後台無法分辨來源。
        const depositPayload: Record<string, unknown> = {
          club_id: data.club_id,
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
    if (error instanceof DuplicateFormSubmissionError) {
      throw error;
    }
    throw new Error(
      `Failed to submit response for form "${formId}": ${error instanceof Error ? error.message : error}`
    );
  }
}
