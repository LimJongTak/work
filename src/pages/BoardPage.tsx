import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useBoards } from "../contexts/BoardsContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { subscribeBoardPosts } from "../lib/posts";
import {
  createCategory,
  deleteCategory,
  subscribeCategories,
} from "../lib/categories";
import { createRequest } from "../lib/requests";
import { logActivity } from "../lib/activity";
import { BOARD_TYPE_META, roleLevel, type Category, type Post } from "../types";
import { formatDate } from "../lib/format";
import {
  exportDoc,
  exportTxt,
  printPdf,
  type ExportItem,
} from "../lib/export";
import Spinner from "../components/Spinner";

export default function BoardPage() {
  const { boardId = "" } = useParams();
  const { boards } = useBoards();
  const { user, profile, isAdmin, role } = useAuth();
  const myLevel = roleLevel(role);
  const toast = useToast();
  const board = useMemo(
    () => boards.find((b) => b.id === boardId),
    [boards, boardId],
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [manageOpen, setManageOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleCount(20);
    setSelected(new Set());
  }, [boardId, keyword, selectedCat]);

  useEffect(() => {
    setLoading(true);
    setSelectedCat("all");
    const unsubPosts = subscribeBoardPosts(
      boardId,
      (data) => {
        setPosts(data);
        setLoading(false);
      },
      (err) => {
        console.error("게시글 구독 오류:", err);
        setPosts([]);
        setLoading(false);
      },
    );
    const unsubCats = subscribeCategories(boardId, setCategories, (e) =>
      console.error("카테고리 구독 오류:", e),
    );
    return () => {
      unsubPosts();
      unsubCats();
    };
  }, [boardId]);

  const catName = (id?: string) =>
    id ? categories.find((c) => c.id === id)?.name : undefined;

  const filtered = posts.filter((p) => {
    const matchKeyword =
      p.title.toLowerCase().includes(keyword.toLowerCase()) ||
      (p.docNumber ?? "").toLowerCase().includes(keyword.toLowerCase());
    const matchCat = selectedCat === "all" || p.categoryId === selectedCat;
    const canView = (p.minLevel ?? 0) <= myLevel; // 열람 권한
    const canViewPrivate = !p.private || p.authorId === user?.uid; // 나만보기
    return matchKeyword && matchCat && canView && canViewPrivate;
  });
  const visible = filtered.slice(0, visibleCount);

  const meta = board ? BOARD_TYPE_META[board.type] : null;
  const isDoc = board?.type === "document";
  const isHtmlBoard = board?.type === "html";
  const hasCategories = categories.length > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === visible.length && visible.length > 0
        ? new Set()
        : new Set(visible.map((p) => p.id)),
    );
  }
  function selectedItems(): ExportItem[] {
    return posts
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        title: p.title,
        category: catName(p.categoryId),
        content: p.content,
      }));
  }
  function runExport(kind: "pdf" | "doc" | "txt") {
    const items = selectedItems();
    if (items.length === 0) {
      toast.show("내보낼 글을 선택하세요.", "error");
      return;
    }
    const name = (board?.name ?? "html").replace(/\s+/g, "_");
    if (kind === "pdf") printPdf(items, board?.name ?? "내보내기");
    else if (kind === "doc") exportDoc(items, name);
    else exportTxt(items, name);
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    await createCategory(boardId, newCat.trim(), categories.length);
    if (user && profile)
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "카테고리 추가",
        `${board?.name ?? ""} / ${newCat.trim()}`,
      );
    setNewCat("");
    toast.show("카테고리를 추가했습니다.", "success");
  }

  async function removeCategory(id: string, name: string) {
    if (!confirm(`'${name}' 카테고리를 삭제할까요? (글은 유지됩니다)`)) return;
    await deleteCategory(id);
    if (user && profile)
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "카테고리 삭제",
        name,
      );
    toast.show("카테고리를 삭제했습니다.", "success");
  }

  async function requestCategory() {
    const name = prompt("요청할 카테고리 이름을 입력하세요");
    if (!name?.trim() || !user || !profile || !board) return;
    await createRequest({
      type: "category",
      name: name.trim(),
      boardId: board.id,
      boardName: board.name,
      requesterId: user.uid,
      requesterName: profile.displayName,
    });
    toast.show("카테고리 추가를 요청했습니다. 관리자 승인 후 생성됩니다.", "info");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta?.icon ?? "📋"}</span>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {board?.name ?? "게시판"}
            </h1>
          </div>
          {board?.description && (
            <p className="mt-1 text-sm text-slate-500">{board.description}</p>
          )}
        </div>
        {myLevel >= (board?.writeLevel ?? 0) ? (
          <Link
            to={`/board/${boardId}/new`}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + 글쓰기
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400 dark:border-slate-700">
            🔒 글쓰기 권한 없음
          </span>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedCat("all")}
          className={chipCls(selectedCat === "all")}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={chipCls(selectedCat === c.id)}
          >
            {c.name}
          </button>
        ))}
        {isAdmin ? (
          <button
            onClick={() => setManageOpen((v) => !v)}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            ⚙️ 카테고리 관리
          </button>
        ) : (
          <button
            onClick={requestCategory}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            + 카테고리 요청
          </button>
        )}
      </div>

      {/* 카테고리 관리 패널 (관리자) */}
      {isAdmin && manageOpen && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="새 카테고리 이름"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              onClick={addCategory}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 && (
              <span className="text-sm text-slate-400">카테고리가 없습니다.</span>
            )}
            {categories.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {c.name}
                <button
                  onClick={() => removeCategory(c.id, c.name)}
                  className="text-slate-400 hover:text-red-500"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="제목 검색..."
          className="w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        {isHtmlBoard && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">
              {selected.size > 0 ? `${selected.size}개 선택` : "내보내기:"}
            </span>
            <button
              onClick={() => runExport("pdf")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              🖨️ PDF
            </button>
            <button
              onClick={() => runExport("doc")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              📄 DOC
            </button>
            <button
              onClick={() => runExport("txt")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {"</>"} TXT
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center text-slate-500">
          {keyword || selectedCat !== "all"
            ? "조건에 맞는 글이 없습니다."
            : "게시된 글이 없습니다."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                {isHtmlBoard && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        visible.length > 0 && selected.size === visible.length
                      }
                      onChange={toggleSelectAll}
                      title="전체 선택"
                    />
                  </th>
                )}
                {isDoc && <th className="px-4 py-3 font-medium">문서번호</th>}
                {hasCategories && <th className="px-4 py-3 font-medium">분류</th>}
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">작성자</th>
                <th className="px-4 py-3 font-medium">작성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  {isHtmlBoard && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(post.id)}
                        onChange={() => toggleSelect(post.id)}
                      />
                    </td>
                  )}
                  {isDoc && (
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {post.docNumber || "-"}
                    </td>
                  )}
                  {hasCategories && (
                    <td className="whitespace-nowrap px-4 py-3">
                      {catName(post.categoryId) ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {catName(post.categoryId)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {post.pinned && (
                      <span className="mr-1" title="고정됨">
                        📌
                      </span>
                    )}
                    <Link
                      to={`/post/${post.id}`}
                      className="font-medium text-slate-800 dark:text-slate-100 hover:text-brand-600"
                    >
                      {post.title}
                    </Link>
                    {post.contentType === "html" && (
                      <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-600">
                        HTML
                      </span>
                    )}
                    {(post.minLevel ?? 0) > 0 && (
                      <span className="ml-1" title="열람 권한 제한">
                        🔒
                      </span>
                    )}
                    {post.private && (
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        나만보기
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {post.authorName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {formatDate(post.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > visibleCount && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + 20)}
            className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            더 보기 ({filtered.length - visibleCount}개 남음)
          </button>
        </div>
      )}
    </div>
  );
}

function chipCls(active: boolean) {
  return `rounded-full px-3 py-1 text-sm font-medium transition ${
    active
      ? "bg-brand-500 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
  }`;
}
