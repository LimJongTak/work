import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-sm text-slate-500">
        주소가 잘못되었거나 삭제된 페이지일 수 있습니다.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
