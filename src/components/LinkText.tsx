import type { ReactNode } from "react";

/** 텍스트 안의 URL 을 클릭 가능한 링크로 변환해 렌더링 */
export default function LinkText({ text }: { text: string }) {
  const re = /(https?:\/\/[^\s]+)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a
        key={i++}
        href={m[0]}
        target="_blank"
        rel="noreferrer"
        className="break-all underline opacity-90 hover:opacity-100"
      >
        {m[0]}
      </a>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
