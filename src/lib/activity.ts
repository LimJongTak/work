import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Timestamp } from "firebase/firestore";

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  target?: string;
  createdAt?: Timestamp;
}

const logsRef = () => collection(db, "activityLogs");

/** 활동 기록 (실패해도 본 작업에 영향 없도록 조용히 처리) */
export async function logActivity(
  actor: { uid: string; name: string } | null | undefined,
  action: string,
  target?: string,
) {
  if (!actor) return;
  try {
    await addDoc(logsRef(), {
      actorUid: actor.uid,
      actorName: actor.name,
      action,
      target: target ?? "",
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("활동 기록 실패:", e);
  }
}

export function subscribeActivity(
  onChange: (logs: ActivityLog[]) => void,
  onError?: (err: Error) => void,
  max = 200,
) {
  const q = query(logsRef(), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ActivityLog,
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
