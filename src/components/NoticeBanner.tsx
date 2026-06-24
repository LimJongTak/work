import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBoards } from "../contexts/BoardsContext";
import { fetchRecentPosts } from "../lib/posts";
import type { Post } from "../types";

/** 공지사항 게시판의 최신 글을 모든 화면 상단에 배너로 표시 */
export default function NoticeBanner() {
  const { boards } = useBoards();
  const [notice, setNotice] = useState<Post | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const noticeBoardIds = new Set(
      boards.filter((b) => b.type === "notice").map((b) => b.id),
    );
    if (noticeBoardIds.size === 0) {
      setNotice(null);
      return;
    }
    let alive = true;
    fetchRecentPosts(100)
      .then((posts) => {
        if (!alive) return;
        const latest = posts.find((p) => noticeBoardIds.has(p.boardId));
        setNotice(latest ?? null);
        if (latest) {
          setDismissed(
            localStorage.getItem(`noticeDismissed_${latest.id}`) === "1",
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [boards]);

  if (!notice || dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 print:hidden">
      <span className="shrink-0">📢</span>
      <Link
        to={`/post/${notice.id}`}
        className="min-w-0 flex-1 truncate font-medium text-amber-800 hover:underline dark:text-amber-200"
      >
        [공지] {notice.title}
      </Link>
      <button
        onClick={() => {
          localStorage.setItem(`noticeDismissed_${notice.id}`, "1");
          setDismissed(true);
        }}
        className="shrink-0 text-amber-500 hover:text-amber-700 dark:text-slate-400"
        title="닫기"
      >
        ✕
      </button>
    </div>
  );
}
