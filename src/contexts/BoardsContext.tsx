import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchBoards } from "../lib/boards";
import type { Board } from "../types";

interface BoardsContextValue {
  boards: Board[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined);

export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setBoards(await fetchBoards());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <BoardsContext.Provider value={{ boards, loading, refresh }}>
      {children}
    </BoardsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBoards() {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error("useBoards must be used within BoardsProvider");
  return ctx;
}
