import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PendingApproval() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const rejected = profile?.rejected === true;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-amber-50 to-slate-100 p-6 text-center dark:from-slate-900 dark:to-slate-950">
      <span className="text-5xl">{rejected ? "🚫" : "⏳"}</span>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {rejected ? "가입이 반려되었습니다" : "승인 대기 중입니다"}
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        {profile?.displayName ? `${profile.displayName}님, ` : ""}
        {rejected
          ? "관리자가 가입 요청을 반려했습니다. 자세한 내용은 관리자에게 문의해 주세요."
          : "가입이 접수되었습니다. 관리자의 승인을 받으면 게시판과 모든 기능을 이용할 수 있습니다."}
      </p>
      {!rejected && (
        <p className="max-w-md text-xs text-slate-400">
          추천코드를 받으셨다면 다시 회원가입할 때 입력하시면 즉시 승인됩니다.
        </p>
      )}
      <button
        onClick={handleLogout}
        className="mt-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        로그아웃
      </button>
    </div>
  );
}
