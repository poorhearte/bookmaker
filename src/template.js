const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const SHARED_HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">`;

const DEFAULT_TYPO = {
  fontFamily: "'Noto Serif KR', '맑은 명조', 'Batang', serif",
  fontSizePt: 10,
  lineHeightPt: 18,
  letterSpacingEm: -0.05,
  firstIndentMm: 3,
};

function bodyStyles(format, typo = DEFAULT_TYPO) {
  return `
@page { size: ${format.width} ${format.height}; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: ${typo.fontFamily};
  font-size: ${typo.fontSizePt}pt;
  line-height: ${typo.lineHeightPt}pt;
  letter-spacing: ${typo.letterSpacingEm}em;
  color: #111;
  word-break: keep-all;
  overflow-wrap: break-word;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}`;
}

export function buildTitlePageHtml({ format, title, author, typography }) {
  const formattedDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>${SHARED_HEAD}
<style>
${bodyStyles(format, typography)}
.title-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
  text-align: center;
}
.title-page .book-title {
  font-size: 2.6em;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.06em;
  line-height: 1.4;
}
.title-page .book-author {
  margin-top: 2.2em;
  font-size: 1.1em;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #333;
}
.title-page .book-date {
  margin-top: auto;
  padding-top: 4em;
  font-size: 0.9em;
  color: #666;
  letter-spacing: 0.05em;
}
</style>
</head>
<body>
<section class="title-page">
  <h1 class="book-title">${esc(title)}</h1>
  ${author ? `<div class="book-author">${esc(author)} 지음</div>` : ''}
  <div class="book-date">${esc(formattedDate)}</div>
</section>
</body>
</html>`;
}

function buildToc(tocItems) {
  if (!tocItems || tocItems.length === 0) return '';
  const items = tocItems
    .map((it) => {
      const pageSpan = it.matchedId
        ? `<span class="toc-page" data-target="${esc(it.matchedId)}">·</span>`
        : `<span class="toc-page toc-page-empty">&nbsp;</span>`;
      return `<li class="toc-item toc-level-${it.level}">
      <span class="toc-text">${esc(it.text)}</span>
      <span class="toc-dots" aria-hidden="true"></span>
      ${pageSpan}
    </li>`;
    })
    .join('\n');
  return `<section class="toc">
  <h1 class="toc-heading">목차</h1>
  <ul class="toc-list">
${items}
  </ul>
</section>`;
}

function buildColophon({ title, author }) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `<section class="colophon">
  <div class="colophon-rule"></div>
  <h2 class="colophon-title">${esc(title)}</h2>
  ${author ? `<p class="colophon-line"><strong>지은이</strong> ${esc(author)}</p>` : ''}
  <p class="colophon-line"><strong>펴낸날</strong> ${esc(today)}</p>
  <p class="colophon-line"><strong>제작</strong> bookmaker</p>
</section>`;
}

function mirrorPageRules(format, firstContentPageIsRecto) {
  const inner = format.margin.left;
  const outer = format.margin.right;
  const recto = `margin-left: ${inner}; margin-right: ${outer};`;
  const verso = `margin-left: ${outer}; margin-right: ${inner};`;
  return `
@page { margin-top: ${format.margin.top}; margin-bottom: ${format.margin.bottom}; }
@page :right { ${firstContentPageIsRecto ? recto : verso} }
@page :left { ${firstContentPageIsRecto ? verso : recto} }`;
}

export function buildContentHtml({
  html,
  format,
  title,
  author,
  tocItems,
  mirror = false,
  firstContentPageIsRecto = true,
  typography = DEFAULT_TYPO,
}) {
  const toc = buildToc(tocItems);
  const colophon = buildColophon({ title, author });
  const mirrorCss = mirror
    ? mirrorPageRules(format, firstContentPageIsRecto)
    : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>${SHARED_HEAD}
<style>
${bodyStyles(format, typography)}
${mirrorCss}
.toc {
  page-break-after: always;
  padding-top: 1em;
}
.toc-heading {
  font-size: 1.8em;
  font-weight: 700;
  text-align: center;
  margin: 0 0 2em 0;
  letter-spacing: 0.15em;
}
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.toc-item {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  margin-bottom: 0.7em;
  font-size: 1em;
}
.toc-item.toc-level-2 {
  margin-left: 1.5em;
  font-size: 0.95em;
  color: #444;
}
.toc-text { flex: 0 0 auto; }
.toc-dots {
  flex: 1 1 auto;
  border-bottom: 1px dotted #999;
  transform: translateY(-3px);
  min-width: 1em;
}
.toc-page {
  flex: 0 0 auto;
  min-width: 1.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.content h1 {
  font-size: 1.7em;
  font-weight: 700;
  margin: 0 0 1.4em 0;
  padding-top: 1em;
  text-align: center;
  letter-spacing: 0.05em;
  page-break-before: always;
  page-break-after: avoid;
}
.content h2 {
  font-size: 1.25em;
  font-weight: 700;
  margin: 1.8em 0 0.7em 0;
  page-break-after: avoid;
}
.content h3 {
  font-size: 1.08em;
  font-weight: 700;
  margin: 1.4em 0 0.4em 0;
  page-break-after: avoid;
}
.content p {
  margin: 0 0 0.3em 0;
  text-indent: ${typography.firstIndentMm}mm;
  text-align: justify;
  hyphens: auto;
  orphans: 2;
  widows: 2;
}
.content h1 + p,
.content h2 + p,
.content h3 + p,
.content blockquote + p,
.content hr + p,
.content ul + p,
.content ol + p {
  text-indent: 0;
}
.content blockquote {
  margin: 1em 1.5em;
  padding-left: 0.8em;
  border-left: 2px solid #999;
  color: #333;
  font-style: italic;
}
.content blockquote p { text-indent: 0; }
.content hr {
  border: 0;
  border-top: 1px solid #bbb;
  width: 30%;
  margin: 2em auto;
}
.content ul, .content ol {
  margin: 0.5em 0 0.5em 1.2em;
  padding-left: 0.5em;
}
.content li { margin-bottom: 0.2em; line-height: 1.7; }
.content code {
  font-family: 'Consolas', 'D2Coding', monospace;
  font-size: 0.9em;
  background: #f0f0f0;
  padding: 0 0.2em;
  border-radius: 2px;
}
.content pre {
  font-family: 'Consolas', 'D2Coding', monospace;
  font-size: 0.85em;
  background: #f5f5f5;
  padding: 0.8em;
  border-radius: 3px;
  white-space: pre-wrap;
  page-break-inside: avoid;
}
.content pre code { background: none; padding: 0; }
.content img { max-width: 100%; height: auto; }
.content strong { font-weight: 700; }
.content em { font-style: italic; }

.colophon {
  page-break-before: always;
  padding-top: 30vh;
  text-align: center;
  font-size: 0.95em;
  color: #333;
}
.colophon-rule {
  width: 40%;
  margin: 0 auto 2em auto;
  border-top: 1px solid #999;
}
.colophon-title {
  font-size: 1.3em;
  font-weight: 700;
  margin: 0 0 1.5em 0;
  letter-spacing: 0.05em;
}
.colophon-line {
  margin: 0.4em 0;
}
.colophon-line strong {
  display: inline-block;
  min-width: 4em;
  margin-right: 0.6em;
  font-weight: 500;
  color: #666;
}
</style>
</head>
<body>
${toc}
<section class="content">
${html}
</section>
${colophon}
</body>
</html>`;
}
