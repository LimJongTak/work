import { useState } from "react";
import { useBoards } from "../../contexts/BoardsContext";
import { useAuth } from "../../contexts/AuthContext";
import { createBoard, deleteBoard, updateBoard } from "../../lib/boards";
import { logActivity } from "../../lib/activity";
import { BOARD_TYPE_META, type Board, type BoardType } from "../../types";

const TYPES: BoardType[] = [
  "notice",
  "free",
  "work",
  "document",
  "html",
  "reference",
];

const WRITE_LEVELS: { label: string; value: number }[] = [
  { label: "전체 글쓰기 가능", value: 0 },
  { label: "준회원 이상", value: 20 },
  { label: "일반회원 이상", value: 40 },
  { label: "정회원 이상", value: 60 },
  { label: "매니저 이상", value: 80 },
  { label: "관리자만", value: 100 },
];

export default function AdminBoards() {
  const { boards, refresh } = useBoards();
  const { user, profile } = useAuth();
  const actor = user && profile ? { uid: user.uid, name: profile.displayName } : null;

  const [name, setName] = useState("");
  const [type, setType] = useState<BoardType>("work");
  const [description, setDescription] = useState("");
  const [writeLevel, setWriteLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Board | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      await createBoard({
        name: name.trim(),
        type,
        description: description.trim(),
        order: boards.length,
        writeLevel,
        createdBy: user.uid,
      });
      void logActivity(actor, "게시판 생성", name.trim());
      setName("");
      setDescription("");
      setType("work");
      setWriteLevel(0);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(board: Board) {
    if (
      !confirm(
        `'${board.name}' 게시판을 삭제할까요?\n(게시판만 삭제되며 글은 남아있을 수 있습니다.)`,
      )
    )
      return;
    await deleteBoard(board.id);
    void logActivity(actor, "게시판 삭제", board.name);
    await refresh();
  }

  async function handleMove(board: Board, dir: -1 | 1) {
    const idx = boards.findIndex((b) => b.id === board.id);
    const target = boards[idx + dir];
    if (!target) return;
    await Promise.all([
      updateBoard(board.id, { order: target.order }),
      updateBoard(target.id, { order: board.order }),
    ]);
    await refresh();
  }

  async function handleSaveEdit() {
    if (!editing) return;
    await updateBoard(editing.id, {
      name: editing.name,
      type: editing.type,
      description: editing.description ?? "",
      writeLevel: editing.writeLevel ?? 0,
    });
    setEditing(null);
    await refresh();
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">게시판 관리</h1>
      <p className="mb-6 text-sm text-slate-500">
        게시판을 추가, 수정, 삭제하고 순서를 변경할 수 있습니다.
      </p>

      {/* 새 게시판 추가 */}
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm"
      >
        <h2 className="mb-4 font-semibold text-slate-700">새 게시판 추가</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              이름
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 공문 작성 관리"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              종류
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BoardType)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {BOARD_TYPE_META[t].icon} {BOARD_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              설명 (선택)
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="게시판 설명"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              글쓰기 권한
            </span>
            <select
              value={writeLevel}
              onChange={(e) => setWriteLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {WRITE_LEVELS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {BOARD_TYPE_META[type].hint}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "추가 중..." : "게시판 추가"}
        </button>
      </form>

      {/* 게시판 목록 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        {boards.length === 0 ? (
          <p className="p-8 text-center text-slate-400">게시판이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {boards.map((board, i) => (
              <li key={board.id} className="flex items-center gap-3 p-4">
                <span className="text-xl">
                  {BOARD_TYPE_META[board.type].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {board.name}
                  </p>
                  <p className="truncate text-sm text-slate-400">
                    {BOARD_TYPE_META[board.type].label}
                    {board.description ? ` · ${board.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMove(board, -1)}
                    disabled={i === 0}
                    className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    title="위로"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(board, 1)}
                    disabled={i === boards.length - 1}
                    className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    title="아래로"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => setEditing(board)}
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(board)}
                    className="rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 수정 모달 */}
      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">게시판 수정</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  이름
                </span>
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  종류
                </span>
                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      type: e.target.value as BoardType,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {BOARD_TYPE_META[t].icon} {BOARD_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  설명
                </span>
                <input
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  글쓰기 권한
                </span>
                <select
                  value={editing.writeLevel ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, writeLevel: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  {WRITE_LEVELS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
