import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { buildTitlePageHtml, buildContentHtml } from './template.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

export async function shutdownBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

async function renderTitlePage(browser, { format, title, author }) {
  const page = await browser.newPage();
  try {
    const html = buildTitlePageHtml({ format, title, author });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
    return await page.pdf({
      width: format.width,
      height: format.height,
      margin: format.margin,
      printBackground: true,
      preferCSSPageSize: false,
    });
  } finally {
    await page.close();
  }
}

async function fillTocPageNumbers(page, format) {
  const mmToPx = 96 / 25.4;
  const mm = (v) => parseFloat(v) * mmToPx;
  const pageContentHeight =
    mm(format.height) - mm(format.margin.top) - mm(format.margin.bottom);

  const measurements = await page.evaluate(() => {
    const tocItems = document.querySelectorAll('.toc-page[data-target]');
    const targetIds = Array.from(tocItems).map((el) => el.dataset.target);
    const tocSection = document.querySelector('.toc');
    const tocBottom = tocSection ? tocSection.getBoundingClientRect().bottom : 0;
    return targetIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return { id, top: null, tocBottom };
      const top = el.getBoundingClientRect().top + window.scrollY;
      return { id, top, tocBottom };
    });
  });

  const tocBottomPx = measurements[0]?.tocBottom ?? 0;
  const tocPageCount = Math.max(1, Math.ceil(tocBottomPx / pageContentHeight));
  const contentOffset = tocPageCount;

  const pageMap = {};
  for (const m of measurements) {
    if (m.top == null) {
      pageMap[m.id] = '';
      continue;
    }
    const flowPage = Math.floor(m.top / pageContentHeight) + 1;
    pageMap[m.id] = flowPage - contentOffset;
  }

  await page.evaluate((pm) => {
    for (const [id, pageNum] of Object.entries(pm)) {
      const el = document.querySelector(`.toc-page[data-target="${id}"]`);
      if (el) el.textContent = String(pageNum);
    }
  }, pageMap);
}

async function renderContent(browser, { html, format, title, author, tocItems }) {
  const page = await browser.newPage();
  try {
    const fullHtml = buildContentHtml({ html, format, title, author, tocItems });
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60_000 });

    const hasMatched = tocItems && tocItems.some((it) => it.matchedId);
    if (hasMatched) {
      await fillTocPageNumbers(page, format);
    }

    return await page.pdf({
      width: format.width,
      height: format.height,
      margin: format.margin,
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;padding:0 ${format.margin.right} 0 ${format.margin.left};font-size:8.5pt;color:#888;font-family:'Noto Serif KR',serif;text-align:center;letter-spacing:0.05em;">
        ${esc(title)}
      </div>`,
      footerTemplate: `<div style="width:100%;text-align:center;font-size:9pt;color:#777;font-family:'Noto Serif KR',serif;">
        <span class="pageNumber"></span>
      </div>`,
    });
  } finally {
    await page.close();
  }
}

async function mergePdfs(pdfBuffers) {
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const doc = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  const out = await merged.save();
  return Buffer.from(out);
}

export async function htmlToPdf({ html, tocItems, format, title, author }) {
  const browser = await getBrowser();
  const [titlePdf, contentPdf] = await Promise.all([
    renderTitlePage(browser, { format, title, author }),
    renderContent(browser, { html, format, title, author, tocItems }),
  ]);
  return await mergePdfs([titlePdf, contentPdf]);
}
