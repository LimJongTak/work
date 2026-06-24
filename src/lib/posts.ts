import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ApprovalStep, Attachment, ContentType, Post } from "../types";

const postsRef = () => collection(db, "posts");

/** 고정 글 우선 + 최신순 정렬. 복합 인덱스 없이 앱에서 정렬합니다. */
function sortNewestFirst(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    // 고정(pinned)된 글을 항상 위로
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (
      (b.createdAt?.toMillis() ?? Infinity) -
      (a.createdAt?.toMillis() ?? Infinity)
    );
  });
}

export async function fetchPostsByBoard(boardId: string): Promise<Post[]> {
  // orderBy 를 쿼리에서 빼면 복합 인덱스가 필요 없습니다.
  const snap = await getDocs(
    query(postsRef(), where("boardId", "==", boardId)),
  );
  return sortNewestFirst(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post),
  );
}

/** 게시판의 글 목록을 실시간으로 구독합니다. 반환 함수로 구독 해제. */
export function subscribeBoardPosts(
  boardId: string,
  onChange: (posts: Post[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(postsRef(), where("boardId", "==", boardId));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post)),
      ),
    (err) => onError?.(err),
  );
}

/** 최근 게시글을 가져옵니다. (전체 검색·대시보드용) */
export async function fetchRecentPosts(max = 300): Promise<Post[]> {
  const snap = await getDocs(
    query(postsRef(), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

/** 특정 작성자의 글 (최신순) */
export async function fetchPostsByAuthor(uid: string): Promise<Post[]> {
  const snap = await getDocs(
    query(postsRef(), where("authorId", "==", uid)),
  );
  return sortNewestFirst(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post),
  );
}

export async function fetchPost(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, "posts", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Post) : null;
}

export interface PostInput {
  boardId: string;
  categoryId?: string;
  title: string;
  content: string;
  contentType: ContentType;
  docNumber?: string;
  status?: string;
  attachments?: Attachment[];
  pinned?: boolean;
  minLevel?: number;
  private?: boolean;
  tags?: string[];
  approvals?: ApprovalStep[];
  approverUids?: string[];
  authorId: string;
  authorName: string;
}

/** 게시글을 다른 게시판으로 이동 (분류는 초기화) */
export async function movePost(id: string, boardId: string) {
  return updateDoc(doc(db, "posts", id), { boardId, categoryId: null });
}

/** 공문 문서번호 자동 발급: "연도-0001" 형식 (연도별 일련번호, 트랜잭션) */
export async function nextDocNumber(year: number): Promise<string> {
  const ref = doc(db, "counters", `doc_${year}`);
  let seq = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    seq = (snap.exists() ? (snap.data().seq as number) : 0) + 1;
    tx.set(ref, { seq }, { merge: true });
  });
  return `${year}-${String(seq).padStart(4, "0")}`;
}

/** 결재 단계 처리 (결재선에 포함된 사용자가 호출) */
export async function setPostApprovals(
  id: string,
  approvals: ApprovalStep[],
  status: string,
) {
  return updateDoc(doc(db, "posts", id), { approvals, status });
}

export async function createPost(input: PostInput) {
  return addDoc(postsRef(), {
    ...input,
    attachments: input.attachments ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePost(
  id: string,
  input: Partial<Omit<PostInput, "boardId" | "authorId" | "authorName">>,
) {
  return updateDoc(doc(db, "posts", id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePost(id: string) {
  return deleteDoc(doc(db, "posts", id));
}
