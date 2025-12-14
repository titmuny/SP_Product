/* Idempotent patch of the existing website. Runs every time the dashboard starts; changes nothing if already patched.
 * Backups of any file it changes go to local-admin/backups/. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LOADER_TAG = '<script src="public-catalog.js?v=sp2" defer></script>';
const CART_TAG = '<script src="cart.js?v=sp1" defer></script>';
const SCRIPT_VERSION = 'admin2';

function backup(root, file, text) {
  const dir = path.join(root, 'local-admin', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(dir, path.basename(file) + '.' + stamp + '.bak'), text, 'utf8');
}

function patchHtml(root, name, notes) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return;
  const original = fs.readFileSync(file, 'utf8');
  // home.html now forwards to index.html so both entry points share one homepage.
  if (name === 'home.html' && /window\.location\.replace\(['"]index\.html/.test(original)) {
    notes.push('Skipped home.html (it redirects to index.html).');
    return;
  }
  let html = original;
  const re = /<script src="script\.js(?:\?[^"]*)?"([^>]*)>\s*<\/script>/;
  if (!re.test(html)) throw new Error(name + ': could not find <script src="script.js" defer>.');
  const what = [];
  if (!html.includes('public-catalog.js')) { html = html.replace(re, (m) => LOADER_TAG + '\n    ' + m); what.push('public-catalog.js'); }
  if (!html.includes('cart.js')) { html = html.replace(re, (m) => m + '\n    ' + CART_TAG); what.push('cart.js'); }
  // new URL whenever script.js changes, so visitors do not keep an old cached copy
  html = html.replace(re, (m, attrs) => '<script src="script.js?v=' + SCRIPT_VERSION + '"' + attrs + '></script>');
  if (html !== original) {
    backup(root, file, original);
    fs.writeFileSync(file, html, 'utf8');
    notes.push('Patched ' + name + (what.length ? ' (added ' + what.join(', ') + ')' : ' (script version)') + '.');
  }
}

const CART_HOOK = [
  '// S90-ADMIN: cart hook (lets cart.js read what is selected in the quick view window)',
  'window.S90QuickView = {',
  '    getOrder: function () {',
  '        if (!currentInfo) return null;',
  '        var multi = currentInfo.options && currentInfo.options.length;',
  '        var lines = multi',
  '            ? getVisibleSelections().map(function (it) { return { label: it.label || \'Option\', price: it.price || \'Contact us\', qty: getSelectionQty(it) }; })',
  '            : (currentSelection ? [{ label: \'\', price: currentSelection.price || \'Contact us\', qty: currentQty }] : []);',
  '        return {',
  '            title: currentInfo.title,',
  '            sku: String(currentInfo.sku || \'\').replace(/^SKU:\\s*/i, \'\'),',
  '            imageRel: currentInfo.imageSrc || \'\',',
  '            lines: lines.filter(function (l) { return l.qty > 0; })',
  '        };',
  '    }',
  '};',
  ''
];

function patchScript(root, notes) {
  const file = path.join(root, 'script.js');
  const original = fs.readFileSync(file, 'utf8');
  let js = original;
  const eol = js.includes('\r\n') ? '\r\n' : '\n';

  if (!js.includes('S90-ADMIN: prefer data-category')) {
    const re = /(function getCategoryFromCard\(card\) \{)(\r?\n)(\s*)(const img = card\.querySelector\('img'\);)/;
    if (!re.test(js)) throw new Error('script.js: could not find getCategoryFromCard() — send me the file so I can adjust the patch.');
    js = js.replace(re, (m, a, nl, ind, d) =>
      a + nl + ind + '// S90-ADMIN: prefer data-category (used by dashboard-managed products)' + nl +
      ind + 'if (card.dataset && card.dataset.category) return card.dataset.category.trim();' + nl + ind + d);
    notes.push('Patched script.js (category lookup honours data-category).');
  }

  if (!js.includes('S90-ADMIN: cart hook')) {
    const re = /(\r?\n)([ \t]*)(cards\.forEach\(function \(card\) \{\s*card\.tabIndex = 0;)/;
    if (!re.test(js)) throw new Error('script.js: could not find the quick-view card loop — send me the file so I can adjust the cart patch.');
    js = js.replace(re, (m, nl, ind, rest) =>
      nl + CART_HOOK.map((l) => (l ? ind + l : l)).join(eol) + eol + ind + rest);
    notes.push('Patched script.js (cart hook).');
  }

  if (js !== original) { backup(root, file, original); fs.writeFileSync(file, js, 'utf8'); }
}

function patchSite(root) {
  const notes = [];
  patchScript(root, notes);
  patchHtml(root, 'index.html', notes);
  patchHtml(root, 'home.html', notes);
  if (!notes.length) notes.push('Website already patched.');
  return notes;
}
module.exports = { patchSite };
