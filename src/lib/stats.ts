import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Stats {
  users: number;
  boards: number;
  posts: number;
  comments: number;
  pendingRequests: number;
  pendingRoleRequests: number;
}

async function count(c: ReturnType<typeof query> | ReturnType<typeof collection>) {
  const snap = await getCountFromServer(c as never);
  return snap.data().count;
}

/** 집계 쿼리로 문서 수만 효율적으로 가져옵니다(문서 다운로드 없음). */
export async function getStats(): Promise<Stats> {
  const [users, boards, posts, comments, pendingRequests, pendingRoleRequests] =
    await Promise.all([
      count(collection(db, "users")),
      count(collection(db, "boards")),
      count(collection(db, "posts")),
      count(collection(db, "comments")),
      count(query(collection(db, "requests"), where("status", "==", "pending"))),
      count(
        query(collection(db, "roleRequests"), where("status", "==", "pending")),
      ),
    ]);
  return {
    users,
    boards,
    posts,
    comments,
    pendingRequests,
    pendingRoleRequests,
  };
}
