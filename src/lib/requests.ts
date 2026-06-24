import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { createBoard } from "./boards";
import { createCategory } from "./categories";
import type { BoardType, OpenRequest } from "../types";

const requestsRef = () => collection(db, "requests");

export interface NewRequest {
  type: "board" | "category";
  name: string;
  boardType?: BoardType;
  boardId?: string;
  boardName?: string;
  description?: string;
  requesterId: string;
  requesterName: string;
}

export async function createRequest(input: NewRequest) {
  return addDoc(requestsRef(), {
    ...input,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

function sortNewest(list: OpenRequest[]): OpenRequest[] {
  return [...list].sort(
    (a, b) =>
      (b.createdAt?.toMillis() ?? Infinity) -
      (a.createdAt?.toMillis() ?? Infinity),
  );
}

/** 대기중 요청 실시간 구독 (관리자용) */
export function subscribePendingRequests(
  onChange: (reqs: OpenRequest[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(requestsRef(), where("status", "==", "pending"));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        sortNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OpenRequest)),
      ),
    (err) => onError?.(err),
  );
}

/** 내가 올린 요청 실시간 구독 */
export function subscribeMyRequests(
  uid: string,
  onChange: (reqs: OpenRequest[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(requestsRef(), where("requesterId", "==", uid));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        sortNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OpenRequest)),
      ),
    (err) => onError?.(err),
  );
}

/** 요청 승인 → 실제 게시판/카테고리 생성 후 상태 갱신 */
export async function approveRequest(req: OpenRequest, adminUid: string) {
  if (req.type === "board") {
    await createBoard({
      name: req.name,
      type: req.boardType ?? "work",
      description: req.description ?? "",
      order: 999,
      createdBy: req.requesterId,
    });
  } else if (req.type === "category" && req.boardId) {
    await createCategory(req.boardId, req.name, 999);
  }
  await updateDoc(doc(db, "requests", req.id), {
    status: "approved",
    decidedBy: adminUid,
    decidedAt: serverTimestamp(),
  });
}

/** 요청 반려 */
export async function rejectRequest(
  reqId: string,
  adminUid: string,
  reason: string,
) {
  await updateDoc(doc(db, "requests", reqId), {
    status: "rejected",
    decidedBy: adminUid,
    decidedAt: serverTimestamp(),
    rejectReason: reason,
  });
}
