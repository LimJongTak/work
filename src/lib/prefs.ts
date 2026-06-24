import type { NotificationType } from "../types";

export const NOTIF_TYPES: { key: NotificationType; label: string }[] = [
  { key: "comment", label: "댓글 알림" },
  { key: "mention", label: "멘션(@) 알림" },
  { key: "dm", label: "메시지(DM) 알림" },
  { key: "request", label: "요청 승인/반려 알림" },
  { key: "like", label: "좋아요 알림" },
];

type Prefs = Record<string, boolean>;

function key(uid: string) {
  return `notifPrefs_${uid}`;
}

/** 알림 종류별 on/off (기본 모두 on) */
export function getNotifPrefs(uid: string): Prefs {
  try {
    return JSON.parse(localStorage.getItem(key(uid)) ?? "{}");
  } catch {
    return {};
  }
}

export function isNotifEnabled(uid: string, type: string): boolean {
  const prefs = getNotifPrefs(uid);
  return prefs[type] !== false; // 기본 true
}

export function setNotifPref(uid: string, type: string, on: boolean) {
  const prefs = getNotifPrefs(uid);
  prefs[type] = on;
  localStorage.setItem(key(uid), JSON.stringify(prefs));
}
