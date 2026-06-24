import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Role, UserProfile } from "../types";

/** 온라인 기준: 마지막 접속이 2분 이내 */
export function isOnline(lastSeenMs?: number): boolean {
  if (!lastSeenMs) return false;
  return Date.now() - lastSeenMs < 120_000;
}

/** 접속 표시(heartbeat) — 주기적으로 호출 */
export async function touchPresence(uid: string) {
  try {
    await updateDoc(doc(db, "users", uid), { lastSeen: serverTimestamp() });
  } catch {
    /* 무시 */
  }
}

const usersRef = () => collection(db, "users");

export async function fetchUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(usersRef(), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
}

/** 전체 사용자 실시간 구독 (온라인 표시 등) */
export function subscribeUsers(
  onChange: (users: UserProfile[]) => void,
  onError?: (err: Error) => void,
) {
  return onSnapshot(
    usersRef(),
    (snap) =>
      onChange(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)),
    (err) => onError?.(err),
  );
}

export async function setUserRole(uid: string, role: Role) {
  return updateDoc(doc(db, "users", uid), { role });
}

export async function setUserApproved(uid: string, approved: boolean) {
  return updateDoc(doc(db, "users", uid), { approved, rejected: false });
}

/** 가입 반려 */
export async function rejectUser(uid: string) {
  return updateDoc(doc(db, "users", uid), { approved: false, rejected: true });
}

/** 회원(프로필) 삭제 — 로그인 자격은 Firebase 콘솔에서 별도 삭제 필요 */
export async function deleteUser(uid: string) {
  return deleteDoc(doc(db, "users", uid));
}

/** 특정 회원이 작성한 글·댓글을 모두 삭제 */
export async function deleteUserContent(uid: string): Promise<number> {
  let count = 0;
  for (const col of ["posts", "comments"]) {
    const snap = await getDocs(
      query(collection(db, col), where("authorId", "==", uid)),
    );
    // 500개 단위로 배치 삭제
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    count += snap.docs.length;
  }
  return count;
}
