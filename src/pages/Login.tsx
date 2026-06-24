import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    const target = email.trim() || prompt("비밀번호를 재설정할 이메일을 입력하세요") || "";
    if (!target.trim()) return;
    try {
      await resetPassword(target.trim());
      setError("");
      alert(`${target} 으로 비밀번호 재설정 메일을 보냈습니다. 메일함을 확인하세요.`);
    } catch {
      setError("재설정 메일 발송에 실패했습니다. 이메일을 확인하세요.");
    }
  }

  return (
    <AuthShell title="로그인" subtitle="업무 게시판에 오신 것을 환영합니다.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="이메일"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="비밀번호"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "로그인 중..." : "로그인"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-full text-center text-xs text-slate-400 hover:text-brand-600"
        >
          비밀번호를 잊으셨나요?
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        계정이 없으신가요?{" "}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
          회원가입
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-xl font-bold text-white">
            W
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
