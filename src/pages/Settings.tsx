import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { NOTIF_TYPES, getNotifPrefs, setNotifPref } from "../lib/prefs";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    user ? getNotifPrefs(user.uid) : {},
  );

  function toggleType(type: string) {
    if (!user) return;
    const on = prefs[type] === false; // 현재 off면 켜기
    setNotifPref(user.uid, type, on);
    setPrefs((p) => ({ ...p, [type]: on }));
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
        설정
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        알림과 화면 설정을 관리합니다. (이 기기에 저장됩니다)
      </p>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          알림
        </h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {NOTIF_TYPES.map((t) => {
            const on = prefs[t.key] !== false;
            return (
              <li
                key={t.key}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="text-slate-700 dark:text-slate-200">
                  {t.label}
                </span>
                <button
                  onClick={() => toggleType(t.key)}
                  className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  aria-label={t.label}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
          화면
        </h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700 dark:text-slate-200">다크 모드</span>
          <button
            onClick={toggle}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "☀️ 라이트로" : "🌙 다크로"}
          </button>
        </div>
      </section>
    </div>
  );
}
