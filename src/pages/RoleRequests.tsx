import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  approveRoleRequest,
  createRoleRequest,
  rejectRoleRequest,
  subscribeMyRoleRequests,
  subscribePendingRoleRequests,
} from "../lib/roleRequests";
import { notify } from "../lib/notifications";
import { logActivity } from "../lib/activity";
import {
  ROLES,
  ROLE_META,
  roleLevel,
  type Role,
  type RoleRequest,
  type RequestStatus,
} from "../types";
import { timeAgo } from "../lib/format";

const STATUS_META: Record<RequestStatus, { label: string; cls: string }> = {
  pending: { label: "대기중", cls: "bg-amber-50 text-amber-600" },
  approved: { label: "승인됨", cls: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "반려됨", cls: "bg-red-50 text-red-500" },
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_META[role].badge}`}>
      {ROLE_META[role].label}
    </span>
  );
}

export default function RoleRequests() {
  const { user, profile, role, isAdmin } = useAuth();
  const toast = useToast();

  const [myReqs, setMyReqs] = useState<RoleRequest[]>([]);
  const [pending, setPending] = useState<RoleRequest[]>([]);
  const [desiredRole, setDesiredRole] = useState<Role | "">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // 현재 등급보다 높은(관리자는 제외) 등급만 신청 가능
  const upgradeOptions = useMemo(() => {
    const myLevel = roleLevel(role);
    return ROLES.filter((r) => r !== "admin" && ROLE_META[r].level > myLevel);
  }, [role]);

  // 신청 가능한 등급이 정해지면 가장 가까운(낮은) 상향 등급을 기본 선택
  useEffect(() => {
    if (upgradeOptions.length === 0) {
      setDesiredRole("");
      return;
    }
    setDesiredRole(upgradeOptions[upgradeOptions.length - 1]);
  }, [upgradeOptions]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMyRoleRequests(user.uid, setMyReqs);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribePendingRoleRequests(setPending);
    return unsub;
  }, [isAdmin]);

  const hasPending = myReqs.some((r) => r.status === "pending");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile || !desiredRole) return;
    if (hasPending) {
      toast.show("이미 처리 대기중인 신청이 있습니다.", "info");
      return;
    }
    setBusy(true);
    try {
      await createRoleRequest({
        requesterId: user.uid,
        requesterName: profile.displayName,
        currentRole: role,
        desiredRole,
        reason: reason.trim(),
      });
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "등급 신청",
        `${ROLE_META[role].label} → ${ROLE_META[desiredRole].label}`,
      );
      toast.show("등급 상향을 신청했습니다. 관리자 승인을 기다려주세요.", "info");
      setReason("");
    } catch (err) {
      console.error("등급 신청 실패:", err);
      toast.show("신청에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function approve(req: RoleRequest) {
    if (!user || !profile) return;
    if (
      !confirm(
        `${req.requesterName} 님을 '${ROLE_META[req.desiredRole].label}' 등급으로 변경할까요?`,
      )
    )
      return;
    try {
      await approveRoleRequest(req, user.uid);
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "등급 신청 승인",
        `${req.requesterName} → ${ROLE_META[req.desiredRole].label}`,
      );
      void notify({
        toUid: req.requesterId,
        fromUid: user.uid,
        type: "request",
        text: `등급 상향 신청이 승인되어 '${ROLE_META[req.desiredRole].label}'(으)로 변경되었습니다.`,
        link: "/role-requests",
      });
      toast.show("승인하여 등급을 변경했습니다.", "success");
    } catch (err) {
      console.error("등급 신청 승인 실패:", err);
      toast.show("승인에 실패했습니다. 권한 또는 네트워크를 확인해주세요.", "error");
    }
  }

  async function reject(req: RoleRequest) {
    if (!user || !profile) return;
    const why = prompt("반려 사유 (선택)") ?? "";
    try {
      await rejectRoleRequest(req.id, user.uid, why);
      void logActivity(
        { uid: user.uid, name: profile.displayName },
        "등급 신청 반려",
        req.requesterName,
      );
      void notify({
        toUid: req.requesterId,
        fromUid: user.uid,
        type: "request",
        text: `등급 상향 신청이 반려되었습니다.${why ? ` (사유: ${why})` : ""}`,
        link: "/role-requests",
      });
      toast.show("신청을 반려했습니다.", "success");
    } catch (err) {
      console.error("등급 신청 반려 실패:", err);
      toast.show("반려에 실패했습니다.", "error");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
          등급 신청
        </h1>
        <p className="text-sm text-slate-500">
          {isAdmin
            ? "회원이 올린 등급 상향 신청을 승인·반려하세요. 승인하면 해당 회원 등급이 바로 변경됩니다."
            : "더 높은 등급이 필요하면 신청하세요. 관리자 승인 후 등급이 올라갑니다."}
        </p>
      </div>

      {/* 관리자: 대기중 등급 신청 */}
      {isAdmin && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            대기중 신청{" "}
            {pending.length > 0 && (
              <span className="text-brand-600">{pending.length}</span>
            )}
          </h2>
          {pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
              대기중인 등급 신청이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {r.requesterName}
                      </span>
                      <RoleBadge role={r.currentRole} />
                      <span className="text-slate-400">→</span>
                      <RoleBadge role={r.desiredRole} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {timeAgo(r.createdAt)}
                      {r.reason ? ` · ${r.reason}` : ""}
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

      {/* 등급 신청 폼 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          새 등급 신청
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span>현재 등급</span>
            <RoleBadge role={role} />
          </div>

          {upgradeOptions.length === 0 ? (
            <p className="text-sm text-slate-400">
              {isAdmin
                ? "관리자는 등급 신청 대상이 아닙니다."
                : "이미 신청 가능한 최고 등급입니다. 추가 상향은 관리자에게 문의해주세요."}
            </p>
          ) : hasPending ? (
            <p className="text-sm text-amber-600">
              처리 대기중인 신청이 있습니다. 결과를 기다린 뒤 다시 신청할 수 있습니다.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    신청 등급
                  </span>
                  <select
                    value={desiredRole}
                    onChange={(e) => setDesiredRole(e.target.value as Role)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {upgradeOptions.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    신청 사유 (선택)
                  </span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="예: 담당 업무가 늘어 권한이 필요합니다."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={busy || !desiredRole}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                신청 보내기
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 내 신청 현황 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          내 신청 현황
        </h2>
        {myReqs.length === 0 ? (
          <p className="text-sm text-slate-400">보낸 등급 신청이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {myReqs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={r.currentRole} />
                    <span className="text-slate-400">→</span>
                    <RoleBadge role={r.desiredRole} />
                    <span className="text-xs text-slate-400">
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  {r.status === "rejected" && r.rejectReason && (
                    <p className="mt-0.5 text-xs text-red-400">
                      사유: {r.rejectReason}
                    </p>
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
