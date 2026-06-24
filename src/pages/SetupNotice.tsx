/** Firebase 설정(.env)이 비어 있을 때 보여주는 안내 화면 */
export default function SetupNotice() {
  const steps = [
    "Firebase 콘솔(console.firebase.google.com)에서 프로젝트를 생성합니다.",
    "Authentication > 로그인 방법에서 '이메일/비밀번호'를 활성화합니다.",
    "Firestore Database를 생성합니다.",
    "프로젝트 설정 > 웹 앱(</>)을 추가하고 firebaseConfig 값을 확인합니다.",
    "firestore.rules 내용을 Firestore > 규칙에 붙여넣고 게시합니다.",
  ];

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-2xl">
            ⚙️
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Firebase 설정이 필요합니다
            </h1>
            <p className="text-sm text-slate-500">
              앱을 사용하려면 먼저 Firebase 프로젝트를 연결하세요.
            </p>
          </div>
        </div>

        <ol className="mb-5 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          그런 다음 프로젝트 루트에 <code className="rounded bg-slate-100 px-1">.env</code>{" "}
          파일을 만들고 값을 채웁니다:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
        </pre>
        <p className="mt-4 text-xs text-slate-400">
          저장 후 개발 서버를 다시 시작하면(npm run dev) 이 화면이 사라집니다.
          자세한 내용은 README.md 를 참고하세요.
        </p>
      </div>
    </div>
  );
}
