import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase";
import type { Attachment } from "../types";

/** 업로드 용량 제한 (10MB) — Storage 보안 규칙과 맞춰야 합니다. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadAttachment(
  file: File,
  uid: string,
): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("파일 크기는 10MB 이하만 업로드할 수 있습니다.");
  }
  // 안전한 경로: attachments/{uid}/{timestamp}_{원본이름}
  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
  const path = `attachments/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return { name: file.name, url, path, size: file.size, type: file.type };
}

export async function removeAttachment(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // 이미 삭제되었거나 권한 문제일 수 있으므로 조용히 무시
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
