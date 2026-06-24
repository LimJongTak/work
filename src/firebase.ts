import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** .env 에 Firebase 설정값이 채워져 있는지 여부 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

// 설정이 없으면 Firebase 를 초기화하지 않습니다.
// (빈 설정으로 getAuth/getFirestore 를 호출하면 즉시 예외가 발생해
//  앱 전체 렌더가 죽고 안내 화면조차 뜨지 않기 때문)
let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // ignoreUndefinedProperties: undefined 필드를 저장 시 자동으로 무시
  // (선택 필드를 넘길 때 Firestore 가 undefined 를 거부해 저장이 실패하는 문제 방지)
  dbInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
  storageInstance = getStorage(app);
} else {
  console.warn(
    "[firebase] .env 에 VITE_FIREBASE_* 값이 설정되지 않았습니다. .env.example 을 참고하세요.",
  );
}

// 설정이 있을 때만 실제 사용되므로 비-null 로 단언해 내보냅니다.
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export const storage = storageInstance as FirebaseStorage;
export default app;
