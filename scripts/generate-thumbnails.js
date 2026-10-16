// Creates a 600x600 .webp thumbnail (transparent background) for every .glb in /server/uploads/models.
// It serves a small three.js page (thumbnail-viewer.html) on a local port, opens it in
// headless Chrome with Puppeteer, and screenshots the rendered model.
// Output: /server/uploads/thumbnails/<model name>.webp  (existing thumbnails are overwritten)
//
// Usage (from the repo root):  npm run models:thumbnails
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer';

const ROOT = path.join(import.meta.dirname, '..');
const MODELS_DIR = path.join(ROOT, 'server', 'uploads', 'models');
const THUMBNAILS_DIR = path.join(ROOT, 'server', 'uploads', 'thumbnails');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const VIEWER_FILE = path.join(import.meta.dirname, 'thumbnail-viewer.html');

const SIZE = 600;
const WEBP_QUALITY = 85;
const RENDER_TIMEOUT_MS = 60_000;

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
};

// URL prefix -> folder on disk
const ROUTES = [
  ['/three/', THREE_DIR],
  ['/models/', MODELS_DIR],
];

// Tiny static file server for the viewer page, three.js and the models
const createServer = () =>
  http.createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filePath = url === '/' ? VIEWER_FILE : null;

    for (const [prefix, folder] of ROUTES) {
      if (url.startsWith(prefix)) {
        const resolved = path.resolve(folder, url.slice(prefix.length));
        if (resolved.startsWith(folder + path.sep)) filePath = resolved; // never serve outside the folder
      }
    }

    try {
      if (!filePath) throw new Error('not found');
      const body = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });

const main = async () => {
  const models = (await fs.readdir(MODELS_DIR)).filter((file) => file.toLowerCase().endsWith('.glb'));
  if (models.length === 0) {
    console.log('No .glb files in server/uploads/models - run npm run models:optimize first.');
    return;
  }
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });

  // Port 0 = let the operating system pick any free port
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await puppeteer.launch({
    // Software WebGL, so it also works on machines without a usable GPU
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const failed = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });

    for (const model of models) {
      process.stdout.write(`Rendering ${model} ... `);
      try {
        await page.goto(`${baseUrl}/?model=${encodeURIComponent(model)}`);
        // The page sets window.renderStatus once the model is drawn (or loading failed)
        await page.waitForFunction(() => window.renderStatus, { timeout: RENDER_TIMEOUT_MS });
        const status = await page.evaluate(() => window.renderStatus);
        if (status !== 'ok') throw new Error(status);

        const output = path.join(THUMBNAILS_DIR, `${path.parse(model).name}.webp`);
        await page.screenshot({ path: output, type: 'webp', quality: WEBP_QUALITY, omitBackground: true });
        const { size } = await fs.stat(output);
        console.log(`saved (${(size / 1024).toFixed(0)} KB)`);
      } catch (error) {
        console.log('FAILED');
        failed.push({ model, error: error.message });
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${models.length - failed.length} of ${models.length} thumbnail(s) saved to server/uploads/thumbnails.`);
  if (failed.length > 0) {
    failed.forEach(({ model, error }) => console.log(`  - ${model}: ${error}`));
    process.exitCode = 1;
  }
};

await main();
