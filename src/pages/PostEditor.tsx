import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useBoards } from "../contexts/BoardsContext";
import { useToast } from "../contexts/ToastContext";
import { createPost, fetchPost, nextDocNumber, updatePost } from "../lib/posts";
import { formatBytes, removeAttachment, uploadAttachment } from "../lib/storage";
import {
  IMAGE_FEATURE_ENABLED,
  type Attachment,
  type ContentType,
} from "../types";
import HtmlPreview from "../components/HtmlPreview";
import HtmlBlockBuilder, {
  blocksToHtml,
  type Block,
} from "../components/HtmlBlockBuilder";
import { fetchCategories } from "../lib/categories";
import { logActivity } from "../lib/activity";
import { markdownToHtml } from "../lib/markdown";
import { roleLevel, type Category } from "../types";
import { findBannedWord } from "../lib/profanity";
import Spinner from "../components/Spinner";

const VIEW_LEVELS: { label: string; value: number }[] = [
  { label: "전체 공개", value: 0 },
  { label: "준회원 이상", value: 20 },
  { label: "일반회원 이상", value: 40 },
  { label: "정회원 이상", value: 60 },
  { label: "매니저 이상", value: 80 },
  { label: "관리자만", value: 100 },
];

const HTML_SAMPLE = `<div style="padding:24px;text-align:center;font-family:Pretendard,sans-serif">
  <h1 style="color:#3366ff">안녕하세요 👋</h1>
  <p>여기에 HTML 코드를 입력하면 오른쪽에서 미리보기가 표시됩니다.</p>
  <button style="padding:8px 16px;border:none;border-radius:8px;background:#3366ff;color:#fff">버튼</button>
</div>`;

export default function PostEditor() {
  // /board/:boardId/new  또는  /post/:postId/edit
  const params = useParams();
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { boards } = useBoards();
  const toast = useToast();

  const editingId = params.postId;
  const isEdit = Boolean(editingId);

  const [boardId, setBoardId] = useState(params.boardId ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [docNumber, setDocNumber] = useState("");
  const [minLevel, setMinLevel] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draftSavedAt, setDraftSavedAt] = useState<string>("");
  const [showRestore, setShowRestore] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  // HTML 입력 방식: 코드 직접 작성 / 블록 빌더
  const [htmlMode, setHtmlMode] = useState<"code" | "blocks">("code");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let alive = true;
    fetchPost(editingId)
      .then((p) => {
        if (!p || !alive) return;
        setBoardId(p.boardId);
        setTitle(p.title);
        setContent(p.content);
        setContentType(p.contentType);
        setDocNumber(p.docNumber ?? "");
        setAttachments(p.attachments ?? []);
        setCategoryId(p.categoryId ?? "");
        setMinLevel(p.minLevel ?? 0);
        setIsPrivate(p.private ?? false);
        setTags(p.tags ?? []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isEdit, editingId]);

  // 선택한 게시판의 카테고리 로드
  useEffect(() => {
    if (!boardId) {
      setCategories([]);
      return;
    }
    fetchCategories(boardId).then(setCategories).catch(() => setCategories([]));
  }, [boardId]);

  // ---- 임시저장(드래프트) : 새 글에서만 ----
  const draftKey =
    !isEdit && user ? `draft_${user.uid}_${params.boardId ?? "new"}` : "";

  // 마운트 시 저장된 드래프트가 있으면 복원 배너 표시
  useEffect(() => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.title || d.content) setShowRestore(true);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // 입력 변경 시 자동 저장(디바운스)
  useEffect(() => {
    if (!draftKey) return;
    if (!title && !content) return;
    const t = setTimeout(() => {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ title, content, contentType, categoryId, docNumber, minLevel, tags }),
      );
      const now = new Date();
      setDraftSavedAt(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      );
    }, 800);
    return () => clearTimeout(t);
  }, [draftKey, title, content, contentType, categoryId, docNumber, minLevel, tags]);

  function restoreDraft() {
    if (!draftKey) return;
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "{}");
      setTitle(d.title ?? "");
      setContent(d.content ?? "");
      setContentType(d.contentType ?? "text");
      setCategoryId(d.categoryId ?? "");
      setDocNumber(d.docNumber ?? "");
      setMinLevel(d.minLevel ?? 0);
      setTags(d.tags ?? []);
    } catch {
      /* ignore */
    }
    setShowRestore(false);
  }

  function discardDraft() {
    if (draftKey) localStorage.removeItem(draftKey);
    setShowRestore(false);
    setDraftSavedAt("");
  }

  // ---- 태그 ----
  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  const board = useMemo(
    () => boards.find((b) => b.id === boardId),
    [boards, boardId],
  );
  const isDoc = board?.type === "document";
  const isHtmlBoard = board?.type === "html";

  // HTML 저장소 게시판이면 기본 형식을 HTML 로 맞춰줍니다.
  useEffect(() => {
    if (isHtmlBoard && !isEdit) setContentType("html");
  }, [isHtmlBoard, isEdit]);

  async function handleFiles(files: FileList | null) {
    if (!files || !user) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadAttachment(file, user.uid));
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.show((err as Error).message ?? "파일 업로드에 실패했습니다.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment(att: Attachment) {
    await removeAttachment(att.path);
    setAttachments((prev) => prev.filter((a) => a.path !== att.path));
  }

  // ---- HTML 에디터 도구 ----
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /** 현재 커서 위치에 HTML 조각을 삽입합니다. */
  function insertAtCursor(snippet: string) {
    const ta = contentRef.current;
    if (!ta) {
      setContent((c) => c + snippet);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  /** 이미지를 업로드하고 <img> 태그를 커서 위치에 삽입합니다. */
  async function handleInsertImage(files: FileList | null) {
    if (!files || !files[0] || !user) return;
    setUploading(true);
    try {
      const att = await uploadAttachment(files[0], user.uid);
      insertAtCursor(
        `\n<img src="${att.url}" alt="${att.name}" style="max-width:100%;height:auto;" />\n`,
      );
    } catch (err) {
      toast.show((err as Error).message ?? "이미지 업로드에 실패했습니다.", "error");
    } finally {
      setUploading(false);
    }
  }

  /** 이미지 주소(URL)를 입력받아 <img> 를 삽입합니다. (업로드 없이 링크로 표시) */
  function insertImageByUrl() {
    const url = prompt("이미지 주소(URL)를 입력하세요\n예: https://example.com/photo.jpg");
    if (!url?.trim()) return;
    insertAtCursor(
      `\n<img src="${url.trim()}" alt="" style="max-width:100%;height:auto;" />\n`,
    );
  }

  /** 입력한 일반 텍스트를 HTML(문단/줄바꿈)로 변환합니다. */
  function convertTextToHtml() {
    if (!content.trim()) return;
    const esc = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const html = esc
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
      .join("\n");
    setContent(html);
  }

  // 블록 형식으로 끼워 넣을 수 있는 HTML 조각들
  const HTML_BLOCKS: { label: string; snippet: string }[] = [
    { label: "제목", snippet: "<h2>제목</h2>\n" },
    { label: "문단", snippet: "<p>문단 내용을 입력하세요.</p>\n" },
    { label: "굵게", snippet: "<strong>굵은 글씨</strong>" },
    {
      label: "목록",
      snippet: "<ul>\n  <li>항목 1</li>\n  <li>항목 2</li>\n</ul>\n",
    },
    { label: "링크", snippet: '<a href="https://">링크 텍스트</a>' },
    {
      label: "버튼",
      snippet:
        '<button style="padding:8px 16px;border:none;border-radius:8px;background:#3366ff;color:#fff;cursor:pointer">버튼</button>',
    },
    {
      label: "표",
      snippet:
        '<table style="border-collapse:collapse" border="1">\n  <tr><th style="padding:6px 12px">제목1</th><th style="padding:6px 12px">제목2</th></tr>\n  <tr><td style="padding:6px 12px">값1</td><td style="padding:6px 12px">값2</td></tr>\n</table>\n',
    },
    { label: "구분선", snippet: "<hr/>\n" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    if (!boardId) {
      toast.show("게시판을 선택해주세요.", "error");
      return;
    }
    if (!content.trim()) {
      toast.show("내용을 입력해주세요.", "error");
      return;
    }
    const banned = findBannedWord(title + " " + content);
    if (banned) {
      toast.show(`금지어("${banned}")가 포함되어 있어 게시할 수 없습니다.`, "error");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && editingId) {
        await updatePost(editingId, {
          title,
          content,
          contentType,
          categoryId: categoryId || undefined,
          // 공문 문서번호는 게시 시 자동 부여되며 수정 시 변경하지 않음
          docNumber: isDoc ? docNumber || undefined : undefined,
          minLevel,
          private: isPrivate,
          tags,
          attachments,
        });
        toast.show("게시글을 수정했습니다.", "success");
        navigate(`/post/${editingId}`);
      } else {
        // 공문 게시판이면 "연도-0001" 형식 문서번호 자동 발급
        const autoDocNumber = isDoc
          ? await nextDocNumber(new Date().getFullYear())
          : undefined;
        const ref = await createPost({
          boardId,
          categoryId: categoryId || undefined,
          title,
          content,
          contentType,
          docNumber: autoDocNumber,
          minLevel,
          private: isPrivate,
          tags,
          attachments,
          authorId: user.uid,
          authorName: profile.displayName,
        });
        if (draftKey) localStorage.removeItem(draftKey);
        void logActivity(
          { uid: user.uid, name: profile.displayName },
          "게시글 작성",
          title,
        );
        toast.show("게시글을 저장했습니다.", "success");
        navigate(`/post/${ref.id}`);
      }
    } catch {
      toast.show(
        "저장에 실패했습니다. 권한 또는 네트워크를 확인해주세요.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  // 글쓰기 권한 체크(새 글 작성 시)
  if (!isEdit && board && roleLevel(role) < (board.writeLevel ?? 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center">
        <span className="text-3xl">🔒</span>
        <p className="mt-2 text-slate-500">
          이 게시판에 글을 작성할 권한이 없습니다.
        </p>
      </div>
    );
  }

  const showPreview = contentType === "html";
  const isMarkdown = contentType === "markdown";
  const splitView = showPreview || isMarkdown;

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? "게시글 수정" : "새 게시글"}
        </h1>
        <div className="flex items-center gap-2">
          {draftSavedAt && (
            <span className="text-xs text-slate-400">
              임시저장됨 {draftSavedAt}
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {showRestore && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <span className="text-amber-700 dark:text-amber-300">
            💾 작성 중이던 임시저장 글이 있습니다.
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
            >
              불러오기
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-slate-600 dark:text-slate-300"
            >
              삭제
            </button>
          </span>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm sm:p-6">
        {/* 게시판 선택 (새 글이면서 경로에 boardId 가 없을 때) */}
        {!isEdit && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              게시판
            </span>
            <select
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">게시판 선택</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {categories.length > 0 && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              분류 (카테고리)
            </span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">선택 안 함</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              제목
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="제목을 입력하세요"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              🔒 열람 권한
            </span>
            <select
              value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-44"
            >
              {VIEW_LEVELS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          🔒 나만 보기 (작성자 외에는 보이지 않습니다)
        </label>

        {/* 태그 */}
        <div className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            태그
          </span>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-slate-700 dark:text-slate-200"
              >
                #{t}
                <button type="button" onClick={() => removeTag(t)} className="text-brand-400 hover:text-red-500">
                  ✕
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === "Backspace" && !tagInput && tags.length) {
                  removeTag(tags[tags.length - 1]);
                }
              }}
              onBlur={() => addTag(tagInput)}
              placeholder={tags.length ? "" : "태그 입력 후 Enter (쉼표로 구분)"}
              className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
            />
          </div>
        </div>

        {isDoc && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            📑 문서번호는 게시 시{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {isEdit && docNumber
                ? docNumber
                : `${new Date().getFullYear()}-####`}
            </span>{" "}
            형식으로 자동 부여됩니다.
          </div>
        )}

        {/* 본문 형식 토글 */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            본문 형식
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800 text-sm">
            <button
              type="button"
              onClick={() => setContentType("text")}
              className={`rounded-md px-3 py-1.5 font-medium ${
                contentType === "text"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              일반 텍스트
            </button>
            <button
              type="button"
              onClick={() => setContentType("markdown")}
              className={`rounded-md px-3 py-1.5 font-medium ${
                contentType === "markdown"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              마크다운
            </button>
            <button
              type="button"
              onClick={() => setContentType("html")}
              className={`rounded-md px-3 py-1.5 font-medium ${
                contentType === "html"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              HTML
            </button>
          </div>
          {contentType === "html" && !content && (
            <button
              type="button"
              onClick={() => setContent(HTML_SAMPLE)}
              className="ml-3 text-sm text-brand-600 hover:underline"
            >
              예시 코드 넣기
            </button>
          )}
        </div>

        {/* 에디터 + (HTML/마크다운이면) 실시간 미리보기 */}
        <div
          className={
            splitView ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : undefined
          }
        >
          <div className="block">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {showPreview ? "HTML 내용" : isMarkdown ? "마크다운" : "내용"}
              </span>
              {showPreview && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setHtmlMode("code")}
                    className={`rounded-md px-2.5 py-1 font-medium ${htmlMode === "code" ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900" : "text-slate-500"}`}
                  >
                    코드
                  </button>
                  <button
                    type="button"
                    onClick={() => setHtmlMode("blocks")}
                    className={`rounded-md px-2.5 py-1 font-medium ${htmlMode === "blocks" ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900" : "text-slate-500"}`}
                  >
                    🧩 블록 빌더
                  </button>
                </div>
              )}
            </div>

            {showPreview && htmlMode === "blocks" ? (
              <HtmlBlockBuilder
                blocks={blocks}
                onChange={(b) => {
                  setBlocks(b);
                  setContent(blocksToHtml(b));
                }}
              />
            ) : (
              <>
                {showPreview && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {HTML_BLOCKS.map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => insertAtCursor(b.snippet)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        + {b.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={insertImageByUrl}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      title="이미지 주소(URL)를 입력해 삽입합니다"
                    >
                      🖼️ 이미지(URL)
                    </button>
                    {IMAGE_FEATURE_ENABLED && (
                      <label className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        ⬆ 업로드
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            void handleInsertImage(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={convertTextToHtml}
                      title="입력한 일반 텍스트를 문단/줄바꿈 HTML 로 변환"
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      텍스트→HTML
                    </button>
                  </div>
                )}

                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={splitView ? 20 : 14}
                  placeholder={
                    showPreview
                      ? "<div>...</div> 형태의 HTML 을 입력하거나 위 버튼으로 블록을 추가하세요"
                      : isMarkdown
                        ? "# 제목\n\n**굵게**, *기울임*, `코드`, - 목록, > 인용, [링크](https://...)"
                        : "내용을 입력하세요"
                  }
                  className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
                    showPreview || isMarkdown ? "font-mono text-sm" : ""
                  }`}
                />
              </>
            )}
          </div>

          {showPreview && (
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                미리보기
              </span>
              <HtmlPreview html={content} className="h-[calc(100%-1.75rem)] min-h-[480px]" />
            </div>
          )}
          {isMarkdown && (
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                미리보기
              </span>
              <div
                className="prose-basic min-h-[480px] overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(content).html,
                }}
              />
            </div>
          )}
        </div>

        {/* 첨부파일 */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            첨부파일{" "}
            <span className="font-normal text-slate-400">(개당 최대 10MB)</span>
          </span>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-2 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50">
            <span>📎 파일 추가</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {uploading && (
            <span className="ml-3 text-sm text-slate-400">업로드 중...</span>
          )}

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.path}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-700">
                    📄 {att.name}{" "}
                    <span className="text-slate-400">
                      ({formatBytes(att.size)})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att)}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                  >
                    제거
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </form>
  );
}
