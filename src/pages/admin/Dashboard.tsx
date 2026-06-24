import { useEffect, useState } from "react";
import { getStats, type Stats } from "../../lib/stats";
import { subscribeActivity, type ActivityLog } from "../../lib/activity";
import { fetchUsers } from "../../lib/users";
import { fetchRecentPosts } from "../../lib/posts";
import { timeAgo } from "../../lib/format";
import Spinner from "../../components/Spinner";
import type { Timestamp } from "firebase/firestore";

interface DayBucket {
  label: string;
  users: number;
  posts: number;
}

/** 최근 14일 일별 집계 */
function buildBuckets(
  userTs: (Timestamp | undefined)[],
  postTs: (Timestamp | undefined)[],
): DayBucket[] {
  const days: DayBucket[] = [];
  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const map = new Map<string, DayBucket>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const b = { label: `${d.getMonth() + 1}/${d.getDate()}`, users: 0, posts: 0 };
    map.set(keyOf(d), b);
    days.push(b);
  }
  const add = (ts: Timestamp | undefined, field: "users" | "posts") => {
    if (!ts) return;
    const b = map.get(keyOf(ts.toDate()));
    if (b) b[field]++;
  };
  userTs.forEach((t) => add(t, "users"));
  postTs.forEach((t) => add(t, "posts"));
  return days;
}

function MiniBars({
  data,
  field,
  color,
}: {
  data: DayBucket[];
  field: "users" | "posts";
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[field]));
  return (
    <div className="flex h-28 items-end gap-1">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t ${color}`}
            style={{ height: `${(d[field] / max) * 100}%`, minHeight: d[field] ? 3 : 0 }}
            title={`${d.label}: ${d[field]}`}
          />
          <span className="text-[9px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const CARDS: { key: keyof Stats; label: string; icon: string }[] = [
  { key: "users", label: "사용자", icon: "👥" },
  { key: "boards", label: "게시판", icon: "🗂️" },
  { key: "posts", label: "게시글", icon: "📝" },
  { key: "comments", label: "댓글", icon: "💬" },
  { key: "pendingRequests", label: "대기 요청", icon: "📥" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [buckets, setBuckets] = useState<DayBucket[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => console.error("통계 로드 오류:", e));
    Promise.all([fetchUsers(), fetchRecentPosts(500)])
      .then(([users, posts]) => {
        setBuckets(
          buildBuckets(
            users.map((u) => u.createdAt),
            posts.map((p) => p.createdAt),
          ),
        );
      })
      .catch((e) => console.error("차트 데이터 오류:", e));
    const unsub = subscribeActivity(
      (l) => {
        setLogs(l);
        setLogsLoading(false);
      },
      (e) => {
        console.error("활동 로그 오류:", e);
        setLogsLoading(false);
      },
    );
    return unsub;
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
          대시보드
        </h1>
        <p className="text-sm text-slate-500">현황 통계와 최근 활동 기록입니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((c) => (
          <div
            key={c.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats ? stats[c.key] : "—"}
            </div>
            <div className="text-xs text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      {/* 추이 차트 */}
      {buckets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              최근 14일 가입자
            </p>
            <MiniBars data={buckets} field="users" color="bg-brand-400" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              최근 14일 게시글
            </p>
            <MiniBars data={buckets} field="posts" color="bg-emerald-400" />
          </div>
        </div>
      )}

      {/* 활동 로그 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          최근 활동
        </h2>
        {logsLoading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            기록된 활동이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-slate-800">
                    {l.actorName.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {l.actorName}
                    </span>{" "}
                    <span className="text-slate-500">{l.action}</span>
                    {l.target && (
                      <span className="text-slate-400"> · {l.target}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {timeAgo(l.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
