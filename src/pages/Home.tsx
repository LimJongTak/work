import { useState } from "react";
import { Link } from "react-router-dom";
import { useBoards } from "../contexts/BoardsContext";
import { useAuth } from "../contexts/AuthContext";
import { seedDefaultBoards } from "../lib/boards";
import { BOARD_TYPE_META } from "../types";
import Spinner from "../components/Spinner";

export default function Home() {
  const { boards, loading, refresh } = useBoards();
  const { user, profile, isAdmin } = useAuth();
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDefaultBoards(user.uid);
      await refresh();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          안녕하세요, {profile?.displayName ?? "사용자"}님 👋
        </h1>
        <p className="mt-1 text-slate-500">
          업무에 필요한 내용을 게시판에서 확인하고 정리하세요.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : boards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-10 text-center">
          <p className="text-slate-500">아직 게시판이 없습니다.</p>
          {isAdmin ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {seeding ? "생성 중..." : "기본 게시판 4종 한 번에 생성"}
              </button>
              <Link
                to="/admin/boards"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                직접 추가하기
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              관리자가 게시판을 추가할 때까지 기다려 주세요.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const meta = BOARD_TYPE_META[board.type];
            return (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-2xl">
                  {meta.icon}
                </div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-600">
                  {board.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {board.description || meta.hint}
                </p>
                <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {meta.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
