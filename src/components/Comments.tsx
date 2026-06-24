import { useEffect, useState } from "react";
import {
  createComment,
  deleteComment,
  subscribeComments,
} from "../lib/comments";
import { useAuth } from "../contexts/AuthContext";
import { notify } from "../lib/notifications";
import { notifyMentions } from "../lib/mentions";
import {
  subscribeMyCommentLike,
  toggleCommentLike,
} from "../lib/engagement";
import { findBannedWord } from "../lib/profanity";
import type { Comment } from "../types";
import { formatDate } from "../lib/format";

export default function Comments({
  postId,
  postAuthorId,
  postTitle,
}: {
  postId: string;
  postAuthorId?: string;
  postTitle?: string;
}) {
  const { user, profile, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeComments(postId, (data) => {
      setComments(data);
      setLoading(false);
    });
    return unsub;
  }, [postId]);

  async function submit(content: string, parentId?: string): Promise<boolean> {
    if (!user || !profile || !content.trim()) return false;
    const banned = findBannedWord(content);
    if (banned) {
      alert(`금지어("${banned}")가 포함되어 있어 등록할 수 없습니다.`);
      return false;
    }
    await createComment({
      postId,
      content: content.trim(),
      authorId: user.uid,
      authorName: profile.displayName,
      parentId,
    });
    if (postAuthorId) {
      void notify({
        toUid: postAuthorId,
        fromUid: user.uid,
        type: "comment",
        text: `${profile.displayName}님이 "${postTitle ?? "내 글"}"에 ${parentId ? "답글" : "댓글"}을 남겼습니다.`,
        link: `/post/${postId}`,
        fromName: profile.displayName,
      });
    }
    void notifyMentions(
      content.trim(),
      { uid: user.uid, name: profile.displayName },
      `/post/${postId}`,
    );
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      if (await submit(text)) setText("");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("댓글을 삭제할까요?")) return;
    await deleteComment(id);
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <section className="mt-6 print:hidden">
      <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        댓글{" "}
        {comments.length > 0 && (
          <span className="text-slate-400">{comments.length}</span>
        )}
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
        {loading ? (
          <p className="py-2 text-sm text-slate-400">불러오는 중...</p>
        ) : topLevel.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">첫 댓글을 남겨보세요.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {topLevel.map((c) => (
              <li key={c.id} className="py-3">
                <CommentRow
                  c={c}
                  meUid={user?.uid}
                  canDelete={isAdmin || c.authorId === user?.uid}
                  onDelete={() => handleDelete(c.id)}
                  onReply={(t) => submit(t, c.id)}
                />
                {repliesOf(c.id).length > 0 && (
                  <ul className="mt-2 space-y-2 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                    {repliesOf(c.id).map((r) => (
                      <li key={r.id}>
                        <CommentRow
                          c={r}
                          meUid={user?.uid}
                          canDelete={isAdmin || r.authorId === user?.uid}
                          onDelete={() => handleDelete(r.id)}
                          isReply
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-3 flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="댓글을 입력하세요 (@이름 으로 멘션)"
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            등록
          </button>
        </form>
      </div>
    </section>
  );
}

function CommentRow({
  c,
  meUid,
  canDelete,
  onDelete,
  onReply,
  isReply,
}: {
  c: Comment;
  meUid?: string;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: (text: string) => Promise<boolean>;
  isReply?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(c.likeCount ?? 0);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!meUid) return;
    return subscribeMyCommentLike(c.id, meUid, setLiked);
  }, [c.id, meUid]);

  async function like() {
    if (!meUid) return;
    const now = await toggleCommentLike(c.id, meUid);
    setCount((x) => x + (now ? 1 : -1));
  }

  async function sendReply() {
    if (!replyText.trim() || !onReply) return;
    if (await onReply(replyText)) {
      setReplyText("");
      setReplying(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className={`grid shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-600 dark:bg-slate-800 ${isReply ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"}`}
      >
        {c.authorName.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {c.authorName}
          </span>
          <span>{formatDate(c.createdAt)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
          {c.content}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs">
          <button
            onClick={like}
            className={`flex items-center gap-1 ${liked ? "text-rose-500" : "text-slate-400 hover:text-rose-500"}`}
          >
            {liked ? "❤️" : "🤍"} {count > 0 && count}
          </button>
          {onReply && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="text-slate-400 hover:text-brand-600"
            >
              답글
            </button>
          )}
        </div>
        {replying && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder="답글 입력..."
              className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              onClick={sendReply}
              disabled={!replyText.trim()}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              등록
            </button>
          </div>
        )}
      </div>
      {canDelete && (
        <button
          onClick={onDelete}
          className="shrink-0 text-xs text-slate-400 hover:text-red-500"
        >
          삭제
        </button>
      )}
    </div>
  );
}
