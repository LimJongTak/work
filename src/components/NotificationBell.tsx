import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  markAllRead,
  markNotificationRead,
  subscribeMyNotifications,
} from "../lib/notifications";
import { isNotifEnabled } from "../lib/prefs";
import type { AppNotification } from "../types";
import { timeAgo } from "../lib/format";

const ICON: Record<string, string> = {
  comment: "💬",
  dm: "✉️",
  request: "📥",
  like: "❤️",
  mention: "📣",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeMyNotifications(
      user.uid,
      (list) =>
        // 설정에서 끈 종류의 알림은 숨김
        setItems(list.filter((n) => isNotifEnabled(user.uid, n.type))),
      (e) => console.error("알림 구독 오류:", e),
    );
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.read) await markNotificationRead(n.id);
    navigate(n.link || "/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        aria-label="알림"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              알림
            </span>
            {unread > 0 && user && (
              <button
                onClick={() => markAllRead(user.uid)}
                className="text-xs text-brand-600 hover:underline"
              >
                모두 읽음
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">
                알림이 없습니다.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-slate-50 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                    n.read ? "" : "bg-brand-50/40 dark:bg-slate-800/50"
                  }`}
                >
                  <span className="text-lg">{ICON[n.type] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {n.text}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
