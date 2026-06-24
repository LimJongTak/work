import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "./Spinner";
import PendingApproval from "../pages/PendingApproval";

/** 로그인했지만 아직 관리자 승인을 받지 못한 회원은 콘텐츠 대신 대기 화면을 봅니다. */
export default function ApprovalGate({ children }: { children: ReactNode }) {
  const { loading, profile, approved } = useAuth();

  if (loading || !profile) return <Spinner label="확인 중..." />;
  if (!approved) return <PendingApproval />;
  return <>{children}</>;
}
