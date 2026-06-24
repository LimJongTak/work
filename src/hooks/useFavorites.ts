import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

/** 즐겨찾기 게시판 ID 목록(브라우저 로컬 저장, 사용자별) */
export function useFavorites() {
  const { user } = useAuth();
  const key = user ? `favBoards_${user.uid}` : "";
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    if (!key) {
      setFavs([]);
      return;
    }
    try {
      setFavs(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setFavs([]);
    }
  }, [key]);

  const toggle = useCallback(
    (id: string) => {
      setFavs((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
        if (key) localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  return { favs, toggle, isFav: (id: string) => favs.includes(id) };
}
