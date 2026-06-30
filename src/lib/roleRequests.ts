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
import { setUserRole } from "./users";
import type { Role, RoleRequest } from "../types";

const roleReqRef = () => collection(db, "roleRequests");

export interface NewRoleRequest {
  requesterId: string;
  requesterName: string;
  currentRole: Role;
  desiredRole: Role;
  reason?: string;
}

export async function createRoleRequest(input: NewRoleRequest) {
  return addDoc(roleReqRef(), {
    ...input,
    reason: input.reason ?? "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

function sortNewest(list: RoleRequest[]): RoleRequest[] {
  return [...list].sort(
    (a, b) =>
      (b.createdAt?.toMillis() ?? Infinity) -
      (a.createdAt?.toMillis() ?? Infinity),
  );
}

/** 대기중 등급 신청 실시간 구독 (관리자용) */
export function subscribePendingRoleRequests(
  onChange: (reqs: RoleRequest[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(roleReqRef(), where("status", "==", "pending"));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        sortNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoleRequest)),
      ),
    (err) => onError?.(err),
  );
}

/** 내가 올린 등급 신청 실시간 구독 */
export function subscribeMyRoleRequests(
  uid: string,
  onChange: (reqs: RoleRequest[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(roleReqRef(), where("requesterId", "==", uid));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        sortNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoleRequest)),
      ),
    (err) => onError?.(err),
  );
}

/** 등급 신청 승인 → 신청자 등급을 desiredRole 로 변경 후 상태 갱신 */
export async function approveRoleRequest(req: RoleRequest, adminUid: string) {
  await setUserRole(req.requesterId, req.desiredRole as Role);
  await updateDoc(doc(db, "roleRequests", req.id), {
    status: "approved",
    decidedBy: adminUid,
    decidedAt: serverTimestamp(),
  });
}

/** 등급 신청 반려 */
export async function rejectRoleRequest(
  reqId: string,
  adminUid: string,
  reason: string,
) {
  await updateDoc(doc(db, "roleRequests", reqId), {
    status: "rejected",
    decidedBy: adminUid,
    decidedAt: serverTimestamp(),
    rejectReason: reason,
  });
}
