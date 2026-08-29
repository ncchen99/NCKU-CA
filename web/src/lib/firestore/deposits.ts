import { getAdminDb } from "@/lib/firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import type { DepositRecord } from "@/types";

const COLLECTION = "deposit_records";

export async function getDepositRecord(
  id: string
): Promise<DepositRecord | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as DepositRecord;
  } catch (error) {
    throw new Error(
      `Failed to get deposit record "${id}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getDepositRecords(
  options?: { status?: string; clubId?: string }
): Promise<DepositRecord[]> {
  try {
    const db = getAdminDb();
    let query = db.collection(COLLECTION) as FirebaseFirestore.Query;

    if (options?.status) {
      query = query.where("status", "==", options.status);
    }
    if (options?.clubId) {
      query = query.where("club_id", "==", options.clubId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as DepositRecord
    );
  } catch (error) {
    throw new Error(
      `Failed to get deposit records: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function createDepositRecord(
  data: Omit<DepositRecord, "id">
): Promise<string> {
  try {
    const db = getAdminDb();
    const docRef = await db.collection(COLLECTION).add(data);
    return docRef.id;
  } catch (error) {
    throw new Error(
      `Failed to create deposit record: ${error instanceof Error ? error.message : error}`
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

type DepositBindingMeta = {
  form_id?: string;
  form_title?: string;
};

export async function getDepositBindingMeta(
  records: DepositRecord[]
): Promise<Map<string, DepositBindingMeta>> {
  try {
    if (records.length === 0) return new Map();

    const db = getAdminDb();
    const responseIdToFormId = new Map<string, string>();
    const responseIdsToResolve = new Set<string>();

    for (const record of records) {
      if (!record.form_response_id) continue;
      if (record.form_id) {
        responseIdToFormId.set(record.form_response_id, record.form_id);
        continue;
      }
      responseIdsToResolve.add(record.form_response_id);
    }

    for (const chunk of chunkArray(Array.from(responseIdsToResolve), 10)) {
      const responseSnapshot = await db
        .collectionGroup("responses")
        .where(FieldPath.documentId(), "in", chunk)
        .get();

      for (const responseDoc of responseSnapshot.docs) {
        const formDocRef = responseDoc.ref.parent.parent;
        if (!formDocRef) continue;
        responseIdToFormId.set(responseDoc.id, formDocRef.id);
      }
    }

    const formIds = [...new Set(Array.from(responseIdToFormId.values()))];
    const formTitleById = new Map<string, string>();

    for (const chunk of chunkArray(formIds, 10)) {
      const formsSnapshot = await db
        .collection("forms")
        .where(FieldPath.documentId(), "in", chunk)
        .get();

      for (const formDoc of formsSnapshot.docs) {
        const title = formDoc.data().title;
        if (typeof title === "string" && title.trim()) {
          formTitleById.set(formDoc.id, title);
        }
      }
    }

    const metaByDepositId = new Map<string, DepositBindingMeta>();

    for (const record of records) {
      if (!record.form_response_id) continue;
      const formId = record.form_id ?? responseIdToFormId.get(record.form_response_id);
      if (!formId) continue;
      metaByDepositId.set(record.id, {
        form_id: formId,
        form_title: formTitleById.get(formId),
      });
    }

    return metaByDepositId;
  } catch (error) {
    throw new Error(
      `Failed to resolve deposit binding meta: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function syncMissingLinkedDepositRecords(): Promise<number> {
  try {
    const db = getAdminDb();
    const formsSnapshot = await db
      .collection("forms")
      .where("deposit_policy.required", "==", true)
      .where("deposit_policy.binding_mode", "==", "linked_to_response")
      .get();

    let created = 0;

    for (const formDoc of formsSnapshot.docs) {
      const formData = formDoc.data() as {
        deposit_policy?: { amount?: number };
      };
      const amount = formData.deposit_policy?.amount;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      const responsesSnapshot = await formDoc.ref.collection("responses").get();
      if (responsesSnapshot.empty) continue;

      const responseDocs = responsesSnapshot.docs;
      const responseIds = responseDocs.map((doc) => doc.id);
      const existingResponseIds = new Set<string>();

      for (const chunk of chunkArray(responseIds, 10)) {
        const existingSnapshot = await db
          .collection(COLLECTION)
          .where("form_response_id", "in", chunk)
          .get();
        for (const existing of existingSnapshot.docs) {
          const existingId = existing.data().form_response_id;
          if (typeof existingId === "string" && existingId) {
            existingResponseIds.add(existingId);
          }
        }
      }

      const batch = db.batch();
      let batchCount = 0;

      for (const responseDoc of responseDocs) {
        if (existingResponseIds.has(responseDoc.id)) continue;
        const responseData = responseDoc.data() as {
          club_id?: string;
          club_name_custom?: string;
          submitted_by_uid?: string;
        };
        if (!responseData.club_id) continue;

        const depositRef = db.collection(COLLECTION).doc();
        batch.set(depositRef, {
          club_id: responseData.club_id,
          ...(responseData.club_name_custom
            ? { club_name_custom: responseData.club_name_custom }
            : {}),
          form_id: formDoc.id,
          form_response_id: responseDoc.id,
          status: "pending_payment",
          amount,
          updated_by: responseData.submitted_by_uid ?? "system",
        });
        batchCount += 1;
      }

      if (batchCount > 0) {
        await batch.commit();
        created += batchCount;
      }
    }

    return created;
  } catch (error) {
    throw new Error(
      `Failed to sync linked deposit records: ${error instanceof Error ? error.message : error}`
    );
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["paid"],
  paid: ["returned"],
};

export async function updateDepositStatus(
  id: string,
  newStatus: "paid" | "returned",
  adminUid: string
): Promise<void> {
  try {
    const db = getAdminDb();
    const docRef = db.collection(COLLECTION).doc(id);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) {
        throw new Error(`Deposit record "${id}" not found`);
      }

      const current = doc.data()!;
      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Invalid status transition: ${current.status} → ${newStatus}`
        );
      }

      const update: Record<string, unknown> = {
        status: newStatus,
        updated_by: adminUid,
      };

      if (newStatus === "paid") {
        update.paid_at = FieldValue.serverTimestamp();
      } else if (newStatus === "returned") {
        update.returned_at = FieldValue.serverTimestamp();
      }

      tx.update(docRef, update);
    });
  } catch (error) {
    throw new Error(
      `Failed to update deposit status "${id}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function batchUpdateDepositStatus(
  ids: string[],
  newStatus: "paid" | "returned",
  adminUid: string
): Promise<void> {
  if (ids.length === 0) return;

  try {
    const db = getAdminDb();
    const batch = db.batch();

    for (const id of ids) {
      const docRef = db.collection(COLLECTION).doc(id);
      const update: Record<string, unknown> = {
        status: newStatus,
        updated_by: adminUid,
      };

      if (newStatus === "paid") {
        update.paid_at = FieldValue.serverTimestamp();
      } else if (newStatus === "returned") {
        update.returned_at = FieldValue.serverTimestamp();
      }

      batch.update(docRef, update);
    }

    await batch.commit();
  } catch (error) {
    throw new Error(
      `Failed to batch update deposit statuses: ${error instanceof Error ? error.message : error}`
    );
  }
}
