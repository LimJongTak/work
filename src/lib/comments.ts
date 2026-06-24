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
import type { Comment } from "../types";

const commentsRef = () => collection(db, "comments");

/** 댓글을 실시간으로 구독합니다. 반환된 함수를 호출하면 구독이 해제됩니다. */
export function subscribeComments(
  postId: string,
  onChange: (comments: Comment[]) => void,
  onError?: (err: Error) => void,
) {
  // orderBy 를 빼서 복합 인덱스 없이 동작하게 하고, 오래된순으로 앱에서 정렬합니다.
  const q = query(commentsRef(), where("postId", "==", postId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
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

export async function createComment(input: {
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId?: string;
}) {
  return addDoc(commentsRef(), {
    ...input,
    parentId: input.parentId ?? null,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function deleteComment(id: string) {
  return deleteDoc(doc(db, "comments", id));
}

/** 특정 작성자의 댓글 (최신순) */
export async function fetchCommentsByAuthor(uid: string): Promise<Comment[]> {
  const snap = await getDocs(
    query(commentsRef(), where("authorId", "==", uid)),
  );
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
  list.sort(
    (a, b) =>
      (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
  return list;
}
