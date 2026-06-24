/** 게시글 내보내기 유틸 (PDF 인쇄 / Word용 .doc / 코드 .txt) */

export interface ExportItem {
  title: string;
  category?: string;
  content: string; // 저장된 HTML 코드(또는 본문)
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob(["﻿" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** 코드(원본 HTML)만 모아 .txt 로 추출 */
export function exportTxt(items: ExportItem[], name = "code") {
  const text = items
    .map((it) => {
      const head = `# ${it.title}${it.category ? `  [${it.category}]` : ""}`;
      return `${head}\n${"-".repeat(50)}\n${it.content}\n`;
    })
    .join("\n" + "=".repeat(50) + "\n\n");
  downloadBlob(text, `${name}_${stamp()}.txt`, "text/plain;charset=utf-8");
}

// 코드를 줄바꿈/들여쓰기 유지하며 전체가 보이도록 감싸는 <pre> 블록
const PRE_STYLE =
  "white-space:pre-wrap;word-break:break-all;font-family:'D2Coding','Consolas',monospace;" +
  "font-size:12px;line-height:1.5;background:#f6f8fa;border:1px solid #ddd;border-radius:6px;padding:12px";

/** 분류·제목·HTML 코드(전체)를 Word(.doc) 문서로 추출 (복붙·문서정리용) */
export function exportDoc(items: ExportItem[], name = "documents") {
  const body = items
    .map((it) => {
      return `
        <h2 style="color:#1f47f5;border-bottom:1px solid #ccc;padding-bottom:4px">${esc(it.title)}</h2>
        ${it.category ? `<p style="color:#666;font-size:12px">분류: ${esc(it.category)}</p>` : ""}
        <pre style="${PRE_STYLE}">${esc(it.content)}</pre>
        <hr style="margin:24px 0;border:none;border-top:1px dashed #ccc"/>
      `;
    })
    .join("\n");
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:w="urn:schemas-microsoft-com:office:word" ` +
    `xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">` +
    `<title>${name}</title></head><body style="font-family:'Malgun Gothic',sans-serif">${body}</body></html>`;
  downloadBlob(html, `${name}_${stamp()}.doc`, "application/msword");
}

/** 선택한 글들의 HTML 코드(전체)를 새 창에서 인쇄(=PDF 저장) */
export function printPdf(items: ExportItem[], docTitle = "내보내기") {
  const body = items
    .map(
      (it) => `
        <section style="page-break-after:always">
          <h2 style="color:#1f47f5;border-bottom:2px solid #1f47f5;padding-bottom:6px">${esc(it.title)}</h2>
          ${it.category ? `<p style="color:#666;font-size:12px;margin:4px 0 12px">분류: ${esc(it.category)}</p>` : ""}
          <pre style="${PRE_STYLE}">${esc(it.content)}</pre>
        </section>`,
    )
    .join("\n");
  const win = window.open("", "_blank");
  if (!win) {
    alert("팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.");
    return;
  }
  win.document.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(docTitle)}</title>` +
      `<style>body{font-family:'Malgun Gothic',sans-serif;margin:24px;color:#1e293b;line-height:1.6}` +
      `pre{white-space:pre-wrap;word-break:break-all}` +
      `section:last-child{page-break-after:auto}</style></head><body>${body}` +
      `<script>window.onload=function(){window.print()}<\/script></body></html>`,
  );
  win.document.close();
}

/**
 * 렌더된 미리보기(화면 그대로)를 PDF로 뽑고 싶을 때 사용하는 별도 함수.
 * (기본 PDF/DOC 는 코드로 출력)
 */
export function printRenderedPdf(items: ExportItem[], docTitle = "내보내기") {
  const body = items
    .map(
      (it) => `
        <section style="page-break-after:always">
          <h2 style="color:#1f47f5">${esc(it.title)}</h2>
          ${it.category ? `<p style="color:#666;font-size:12px">분류: ${esc(it.category)}</p>` : ""}
          <div>${it.content}</div>
        </section>`,
    )
    .join("\n");
  const win = window.open("", "_blank");
  if (!win) {
    alert("팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.");
    return;
  }
  win.document.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(docTitle)}</title>` +
      `<style>body{font-family:'Malgun Gothic',sans-serif;margin:24px}` +
      `section:last-child{page-break-after:auto}</style></head><body>${body}` +
      `<script>window.onload=function(){window.print()}<\/script></body></html>`,
  );
  win.document.close();
}
