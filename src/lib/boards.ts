import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { createCategory } from "./categories";
import type { Board, BoardType } from "../types";

const boardsRef = () => collection(db, "boards");

export async function fetchBoards(): Promise<Board[]> {
  const snap = await getDocs(query(boardsRef(), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Board);
}

export async function createBoard(input: {
  name: string;
  type: BoardType;
  description?: string;
  order: number;
  writeLevel?: number;
  createdBy: string;
}) {
  return addDoc(boardsRef(), {
    ...input,
    description: input.description ?? "",
    writeLevel: input.writeLevel ?? 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateBoard(
  id: string,
  input: Partial<Pick<Board, "name" | "type" | "description" | "order" | "writeLevel">>,
) {
  return updateDoc(doc(db, "boards", id), input);
}

export async function deleteBoard(id: string) {
  return deleteDoc(doc(db, "boards", id));
}

/** 처음 사용 시 기본 게시판 4종을 한 번에 생성합니다. */
export async function seedDefaultBoards(createdBy: string) {
  const defaults: Array<{
    name: string;
    type: BoardType;
    description: string;
    writeLevel?: number;
  }> = [
    {
      name: "공지사항",
      type: "notice",
      description: "중요한 공지를 게시합니다.",
      writeLevel: 80, // 매니저 이상만 작성
    },
    {
      name: "자유게시판",
      type: "free",
      description: "자유롭게 소통하는 게시판입니다.",
    },
    {
      name: "HTML 저장소",
      type: "html",
      description: "HTML 코드를 저장하고 미리보기로 화면 구성을 확인합니다.",
    },
    {
      name: "공문 작성 관리",
      type: "document",
      description: "공문을 작성하고 문서번호·상태로 관리합니다.",
    },
    { name: "업무", type: "work", description: "일반 업무 내용을 기록·공유합니다." },
    { name: "참고", type: "reference", description: "참고 자료와 링크를 보관합니다." },
  ];

  const refs = await Promise.all(
    defaults.map((b, i) =>
      createBoard({
        name: b.name,
        type: b.type,
        description: b.description,
        order: i,
        writeLevel: b.writeLevel ?? 0,
        createdBy,
      }),
    ),
  );

  // 업무 게시판에 기본 세부 카테고리를 추가합니다.
  const workIdx = defaults.findIndex((b) => b.type === "work");
  if (workIdx >= 0) {
    const workBoardId = refs[workIdx].id;
    await Promise.all(
      ["행정 업무", "개발자 업무", "기획/디자인", "기타"].map((name, i) =>
        createCategory(workBoardId, name, i),
      ),
    );
  }
}
