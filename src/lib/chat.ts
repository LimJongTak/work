import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Conversation, DirectMessage, LiveMessage } from "../types";

/* ---------------- 라이브톡 (전체 채팅) ---------------- */

const liveRef = () => collection(db, "liveMessages");

export function subscribeLiveMessages(
  onChange: (msgs: LiveMessage[]) => void,
  onError?: (err: Error) => void,
) {
  // 단일 필드 정렬(createdAt)은 자동 인덱스로 동작합니다.
  const q = query(liveRef(), orderBy("createdAt", "desc"), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as LiveMessage,
      );
      onChange(list.reverse()); // 오래된 → 최신 순으로
    },
    (err) => onError?.(err),
  );
}

export async function sendLiveMessage(
  text: string,
  senderId: string,
  senderName: string,
) {
  return addDoc(liveRef(), {
    text,
    senderId,
    senderName,
    createdAt: serverTimestamp(),
  });
}

/* ---------------- 1:1 메시지 ---------------- */

/** 두 사용자 uid 로 결정적 대화방 id 생성 (중복 방지) */
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export async function getOrCreateConversation(
  me: { uid: string; name: string },
  other: { uid: string; name: string },
): Promise<string> {
  const id = conversationId(me.uid, other.uid);
  const ref = doc(db, "conversations", id);
  // 존재 여부를 읽지 않고 merge 로 생성/갱신합니다.
  // (없는 문서를 getDoc 하면 보안 규칙이 null 을 참조해 권한 오류가 납니다)
  // members / memberNames 만 병합하므로 기존 lastMessage 는 보존됩니다.
  await setDoc(
    ref,
    {
      members: [me.uid, other.uid],
      memberNames: { [me.uid]: me.name, [other.uid]: other.name },
    },
    { merge: true },
  );
  return id;
}

/** 그룹 대화방 생성 */
export async function createGroupConversation(
  name: string,
  members: { uid: string; name: string }[],
  creatorUid: string,
): Promise<string> {
  const memberNames: Record<string, string> = {};
  members.forEach((m) => (memberNames[m.uid] = m.name));
  const ref = await addDoc(collection(db, "conversations"), {
    isGroup: true,
    name,
    members: members.map((m) => m.uid),
    memberNames,
    createdBy: creatorUid,
    lastMessage: "",
    lastAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeConversations(
  uid: string,
  onChange: (convs: Conversation[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(
    collection(db, "conversations"),
    where("members", "array-contains", uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Conversation,
      );
      list.sort(
        (a, b) => (b.lastAt?.toMillis() ?? 0) - (a.lastAt?.toMillis() ?? 0),
      );
      onChange(list);
    },
    (err) => onError?.(err),
  );
}

export function subscribeDirectMessages(
  convId: string,
  onChange: (msgs: DirectMessage[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(
    collection(db, "directMessages"),
    where("conversationId", "==", convId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as DirectMessage,
      );
      list.sort(
        (a, b) =>
          (a.createdAt?.toMillis() ?? Infinity) -
          (b.createdAt?.toMillis() ?? Infinity),
      );
      onChange(list);
    },
    (err) => onError?.(err),
  );
}

export async function sendDirectMessage(
  convId: string,
  text: string,
  senderId: string,
  senderName: string,
) {
  await addDoc(collection(db, "directMessages"), {
    conversationId: convId,
    text,
    senderId,
    senderName,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: text,
    lastAt: serverTimestamp(),
    lastSenderId: senderId,
  });
}

/** 대화방을 지금 읽은 것으로 표시 */
export async function markConversationRead(convId: string, uid: string) {
  try {
    await updateDoc(doc(db, "conversations", convId), {
      [`reads.${uid}`]: serverTimestamp(),
    });
  } catch (e) {
    console.warn("읽음 처리 실패:", e);
  }
}
