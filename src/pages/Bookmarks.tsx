import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBoards } from "../contexts/BoardsContext";
import { subscribeMyBookmarks } from "../lib/engagement";
import type { Bookmark } from "../types";
import { timeAgo } from "../lib/format";
import { BOARD_TYPE_META } from "../types";

export default function Bookmarks() {
  const { user } = useAuth();
  const { boards } = useBoards();
  const [items, setItems] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyBookmarks(user.uid, setItems);
  }, [user]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
        🔖 북마크
      </h1>
      <p className="mb-6 text-sm text-slate-500">저장해 둔 게시글 모음입니다.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          북마크한 글이 없습니다. 게시글에서 📑 북마크를 눌러보세요.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const board = boards.find((x) => x.id === b.boardId);
            return (
              <Link
                key={b.id}
                to={`/post/${b.postId}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {b.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {board
                      ? `${BOARD_TYPE_META[board.type].icon} ${board.name} · `
                      : ""}
                    {timeAgo(b.createdAt)}
                  </p>
                </div>
                <span className="text-slate-300">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
