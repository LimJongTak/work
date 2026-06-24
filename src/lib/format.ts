import type { Timestamp } from "firebase/firestore";

export function formatDate(ts?: Timestamp): string {
  if (!ts) return "";
  const d = ts.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

/** "방금 전", "3분 전", "어제" 같은 상대 시간. 1주일 넘으면 날짜로 표시. */
export function timeAgo(ts?: Timestamp): string {
  if (!ts) return "";
  const now = Date.now();
  const then = ts.toMillis();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return formatDate(ts);
}
