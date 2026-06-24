import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import type { AppNotification, NotificationType } from "../types";

const notifsRef = () => collection(db, "notifications");

/** 알림 생성 (본인에게 보내는 알림은 무시) */
export async function notify(input: {
  toUid: string;
  fromUid: string;
  type: NotificationType;
  text: string;
  link: string;
  fromName?: string;
}) {
  if (!input.toUid || input.toUid === input.fromUid) return;
  try {
    await addDoc(notifsRef(), {
      toUid: input.toUid,
      type: input.type,
      text: input.text,
      link: input.link,
      fromName: input.fromName ?? "",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("알림 생성 실패:", e);
  }
}

export function subscribeMyNotifications(
  uid: string,
  onChange: (list: AppNotification[]) => void,
  onError?: (err: Error) => void,
) {
  // 단일 필드(createdAt) 정렬 + where 는 복합 인덱스가 필요하므로 정렬은 앱에서 처리
  const q = query(notifsRef(), where("toUid", "==", uid), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AppNotification,
      );
      list.sort(
        (a, b) =>
          (b.createdAt?.toMillis() ?? Infinity) -
          (a.createdAt?.toMillis() ?? Infinity),
      );
      onChange(list);
    },
    (err) => onError?.(err),
  );
}

export async function markNotificationRead(id: string) {
  return updateDoc(doc(db, "notifications", id), { read: true });
}

export async function markAllRead(uid: string) {
  // 복합 인덱스를 피하려 단일 where 로 가져와 읽지 않은 것만 갱신
  const snap = await getDocs(query(notifsRef(), where("toUid", "==", uid)));
  const batch = writeBatch(db);
  snap.docs
    .filter((d) => d.data().read === false)
    .forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}
