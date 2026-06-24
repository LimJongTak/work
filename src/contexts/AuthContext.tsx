import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { isApproved, normalizeRole, type Role, type UserProfile } from "../types";
import { consumeInviteCode } from "../lib/invites";
import { touchPresence } from "../lib/users";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: Role;
  isAdmin: boolean;
  /** 관리자 또는 매니저 */
  isManager: boolean;
  /** 관리자 승인을 받아 콘텐츠 접근이 가능한지 */
  approved: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    inviteCode?: string,
  ) => Promise<{ approved: boolean }>;
  logout: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** 프로필 문서가 없으면 생성하고(첫 사용자는 관리자), 프로필을 반환합니다. */
async function ensureProfile(firebaseUser: User): Promise<UserProfile> {
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid: snap.id, ...snap.data() } as UserProfile;
  }
  // 프로필이 없으면(가입 중 실패 등) 자동 복구 생성. 첫 사용자만 관리자/승인.
  const existing = await getDocs(query(collection(db, "users"), limit(1)));
  const isFirst = existing.empty;
  const role: Role = isFirst ? "admin" : "member";
  const displayName =
    firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "사용자";
  const data = {
    email: firebaseUser.email ?? "",
    displayName,
    role,
    approved: isFirst, // 첫 관리자만 자동 승인, 그 외는 대기
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return {
    uid: firebaseUser.uid,
    email: data.email,
    displayName,
    role,
    approved: isFirst,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // 회원가입 중에는 onAuthStateChanged 가 프로필을 중복 생성하지 않도록 잠금
  const signingUp = useRef(false);

  useEffect(() => {
    // Firebase 미설정 시에는 인증 구독을 건너뜁니다. (안내 화면 표시)
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // 가입 진행 중이면 signup() 이 프로필을 직접 설정하므로 건너뜀
        if (signingUp.current) {
          setLoading(false);
          return;
        }
        try {
          setProfile(await ensureProfile(firebaseUser));
        } catch (e) {
          console.error("프로필 로드 실패:", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // 접속 표시(heartbeat): 로그인 중이면 즉시 + 60초마다 lastSeen 갱신
  useEffect(() => {
    if (!user) return;
    void touchPresence(user.uid);
    const t = setInterval(() => void touchPresence(user.uid), 60_000);
    return () => clearInterval(t);
  }, [user]);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signup(
    email: string,
    password: string,
    displayName: string,
    inviteCode?: string,
  ): Promise<{ approved: boolean }> {
    signingUp.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });

      // 가장 먼저 가입한 사용자는 자동으로 관리자 + 승인
      const existing = await getDocs(query(collection(db, "users"), limit(1)));
      const isFirst = existing.empty;
      const role: Role = isFirst ? "admin" : "member";

      // 추천코드가 있으면 검증·소진하여 즉시 승인
      let approved = isFirst;
      if (!isFirst && inviteCode?.trim()) {
        try {
          await consumeInviteCode(
            inviteCode.trim().toUpperCase(),
            cred.user.uid,
            displayName,
          );
          approved = true;
        } catch (e) {
          // 코드가 유효하지 않으면 승인 대기 상태로 가입 진행
          console.warn("추천코드 처리 실패:", (e as Error).message);
          approved = false;
        }
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        displayName,
        role,
        approved,
        createdAt: serverTimestamp(),
      });
      setProfile({ uid: cred.user.uid, email, displayName, role, approved });
      return { approved };
    } finally {
      signingUp.current = false;
    }
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateDisplayName(name: string) {
    const trimmed = name.trim();
    if (!trimmed || !auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: trimmed });
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      displayName: trimmed,
    });
    setProfile((p) => (p ? { ...p, displayName: trimmed } : p));
  }

  const role = normalizeRole(profile?.role);
  const value: AuthContextValue = {
    user,
    profile,
    loading,
    role,
    isAdmin: role === "admin",
    isManager: role === "admin" || role === "manager",
    approved: isApproved(profile),
    login,
    signup,
    logout,
    updateDisplayName,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
