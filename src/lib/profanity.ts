// 기본 금지어 목록 (필요 시 자유롭게 추가)
const BANNED = [
  "시발",
  "씨발",
  "씨발놈",
  "개새끼",
  "개색기",
  "병신",
  "좆",
  "지랄",
  "닥쳐",
  "엿먹어",
  "fuck",
  "shit",
  "bitch",
  "asshole",
];

/** 텍스트에 금지어가 있으면 해당 단어를, 없으면 null 을 반환 */
export function findBannedWord(text: string): string | null {
  const lower = text.toLowerCase().replace(/\s+/g, "");
  return BANNED.find((w) => lower.includes(w)) ?? null;
}
