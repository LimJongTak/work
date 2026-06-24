export interface TocItem {
  level: number;
  text: string;
  id: string;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 인라인 마크다운(굵게/기울임/코드/링크) 처리. 입력은 이미 HTML 이스케이프된 상태 */
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

function slug(text: string, i: number): string {
  return (
    "h-" +
    i +
    "-" +
    text
      .toLowerCase()
      .replace(/[^\w가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30)
  );
}

/** 안전한(이스케이프된) 마크다운 → HTML. 제목 목차(TOC)도 함께 반환 */
export function markdownToHtml(md: string): { html: string; toc: TocItem[] } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const toc: TocItem[] = [];
  let i = 0;
  let inCode = false;
  let listType: "ul" | "ol" | null = null;
  let headingIdx = 0;

  function closeList() {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  }

  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n];

    // 코드펜스
    if (/^```/.test(raw.trim())) {
      closeList();
      if (!inCode) {
        inCode = true;
        out.push(
          '<pre style="background:#0f172a;color:#e2e8f0;padding:14px;border-radius:10px;overflow:auto;font-size:13px"><code>',
        );
      } else {
        inCode = false;
        out.push("</code></pre>");
      }
      continue;
    }
    if (inCode) {
      out.push(esc(raw));
      continue;
    }

    const line = raw.trimEnd();
    const e = esc(line);

    // 제목
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const text = h[2];
      const id = slug(text, i++ + headingIdx++);
      toc.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(esc(text))}</h${level}>`);
      continue;
    }

    // 수평선
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeList();
      out.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>');
      continue;
    }

    // 인용
    if (/^>\s?/.test(line)) {
      closeList();
      out.push(
        `<blockquote style="border-left:4px solid #3366ff;margin:8px 0;padding:6px 14px;color:#475569">${inline(esc(line.replace(/^>\s?/, "")))}</blockquote>`,
      );
      continue;
    }

    // 순서 없는 목록
    if (/^[-*]\s+/.test(line)) {
      if (listType !== "ul") {
        closeList();
        out.push('<ul style="padding-left:24px;line-height:1.8">');
        listType = "ul";
      }
      out.push(`<li>${inline(esc(line.replace(/^[-*]\s+/, "")))}</li>`);
      continue;
    }
    // 순서 있는 목록
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== "ol") {
        closeList();
        out.push('<ol style="padding-left:24px;line-height:1.8">');
        listType = "ol";
      }
      out.push(`<li>${inline(esc(line.replace(/^\d+\.\s+/, "")))}</li>`);
      continue;
    }

    // 빈 줄
    if (line.trim() === "") {
      closeList();
      continue;
    }

    // 일반 문단
    closeList();
    out.push(`<p style="line-height:1.7;margin:6px 0">${inline(e)}</p>`);
  }
  closeList();
  if (inCode) out.push("</code></pre>");

  return { html: out.join("\n"), toc };
}
