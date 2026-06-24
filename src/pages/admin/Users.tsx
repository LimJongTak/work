import { useEffect, useState } from "react";
import {
  deleteUser,
  deleteUserContent,
  fetchUsers,
  isOnline,
  rejectUser,
  setUserApproved,
  setUserRole,
} from "../../lib/users";
import {
  createInviteCode,
  deleteInviteCode,
  subscribeInviteCodes,
} from "../../lib/invites";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { logActivity } from "../../lib/activity";
import {
  ROLES,
  ROLE_META,
  isApproved,
  normalizeRole,
  type InviteCode,
  type Role,
  type UserProfile,
} from "../../types";
import { formatDate } from "../../lib/format";
import Spinner from "../../components/Spinner";

export default function AdminUsers() {
  const { user: me, profile: myProfile } = useAuth();
  const toast = useToast();
  const actor = me && myProfile ? { uid: me.uid, name: myProfile.displayName } : null;
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [genBusy, setGenBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const unsub = subscribeInviteCodes(setCodes, (e) =>
      console.error("추천코드 구독 오류:", e),
    );
    return unsub;
  }, []);

  async function changeRole(u: UserProfile, role: Role) {
    if (normalizeRole(u.role) === role) return;
    await setUserRole(u.uid, role);
    await load();
    void logActivity(actor, "등급 변경", `${u.displayName} → ${ROLE_META[role].label}`);
    toast.show(`${u.displayName} 등급을 ${ROLE_META[role].label}(으)로 변경`, "success");
  }

  async function approve(u: UserProfile) {
    await setUserApproved(u.uid, true);
    await load();
    void logActivity(actor, "가입 승인", u.displayName);
    toast.show(`${u.displayName} 가입을 승인했습니다.`, "success");
  }

  async function revoke(u: UserProfile) {
    await setUserApproved(u.uid, false);
    await load();
    void logActivity(actor, "승인 취소", u.displayName);
    toast.show("승인을 취소했습니다.", "success");
  }

  async function reject(u: UserProfile) {
    if (!confirm(`${u.displayName} 가입을 반려할까요?`)) return;
    await rejectUser(u.uid);
    await load();
    void logActivity(actor, "가입 반려", u.displayName);
    toast.show("가입을 반려했습니다.", "success");
  }

  async function remove(u: UserProfile) {
    if (
      !confirm(
        `${u.displayName} 회원을 삭제할까요?\n프로필·권한이 제거되어 더 이상 접근할 수 없습니다.\n(로그인 자격 자체는 Firebase 콘솔에서 별도 삭제해야 완전히 차단됩니다.)`,
      )
    )
      return;
    const alsoContent = confirm(
      `${u.displayName} 회원이 작성한 글·댓글도 함께 삭제할까요?\n[확인] = 글·댓글까지 삭제 / [취소] = 회원만 삭제(글·댓글 유지)`,
    );
    if (alsoContent) {
      const n = await deleteUserContent(u.uid);
      void logActivity(actor, "회원 콘텐츠 삭제", `${u.displayName} (${n}건)`);
    }
    await deleteUser(u.uid);
    await load();
    void logActivity(actor, "회원 삭제", u.displayName);
    toast.show(
      alsoContent ? "회원과 작성 글·댓글을 삭제했습니다." : "회원을 삭제했습니다.",
      "success",
    );
  }

  async function purgeRejected() {
    const targets = users.filter((u) => u.rejected && u.uid !== me?.uid);
    if (targets.length === 0) {
      toast.show("삭제할 반려 회원이 없습니다.", "info");
      return;
    }
    if (!confirm(`반려된 회원 ${targets.length}명을 모두 삭제할까요?`)) return;
    await Promise.all(targets.map((u) => deleteUser(u.uid)));
    await load();
    void logActivity(actor, "반려 회원 일괄 삭제", `${targets.length}명`);
    toast.show(`반려 회원 ${targets.length}명을 삭제했습니다.`, "success");
  }

  function exportCsv() {
    const header = ["이름", "이메일", "등급", "승인상태", "가입일"];
    const rows = users.map((u) => [
      u.displayName,
      u.email,
      ROLE_META[normalizeRole(u.role)].label,
      u.rejected ? "반려" : isApproved(u) ? "승인" : "대기",
      formatDate(u.createdAt),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    // 엑셀 한글 깨짐 방지용 BOM
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show("사용자 목록을 내보냈습니다.", "success");
  }

  async function generateCode() {
    if (!me) return;
    setGenBusy(true);
    try {
      const code = await createInviteCode(me.uid);
      toast.show(`추천코드 ${code} 발급됨`, "success");
    } finally {
      setGenBusy(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.show("코드를 복사했습니다.", "info");
  }

  const pendingCount = users.filter((u) => !isApproved(u)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
            사용자 관리
          </h1>
          <p className="text-sm text-slate-500">
            가입 승인·반려, 등급(5단계) 변경, 추천코드 발급을 관리합니다.
            {pendingCount > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · 승인 대기 {pendingCount}명
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={purgeRejected}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            🗑 반려 회원 정리
          </button>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ⬇ CSV 내보내기
          </button>
        </div>
      </div>

      {/* 추천코드 발급 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">
            추천코드 (1회용)
          </h2>
          <button
            onClick={generateCode}
            disabled={genBusy}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            + 코드 발급
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {codes.length === 0 ? (
            <p className="text-sm text-slate-400">발급된 코드가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {codes.map((c) => (
                <div
                  key={c.code}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                    c.used
                      ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      : "border-brand-200 bg-brand-50 text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-300"
                  }`}
                >
                  <span className="font-mono font-bold tracking-widest">
                    {c.code}
                  </span>
                  {c.used ? (
                    <span className="text-xs">
                      사용됨{c.usedByName ? ` · ${c.usedByName}` : ""}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => copyCode(c.code)}
                        className="text-xs text-slate-500 hover:text-brand-600"
                        title="복사"
                      >
                        복사
                      </button>
                      <button
                        onClick={() => deleteInviteCode(c.code)}
                        className="text-xs text-slate-400 hover:text-red-500"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 사용자 목록 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          사용자
        </h2>
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium">이메일</th>
                  <th className="px-4 py-3 font-medium">승인</th>
                  <th className="px-4 py-3 font-medium">등급</th>
                  <th className="px-4 py-3 font-medium">가입일</th>
                  <th className="px-4 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const approved = isApproved(u);
                  const isMe = u.uid === me?.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${isOnline(u.lastSeen?.toMillis()) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                            title={
                              isOnline(u.lastSeen?.toMillis())
                                ? "온라인"
                                : "오프라인"
                            }
                          />
                          {u.displayName}
                        </span>
                        {isMe && (
                          <span className="ml-2 text-xs text-slate-400">(나)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        {normalizeRole(u.role) === "admin" ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            관리자
                          </span>
                        ) : approved ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                              승인됨 ✓
                            </span>
                            <button
                              onClick={() => revoke(u)}
                              className="text-xs text-slate-400 hover:text-amber-600"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {u.rejected && (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
                                반려됨
                              </span>
                            )}
                            <button
                              onClick={() => approve(u)}
                              className="rounded-md bg-brand-500 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-600"
                            >
                              승인
                            </button>
                            {!u.rejected && (
                              <button
                                onClick={() => reject(u)}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                              >
                                반려
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={normalizeRole(u.role)}
                          onChange={(e) => changeRole(u, e.target.value as Role)}
                          disabled={isMe}
                          className="rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-40"
                          title={isMe ? "본인 등급은 변경할 수 없습니다" : "등급 변경"}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => remove(u)}
                          disabled={isMe}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-30"
                          title={isMe ? "본인은 삭제할 수 없습니다" : "회원 삭제"}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
