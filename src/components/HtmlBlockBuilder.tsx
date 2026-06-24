import { useState } from "react";

/** 블록 종류 정의 */
export type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3; align: Align }
  | { id: string; type: "text"; text: string; align: Align }
  | { id: string; type: "image"; url: string; alt: string; width: number; align: Align }
  | { id: string; type: "button"; text: string; href: string; color: string; align: Align }
  | { id: string; type: "list"; items: string; ordered: boolean }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "callout"; text: string; emoji: string }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "code"; text: string }
  | { id: string; type: "spacer"; size: number }
  | { id: string; type: "divider" };

type Align = "left" | "center" | "right";

function uid() {
  return crypto.randomUUID();
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 유튜브/일반 URL → 임베드 URL */
function toEmbedUrl(url: string): string {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

/** 블록 배열을 HTML 문자열로 직렬화 */
export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `<h${b.level} style="text-align:${b.align}">${esc(b.text)}</h${b.level}>`;
        case "text":
          return `<p style="text-align:${b.align};line-height:1.6">${esc(b.text).replace(/\n/g, "<br/>")}</p>`;
        case "image":
          return `<div style="text-align:${b.align}"><img src="${b.url}" alt="${esc(b.alt)}" style="max-width:${b.width}%;height:auto;display:inline-block" /></div>`;
        case "button":
          return `<div style="text-align:${b.align}"><a href="${esc(b.href)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:${b.color};color:#fff;text-decoration:none;font-weight:600">${esc(b.text)}</a></div>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          const items = b.items
            .split("\n")
            .filter((x) => x.trim())
            .map((x) => `  <li>${esc(x.trim())}</li>`)
            .join("\n");
          return `<${tag} style="padding-left:24px;line-height:1.8">\n${items}\n</${tag}>`;
        }
        case "quote":
          return `<blockquote style="border-left:4px solid #3366ff;margin:8px 0;padding:8px 16px;color:#475569">${esc(b.text)}</blockquote>`;
        case "callout":
          return `<div style="display:flex;gap:10px;background:#eef4ff;border:1px solid #bcd2ff;padding:12px 16px;border-radius:10px;margin:8px 0"><span>${esc(b.emoji)}</span><span>${esc(b.text)}</span></div>`;
        case "video":
          return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:8px 0"><iframe src="${toEmbedUrl(b.url)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`;
        case "code":
          return `<pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:10px;overflow:auto;font-size:13px"><code>${esc(b.text)}</code></pre>`;
        case "spacer":
          return `<div style="height:${b.size}px"></div>`;
        case "divider":
          return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>`;
      }
    })
    .join("\n");
}

const NEW_BLOCKS: Record<string, () => Block> = {
  heading: () => ({ id: uid(), type: "heading", text: "제목", level: 2, align: "left" }),
  text: () => ({ id: uid(), type: "text", text: "내용을 입력하세요.", align: "left" }),
  image: () => ({ id: uid(), type: "image", url: "", alt: "", width: 100, align: "center" }),
  button: () => ({ id: uid(), type: "button", text: "버튼", href: "https://", color: "#3366ff", align: "left" }),
  list: () => ({ id: uid(), type: "list", items: "항목 1\n항목 2", ordered: false }),
  quote: () => ({ id: uid(), type: "quote", text: "인용문" }),
  callout: () => ({ id: uid(), type: "callout", text: "안내 문구를 입력하세요.", emoji: "💡" }),
  video: () => ({ id: uid(), type: "video", url: "" }),
  code: () => ({ id: uid(), type: "code", text: "console.log('hello')" }),
  spacer: () => ({ id: uid(), type: "spacer", size: 24 }),
  divider: () => ({ id: uid(), type: "divider" }),
};

const ADD_BUTTONS: { key: keyof typeof NEW_BLOCKS; label: string }[] = [
  { key: "heading", label: "제목" },
  { key: "text", label: "텍스트" },
  { key: "image", label: "이미지" },
  { key: "video", label: "동영상" },
  { key: "button", label: "버튼" },
  { key: "list", label: "목록" },
  { key: "quote", label: "인용" },
  { key: "callout", label: "콜아웃" },
  { key: "code", label: "코드" },
  { key: "spacer", label: "여백" },
  { key: "divider", label: "구분선" },
];

const LABELS: Record<Block["type"], string> = {
  heading: "제목",
  text: "텍스트",
  image: "이미지",
  button: "버튼",
  list: "목록",
  quote: "인용",
  callout: "콜아웃",
  video: "동영상",
  code: "코드",
  spacer: "여백",
  divider: "구분선",
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800";

export default function HtmlBlockBuilder({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function update(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }
  function add(key: keyof typeof NEW_BLOCKS) {
    onChange([...blocks, NEW_BLOCKS[key]()]);
  }
  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length)
      return;
    const next = [...blocks];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      {blocks.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">
          아래 버튼으로 블록을 추가하세요. 블록 왼쪽 손잡이(⠿)를 잡고 끌어
          순서를 바꿀 수 있습니다.
        </p>
      )}

      <div className="space-y-2">
        {blocks.map((b, i) => (
          <div
            key={b.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (overIndex !== i) setOverIndex(i);
            }}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`flex gap-2 rounded-lg border bg-white p-3 dark:bg-slate-900 ${
              overIndex === i && dragIndex !== null
                ? "border-brand-400 ring-2 ring-brand-100"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            {/* 드래그 손잡이 */}
            <div
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              title="끌어서 이동"
              className="flex cursor-grab select-none items-start pt-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
            >
              ⠿
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-slate-800">
                  {LABELS[b.type]}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded px-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">▲</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === blocks.length - 1} className="rounded px-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">▼</button>
                  <button type="button" onClick={() => remove(b.id)} className="rounded px-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-slate-800">✕</button>
                </div>
              </div>

              {b.type === "heading" && (
                <div className="flex flex-wrap gap-2">
                  <input className={inputCls + " min-w-[140px] flex-1"} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="제목 텍스트" />
                  <select className={inputCls + " w-24"} value={b.level} onChange={(e) => update(b.id, { level: Number(e.target.value) as 1 | 2 | 3 })}>
                    <option value={1}>대제목</option>
                    <option value={2}>중제목</option>
                    <option value={3}>소제목</option>
                  </select>
                  <AlignSelect value={b.align} onChange={(align) => update(b.id, { align })} />
                </div>
              )}

              {b.type === "text" && (
                <div className="space-y-2">
                  <textarea className={inputCls} rows={2} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="문단 내용" />
                  <AlignSelect value={b.align} onChange={(align) => update(b.id, { align })} />
                </div>
              )}

              {b.type === "image" && (
                <div className="space-y-2">
                  {b.url && (
                    <img src={b.url} alt={b.alt} className="max-h-40 rounded border border-slate-200 dark:border-slate-700" />
                  )}
                  <input className={inputCls} value={b.url} onChange={(e) => update(b.id, { url: e.target.value })} placeholder="이미지 주소(URL) 붙여넣기" />
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={inputCls + " min-w-[120px] flex-1"} value={b.alt} onChange={(e) => update(b.id, { alt: e.target.value })} placeholder="대체 텍스트(선택)" />
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      너비
                      <input type="number" min={10} max={100} className={inputCls + " w-16"} value={b.width} onChange={(e) => update(b.id, { width: Number(e.target.value) })} />%
                    </span>
                    <AlignSelect value={b.align} onChange={(align) => update(b.id, { align })} />
                  </div>
                </div>
              )}

              {b.type === "video" && (
                <div className="space-y-1">
                  <input className={inputCls} value={b.url} onChange={(e) => update(b.id, { url: e.target.value })} placeholder="유튜브 주소 또는 임베드 URL" />
                  <p className="text-xs text-slate-400">유튜브 링크를 붙여넣으면 자동으로 재생 영역이 됩니다.</p>
                </div>
              )}

              {b.type === "button" && (
                <div className="flex flex-wrap gap-2">
                  <input className={inputCls + " min-w-[100px] flex-1"} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="버튼 글자" />
                  <input className={inputCls + " min-w-[140px] flex-1"} value={b.href} onChange={(e) => update(b.id, { href: e.target.value })} placeholder="링크 주소" />
                  <input type="color" className="h-9 w-12 rounded border border-slate-300 dark:border-slate-700" value={b.color} onChange={(e) => update(b.id, { color: e.target.value })} />
                  <AlignSelect value={b.align} onChange={(align) => update(b.id, { align })} />
                </div>
              )}

              {b.type === "list" && (
                <div className="space-y-2">
                  <textarea className={inputCls} rows={3} value={b.items} onChange={(e) => update(b.id, { items: e.target.value })} placeholder="한 줄에 항목 하나씩" />
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={b.ordered} onChange={(e) => update(b.id, { ordered: e.target.checked })} />
                    번호 매기기 (1. 2. 3.)
                  </label>
                </div>
              )}

              {b.type === "quote" && (
                <textarea className={inputCls} rows={2} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="인용문" />
              )}

              {b.type === "callout" && (
                <div className="flex gap-2">
                  <input className={inputCls + " w-14 text-center"} value={b.emoji} onChange={(e) => update(b.id, { emoji: e.target.value })} placeholder="💡" />
                  <textarea className={inputCls} rows={2} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="안내 문구" />
                </div>
              )}

              {b.type === "code" && (
                <textarea className={inputCls + " font-mono"} rows={3} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="코드 입력" />
              )}

              {b.type === "spacer" && (
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  높이
                  <input type="number" min={4} max={200} className={inputCls + " w-20"} value={b.size} onChange={(e) => update(b.id, { size: Number(e.target.value) })} />px
                </label>
              )}

              {b.type === "divider" && (
                <p className="text-center text-sm text-slate-400">— 구분선 —</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3 dark:border-slate-700">
        {ADD_BUTTONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => add(a.key)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            + {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AlignSelect({ value, onChange }: { value: Align; onChange: (a: Align) => void }) {
  return (
    <select className={inputCls + " w-24"} value={value} onChange={(e) => onChange(e.target.value as Align)}>
      <option value="left">왼쪽</option>
      <option value="center">가운데</option>
      <option value="right">오른쪽</option>
    </select>
  );
}
