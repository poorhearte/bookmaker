import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { FORMATS } from './src/formats.js';
import { toHtml } from './src/convert.js';
import { htmlToPdf, shutdownBrowser } from './src/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, 'uploads');
await mkdir(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const app = express();
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

app.get('/api/formats', (_req, res) => {
  res.json(
    Object.entries(FORMATS).map(([id, f]) => ({
      id,
      name: f.name,
      width: f.width,
      height: f.height,
    })),
  );
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
  const content = (req.body.content || '').trim();
  const hasFile = !!req.file;
  const hasContent = content.length > 0;

  if (!hasFile && !hasContent) {
    return res.status(400).json({ error: '원고 파일 또는 직접 입력 내용이 필요해요' });
  }

  const formatId = req.body.format || 'sinkuk';
  const format = FORMATS[formatId];
  if (!format) {
    if (hasFile) await unlink(req.file.path).catch(() => {});
    return res.status(400).json({ error: `알 수 없는 책 포맷: ${formatId}` });
  }

  let sourceFile;
  let tempPath = null;
  if (hasFile) {
    sourceFile = req.file;
  } else {
    tempPath = join(UPLOAD_DIR, `${randomUUID()}.md`);
    await writeFile(tempPath, content, 'utf-8');
    sourceFile = { path: tempPath, originalname: 'manuscript.md' };
  }

  const baseName = sourceFile.originalname.replace(/\.[^.]+$/, '');
  const title = (req.body.title || '').trim() || (hasContent ? '제목 없음' : baseName);
  const author = (req.body.author || '').trim();

  try {
    const { html, headings } = await toHtml(sourceFile);
    const pdf = await htmlToPdf({ html, headings, format, title, author });
    const sanitize = (s) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
    const today = new Date().toISOString().slice(0, 10);
    const parts = [
      sanitize(title),
      author ? sanitize(author) : null,
      sanitize(format.name),
      today,
    ].filter(Boolean);
    const filename = `${parts.join('_')}_.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.end(pdf);
  } catch (err) {
    console.error('[convert] failed:', err);
    res.status(500).json({ error: err.message || '변환 실패' });
  } finally {
    if (hasFile) await unlink(req.file.path).catch(() => {});
    if (tempPath) await unlink(tempPath).catch(() => {});
  }
});

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, () => {
  console.log(`bookmaker listening at http://localhost:${PORT}`);
});

const shutdown = async () => {
  console.log('\nshutting down...');
  await new Promise((r) => server.close(r));
  await shutdownBrowser();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
