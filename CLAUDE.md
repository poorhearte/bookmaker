# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bookmaker is a small Express server that converts a user-uploaded manuscript (`.md`, `.txt`, or `.docx`) into a print-ready Korean book PDF. The UI is Korean-language; user-facing error strings should remain Korean.

## Commands

- `npm start` — run the server (`server.js`) on `PORT` (default `3000`).
- `npm run dev` — same, with `node --watch` auto-reload.

There is no test suite, linter, or build step. Verify changes by running the server and POSTing a file to `/api/convert`, or by using the web UI at `http://localhost:3000`.

## Architecture

The request flow is a straight pipeline; each `src/` module owns one stage:

1. **`server.js`** — Express app. Serves `public/` statically. Two endpoints:
   - `GET /api/formats` — lists available book sizes from [src/formats.js](src/formats.js).
   - `POST /api/convert` — multipart upload (`multer`, 20 MB cap, files land in `uploads/`), runs the pipeline, streams the PDF back, and unlinks the upload in `finally`. Lifecycle: registers `SIGINT`/`SIGTERM` handlers that call `shutdownBrowser()` to close the shared Puppeteer instance.

2. **[src/convert.js](src/convert.js)** — `toHtml(file)` dispatches on the file extension: `marked` for Markdown, a custom `wrapPlainText` (paragraphs split on blank lines, `\n` → `<br>`, HTML-escaped) for `.txt`, and `mammoth.convertToHtml` for `.docx`. Output is a raw HTML fragment, **not** a full document.

3. **[src/template.js](src/template.js)** — `buildBookHtml({ html, format, title })` wraps the fragment into a full HTML document with a `<style>` block tuned for print: `@page` size from the format, `Noto Serif KR` via Google Fonts, justified Korean body with `word-break: keep-all`, first-paragraph-indent suppression after headings/blockquotes/hr/lists, page-break rules on `h1` (`page-break-before: always`, except the first), and a title page section.

4. **[src/render.js](src/render.js)** — `htmlToPdf` reuses a single lazily-launched headless Chromium (`browserPromise`); each request gets its own `page`. It uses `waitUntil: 'networkidle0'` so Google Fonts finish loading before snapshot. Page size comes from `format.{width,height,margin}`; page numbers are rendered via Puppeteer's `footerTemplate` (`displayHeaderFooter: true`).

5. **[src/formats.js](src/formats.js)** — the `FORMATS` registry (Korean book sizes: 신국판, 46판, A5, 크라운판, 국배판). Each entry has `name`, `width`, `height`, `margin`, `bodyFontSize`. Adding a format here is automatically picked up by both the API and the dropdown in [public/index.html](public/index.html).

## Things to know when editing

- **Print CSS is fragile.** The body styles in `template.js` are tuned for Korean typography (justified text, no-break inside Hangul words, suppressed first-line indents after structural elements). Changes there directly affect every output PDF — verify by generating one.
- **Puppeteer is a singleton.** `getBrowser()` in `render.js` caches the browser across requests. Do not call `browser.close()` per request; only `shutdownBrowser()` on process exit.
- **No font embedding control.** Fonts are loaded from Google Fonts over the network at render time. Offline rendering will produce fallback fonts.
- **`mammoth` strips most styling** from `.docx`; only basic structure (headings, paragraphs, lists, blockquotes, bold/italic) survives — the print CSS then restyles it.
- **Uploads are ephemeral** — always cleaned up in the `finally` block of `/api/convert`. Don't rely on the upload path beyond the request scope.
