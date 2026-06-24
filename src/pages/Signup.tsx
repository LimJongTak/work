import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthShell, Field } from "./Login";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, name, code);
      // 승인 여부와 무관하게 홈으로 이동 → 미승인이면 승인 대기 화면 표시
      navigate("/", { replace: true });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setError("이미 가입된 이메일입니다.");
      } else {
        setError("회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="회원가입" subtitle="계정을 만들고 업무 게시판을 이용하세요.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="이름" value={name} onChange={setName} placeholder="홍길동" />
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
          placeholder="6자 이상"
          autoComplete="new-password"
        />
        <Field
          label="추천코드 (선택)"
          value={code}
          onChange={setCode}
          placeholder="관리자에게 받은 코드 (있으면 즉시 승인)"
          required={false}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          💡 추천코드를 입력하면 즉시 이용 가능하고, 없으면 관리자 승인 후 이용할 수
          있습니다. (첫 가입 계정은 자동 관리자)
        </p>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
