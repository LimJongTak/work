import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { fetchUsers, isOnline } from "../lib/users";
import {
  createGroupConversation,
  getOrCreateConversation,
  markConversationRead,
  sendDirectMessage,
  subscribeConversations,
  subscribeDirectMessages,
} from "../lib/chat";
import { notify } from "../lib/notifications";
import LinkText from "../components/LinkText";
import type { Conversation, DirectMessage, UserProfile } from "../types";
import { timeAgo } from "../lib/format";

export default function Messages() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string>("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserProfile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeConversations(user.uid, setConversations);
    return unsub;
  }, [user]);

  // 온라인 표시용 사용자 목록 로드(주기적 갱신)
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      fetchUsers()
        .then((u) => alive && setUsers(u))
        .catch(() => {});
    void refresh();
    const t = setInterval(refresh, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const onlineOf = (uid?: string) => {
    const u = users.find((x) => x.uid === uid);
    return isOnline(u?.lastSeen?.toMillis());
  };

  useEffect(() => {
    if (!activeId || !user) {
      setMessages([]);
      return;
    }
    void markConversationRead(activeId, user.uid);
    const unsub = subscribeDirectMessages(activeId, (msgs) => {
      setMessages(msgs);
      // 새 메시지 도착 시에도 읽음 갱신
      void markConversationRead(activeId, user.uid);
    });
    return unsub;
  }, [activeId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openNew() {
    setUsers(await fetchUsers());
    setShowNew(true);
  }

  async function openGroup() {
    setUsers(await fetchUsers());
    setGroupMembers(new Set());
    setGroupName("");
    setShowGroup(true);
  }

  async function createGroup() {
    if (!user || !profile || groupMembers.size === 0 || !groupName.trim()) return;
    const members = [
      { uid: user.uid, name: profile.displayName },
      ...users
        .filter((u) => groupMembers.has(u.uid))
        .map((u) => ({ uid: u.uid, name: u.displayName })),
    ];
    const id = await createGroupConversation(
      groupName.trim(),
      members,
      user.uid,
    );
    setShowGroup(false);
    setActiveName(groupName.trim());
    setActiveId(id);
  }

  async function startChat(other: UserProfile) {
    if (!user || !profile) return;
    try {
      const id = await getOrCreateConversation(
        { uid: user.uid, name: profile.displayName },
        { uid: other.uid, name: other.displayName },
      );
      setShowNew(false);
      setActiveName(other.displayName);
      setActiveId(id);
    } catch (e) {
      console.error("대화 시작 오류:", e);
      toast.show("대화를 시작하지 못했습니다. 권한/네트워크를 확인하세요.", "error");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || !profile || !activeId) return;
    const t = text.trim();
    setText("");
    await sendDirectMessage(activeId, t, user.uid, profile.displayName);
    // 상대(들)에게 알림
    const recipients = (activeConv?.members ?? []).filter(
      (m) => m !== user.uid,
    );
    const label = activeConv?.isGroup
      ? `${profile.displayName}님이 '${activeConv.name ?? "그룹"}'에 메시지를 보냈습니다.`
      : `${profile.displayName}님이 메시지를 보냈습니다.`;
    recipients.forEach((uid) =>
      void notify({
        toUid: uid,
        fromUid: user.uid,
        type: "dm",
        text: label,
        link: "/messages",
        fromName: profile.displayName,
      }),
    );
  }

  const activeConv = conversations.find((c) => c.id === activeId);
  const otherName = (c: Conversation) => {
    const otherUid = c.members.find((m) => m !== user?.uid);
    return otherUid ? c.memberNames?.[otherUid] ?? "상대" : "상대";
  };
  const convTitle = (c: Conversation) =>
    c.isGroup ? c.name || "그룹" : otherName(c);
  const headerName = activeConv ? convTitle(activeConv) : activeName;

  function isUnread(c: Conversation): boolean {
    if (!user || !c.lastSenderId || c.lastSenderId === user.uid) return false;
    const myRead = c.reads?.[user.uid]?.toMillis() ?? 0;
    const last = c.lastAt?.toMillis() ?? 0;
    return last > myRead;
  }

  // 내가 보낸 마지막 메시지를 상대가 읽었는지
  const otherUid = activeConv?.members.find((m) => m !== user?.uid);
  const otherReadMs = otherUid ? activeConv?.reads?.[otherUid]?.toMillis() ?? 0 : 0;
  const myMsgs = messages.filter((m) => m.senderId === user?.uid);
  const myLastMsg = myMsgs[myMsgs.length - 1];
  const myLastRead =
    !!myLastMsg && otherReadMs >= (myLastMsg.createdAt?.toMillis() ?? Infinity);

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold text-slate-800 dark:text-slate-100">
        ✉️ 메시지
      </h1>

      <div className="flex h-[calc(100vh-11rem)] gap-4">
        {/* 대화 목록 */}
        <aside
          className={`w-full shrink-0 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:w-72 ${activeId ? "hidden md:block" : "block"}`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              대화
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={openGroup}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                + 그룹
              </button>
              <button
                onClick={openNew}
                className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
              >
                + 새 대화
              </button>
            </div>
          </div>
          <div className="overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">대화가 없습니다.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveName(otherName(c));
                    setActiveId(c.id);
                  }}
                  className={`flex w-full items-center gap-3 border-b border-slate-50 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${activeId === c.id ? "bg-slate-50 dark:bg-slate-800" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-slate-800">
                      {c.isGroup ? "👥" : convTitle(c).slice(0, 1)}
                    </div>
                    {!c.isGroup &&
                      onlineOf(c.members.find((m) => m !== user?.uid)) && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                      )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {convTitle(c)}
                      {c.isGroup && (
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          {c.members.length}
                        </span>
                      )}
                    </p>
                    <p
                      className={`truncate text-xs ${isUnread(c) ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-400"}`}
                    >
                      {c.lastMessage || "새 대화"}
                    </p>
                  </div>
                  {isUnread(c) && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* 대화창 */}
        <section
          className={`flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${activeId ? "flex" : "hidden md:flex"}`}
        >
          {!activeId ? (
            <div className="grid flex-1 place-items-center text-sm text-slate-400">
              왼쪽에서 대화를 선택하거나 새 대화를 시작하세요.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
                <button
                  onClick={() => setActiveId(null)}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
                >
                  ←
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {headerName}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    첫 메시지를 보내보세요.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => {
                      const mine = m.senderId === user?.uid;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div className="max-w-[75%]">
                            {!mine && activeConv?.isGroup && (
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
                    {!activeConv?.isGroup &&
                      myLastRead &&
                      messages[messages.length - 1]?.senderId === user?.uid && (
                        <p className="px-1 text-right text-[11px] text-brand-500">
                          읽음
                        </p>
                      )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
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
            </>
          )}
        </section>
      </div>

      {/* 새 대화: 사용자 선택 */}
      {showNew && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
          onClick={() => setShowNew(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">
              대화 상대 선택
            </h2>
            <div className="space-y-1">
              {users
                .filter((u) => u.uid !== user?.uid)
                .map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => startChat(u)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="relative">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-slate-800">
                        {u.displayName.slice(0, 1)}
                      </div>
                      {isOnline(u.lastSeen?.toMillis()) && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                      )}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {u.displayName}
                    </span>
                  </button>
                ))}
              {users.filter((u) => u.uid !== user?.uid).length === 0 && (
                <p className="p-2 text-sm text-slate-400">
                  대화할 다른 사용자가 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 그룹 만들기 */}
      {showGroup && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4"
          onClick={() => setShowGroup(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">
              그룹 만들기
            </h2>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="그룹 이름"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800"
            />
            <p className="mb-1 text-xs text-slate-400">
              참여자 선택 ({groupMembers.size}명)
            </p>
            <div className="mb-3 flex-1 space-y-1 overflow-y-auto">
              {users
                .filter((u) => u.uid !== user?.uid)
                .map((u) => {
                  const on = groupMembers.has(u.uid);
                  return (
                    <label
                      key={u.uid}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setGroupMembers((prev) => {
                            const next = new Set(prev);
                            if (next.has(u.uid)) next.delete(u.uid);
                            else next.add(u.uid);
                            return next;
                          })
                        }
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {u.displayName}
                      </span>
                    </label>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowGroup(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={createGroup}
                disabled={!groupName.trim() || groupMembers.size === 0}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
