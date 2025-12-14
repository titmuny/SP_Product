/* S90 Local Admin server — zero dependencies (Node.js 18+).
 * Runs ONLY on 127.0.0.1. Manages catalog.json + uploads/products and publishes via git. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const ADMIN_DIR = __dirname;
const PORT = Number(process.env.S90_ADMIN_PORT || 4177);
const HOST = '127.0.0.1';
const CATALOG_FILE = path.join(ROOT, 'catalog.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads', 'products');
const AUTH_FILE = path.join(ADMIN_DIR, '.admin-auth.json');
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const SESSION_MS = 8 * 60 * 60 * 1000;
const SKU_RE = /^[A-Za-z0-9._-]{1,40}$/;

/* ---------- small helpers ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch { return fallback; }
}
function writeJsonAtomic(file, data) {
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}
function ensureGitignoreLines(lines) {
  const f = path.join(ROOT, '.gitignore');
  let cur = '';
  try { cur = fs.readFileSync(f, 'utf8'); } catch {}
  const have = new Set(cur.split(/\r?\n/).map((l) => l.trim()));
  const add = lines.filter((l) => !have.has(l));
  if (add.length) {
    const sep = cur && !cur.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(f, cur + sep + add.join('\n') + '\n', 'utf8');
  }
}

/* ---------- catalog ---------- */
function loadCatalog() {
  const c = readJson(CATALOG_FILE, null) || {};
  if (!Array.isArray(c.products)) c.products = [];
  if (!c.overrides || typeof c.overrides !== 'object' || Array.isArray(c.overrides)) c.overrides = {};
  c.version = 1;
  return c;
}
function saveCatalog(c) {
  c.version = 1;
  c.updatedAt = nowIso();
  writeJsonAtomic(CATALOG_FILE, c);
}

/* ---------- parse the existing static site (categories + hard-coded products) ---------- */
let siteCache = null;
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function parseSite() {
  const cats = [];
  const seenCat = new Set();
  const products = [];
  for (const file of ['index.html', 'home.html']) {
    let html = '';
    try { html = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { continue; }
    const re = /<button[^>]*class="[^"]*category-filter[^"]*"[^>]*data-category="([^"]+)"[^>]*>([^<]+)</g;
    let m;
    while ((m = re.exec(html))) {
      const value = decodeEntities(m[1]).trim();
      if (!value || value === 'All' || seenCat.has(value)) continue;
      seenCat.add(value);
      cats.push({ value, label: decodeEntities(m[2]).trim() });
    }
    const parts = html.split(/<div class="card h-100 d-flex flex-column box(?: s90-square-card)?"/);
    for (let i = 1; i < parts.length; i++) {
      const blk = parts[i].slice(0, 30000);
      const sku = /SKU:\s*([^\s<|,;]+)/i.exec(blk);
      if (!sku) continue;
      const img = /<img[^>]*\ssrc="([^"]+)"/i.exec(blk);
      const title = /<h5[^>]*class="card-title[^"]*"[^>]*>([\s\S]*?)<\/h5>/i.exec(blk);
      const price = /Price:\s*([\s\S]*?)<\/p>/i.exec(blk);
      const src = img ? decodeEntities(img[1]) : '';
      const items = [];
      const ul = /<ul[^>]*class="[^"]*\bitems\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i.exec(blk);
      if (ul) {
        const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let lm;
        while ((lm = liRe.exec(ul[1]))) {
          const pm = /<b[^>]*class="[^"]*multi-price[^"]*"[^>]*>([\s\S]*?)<\/b>/i.exec(lm[1]);
          const strip = (t) => decodeEntities(t.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
          items.push({
            name: strip(lm[1].replace(/<b[^>]*class="[^"]*multi-price[^"]*"[^>]*>[\s\S]*?<\/b>/i, '')),
            price: pm ? strip(pm[1]).replace(/^=\s*/, '') : ''
          });
        }
      }
      products.push({
        items,
        sku: sku[1], page: file,
        name: title ? decodeEntities(title[1].replace(/<[^>]+>/g, '')).trim() : '',
        price: price ? decodeEntities(price[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() : '',
        image: src, folder: src.includes('/') ? src.split('/')[0] : '',
        category: src.includes('/') ? src.split('/')[0] : ''
      });
    }
  }
  // merge duplicates (same SKU on index + home)
  const bySku = new Map();
  for (const p of products) {
    const ex = bySku.get(p.sku);
    if (!ex) bySku.set(p.sku, { ...p, pages: [p.page], folders: p.folder ? [p.folder] : [] });
    else {
      if (!ex.pages.includes(p.page)) ex.pages.push(p.page);
      if (p.folder && !ex.folders.includes(p.folder)) ex.folders.push(p.folder);
    }
  }
  const list = Array.from(bySku.values()).map(({ page, folder, ...rest }) => rest);
  return { categories: cats, products: list };
}
function getSite(force) {
  if (!siteCache || force) siteCache = parseSite();
  return siteCache;
}

/* ---------- images ---------- */
function sniffImage(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 6 && buf.slice(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}
function saveImageFromDataUrl(dataUrl, sku) {
  const m = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, 'Invalid image data.');
  const buf = Buffer.from(m[1].replace(/\s+/g, ''), 'base64');
  if (!buf.length) throw new HttpError(400, 'Image is empty.');
  if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image is larger than 10 MB. Compress it first.');
  const ext = sniffImage(buf);
  if (!ext) throw new HttpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed.');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = sku.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36) + '.' + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return 'uploads/products/' + name;
}
function deleteImageIfUnused(rel, catalog) {
  if (!rel || !rel.startsWith('uploads/products/')) return;
  const used = catalog.products.some((p) => p.image === rel) ||
    Object.values(catalog.overrides).some((o) => o && o.image === rel);
  if (used) return;
  const full = path.resolve(ROOT, rel);
  if (full.startsWith(UPLOAD_DIR + path.sep)) { try { fs.unlinkSync(full); } catch {} }
}

/* ---------- validation ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const cleanText = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
function cleanPrice(v) {
  const s = String(v == null ? '' : v).replace(/[$,\s]/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) throw new HttpError(400, 'Price must be a number such as 5 or 5.50.');
  return Number(s).toFixed(2);
}
function cleanItems(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new HttpError(400, 'Sub-items must be a list.');
  if (v.length > 80) throw new HttpError(400, 'Too many sub-items (max 80).');
  const out = [];
  for (const it of v) {
    const name = cleanText(it && it.name, 200).replace(/[<>]/g, '');
    const price = cleanText(it && it.price, 30).replace(/[<>]/g, '');
    if (!name && !price) continue;            // ignore fully empty rows
    if (!name) throw new HttpError(400, 'Every sub-item needs a name.');
    out.push({ name, price });
  }
  return out;
}
function validCategory(value) {
  const ok = getSite().categories.some((c) => c.value === value);
  if (!ok) throw new HttpError(400, 'Unknown category. Pick one from the list.');
  return value;
}
function staticSkuExists(sku) { return getSite().products.some((p) => p.sku.toLowerCase() === sku.toLowerCase()); }

/* ---------- auth ---------- */
function initAuth() {
  let auth = readJson(AUTH_FILE, null);
  if (auth && auth.salt && auth.hash) return null;
  const password = crypto.randomBytes(9).toString('base64url');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ salt, hash, createdAt: nowIso() }, null, 2));
  return password;
}
function checkPassword(pw) {
  const auth = readJson(AUTH_FILE, null);
  if (!auth) return false;
  const a = crypto.scryptSync(String(pw || ''), auth.salt, 32);
  const b = Buffer.from(auth.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sessions = new Map();
let failCount = 0, lockedUntil = 0;
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function currentSession(req) {
  const tok = parseCookies(req).s90_admin;
  const s = tok && sessions.get(tok);
  if (!s) return null;
  if (Date.now() > s.exp) { sessions.delete(tok); return null; }
  return s;
}

/* ---------- git ---------- */
function git(args, timeout = 180000) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: ROOT, timeout, windowsHide: true, maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err && typeof err.code !== 'undefined' ? err.code : 0,
        out: String(stdout || '').trim(), err: String(stderr || '').trim(), missing: err && err.code === 'ENOENT' });
    });
  });
}
async function gitStatus() {
  const v = await git(['--version'], 15000);
  if (v.missing) return { ok: false, problem: 'Git is not installed (or not in PATH). Install Git for Windows, then restart the dashboard.' };
  const inside = await git(['rev-parse', '--is-inside-work-tree'], 15000);
  if (!inside.ok || inside.out !== 'true') return { ok: false, problem: 'This folder is not a Git repository (no .git folder). Copy the dashboard files into your cloned GitHub repository.' };
  const remote = await git(['remote', 'get-url', 'origin'], 15000);
  if (!remote.ok) return { ok: false, problem: 'No "origin" remote is configured for this repository.' };
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'], 15000);
  return { ok: true, remote: remote.out.replace(/\/\/[^@/]+@/, '//***@'), branch: branch.out };
}
const PUBLISH_PATHS = ['catalog.json', 'uploads', 'public-catalog.js', 'cart.js', 'script.js', 'index.html', 'home.html',
  'style.css', 'vercel.json', '.vercelignore', '.gitignore', 'start-local-admin.bat', 'local-admin'];
let publishing = false;
async function publish() {
  if (publishing) throw new HttpError(409, 'A publish is already running.');
  publishing = true;
  const log = [];
  try {
    const st = await gitStatus();
    if (!st.ok) return { ok: false, message: st.problem, log };
    const existing = PUBLISH_PATHS.filter((p) => fs.existsSync(path.join(ROOT, p)));
    const add = await git(['add', '-A', '--', ...existing]);
    log.push('$ git add ...' + (add.err ? '\n' + add.err : ''));
    if (!add.ok) return { ok: false, message: 'git add failed.', log: log.concat(add.err) };
    const diff = await git(['diff', '--cached', '--name-status']);
    if (!diff.out) {
      // maybe earlier commits are not pushed yet
      const ahead = await git(['status', '-sb']);
      if (/ahead \d+/.test(ahead.out)) log.push('Nothing new to commit, but earlier commits are waiting to be pushed.');
      else return { ok: true, message: 'Nothing to publish — no changes found.', log };
    } else {
      log.push(diff.out.split('\n').slice(0, 40).join('\n') + (diff.out.split('\n').length > 40 ? '\n...' : ''));
      const msg = 'S90 admin: update catalog ' + nowIso().slice(0, 16).replace('T', ' ');
      const commit = await git(['commit', '-m', msg]);
      log.push('$ git commit\n' + (commit.out || commit.err));
      if (!commit.ok) {
        const hint = /user\.(name|email)|unable to auto-detect|tell me who you are/i.test(commit.out + commit.err)
          ? ' Git does not know who you are. Run: git config --global user.name "Your Name"  and  git config --global user.email "you@example.com"' : '';
        return { ok: false, message: 'git commit failed.' + hint, log };
      }
    }
    const push = await git(['push']);
    log.push('$ git push\n' + (push.err || push.out));
    if (!push.ok) {
      let hint = 'git push failed.';
      if (/rejected|non-fast-forward|fetch first/i.test(push.err)) hint += ' GitHub has newer changes (for example from your other PC). Click "Sync from GitHub", then publish again.';
      else if (/authentication|denied|could not read|403|401|terminal prompts disabled/i.test(push.err)) hint += ' GitHub sign-in is not configured on this PC. Sign in once with Git Credential Manager, GitHub CLI (gh auth login) or SSH, then try again.';
      else if (/large|100 MB|exceeds/i.test(push.err)) hint += ' A file is too large for GitHub. Compress big images and try again.';
      return { ok: false, message: hint, log };
    }
    return { ok: true, message: 'Pushed to GitHub. Vercel should now start a new deployment — check Deployments in your Vercel project.', log };
  } finally { publishing = false; }
}
async function pull() {
  const st = await gitStatus();
  if (!st.ok) return { ok: false, message: st.problem, log: [] };
  const r = await git(['pull', '--rebase', '--autostash']);
  return { ok: r.ok, message: r.ok ? 'Synced from GitHub.' : 'git pull failed. Resolve it in a terminal (git status) and try again.', log: [r.out, r.err].filter(Boolean) };
}

/* ---------- API ---------- */
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large.');
    chunks.push(c);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}
function send(res, status, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const api = {
  async 'GET /api/state'() {
    const catalog = loadCatalog();
    const site = getSite();
    return { catalog, categories: site.categories, staticProducts: site.products, git: await gitStatus() };
  },
  async 'POST /api/refresh-site'() { getSite(true); return { ok: true }; },
  async 'POST /api/product'(b) {
    const catalog = loadCatalog();
    const sku = cleanText(b.sku, 40);
    if (!SKU_RE.test(sku)) throw new HttpError(400, 'SKU may only contain letters, numbers, dot, dash and underscore (max 40).');
    const orig = b.originalSku ? cleanText(b.originalSku, 40) : '';
    const idx = orig ? catalog.products.findIndex((p) => p.sku === orig) : -1;
    if (orig && idx < 0) throw new HttpError(404, 'Product not found.');
    if (catalog.products.some((p, i) => i !== idx && p.sku.toLowerCase() === sku.toLowerCase())) throw new HttpError(409, 'Another dashboard product already uses this SKU.');
    if (staticSkuExists(sku)) throw new HttpError(409, 'This SKU already exists on the original website. Use "Existing site products" to edit it.');
    const name = cleanText(b.name, 200);
    if (!name) throw new HttpError(400, 'Product name is required.');
    const category = validCategory(cleanText(b.category, 120));
    const items = cleanItems(b.items);
    const hasPrice = String(b.price == null ? '' : b.price).trim() !== '';
    if (!items.length && !hasPrice) throw new HttpError(400, 'Enter a price, or add at least one sub-item.');
    const price = hasPrice ? cleanPrice(b.price) : '';
    const prev = idx >= 0 ? catalog.products[idx] : null;
    let image = prev ? prev.image : '';
    if (b.imageData) { image = saveImageFromDataUrl(b.imageData, sku); }
    else if (!image) throw new HttpError(400, 'Please upload a product picture.');
    const rec = { sku, name, category, price, items, image, visible: b.visible !== false,
      createdAt: prev ? prev.createdAt : nowIso(), updatedAt: nowIso() };
    if (idx >= 0) catalog.products[idx] = rec; else catalog.products.push(rec);
    saveCatalog(catalog);
    if (prev && prev.image !== image) deleteImageIfUnused(prev.image, catalog);
    return { ok: true, product: rec };
  },
  async 'POST /api/product/delete'(b) {
    const catalog = loadCatalog();
    const sku = cleanText(b.sku, 40);
    const i = catalog.products.findIndex((p) => p.sku === sku);
    if (i < 0) throw new HttpError(404, 'Product not found.');
    const [gone] = catalog.products.splice(i, 1);
    saveCatalog(catalog);
    deleteImageIfUnused(gone.image, catalog);
    return { ok: true };
  },
  async 'POST /api/product/visibility'(b) {
    const catalog = loadCatalog();
    const p = catalog.products.find((x) => x.sku === cleanText(b.sku, 40));
    if (!p) throw new HttpError(404, 'Product not found.');
    p.visible = !!b.visible; p.updatedAt = nowIso();
    saveCatalog(catalog);
    return { ok: true };
  },
  async 'POST /api/override'(b) {
    const catalog = loadCatalog();
    const sku = cleanText(b.sku, 40);
    if (!staticSkuExists(sku)) throw new HttpError(404, 'That SKU is not on the original website. Check the exact SKU.');
    const prev = catalog.overrides[sku] || {};
    if (b.clear) {
      delete catalog.overrides[sku];
      saveCatalog(catalog);
      deleteImageIfUnused(prev.image, catalog);
      return { ok: true };
    }
    const o = { ...prev };
    if ('hidden' in b) o.hidden = !!b.hidden;
    if ('name' in b) { const n = cleanText(b.name, 200); if (n) o.name = n; else delete o.name; }
    if ('price' in b) { if (String(b.price).trim() === '') delete o.price; else o.price = cleanPrice(b.price); }
    if ('category' in b) { if (!b.category) delete o.category; else o.category = validCategory(cleanText(b.category, 120)); }
    if ('items' in b) { const it = cleanItems(b.items); if (it.length) o.items = it; else delete o.items; }
    if (b.imageData) o.image = saveImageFromDataUrl(b.imageData, sku);
    if (!o.hidden) delete o.hidden;
    o.updatedAt = nowIso();
    if (Object.keys(o).length <= 1) delete catalog.overrides[sku]; else catalog.overrides[sku] = o;
    saveCatalog(catalog);
    if (prev.image && prev.image !== o.image) deleteImageIfUnused(prev.image, catalog);
    return { ok: true, override: catalog.overrides[sku] || null };
  },
  async 'POST /api/publish'() { return publish(); },
  async 'POST /api/pull'() { return pull(); }
};

/* ---------- static serving (dashboard page + read-only image previews) ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveFile(res, file, extraHeaders = {}) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders });
    res.end(data);
  });
}
const PAGE_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'";

const server = http.createServer(async (req, res) => {
  try {
    const host = String(req.headers.host || '');
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { res.writeHead(403); return res.end('Forbidden'); }
    const url = new URL(req.url, 'http://' + host);
    const route = req.method + ' ' + url.pathname;

    if (route === 'GET /' || route === 'GET /local-admin.html') {
      return serveFile(res, path.join(ADMIN_DIR, 'local-admin.html'), { 'Content-Security-Policy': PAGE_CSP });
    }
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && origin !== 'http://' + host) throw new HttpError(403, 'Bad origin.');
        if (req.headers['x-s90-admin'] !== '1') throw new HttpError(403, 'Missing header.');
      }
      if (route === 'POST /api/login') {
        const b = await readBody(req);
        if (Date.now() < lockedUntil) throw new HttpError(429, 'Too many wrong attempts. Wait a minute and try again.');
        if (!checkPassword(b.password)) {
          await sleep(500);
          if (++failCount >= 5) { lockedUntil = Date.now() + 60000; failCount = 0; }
          throw new HttpError(401, 'Wrong password.');
        }
        failCount = 0;
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { exp: Date.now() + SESSION_MS });
        return send(res, 200, { ok: true }, { 'Set-Cookie': `s90_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` });
      }
      if (route === 'POST /api/logout') {
        const tok = parseCookies(req).s90_admin; if (tok) sessions.delete(tok);
        return send(res, 200, { ok: true }, { 'Set-Cookie': 's90_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }
      if (route === 'GET /api/session') return send(res, 200, { loggedIn: !!currentSession(req) });
      if (!currentSession(req)) throw new HttpError(401, 'Please log in.');
      const handler = api[route];
      if (!handler) throw new HttpError(404, 'Unknown API route.');
      const body = req.method === 'POST' ? await readBody(req) : {};
      return send(res, 200, await handler(body));
    }
    // read-only previews of site images (needs login)
    if (req.method === 'GET') {
      if (!currentSession(req)) { res.writeHead(401); return res.end('Login required'); }
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const full = path.resolve(ROOT, rel);
      const ext = path.extname(full).toLowerCase();
      const okExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
      const inRoot = full.startsWith(ROOT + path.sep);
      const bad = rel.split(/[\\/]/).some((seg) => seg.startsWith('.') || seg === 'node_modules' || seg === 'local-admin');
      if (okExt && inRoot && !bad) return serveFile(res, full);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { ok: false, error: e.message });
    console.error(e);
    send(res, 500, { ok: false, error: 'Unexpected server error. See the terminal window.' });
  }
});

/* ---------- start ---------- */
function start() {
  const { patchSite } = require('./patch-site.js');
  try { for (const line of patchSite(ROOT)) console.log('[site] ' + line); }
  catch (e) { console.error('[site] Could not patch the website files: ' + e.message); process.exit(1); }
  ensureGitignoreLines(['local-admin/.admin-auth.json', 'local-admin/backups/', 'catalog.json.tmp-*']);
  if (!fs.existsSync(CATALOG_FILE)) saveCatalog({ products: [], overrides: {} });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const firstPassword = initAuth();
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE'
      ? `Port ${PORT} is already in use. Is the dashboard already running in another window?`
      : String(e));
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    console.log('');
    if (firstPassword) console.log('S90 LOCAL ADMIN PASSWORD (save it): ' + firstPassword);
    else console.log('S90 LOCAL ADMIN: using the password generated the first time (stored hashed in local-admin\\.admin-auth.json).');
    console.log('S90 LOCAL ADMIN running at:');
    console.log(`http://${HOST}:${PORT}/local-admin.html`);
    console.log('\nKeep this window open. Press Ctrl+C to stop.');
  });
}
if (require.main === module) start();
module.exports = { server, loadCatalog };
