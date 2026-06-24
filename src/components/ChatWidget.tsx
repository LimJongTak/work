import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  markConversationRead,
  sendDirectMessage,
  sendLiveMessage,
  subscribeConversations,
  subscribeDirectMessages,
  subscribeLiveMessages,
} from "../lib/chat";
import { notify } from "../lib/notifications";
import type { Conversation, DirectMessage, LiveMessage } from "../types";
import LinkText from "./LinkText";

type View = { kind: "list" } | { kind: "live" } | { kind: "dm"; id: string };

export default function ChatWidget() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [live, setLive] = useState<LiveMessage[]>([]);
  const [dm, setDm] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [lastReadLive, setLastReadLive] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLastReadLive(Number(localStorage.getItem(`liveRead_${user.uid}`) || 0));
    const u1 = subscribeConversations(user.uid, setConvs);
    const u2 = subscribeLiveMessages(setLive);
    return () => {
      u1();
      u2();
    };
  }, [user]);

  useEffect(() => {
    if (view.kind !== "dm" || !user) {
      setDm([]);
      return;
    }
    const id = view.id;
    void markConversationRead(id, user.uid);
    const unsub = subscribeDirectMessages(id, (m) => {
      setDm(m);
      void markConversationRead(id, user.uid);
    });
    return unsub;
  }, [view, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [dm, live, view, open]);

  if (!user || !profile) return null;
  const me = user.uid;

  const isUnread = (c: Conversation) =>
    !!c.lastSenderId &&
    c.lastSenderId !== me &&
    (c.lastAt?.toMillis() ?? 0) > (c.reads?.[me]?.toMillis() ?? 0);
  const dmUnread = convs.filter(isUnread).length;
  const liveUnread = live.filter(
    (m) => m.senderId !== me && (m.createdAt?.toMillis() ?? 0) > lastReadLive,
  ).length;
  const total = dmUnread + liveUnread;

  const convTitle = (c: Conversation) =>
    c.isGroup
      ? c.name || "그룹"
      : c.memberNames?.[c.members.find((m) => m !== me) ?? ""] ?? "상대";

  function openLive() {
    const now = Date.now();
    localStorage.setItem(`liveRead_${me}`, String(now));
    setLastReadLive(now);
    setView({ kind: "live" });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const t = text.trim();
    if (!t) return;
    setText("");
    if (view.kind === "live") {
      await sendLiveMessage(t, me, profile.displayName);
      const now = Date.now();
      localStorage.setItem(`liveRead_${me}`, String(now));
      setLastReadLive(now);
    } else if (view.kind === "dm") {
      await sendDirectMessage(view.id, t, me, profile.displayName);
      const c = convs.find((x) => x.id === view.id);
      (c?.members ?? [])
        .filter((m) => m !== me)
        .forEach((uid) =>
          void notify({
            toUid: uid,
            fromUid: me,
            type: "dm",
            text: `${profile.displayName}님의 메시지`,
            link: "/messages",
            fromName: profile.displayName,
          }),
        );
    }
  }

  const headerTitle =
    view.kind === "live"
      ? "💬 라이브톡"
      : view.kind === "dm"
        ? convTitle(convs.find((c) => c.id === view.id) ?? ({} as Conversation))
        : "메시지";

  const Bubble = (m: { mine: boolean; text: string; name?: string; ms?: number }) => (
    <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        {!m.mine && m.name && (
          <p className="mb-0.5 px-1 text-[10px] text-slate-400">{m.name}</p>
        )}
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${
            m.mine
              ? "bg-brand-500 text-white"
              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          <LinkText text={m.text} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 print:hidden">
      {/* 채팅 창 */}
      {open && (
        <div className="flex h-[440px] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {/* 헤더 */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800">
            {view.kind !== "list" && (
              <button
                onClick={() => setView({ kind: "list" })}
                className="rounded px-1 text-slate-400 hover:text-slate-600"
              >
                ←
              </button>
            )}
            <span className="flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
              {headerTitle}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded px-1 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {/* 본문 */}
          {view.kind === "list" ? (
            <div className="flex-1 overflow-y-auto">
              <button
                onClick={openLive}
                className="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-lg dark:bg-slate-800">
                  💬
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    라이브톡
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {live.length ? live[live.length - 1].text : "전체 채팅"}
                  </p>
                </div>
                {liveUnread > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                    {liveUnread}
                  </span>
                )}
              </button>

              {convs.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  대화가 없습니다. 메시지 메뉴에서 새 대화를 시작하세요.
                </p>
              ) : (
                convs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setView({ kind: "dm", id: c.id })}
                    className="flex w-full items-center gap-3 border-b border-slate-50 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-slate-800">
                      {c.isGroup ? "👥" : convTitle(c).slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {convTitle(c)}
                      </p>
                      <p
                        className={`truncate text-xs ${isUnread(c) ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-400"}`}
                      >
                        {c.lastMessage || "새 대화"}
                      </p>
                    </div>
                    {isUnread(c) && (
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {view.kind === "live"
                  ? live
                      .slice(-40)
                      .map((m) => (
                        <Bubble
                          key={m.id}
                          mine={m.senderId === me}
                          text={m.text}
                          name={m.senderName}
                        />
                      ))
                  : dm
                      .slice(-40)
                      .map((m) => (
                        <Bubble
                          key={m.id}
                          mine={m.senderId === me}
                          text={m.text}
                          name={
                            convs.find((c) => c.id === (view as { id: string }).id)
                              ?.isGroup
                              ? m.senderName
                              : undefined
                          }
                        />
                      ))}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={send}
                className="flex gap-2 border-t border-slate-100 p-2 dark:border-slate-800"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="메시지..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  전송
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* 챗헤드 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-2xl text-white shadow-lg transition hover:bg-brand-600"
        aria-label="채팅"
      >
        {open ? "✕" : "💬"}
        {!open && total > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-rose-500 px-1 text-xs font-bold text-white dark:border-slate-900">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
    </div>
  );
}
