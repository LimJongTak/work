import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBoards } from "../contexts/BoardsContext";
import { useToast } from "../contexts/ToastContext";
import { deletePost, fetchPost, fetchPostsByAuthor } from "../lib/posts";
import { deleteComment, fetchCommentsByAuthor } from "../lib/comments";
import { fetchMyLikedPostIds, toggleLike } from "../lib/engagement";
import type { Comment, Post } from "../types";
import { timeAgo } from "../lib/format";
import Spinner from "../components/Spinner";

type Tab = "posts" | "comments" | "likes";

export default function MyActivity() {
  const { user, profile } = useAuth();
  const { boards } = useBoards();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, c, likedIds] = await Promise.all([
        fetchPostsByAuthor(user.uid),
        fetchCommentsByAuthor(user.uid),
        fetchMyLikedPostIds(user.uid),
      ]);
      setPosts(p);
      setComments(c);
      const likedPosts = (
        (await Promise.all(
          likedIds.slice(0, 100).map((id) => fetchPost(id)),
        )).filter(Boolean) as Post[]
      ).filter((p) => !p.private || p.authorId === user.uid);
      setLiked(likedPosts);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const boardName = (id: string) => boards.find((b) => b.id === id)?.name ?? "";

  async function removePost(p: Post) {
    if (!confirm(`'${p.title}' 글을 삭제할까요?`)) return;
    await deletePost(p.id);
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    toast.show("글을 삭제했습니다.", "success");
  }
  async function removeComment(c: Comment) {
    if (!confirm("댓글을 삭제할까요?")) return;
    await deleteComment(c.id);
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    toast.show("댓글을 삭제했습니다.", "success");
  }
  async function unlike(p: Post) {
    if (!user) return;
    await toggleLike(p.id, user.uid);
    setLiked((prev) => prev.filter((x) => x.id !== p.id));
    toast.show("좋아요를 취소했습니다.", "success");
  }

  const tabCls = (t: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      tab === t
        ? "bg-brand-500 text-white"
        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
        내 활동
      </h1>
      <p className="mb-5 text-sm text-slate-500">
        {profile?.displayName}님의 글·댓글·좋아요를 관리합니다.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setTab("posts")} className={tabCls("posts")}>
          내 글 {posts.length}
        </button>
        <button onClick={() => setTab("comments")} className={tabCls("comments")}>
          내 댓글 {comments.length}
        </button>
        <button onClick={() => setTab("likes")} className={tabCls("likes")}>
          좋아요 {liked.length}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === "posts" ? (
        posts.length === 0 ? (
          <Empty text="작성한 글이 없습니다." />
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <Row key={p.id}>
                <Link to={`/post/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {p.title}
                    {p.private && <span className="ml-1 text-xs text-slate-400">🔒</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {boardName(p.boardId)} · {timeAgo(p.createdAt)} · 👁 {p.viewCount ?? 0} · ❤️ {p.likeCount ?? 0}
                  </p>
                </Link>
                <Link
                  to={`/post/${p.id}/edit`}
                  className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  수정
                </Link>
                <button
                  onClick={() => removePost(p)}
                  className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              </Row>
            ))}
          </div>
        )
      ) : tab === "comments" ? (
        comments.length === 0 ? (
          <Empty text="작성한 댓글이 없습니다." />
        ) : (
          <div className="space-y-2">
            {comments.map((c) => (
              <Row key={c.id}>
                <Link to={`/post/${c.postId}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                    {c.content}
                  </p>
                  <p className="text-xs text-slate-400">{timeAgo(c.createdAt)}</p>
                </Link>
                <button
                  onClick={() => removeComment(c)}
                  className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              </Row>
            ))}
          </div>
        )
      ) : liked.length === 0 ? (
        <Empty text="좋아요한 글이 없습니다." />
      ) : (
        <div className="space-y-2">
          {liked.map((p) => (
            <Row key={p.id}>
              <Link to={`/post/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                  {p.title}
                </p>
                <p className="text-xs text-slate-400">
                  {boardName(p.boardId)} · {p.authorName} · {timeAgo(p.createdAt)}
                </p>
              </Link>
              <button
                onClick={() => unlike(p)}
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:border-slate-700"
              >
                ❤️ 취소
              </button>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
      {text}
    </div>
  );
}
