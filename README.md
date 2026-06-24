<div align="center">

# 🗂️ Work Board · 업무 게시판

**로그인 기반 사내 업무용 통합 게시판 & 협업 플랫폼**

승인제 가입 · 등급별 권한 · 게시판/카테고리 · HTML 블록 빌더 · 공문 관리 · 실시간 채팅 · 알림까지

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## ✨ 주요 기능

### 🔐 인증 · 권한
- **로그인 전용 접근** — 모든 콘텐츠는 로그인 후에만 열람
- **승인제 가입** — 관리자 승인 또는 **1회용 추천코드**로 즉시 가입
- **가입 반려** 처리 & 승인 대기 화면
- **5단계 사용자 등급** — 관리자 · 매니저 · 정회원 · 일반회원 · 준회원
- 게시글 단위 **열람 권한 / 나만 보기(비공개)**

### 📋 게시판 · 게시글
- **6종 게시판** — 공지사항 · 자유게시판 · 업무 · 공문 · HTML 저장소 · 참고 (관리자 추가, 일반 등급은 개설 요청)
- **게시판별 카테고리** & **글쓰기 권한** 설정
- **3가지 본문 형식** — 일반 텍스트 · **마크다운**(목차 자동) · **HTML**
- 🧩 **HTML 블록 빌더** — 제목·이미지·동영상·버튼·코드·콜아웃 등 **드래그로 조립**
- 📑 **공문 자동 문서번호**(`연도-0001`) · 📌 고정 · 🏷️ 태그 · 👁️ 조회수 · ❤️ 좋아요 · 🔖 북마크
- 💾 **임시저장(자동)** · ↔️ 글 이동/복사 · 🖨️ 인쇄/PDF · 📄 DOC · `</>` 코드 TXT 내보내기

### 💬 소통
- **실시간 댓글**(대댓글 · 좋아요 · @멘션)
- **라이브톡**(전체 채팅) · **1:1 / 그룹 메시지**(읽음 표시 · 링크 자동연결)
- 🟢 **온라인 상태** & 접속자 목록
- 🔔 **알림 센터**(댓글·DM·멘션·요청·좋아요, 종류별 on/off) · 우측 하단 **플로팅 채팅 위젯**

### 🛠️ 관리자
- **대시보드** — 현황 통계 + 최근 14일 추이 차트 + 활동 로그(감사)
- **사용자 관리** — 승인/반려/등급변경/삭제 · 회원 콘텐츠 일괄삭제 · CSV 내보내기
- **추천코드 발급** · **게시판/카테고리 관리** · **개설 요청 승인** · 🚩 **신고함**
- **금지어 필터** · 게시글 모더레이션(고정/삭제)

### 🎨 기타
- 🌙 **다크 모드** · 📱 **반응형 + PWA(앱 설치)** · 📂 내 활동(글/댓글/좋아요 관리)

---

## 🧱 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프론트엔드 | React 18 · TypeScript · Vite 5 |
| 라우팅 | React Router v6 |
| 인증 | Firebase Authentication (이메일/비밀번호) |
| 데이터베이스 | Cloud Firestore (실시간 구독) |
| 파일 | Firebase Storage |
| 스타일 | Tailwind CSS |

> 별도 백엔드 서버 없이 **Firebase 보안 규칙**이 인증·권한·데이터 무결성을 담당합니다.

---

## 🚀 시작하기

### 1. Firebase 프로젝트 준비
1. [Firebase 콘솔](https://console.firebase.google.com/)에서 프로젝트 생성
2. **Authentication** → 로그인 방법에서 **이메일/비밀번호** 사용 설정
3. **Firestore Database** 생성
4. **Storage** 시작하기 (첨부/이미지용)
5. **프로젝트 설정 → 웹 앱(</>)** 추가 후 `firebaseConfig` 값 확인

### 2. 환경 변수
`.env.example` 을 복사해 `.env` 를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. 보안 규칙 적용
`firestore.rules` 내용을 **Firestore → 규칙** 에, `storage.rules` 내용을 **Storage → 규칙** 에 붙여넣고 게시합니다.
(또는 `firebase deploy --only firestore:rules,storage`)

### 4. 설치 & 실행
```bash
npm install
npm run dev
```

`http://localhost:5173` 접속 → **회원가입**(첫 계정이 자동 관리자) → 관리자 메뉴에서 게시판을 구성하세요.

---

## 📦 빌드 & 배포

```bash
npm run build      # dist/ 생성
npm run preview    # 빌드 미리보기
```

Firebase Hosting 배포:
```bash
npm i -g firebase-tools
firebase login
firebase use --add        # 또는 .firebaserc 의 프로젝트 ID 설정
npm run build
firebase deploy
```

---

## 🗃️ 데이터 모델 (Firestore)

```
users          사용자 프로필 · 등급 · 승인상태 · 접속시각
inviteCodes    1회용 추천코드
boards         게시판 (종류 · 글쓰기 권한)
categories     게시판별 카테고리
posts          게시글 (본문형식 · 태그 · 권한 · 좋아요/조회수 · 결재선)
comments       댓글 · 대댓글
likes / commentLikes / bookmarks   좋아요 · 북마크
notifications  알림        reports     신고
conversations / directMessages     1:1·그룹 채팅
liveMessages   라이브톡    activityLogs  활동 로그   counters  문서번호
```

---

## 📁 프로젝트 구조

```
src/
├─ contexts/    Auth · Boards · Theme · Toast
├─ hooks/       useFavorites · usePresence
├─ lib/         firebase · posts · comments · chat · users · ... (데이터 계층)
├─ components/  Layout · Sidebar · ChatWidget · HtmlBlockBuilder · ...
└─ pages/       Login · Home · BoardPage · PostDetail · PostEditor
                · LiveTalk · Messages · MyActivity · Settings · admin/*
```

---

## 🔒 보안 메모
- 첫 가입자만 자동 관리자가 되며, 이후 가입은 **승인 또는 추천코드**가 필요합니다.
- HTML 미리보기는 `allow-same-origin` 없는 **sandbox iframe** 으로 안전하게 렌더링됩니다.
- 일부 세밀한 권한(나만보기·열람등급)은 UX 차원 필터이며, 완전한 서버 강제가 필요하면 Cloud Functions 도입을 권장합니다.

---

<div align="center">
Made with ❤️ using React · Firebase
</div>
