import type { Timestamp } from "firebase/firestore";

/**
 * 사용자 등급
 * - admin   : 관리자 (전체 관리, 요청 승인/반려)
 * - manager : 매니저 (게시판 관리 일부 + 요청 가능)
 * - member  : 일반 회원 (글/댓글 작성, 게시판·카테고리 추가는 요청만)
 */
export type Role = "admin" | "manager" | "senior" | "member" | "associate";

export const ROLE_META: Record<Role, { label: string; level: number; badge: string }> = {
  admin: { label: "관리자", level: 100, badge: "bg-emerald-50 text-emerald-600" },
  manager: { label: "매니저", level: 80, badge: "bg-brand-50 text-brand-600" },
  senior: { label: "정회원", level: 60, badge: "bg-violet-50 text-violet-600" },
  member: { label: "일반 회원", level: 40, badge: "bg-slate-100 text-slate-500" },
  associate: { label: "준회원", level: 20, badge: "bg-amber-50 text-amber-600" },
};

/** 등급 목록 (레벨 높은 순) */
export const ROLES: Role[] = ["admin", "manager", "senior", "member", "associate"];

/** 과거 'user' 값 등 알 수 없는 값을 member 로 보정 */
export function normalizeRole(role?: string): Role {
  if (
    role === "admin" ||
    role === "manager" ||
    role === "senior" ||
    role === "member" ||
    role === "associate"
  )
    return role;
  return "member";
}

/** 등급의 권한 레벨(숫자). 열람 권한 비교에 사용 */
export function roleLevel(role?: string): number {
  return ROLE_META[normalizeRole(role)].level;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  /** 관리자 승인 여부. 미승인 회원은 게시글 등 콘텐츠에 접근할 수 없습니다. */
  approved?: boolean;
  /** 가입 반려 여부 */
  rejected?: boolean;
  /** 마지막 접속 시각(온라인 표시용) */
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
}

/** 콘텐츠 접근 가능한(승인된) 회원인지. 관리자는 항상 승인으로 간주. */
export function isApproved(
  p?: Pick<UserProfile, "role" | "approved"> | null,
): boolean {
  if (!p) return false;
  return normalizeRole(p.role) === "admin" || p.approved === true;
}

/** 관리자가 발급하는 1회용 추천(초대) 코드 */
export interface InviteCode {
  code: string;
  used: boolean;
  createdBy: string;
  usedBy?: string;
  usedByName?: string;
  createdAt?: Timestamp;
  usedAt?: Timestamp;
}

/**
 * 게시판 종류
 * - html      : HTML 코드를 저장하고 미리보기로 화면을 볼 수 있는 저장소
 * - document  : 공문 작성 관리
 * - work      : 업무
 * - reference : 참고 자료
 * - notice    : 공지사항
 * - free      : 자유게시판
 */
export type BoardType =
  | "html"
  | "document"
  | "work"
  | "reference"
  | "notice"
  | "free";

export interface Board {
  id: string;
  name: string;
  type: BoardType;
  description?: string;
  order: number;
  /** 글쓰기 최소 권한 레벨(0=전체). 예: 공지사항=80(매니저↑) */
  writeLevel?: number;
  createdAt?: Timestamp;
  createdBy?: string;
}

/** 게시글 본문 형식 */
export type ContentType = "html" | "text" | "markdown";

/** 공문 결재 단계 */
export interface ApprovalStep {
  uid: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  decidedAt?: Timestamp;
}

export interface Attachment {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

export interface Post {
  id: string;
  boardId: string;
  categoryId?: string;
  title: string;
  content: string;
  contentType: ContentType;
  /** 공문 게시판용 부가 정보 (선택) */
  docNumber?: string;
  status?: string;
  attachments?: Attachment[];
  pinned?: boolean;
  /** 열람 최소 권한 레벨(0=전체 공개). 게시자가 설정 */
  minLevel?: number;
  /** 나만 보기(작성자 외 비공개) */
  private?: boolean;
  likeCount?: number;
  viewCount?: number;
  tags?: string[];
  /** 공문 결재선 */
  approvals?: ApprovalStep[];
  approverUids?: string[];
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Comment {
  id: string;
  postId: string;
  /** 대댓글이면 부모 댓글 id */
  parentId?: string;
  content: string;
  authorId: string;
  authorName: string;
  likeCount?: number;
  createdAt?: Timestamp;
}

/** 게시판 내 세부 카테고리 (예: 업무 → 행정업무 / 개발자 업무) */
export interface Category {
  id: string;
  boardId: string;
  name: string;
  order: number;
  createdAt?: Timestamp;
}

/** 게시판/카테고리 개설 요청 (관리자 승인 필요) */
export type RequestType = "board" | "category";
export type RequestStatus = "pending" | "approved" | "rejected";

export interface OpenRequest {
  id: string;
  type: RequestType;
  name: string;
  /** board 요청일 때 게시판 종류 */
  boardType?: BoardType;
  /** category 요청일 때 대상 게시판 */
  boardId?: string;
  boardName?: string;
  description?: string;
  requesterId: string;
  requesterName: string;
  status: RequestStatus;
  createdAt?: Timestamp;
  decidedBy?: string;
  decidedAt?: Timestamp;
  rejectReason?: string;
}

/** 알림 */
export type NotificationType = "comment" | "dm" | "request" | "like" | "mention";
export interface AppNotification {
  id: string;
  toUid: string;
  type: NotificationType;
  text: string;
  link: string;
  fromName?: string;
  read: boolean;
  createdAt?: Timestamp;
}

/** 북마크(즐겨찾기 글) */
export interface Bookmark {
  id: string;
  uid: string;
  postId: string;
  title: string;
  boardId: string;
  createdAt?: Timestamp;
}

/** 라이브톡(전체 채팅) 메시지 */
export interface LiveMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt?: Timestamp;
}

/** 대화방 (1:1 또는 그룹) */
export interface Conversation {
  id: string;
  members: string[]; // 참여자 uid 목록
  memberNames: Record<string, string>;
  /** 그룹 채팅 여부 */
  isGroup?: boolean;
  /** 그룹 이름 */
  name?: string;
  createdBy?: string;
  lastMessage?: string;
  lastAt?: Timestamp;
  lastSenderId?: string;
  /** 사용자별 마지막 읽은 시각 */
  reads?: Record<string, Timestamp>;
}

/** 1:1 메시지 */
export interface DirectMessage {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt?: Timestamp;
}

/** 이미지 업로드 기능 공개 여부 (추후 공개 예정) */
export const IMAGE_FEATURE_ENABLED = false;
export const IMAGE_COMING_SOON_MSG = "이미지 기능은 추후 공개 예정입니다.";

export const BOARD_TYPE_META: Record<
  BoardType,
  { label: string; icon: string; hint: string }
> = {
  html: {
    label: "HTML 저장소",
    icon: "🖥️",
    hint: "HTML 코드를 저장하고 미리보기로 화면 구성을 확인합니다.",
  },
  document: {
    label: "공문 관리",
    icon: "📑",
    hint: "공문을 작성하고 문서번호·상태로 관리합니다.",
  },
  work: {
    label: "업무",
    icon: "🗂️",
    hint: "일반 업무 내용을 기록·공유합니다.",
  },
  reference: {
    label: "참고",
    icon: "📚",
    hint: "참고 자료와 링크를 보관합니다.",
  },
  notice: {
    label: "공지사항",
    icon: "📢",
    hint: "중요한 공지를 게시합니다.",
  },
  free: {
    label: "자유게시판",
    icon: "🗣️",
    hint: "자유롭게 소통하는 게시판입니다.",
  },
};
