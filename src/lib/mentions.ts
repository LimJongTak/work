import { fetchUsers } from "./users";
import { notify } from "./notifications";

/**
 * 텍스트에서 @이름 형태의 멘션을 찾아 해당 사용자에게 알림을 보냅니다.
 * (이름에 공백이 있어도 "@" + 표시이름 포함 여부로 판별)
 */
export async function notifyMentions(
  text: string,
  from: { uid: string; name: string },
  link: string,
) {
  if (!text.includes("@")) return;
  let users;
  try {
    users = await fetchUsers();
  } catch {
    return;
  }
  for (const u of users) {
    if (u.uid === from.uid) continue;
    if (u.displayName && text.includes("@" + u.displayName)) {
      void notify({
        toUid: u.uid,
        fromUid: from.uid,
        type: "mention",
        text: `${from.name}님이 회원님을 언급했습니다.`,
        link,
        fromName: from.name,
      });
    }
  }
}
