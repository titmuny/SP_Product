/* Idempotent patch of the existing website. Runs every time the dashboard starts; changes nothing if already patched.
 * Backups of any file it changes go to local-admin/backups/. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LOADER_TAG = '<script src="public-catalog.js?v=1" defer></script>';
const CART_TAG = '<script src="cart.js?v=1" defer></script>';
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
  const head = original.slice(0, original.toLowerCase().indexOf('</head>'));
  const tags = [];
  if (!head.includes('public-catalog.js')) tags.push(LOADER_TAG);
  if (!head.includes('cart.js')) tags.push(CART_TAG);
  if (!tags.length) return;
  const html = original.replace(/<\/head>/i, '    ' + tags.join('\n    ') + '\n</head>');
  backup(root, file, original);
  fs.writeFileSync(file, html, 'utf8');
  notes.push('Patched ' + name + ' (added ' + tags.join(' and ') + ').');
}
const CART_HOOK = [
  'window.S90QuickView = {',
  '    getOrder: function () {',
  '        if (!currentInfo) return null;',
  '        var multi = currentInfo.options && currentInfo.options.length;',
  '        var lines = multi ? getVisibleSelections().map(function (it) { return { label: it.label || \'Option\', price: it.price || \'Contact us\', qty: getSelectionQty(it) }; }) : (currentSelection ? [{ label: \'\', price: currentSelection.price || \'Contact us\', qty: currentQty }] : []);',
  '        return { title: currentInfo.title, sku: String(currentInfo.sku || \'\').replace(/^SKU:\\s*/i, \'\'), imageRel: currentInfo.imageSrc || \'\', lines: lines.filter(function (l) { return l.qty > 0; }) };',
  '    }',
  '};'
];

function patchScript(root, notes) {
  const files = ['index.html', 'home.html'];
  for (const name of files) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const original = fs.readFileSync(file, 'utf8');
    let html = original;
    if (!html.includes('card.dataset && card.dataset.category')) {
      html = html.replace(/(function getCategoryFromCard\(card\) \{)(\r?\n)([ \t]*)/, '$1$2$3if (card.dataset && card.dataset.category) return card.dataset.category.trim();$2$3');
    }
    if (!html.includes('window.S90QuickView')) {
      const order = html.indexOf('orderBtn.addEventListener');
      const loop = html.indexOf('cards.forEach(function (card) {', order);
      if (loop >= 0) html = html.slice(0, loop) + CART_HOOK.join('\n') + '\n\n            ' + html.slice(loop);
    }
    if (html !== original) { backup(root, file, original); fs.writeFileSync(file, html, 'utf8'); notes.push('Patched ' + name + ' (category and cart hooks).'); }
  }
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
