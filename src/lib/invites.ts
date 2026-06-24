import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { InviteCode } from "../types";

const codesRef = () => collection(db, "inviteCodes");

/** 헷갈리는 문자(0,O,1,I)를 제외한 6자리 코드 생성 */
export function genCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

export async function createInviteCode(createdBy: string): Promise<string> {
  const code = genCode();
  await setDoc(doc(db, "inviteCodes", code), {
    code,
    used: false,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return code;
}

export function subscribeInviteCodes(
  onChange: (codes: InviteCode[]) => void,
  onError?: (err: Error) => void,
) {
  // 단일 필드 정렬(createdAt)은 자동 인덱스로 동작
  const q = query(codesRef(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as InviteCode)),
    (err) => onError?.(err),
  );
}

/** 추천코드 검증 + 1회용 소진 (트랜잭션). 유효하지 않으면 예외 발생. */
export async function consumeInviteCode(
  code: string,
  uid: string,
  name: string,
) {
  const ref = doc(db, "inviteCodes", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("존재하지 않는 추천코드입니다.");
    if (snap.data().used) throw new Error("이미 사용된 추천코드입니다.");
    tx.update(ref, {
      used: true,
      usedBy: uid,
      usedByName: name,
      usedAt: serverTimestamp(),
    });
  });
}

export async function deleteInviteCode(code: string) {
  return deleteDoc(doc(db, "inviteCodes", code));
}
