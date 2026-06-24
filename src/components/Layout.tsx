import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import NoticeBanner from "./NoticeBanner";
import ChatWidget from "./ChatWidget";

export default function Layout() {
  const { profile, isAdmin, logout, updateDisplayName } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  function openProfile() {
    setNameDraft(profile?.displayName ?? "");
    setProfileOpen(true);
  }

  async function saveProfile() {
    await updateDisplayName(nameDraft);
    setProfileOpen(false);
    toast.show("이름이 변경되었습니다.", "success");
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* 상단 바 */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 print:hidden">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴"
          >
            ☰
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-sm text-white">
              W
            </span>
            업무 게시판
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="hidden sm:block">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 전체 검색"
              className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none transition focus:w-56 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-800"
            />
          </form>
          <NotificationBell />
          <button
            onClick={toggle}
            className="rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label="테마 전환"
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            onClick={openProfile}
            className="hidden rounded-lg px-2 py-1 text-right hover:bg-slate-100 dark:hover:bg-slate-800 sm:block"
            title="프로필 편집"
          >
            <p className="text-sm font-medium leading-tight">
              {profile?.displayName ?? "사용자"}
            </p>
            <p className="text-xs leading-tight text-slate-400">
              {isAdmin ? "관리자" : "일반 사용자"}
            </p>
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block print:hidden">
          <div className="sticky top-14">
            <Sidebar />
          </div>
        </aside>

        {/* 모바일 사이드바 */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl dark:bg-slate-900">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <NoticeBanner />
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 프로필 편집 모달 */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
              프로필 편집
            </h2>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                이름
              </span>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
                placeholder="표시할 이름"
              />
            </label>
            <p className="mt-1 text-xs text-slate-400">
              {profile?.email}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setProfileOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={saveProfile}
                disabled={!nameDraft.trim()}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
    </div>
  );
}
