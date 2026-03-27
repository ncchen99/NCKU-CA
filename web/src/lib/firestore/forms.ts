import { getAdminDb } from "@/lib/firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
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
      const existing = await tx.get(
        responsesRef.where("club_id", "==", data.club_id).limit(1)
      );

      if (!existing.empty) {
        throw new DuplicateFormSubmissionError();
      }

      const newRef = responsesRef.doc();
      tx.set(newRef, {
        ...data,
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
        const depositPayload: Record<string, unknown> = {
          club_id: data.club_id,
          status: "pending_payment",
          amount: depositAmount,
          updated_by: options?.updatedByUid ?? data.submitted_by_uid,
        };

        if (options?.depositPolicy?.binding_mode === "linked_to_response") {
          depositPayload.form_id = formId;
          depositPayload.form_response_id = newRef.id;
        }

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
