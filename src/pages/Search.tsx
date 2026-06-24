import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchRecentPosts } from "../lib/posts";
import { useBoards } from "../contexts/BoardsContext";
import { useAuth } from "../contexts/AuthContext";
import { BOARD_TYPE_META, roleLevel, type Post } from "../types";
import { formatDate } from "../lib/format";
import Spinner from "../components/Spinner";

export default function Search() {
  const [params] = useSearchParams();
  const keyword = (params.get("q") ?? "").trim();
  const tagParam = (params.get("tag") ?? "").trim().toLowerCase();
  const { boards } = useBoards();
  const { user, role } = useAuth();
  const myLevel = roleLevel(role);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardFilter, setBoardFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchRecentPosts()
      .then((data) => alive && setPosts(data))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const boardName = useMemo(() => {
    const map = new Map(boards.map((b) => [b.id, b]));
    return (id: string) => map.get(id);
  }, [boards]);

  const lower = keyword.toLowerCase();
  const authorLower = authorFilter.trim().toLowerCase();
  const fromMs = fromDate ? new Date(fromDate + "T00:00").getTime() : null;
  const toMs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

  const hasFilter =
    !!keyword || !!tagParam || !!boardFilter || !!authorLower || !!fromMs || !!toMs;

  const results = hasFilter
    ? posts.filter((p) => {
        if (p.private && p.authorId !== user?.uid) return false;
        if ((p.minLevel ?? 0) > myLevel) return false;
        if (
          tagParam &&
          !(p.tags ?? []).some((t) => t.toLowerCase() === tagParam)
        )
          return false;
        if (
          keyword &&
          !(
            p.title.toLowerCase().includes(lower) ||
            p.content.toLowerCase().includes(lower) ||
            (p.docNumber ?? "").toLowerCase().includes(lower) ||
            p.authorName.toLowerCase().includes(lower)
          )
        )
          return false;
        if (boardFilter && p.boardId !== boardFilter) return false;
        if (authorLower && !p.authorName.toLowerCase().includes(authorLower))
          return false;
        const ms = p.createdAt?.toMillis() ?? 0;
        if (fromMs && ms < fromMs) return false;
        if (toMs && ms > toMs) return false;
        return true;
      })
    : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">전체 검색</h1>
      <p className="mb-4 text-sm text-slate-500">
        {hasFilter ? (
          <>
            {keyword && (
              <span className="font-medium text-slate-700 dark:text-slate-200">
                "{keyword}"{" "}
              </span>
            )}
            {tagParam && (
              <span className="font-medium text-brand-600">#{tagParam} </span>
            )}
            검색 결과 {!loading && `· ${results.length}건`}
          </>
        ) : (
          "검색어를 입력하거나 아래 필터로 글을 찾으세요."
        )}
      </p>

      {/* 고급 필터 */}
      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs text-slate-500">
          게시판
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">전체</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          작성자
          <input
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            placeholder="이름"
            className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </label>
        <label className="text-xs text-slate-500">
          시작일
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </label>
        <label className="text-xs text-slate-500">
          종료일
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </label>
        {(boardFilter || authorFilter || fromDate || toDate) && (
          <button
            onClick={() => {
              setBoardFilter("");
              setAuthorFilter("");
              setFromDate("");
              setToDate("");
            }}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            초기화
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : hasFilter && results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center text-slate-500">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((post) => {
            const board = boardName(post.boardId);
            return (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="block rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {board && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                      {BOARD_TYPE_META[board.type].icon} {board.name}
                    </span>
                  )}
                  <span>{post.authorName}</span>
                  <span>·</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <h2 className="mt-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  {post.title}
                  {post.contentType === "html" && (
                    <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-600">
                      HTML
                    </span>
                  )}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {post.contentType === "html"
                    ? post.content.replace(/<[^>]+>/g, " ").slice(0, 160)
                    : post.content.slice(0, 160)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
