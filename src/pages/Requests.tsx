import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  approveRequest,
  createRequest,
  rejectRequest,
  subscribeMyRequests,
  subscribePendingRequests,
} from "../lib/requests";
import { notify } from "../lib/notifications";
import { logActivity } from "../lib/activity";
import {
  BOARD_TYPE_META,
  type BoardType,
  type OpenRequest,
  type RequestStatus,
} from "../types";
import { timeAgo } from "../lib/format";

const BOARD_TYPES: BoardType[] = [
  "notice",
  "free",
  "work",
  "document",
  "html",
  "reference",
];

const STATUS_META: Record<RequestStatus, { label: string; cls: string }> = {
  pending: { label: "대기중", cls: "bg-amber-50 text-amber-600" },
  approved: { label: "승인됨", cls: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "반려됨", cls: "bg-red-50 text-red-500" },
};

export default function Requests() {
  const { user, profile, isAdmin } = useAuth();
  const toast = useToast();

  const [myReqs, setMyReqs] = useState<OpenRequest[]>([]);
  const [pending, setPending] = useState<OpenRequest[]>([]);

  const [name, setName] = useState("");
  const [type, setType] = useState<BoardType>("work");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMyRequests(user.uid, setMyReqs);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribePendingRequests(setPending);
    return unsub;
  }, [isAdmin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile || !name.trim()) return;
    setBusy(true);
    try {
      if (isAdmin) {
        // 관리자는 요청이 아니라 바로 개설할 수도 있지만, 여기서는 요청 흐름 통일을 위해 생성
        const { createBoard } = await import("../lib/boards");
        await createBoard({
          name: name.trim(),
          type,
          description: description.trim(),
          order: 999,
          createdBy: user.uid,
        });
        toast.show("게시판을 개설했습니다.", "success");
      } else {
        await createRequest({
          type: "board",
          name: name.trim(),
          boardType: type,
          description: description.trim(),
          requesterId: user.uid,
          requesterName: profile.displayName,
        });
        toast.show("게시판 개설을 요청했습니다. 관리자 승인을 기다려주세요.", "info");
      }
      setName("");
      setDescription("");
      setType("work");
    } finally {
      setBusy(false);
    }
  }

  async function approve(req: OpenRequest) {
    if (!user) return;
    await approveRequest(req, user.uid);
    if (profile)
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "요청 승인",
        req.name,
      );
    void notify({
      toUid: req.requesterId,
      fromUid: user.uid,
      type: "request",
      text: `'${req.name}' ${req.type === "board" ? "게시판" : "카테고리"} 요청이 승인되었습니다.`,
      link: req.type === "board" ? "/" : `/board/${req.boardId ?? ""}`,
    });
    toast.show("승인하여 개설했습니다.", "success");
  }

  async function reject(req: OpenRequest) {
    if (!user) return;
    const reason = prompt("반려 사유 (선택)") ?? "";
    await rejectRequest(req.id, user.uid, reason);
    if (profile)
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "요청 반려",
        req.name,
      );
    void notify({
      toUid: req.requesterId,
      fromUid: user.uid,
      type: "request",
      text: `'${req.name}' 요청이 반려되었습니다.${reason ? ` (사유: ${reason})` : ""}`,
      link: "/requests",
    });
    toast.show("요청을 반려했습니다.", "success");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
          게시판 요청
        </h1>
        <p className="text-sm text-slate-500">
          {isAdmin
            ? "새 게시판을 바로 개설하거나, 아래에서 들어온 요청을 승인·반려하세요."
            : "필요한 게시판을 요청하면 관리자 승인 후 개설됩니다."}
        </p>
      </div>

      {/* 관리자: 대기중 요청 */}
      {isAdmin && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            대기중 요청 {pending.length > 0 && <span className="text-brand-600">{pending.length}</span>}
          </h2>
          {pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
              대기중인 요청이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {r.type === "board" ? "게시판" : "카테고리"}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {r.name}
                      </span>
                      {r.type === "board" && r.boardType && (
                        <span className="text-xs text-slate-400">
                          {BOARD_TYPE_META[r.boardType].label}
                        </span>
                      )}
                      {r.type === "category" && r.boardName && (
                        <span className="text-xs text-slate-400">
                          → {r.boardName}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {r.requesterName} · {timeAgo(r.createdAt)}
                      {r.description ? ` · ${r.description}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(r)}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => reject(r)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50"
                    >
                      반려
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 게시판 요청/개설 폼 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          {isAdmin ? "새 게시판 개설" : "새 게시판 요청"}
        </h2>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                이름
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 회계 업무"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                종류
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as BoardType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
              >
                {BOARD_TYPES.map((t) => (
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
                placeholder="용도 설명"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {isAdmin ? "개설하기" : "요청 보내기"}
          </button>
        </form>
      </section>

      {/* 내 요청 현황 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          내 요청 현황
        </h2>
        {myReqs.length === 0 ? (
          <p className="text-sm text-slate-400">보낸 요청이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {myReqs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {r.name}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {r.type === "board" ? "게시판" : `카테고리 → ${r.boardName ?? ""}`}
                    {" · "}
                    {timeAgo(r.createdAt)}
                  </span>
                  {r.status === "rejected" && r.rejectReason && (
                    <p className="text-xs text-red-400">사유: {r.rejectReason}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[r.status].cls}`}
                >
                  {STATUS_META[r.status].label}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
