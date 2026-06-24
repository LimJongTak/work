import { useMemo } from "react";

/**
 * 저장된 HTML 을 격리된 iframe(sandbox) 안에서 렌더링합니다.
 * sandbox 에 allow-same-origin 을 주지 않아 부모 페이지/쿠키에 접근할 수 없으므로 안전합니다.
 */
export default function HtmlPreview({
  html,
  className = "",
  title = "HTML 미리보기",
}: {
  html: string;
  className?: string;
  title?: string;
}) {
  const srcDoc = useMemo(() => {
    // 문서 전체(<html>)가 아니면 기본 골격으로 감싸 가독성을 높입니다.
    const looksFullDoc = /<html[\s>]/i.test(html);
    if (looksFullDoc) return html;
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>body{font-family:Pretendard,system-ui,-apple-system,sans-serif;margin:16px;color:#1e293b;line-height:1.6}</style>
</head><body>${html}</body></html>`;
  }, [html]);

  return (
    <iframe
      title={title}
      sandbox="allow-scripts allow-popups allow-forms"
      srcDoc={srcDoc}
      className={`w-full rounded-lg border border-slate-200 bg-white ${className}`}
    />
  );
}
