import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  resolveReport,
  subscribeOpenReports,
  type Report,
} from "../../lib/reports";
import { deletePost } from "../../lib/posts";
import { useToast } from "../../contexts/ToastContext";
import { timeAgo } from "../../lib/format";
import Spinner from "../../components/Spinner";

export default function AdminReports() {
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeOpenReports(
      (l) => {
        setReports(l);
        setLoading(false);
      },
      (e) => {
        console.error("신고 구독 오류:", e);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  async function resolve(r: Report) {
    await resolveReport(r.id);
    toast.show("처리 완료로 표시했습니다.", "success");
  }

  async function removePost(r: Report) {
    if (!confirm(`'${r.postTitle}' 게시글을 삭제할까요?`)) return;
    await deletePost(r.postId);
    await resolveReport(r.id);
    toast.show("게시글을 삭제하고 신고를 처리했습니다.", "success");
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
        신고함
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        접수된 게시글 신고를 확인하고 처리합니다.
        {reports.length > 0 && (
          <span className="ml-2 font-medium text-red-500">
            · 미처리 {reports.length}건
          </span>
        )}
      </p>

      {loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          처리할 신고가 없습니다. 👍
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <Link
                  to={`/post/${r.postId}`}
                  className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100"
                >
                  {r.postTitle}
                </Link>
                <p className="mt-0.5 text-sm text-red-500">사유: {r.reason}</p>
                <p className="text-xs text-slate-400">
                  신고자 {r.reporterName} · {timeAgo(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/post/${r.postId}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  보기
                </Link>
                <button
                  onClick={() => resolve(r)}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  처리완료
                </button>
                <button
                  onClick={() => removePost(r)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  글 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
