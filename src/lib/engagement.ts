import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Bookmark } from "../types";

/* ---------------- 조회수 ---------------- */

/** 같은 세션에서 중복 집계하지 않고 조회수 1 증가 */
export async function bumpViewOnce(postId: string) {
  const key = `viewed_${postId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  try {
    await updateDoc(doc(db, "posts", postId), { viewCount: increment(1) });
  } catch (e) {
    console.warn("조회수 증가 실패:", e);
  }
}

/* ---------------- 좋아요 ---------------- */

const likeId = (postId: string, uid: string) => `${postId}_${uid}`;

/** 내가 이 글을 좋아요 했는지 실시간 구독 */
export function subscribeMyLike(
  postId: string,
  uid: string,
  onChange: (liked: boolean) => void,
) {
  return onSnapshot(doc(db, "likes", likeId(postId, uid)), (snap) =>
    onChange(snap.exists()),
  );
}

export async function toggleLike(postId: string, uid: string): Promise<boolean> {
  const ref = doc(db, "likes", likeId(postId, uid));
  const snap = await getDoc(ref);
  const postRef = doc(db, "posts", postId);
  if (snap.exists()) {
    await deleteDoc(ref);
    await updateDoc(postRef, { likeCount: increment(-1) });
    return false;
  } else {
    await setDoc(ref, { postId, uid, createdAt: serverTimestamp() });
    await updateDoc(postRef, { likeCount: increment(1) });
    return true;
  }
}

/** 내가 좋아요한 글 id 목록 */
export async function fetchMyLikedPostIds(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "likes"), where("uid", "==", uid)),
  );
  return snap.docs.map((d) => d.data().postId as string);
}

/* ---------------- 북마크 ---------------- */

const bmId = (postId: string, uid: string) => `${postId}_${uid}`;

export function subscribeMyBookmark(
  postId: string,
  uid: string,
  onChange: (marked: boolean) => void,
) {
  return onSnapshot(doc(db, "bookmarks", bmId(postId, uid)), (snap) =>
    onChange(snap.exists()),
  );
}

export async function toggleBookmark(
  uid: string,
  post: { id: string; title: string; boardId: string },
): Promise<boolean> {
  const ref = doc(db, "bookmarks", bmId(post.id, uid));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  } else {
    await setDoc(ref, {
      uid,
      postId: post.id,
      title: post.title,
      boardId: post.boardId,
      createdAt: serverTimestamp(),
    });
    return true;
  }
}

/* ---------------- 댓글 좋아요 ---------------- */

const clId = (commentId: string, uid: string) => `${commentId}_${uid}`;

export function subscribeMyCommentLike(
  commentId: string,
  uid: string,
  onChange: (liked: boolean) => void,
) {
  return onSnapshot(doc(db, "commentLikes", clId(commentId, uid)), (snap) =>
    onChange(snap.exists()),
  );
}

export async function toggleCommentLike(
  commentId: string,
  uid: string,
): Promise<boolean> {
  const ref = doc(db, "commentLikes", clId(commentId, uid));
  const snap = await getDoc(ref);
  const cRef = doc(db, "comments", commentId);
  if (snap.exists()) {
    await deleteDoc(ref);
    await updateDoc(cRef, { likeCount: increment(-1) });
    return false;
  } else {
    await setDoc(ref, { commentId, uid, createdAt: serverTimestamp() });
    await updateDoc(cRef, { likeCount: increment(1) });
    return true;
  }
}

export function subscribeMyBookmarks(
  uid: string,
  onChange: (list: Bookmark[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(collection(db, "bookmarks"), where("uid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bookmark);
      list.sort(
        (a, b) =>
          (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
      );
      onChange(list);
    },
    (err) => onError?.(err),
  );
}
