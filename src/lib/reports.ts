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
} from "firebase/firestore";
import { db } from "../firebase";
import type { Timestamp } from "firebase/firestore";

export interface Report {
  id: string;
  postId: string;
  postTitle: string;
  boardId: string;
  reason: string;
  reporterId: string;
  reporterName: string;
  status: "open" | "resolved";
  createdAt?: Timestamp;
}

const reportsRef = () => collection(db, "reports");

export async function createReport(input: {
  postId: string;
  postTitle: string;
  boardId: string;
  reason: string;
  reporterId: string;
  reporterName: string;
}) {
  return addDoc(reportsRef(), {
    ...input,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export function subscribeOpenReports(
  onChange: (list: Report[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(reportsRef(), where("status", "==", "open"), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Report);
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

export async function resolveReport(id: string) {
  return updateDoc(doc(db, "reports", id), { status: "resolved" });
}
