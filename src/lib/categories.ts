import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Category } from "../types";

const categoriesRef = () => collection(db, "categories");

function sortByOrder(list: Category[]): Category[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function subscribeCategories(
  boardId: string,
  onChange: (cats: Category[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(categoriesRef(), where("boardId", "==", boardId));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category)),
      ),
    (err) => onError?.(err),
  );
}

export async function fetchCategories(boardId: string): Promise<Category[]> {
  const snap = await getDocs(
    query(categoriesRef(), where("boardId", "==", boardId)),
  );
  return sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category));
}

export async function createCategory(boardId: string, name: string, order = 0) {
  return addDoc(categoriesRef(), {
    boardId,
    name,
    order,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCategory(id: string) {
  return deleteDoc(doc(db, "categories", id));
}
