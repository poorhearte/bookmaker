import { readFile } from 'node:fs/promises';
import { marked } from 'marked';
import mammoth from 'mammoth';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);

function wrapPlainText(raw) {
  return raw
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function extractHeadings(html) {
  const headings = [];
  const result = html.replace(
    /<(h[12])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (_match, tag, attrs, inner) => {
      const level = Number(tag.slice(1));
      const text = inner.replace(/<[^>]+>/g, '').trim();
      if (!text) return _match;
      const id = `ch-${headings.length + 1}`;
      headings.push({ id, level, text });
      const existingAttrs = (attrs || '').replace(/\sid="[^"]*"/i, '');
      return `<${tag}${existingAttrs} id="${id}" data-toc-id="${id}">${inner}</${tag}>`;
    },
  );
  return { html: result, headings };
}

async function rawHtml(file) {
  const ext = file.originalname.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'markdown') {
    const raw = await readFile(file.path, 'utf-8');
    return marked.parse(raw, { gfm: true, breaks: false });
  }
  if (ext === 'txt') {
    const raw = await readFile(file.path, 'utf-8');
    return wrapPlainText(raw);
  }
  if (ext === 'docx') {
    const { value } = await mammoth.convertToHtml({ path: file.path });
    return value;
  }
  throw new Error(`지원하지 않는 파일 형식: .${ext} (현재는 .md, .txt, .docx 지원)`);
}

export async function toHtml(file) {
  const html = await rawHtml(file);
  return extractHeadings(html);
}
