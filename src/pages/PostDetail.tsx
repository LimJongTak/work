import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createPost,
  deletePost,
  fetchPost,
  movePost,
  updatePost,
} from "../lib/posts";
import { useAuth } from "../contexts/AuthContext";
import { useBoards } from "../contexts/BoardsContext";
import { useToast } from "../contexts/ToastContext";
import { roleLevel, type Post } from "../types";
import { formatDate, timeAgo } from "../lib/format";
import HtmlPreview from "../components/HtmlPreview";
import Comments from "../components/Comments";
import Spinner from "../components/Spinner";
import { formatBytes, removeAttachment } from "../lib/storage";
import { logActivity } from "../lib/activity";
import { markdownToHtml } from "../lib/markdown";
import { exportTxt } from "../lib/export";
import { createReport } from "../lib/reports";
import {
  bumpViewOnce,
  subscribeMyBookmark,
  subscribeMyLike,
  toggleBookmark,
  toggleLike,
} from "../lib/engagement";

export default function PostDetail() {
  const { postId = "" } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isManager, role } = useAuth();
  const { boards } = useBoards();
  const toast = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [moveOpen, setMoveOpen] = useState<null | "move" | "copy">(null);
  const [targetBoard, setTargetBoard] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPost(postId)
      .then((p) => {
        if (!alive) return;
        setPost(p);
        setLikeCount(p?.likeCount ?? 0);
        if (p) void bumpViewOnce(postId);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [postId]);

  useEffect(() => {
    if (!user) return;
    const unsubLike = subscribeMyLike(postId, user.uid, setLiked);
    const unsubBm = subscribeMyBookmark(postId, user.uid, setBookmarked);
    return () => {
      unsubLike();
      unsubBm();
    };
  }, [postId, user]);

  async function handleLike() {
    if (!user) return;
    const now = await toggleLike(postId, user.uid);
    setLikeCount((c) => c + (now ? 1 : -1));
  }

  async function handleBookmark() {
    if (!user || !post) return;
    const now = await toggleBookmark(user.uid, {
      id: post.id,
      title: post.title,
      boardId: post.boardId,
    });
    toast.show(now ? "북마크에 추가했습니다." : "북마크를 해제했습니다.", "success");
  }

  if (loading) return <Spinner />;
  if (!post)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center text-slate-500">
        존재하지 않는 게시글입니다.
      </div>
    );

  const isAuthor = post.authorId === user?.uid;
  // 나만보기: 작성자만 열람
  if (post.private && !isAuthor) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center">
        <span className="text-3xl">🔒</span>
        <p className="mt-2 text-slate-500">작성자만 볼 수 있는 비공개 글입니다.</p>
      </div>
    );
  }
  // 열람 권한: 작성자/관리자는 항상, 그 외는 레벨 충족 시
  if (
    (post.minLevel ?? 0) > roleLevel(role) &&
    !isAuthor &&
    !isAdmin
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center">
        <span className="text-3xl">🔒</span>
        <p className="mt-2 text-slate-500">이 게시글을 열람할 권한이 없습니다.</p>
      </div>
    );
  }

  const board = boards.find((b) => b.id === post.boardId);
  const canEdit = isAdmin || isAuthor; // 내용 수정: 작성자/관리자
  const canModerate = isManager || isAuthor; // 고정·삭제: 매니저 이상 또는 작성자
  const isHtml = post.contentType === "html";
  const isMd = post.contentType === "markdown";
  const md = isMd
    ? markdownToHtml(post.content)
    : { html: "", toc: [] as { level: number; text: string; id: string }[] };

  async function handleDelete() {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    // 첨부파일을 먼저 정리한 뒤 게시글 문서를 삭제합니다.
    if (post?.attachments?.length) {
      await Promise.all(post.attachments.map((a) => removeAttachment(a.path)));
    }
    await deletePost(postId);
    if (user && profile)
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "게시글 삭제",
        post?.title,
      );
    toast.show("게시글을 삭제했습니다.", "success");
    navigate(board ? `/board/${board.id}` : "/");
  }

  async function handleReport() {
    if (!post || !user || !profile) return;
    const reason = prompt("신고 사유를 입력하세요");
    if (!reason?.trim()) return;
    await createReport({
      postId: post.id,
      postTitle: post.title,
      boardId: post.boardId,
      reason: reason.trim(),
      reporterId: user.uid,
      reporterName: profile.displayName,
    });
    toast.show("신고가 접수되었습니다. 감사합니다.", "success");
  }

  async function doMoveCopy() {
    if (!post || !targetBoard || !user || !profile) return;
    if (moveOpen === "move") {
      await movePost(post.id, targetBoard);
      toast.show("게시글을 이동했습니다.", "success");
      setMoveOpen(null);
      navigate(`/post/${post.id}`);
      setPost({ ...post, boardId: targetBoard, categoryId: undefined });
    } else {
      const ref = await createPost({
        boardId: targetBoard,
        title: post.title,
        content: post.content,
        contentType: post.contentType,
        minLevel: post.minLevel ?? 0,
        tags: post.tags ?? [],
        attachments: post.attachments ?? [],
        authorId: user.uid,
        authorName: profile.displayName,
      });
      toast.show("게시글을 복사했습니다.", "success");
      setMoveOpen(null);
      navigate(`/post/${ref.id}`);
    }
  }

  async function handleTogglePin() {
    if (!post) return;
    const next = !post.pinned;
    await updatePost(post.id, { pinned: next });
    setPost({ ...post, pinned: next });
    toast.show(next ? "상단에 고정했습니다." : "고정을 해제했습니다.", "success");
  }

  return (
    <div>
      <div className="mb-4 text-sm text-slate-400 print:hidden">
        <Link to="/" className="hover:text-brand-600">
          홈
        </Link>
        {board && (
          <>
            {" / "}
            <Link to={`/board/${board.id}`} className="hover:text-brand-600">
              {board.name}
            </Link>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-slate-800 dark:text-slate-100 sm:text-2xl">
              {post.pinned && <span className="mr-1.5">📌</span>}
              {post.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
              <span>{post.authorName}</span>
              <span>·</span>
              <span title={formatDate(post.createdAt)}>
                {timeAgo(post.createdAt)}
                {post.updatedAt &&
                  post.createdAt &&
                  post.updatedAt.toMillis() - post.createdAt.toMillis() > 60000 &&
                  " (수정됨)"}
              </span>
              {post.docNumber && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  문서번호 {post.docNumber}
                </span>
              )}
              <span>·</span>
              <span title="조회수">👁 {post.viewCount ?? 0}</span>
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/search?tag=${encodeURIComponent(t)}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="인쇄 또는 PDF로 저장"
            >
              🖨️ 인쇄/PDF
            </button>
            {isHtml && (
              <button
                onClick={() =>
                  exportTxt(
                    [{ title: post.title, content: post.content }],
                    post.title.replace(/\s+/g, "_"),
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                title="HTML 코드를 .txt 로 추출"
              >
                {"</>"} 코드 TXT
              </button>
            )}
            {!isAuthor && (
              <button
                onClick={handleReport}
                className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                title="게시글 신고"
              >
                🚩 신고
              </button>
            )}
            {canModerate && (
              <button
                onClick={handleTogglePin}
                className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                title={post.pinned ? "상단 고정 해제" : "상단에 고정"}
              >
                {post.pinned ? "📌 고정 해제" : "📌 고정"}
              </button>
            )}
            {canEdit && (
              <Link
                to={`/post/${post.id}/edit`}
                className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                수정
              </Link>
            )}
            {canModerate && (
              <>
                <button
                  onClick={() => {
                    setTargetBoard("");
                    setMoveOpen("move");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  이동
                </button>
                <button
                  onClick={() => {
                    setTargetBoard("");
                    setMoveOpen("copy");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  복사
                </button>
              </>
            )}
            {canModerate && (
              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            )}
          </div>
        </div>

        <div className="pt-5">
          {isHtml ? (
            <div>
              <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800 text-sm">
                <button
                  onClick={() => setTab("preview")}
                  className={`rounded-md px-3 py-1.5 font-medium ${
                    tab === "preview"
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  미리보기
                </button>
                <button
                  onClick={() => setTab("code")}
                  className={`rounded-md px-3 py-1.5 font-medium ${
                    tab === "code"
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  코드
                </button>
              </div>
              {tab === "preview" ? (
                <HtmlPreview html={post.content} className="min-h-[480px]" />
              ) : (
                <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-4 text-sm text-slate-100 print:max-h-none print:overflow-visible">
                  <code>{post.content}</code>
                </pre>
              )}
            </div>
          ) : isMd ? (
            <div>
              {md.toc.length > 1 && (
                <nav className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 print:hidden">
                  <p className="mb-1 font-semibold text-slate-500">목차</p>
                  <ul className="space-y-0.5">
                    {md.toc.map((t) => (
                      <li key={t.id} style={{ paddingLeft: (t.level - 1) * 12 }}>
                        <a
                          href={`#${t.id}`}
                          className="text-slate-600 hover:text-brand-600 dark:text-slate-300"
                        >
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <div
                className="prose-basic text-slate-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: md.html }}
              />
            </div>
          ) : (
            <div className="prose-basic whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {post.content}
            </div>
          )}
        </div>

        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-600">
              첨부파일 {post.attachments.length}
            </h2>
            <ul className="space-y-2">
              {post.attachments.map((att) => (
                <li key={att.path}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span>📄</span>
                    <span className="min-w-0 flex-1 truncate">{att.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatBytes(att.size)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 좋아요 / 북마크 */}
      <div className="mt-4 flex items-center justify-center gap-3 print:hidden">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
            liked
              ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-slate-700 dark:bg-slate-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {liked ? "❤️" : "🤍"} 좋아요 {likeCount > 0 && likeCount}
        </button>
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
            bookmarked
              ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-slate-700 dark:bg-slate-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {bookmarked ? "🔖" : "📑"} 북마크
        </button>
      </div>

      <Comments
        postId={post.id}
        postAuthorId={post.authorId}
        postTitle={post.title}
      />

      {/* 게시글 이동/복사 모달 */}
      {moveOpen && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
          onClick={() => setMoveOpen(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
              게시글 {moveOpen === "move" ? "이동" : "복사"}
            </h2>
            <select
              value={targetBoard}
              onChange={(e) => setTargetBoard(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">대상 게시판 선택</option>
              {boards
                .filter((b) => moveOpen === "copy" || b.id !== post.boardId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setMoveOpen(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={doMoveCopy}
                disabled={!targetBoard}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {moveOpen === "move" ? "이동" : "복사"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
