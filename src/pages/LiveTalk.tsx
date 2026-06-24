import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { sendLiveMessage, subscribeLiveMessages } from "../lib/chat";
import { notifyMentions } from "../lib/mentions";
import LinkText from "../components/LinkText";
import { usePresence } from "../hooks/usePresence";
import type { LiveMessage } from "../types";
import { timeAgo } from "../lib/format";

export default function LiveTalk() {
  const { user, profile } = useAuth();
  const { online } = usePresence();
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [text, setText] = useState("");
  const [showOnline, setShowOnline] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeLiveMessages(setMessages, (e) =>
      console.error("라이브톡 오류:", e),
    );
    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || !profile) return;
    const t = text.trim();
    setText("");
    await sendLiveMessage(t, user.uid, profile.displayName);
    void notifyMentions(t, { uid: user.uid, name: profile.displayName }, "/live");
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            💬 라이브톡
          </h1>
          <p className="text-sm text-slate-500">
            모두가 함께 보는 전체 채팅방입니다.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowOnline((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600 hover:bg-emerald-100 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            접속중 {online.length}명 ▾
          </button>
          {showOnline && (
            <div className="absolute right-0 z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <p className="px-2 py-1 text-xs font-semibold text-slate-400">
                접속중 ({online.length})
              </p>
              {online.length === 0 ? (
                <p className="px-2 py-2 text-sm text-slate-400">
                  접속중인 사용자가 없습니다.
                </p>
              ) : (
                online.map((u) => (
                  <div
                    key={u.uid}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {u.displayName}
                    {u.uid === user?.uid && (
                      <span className="text-xs text-slate-400">(나)</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            첫 메시지를 남겨보세요.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.senderId === user?.uid;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[75%] ${mine ? "items-end" : ""}`}>
                    {!mine && (
                      <p className="mb-0.5 px-1 text-xs text-slate-400">
                        {m.senderName}
                      </p>
                    )}
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                        mine
                          ? "bg-brand-500 text-white"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      }`}
                    >
                      <LinkText text={m.text} />
                    </div>
                    <p
                      className={`mt-0.5 px-1 text-[11px] text-slate-400 ${mine ? "text-right" : ""}`}
                    >
                      {timeAgo(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}
