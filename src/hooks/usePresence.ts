import { useEffect, useState } from "react";
import { isOnline, subscribeUsers } from "../lib/users";
import type { UserProfile } from "../types";

/** 전체 사용자와 현재 온라인(2분 이내 접속) 목록을 실시간 제공 */
export function usePresence() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeUsers(setUsers, (e) =>
      console.error("사용자 구독 오류:", e),
    );
    // 시간이 지나면 온라인 여부가 바뀌므로 30초마다 재평가
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, []);

  const online = users.filter((u) => isOnline(u.lastSeen?.toMillis()));
  return { users, online };
}
