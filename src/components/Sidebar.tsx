import { NavLink } from "react-router-dom";
import { useBoards } from "../contexts/BoardsContext";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../hooks/useFavorites";
import { BOARD_TYPE_META, type Board } from "../types";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { boards, loading } = useBoards();
  const { isAdmin } = useAuth();
  const { isFav, toggle } = useFavorites();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-brand-500 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  function BoardRow({ board }: { board: Board }) {
    return (
      <div className="group flex items-center gap-1">
        <NavLink
          to={`/board/${board.id}`}
          className={linkClass}
          onClick={onNavigate}
        >
          <span className="text-lg">{BOARD_TYPE_META[board.type].icon}</span>
          <span className="truncate">{board.name}</span>
        </NavLink>
        <button
          onClick={() => toggle(board.id)}
          className={`shrink-0 rounded p-1 text-sm ${
            isFav(board.id)
              ? "text-amber-400"
              : "text-slate-300 opacity-0 hover:text-amber-400 group-hover:opacity-100"
          }`}
          title={isFav(board.id) ? "즐겨찾기 해제" : "즐겨찾기"}
        >
          {isFav(board.id) ? "★" : "☆"}
        </button>
      </div>
    );
  }

  const favBoards = boards.filter((b) => isFav(b.id));
  const otherBoards = boards.filter((b) => !isFav(b.id));

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      {favBoards.length > 0 && (
        <>
          <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            ★ 즐겨찾기
          </p>
          {favBoards.map((board) => (
            <BoardRow key={board.id} board={board} />
          ))}
          <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
        </>
      )}

      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        게시판
      </p>

      {loading && <p className="px-3 py-2 text-sm text-slate-400">불러오는 중...</p>}

      {!loading && boards.length === 0 && (
        <p className="px-3 py-2 text-sm text-slate-400">
          게시판이 없습니다.
          {isAdmin && " 관리자 메뉴에서 추가하세요."}
        </p>
      )}

      {otherBoards.map((board) => (
        <BoardRow key={board.id} board={board} />
      ))}

      <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
      <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        소통
      </p>
      <NavLink to="/live" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">💬</span>
        <span>라이브톡</span>
      </NavLink>
      <NavLink to="/messages" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">✉️</span>
        <span>메시지</span>
      </NavLink>
      <NavLink to="/bookmarks" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">🔖</span>
        <span>북마크</span>
      </NavLink>
      <NavLink to="/me" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">📂</span>
        <span>내 활동</span>
      </NavLink>
      <NavLink to="/requests" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">📝</span>
        <span>게시판 요청</span>
      </NavLink>
      <NavLink to="/role-requests" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">📈</span>
        <span>등급 신청</span>
      </NavLink>
      <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
        <span className="text-lg">⚙️</span>
        <span>설정</span>
      </NavLink>

      {isAdmin && (
        <>
          <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
          <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            관리자
          </p>
          <NavLink to="/admin/dashboard" className={linkClass} onClick={onNavigate}>
            <span className="text-lg">📊</span>
            <span>대시보드</span>
          </NavLink>
          <NavLink to="/admin/boards" className={linkClass} onClick={onNavigate}>
            <span className="text-lg">⚙️</span>
            <span>게시판 관리</span>
          </NavLink>
          <NavLink to="/admin/users" className={linkClass} onClick={onNavigate}>
            <span className="text-lg">👥</span>
            <span>사용자 관리</span>
          </NavLink>
          <NavLink to="/admin/reports" className={linkClass} onClick={onNavigate}>
            <span className="text-lg">🚩</span>
            <span>신고함</span>
          </NavLink>
          <NavLink to="/requests" className={linkClass} onClick={onNavigate}>
            <span className="text-lg">📥</span>
            <span>요청 승인</span>
          </NavLink>
          <NavLink to="/role-requests" className={linkClass} onClick={onNavigate}>
            <span className="text-lg">🎖️</span>
            <span>등급 신청 관리</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}
