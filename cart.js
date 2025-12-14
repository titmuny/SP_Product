/* S90 shopping cart.
 * - "Add to Cart" button next to "Order Now" in the product quick-view window
 * - floating cart button (above the Facebook button) that opens the cart: see items, change qty, remove,
 *   and send the whole order to Telegram with one "Order Now"
 * The cart is remembered in the visitor's browser (localStorage) and is shared by index.html and home.html. */
(function () {
  'use strict';
  var STORAGE_KEY = 's90_cart_v1';
  var TELEGRAM_USER = 'simplyshoppingKH_1';
  var items = load();

  /* ---------- storage ---------- */
  function valid(x) { return x && typeof x.sku === 'string' && typeof x.title === 'string' && x.qty > 0; }
  function load() {
    try {
      var j = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(j) ? j.filter(valid) : [];
    } catch (e) { return []; }
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* private mode */ } }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // "$2.50", "2.5", "$1,200" are real prices; "$1x.xx" or "Contact us" are not
  function isNum(p) { return /^\$?\s*\d[\d,]*(\.\d+)?$/.test(String(p || '').trim()); }
  function val(p) { return Number(String(p).replace(/[$,\s]/g, '')); }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function lineTotalText(it) { return isNum(it.price) ? money(val(it.price) * it.qty) : (it.price || 'Contact us'); }
  function totals() {
    var qty = 0, sum = 0, unknown = 0;
    items.forEach(function (it) {
      qty += it.qty;
      if (isNum(it.price)) sum += val(it.price) * it.qty; else unknown += 1;
    });
    return { qty: qty, sum: sum, unknown: unknown };
  }
  function keyOf(it) { return it.sku + '||' + (it.label || ''); }

  /* ---------- cart operations ---------- */
  function addOrder(order) {
    order.lines.forEach(function (ln) {
      var rec = { sku: order.sku || 'N/A', title: order.title, label: ln.label || '', price: ln.price || 'Contact us',
        qty: Math.max(1, Math.floor(ln.qty)), image: order.imageRel || '' };
      var ex = items.filter(function (x) { return keyOf(x) === keyOf(rec); })[0];
      if (ex) { ex.qty += rec.qty; ex.price = rec.price; } else items.push(rec);
    });
    save(); render();
  }

  /* ---------- Telegram ---------- */
  function buildOrderText() {
    var t = totals(), lines = ['Order Summary', ''];
    var groups = [], map = {};
    items.forEach(function (it) {
      var g = map[it.sku + '||' + it.title];
      if (!g) { g = map[it.sku + '||' + it.title] = { title: it.title, sku: it.sku, rows: [] }; groups.push(g); }
      g.rows.push(it);
    });
    groups.forEach(function (g, i) {
      lines.push((i + 1) + '. ' + g.title);
      lines.push('   SKU: ' + g.sku);
      g.rows.forEach(function (it) {
        lines.push('   - ' + (it.label ? it.label + ' | ' : '') + 'Qty: ' + it.qty + ' | Total: ' + lineTotalText(it));
      });
      lines.push('');
    });
    lines.push('Total Qty: ' + t.qty);
    lines.push('Grand Total: ' + money(t.sum) + (t.unknown ? ' + ' + t.unknown + ' item(s) to confirm price' : ''));
    return lines.join('\n');
  }
  function isMobile() {
    return window.matchMedia('(max-width: 767.98px)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }
  function openTelegram(text) {
    var enc = encodeURIComponent(text);
    var web = 'https://t.me/' + TELEGRAM_USER + '?text=' + enc;
    var app = 'tg://resolve?domain=' + TELEGRAM_USER + '&text=' + enc;
    if (isMobile()) {
      var timer = window.setTimeout(function () { window.location.href = web; }, 900);
      window.location.href = app;
      window.setTimeout(function () { window.clearTimeout(timer); }, 1200);
    } else {
      window.open(web, '_blank', 'noopener');
    }
  }
  function sendOrder() {
    if (!items.length) return;
    var text = buildOrderText();
    if (text.length > 3500) {
      // Telegram messages are limited in size: copy the full order and open the chat with a short note.
      var done = function () {
        alert('Your order is long, so it was copied. Paste it into the Telegram chat and press send.');
        openTelegram('Order from website — please paste your copied order here.');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { openTelegram(text.slice(0, 3500)); });
      else openTelegram(text.slice(0, 3500));
      return;
    }
    openTelegram(text);
  }

  /* ---------- UI ---------- */
  var fab, badge, overlay, bodyEl, footEl, countEl, toastEl, toastTimer, mobileCartBadge;

  function injectStyle() {
    var css = [
      '.s90-cart-fab{position:fixed;right:20px;bottom:300px;z-index:99;width:50px;height:50px;border:none;border-radius:50%;background:linear-gradient(135deg,#ff9f1a,#f57c00);color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
      '@media(max-width:991.98px){.s90-cart-fab{right:max(12px,env(safe-area-inset-right));bottom:176px;width:40px;height:40px;font-size:20px}body:has(#homeBtn) .s90-cart-fab{bottom:228px}}',
      '.s90-cart-fab.bump{animation:s90bump .5s}@keyframes s90bump{30%{transform:scale(1.25)}60%{transform:scale(.92)}}',
      '.s90-cart-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#d32f2f;color:#fff;font:700 12px/20px Arial,sans-serif;text-align:center}',
      '.s90-cart-overlay{position:fixed;inset:0;z-index:1070;background:rgba(0,0,0,.5);display:flex;justify-content:flex-end}',
      '.s90-cart-overlay[hidden]{display:none}',
      '.s90-cart-panel{background:#fff;width:min(440px,100%);height:100%;display:flex;flex-direction:column;box-shadow:-4px 0 16px rgba(0,0,0,.25)}',
      '.s90-cart-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e3e6ec;font-size:18px;color:#0d47c9}',
      '.s90-cart-x{border:none;background:none;font-size:22px;cursor:pointer;color:#555;line-height:1}',
      '.s90-cart-body{flex:1;overflow:auto;padding:10px 14px}',
      '.s90-cart-empty{text-align:center;color:#667085;padding:40px 10px}',
      '.s90-cart-item{display:grid;grid-template-columns:56px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid #eef0f4}',
      '.s90-cart-item img{width:56px;height:56px;object-fit:contain;background:#f4f5f7;border-radius:6px}',
      '.s90-cart-title{font-weight:600;color:#0d47c9;line-height:1.3}',
      '.s90-cart-meta{font-size:13px;color:#555}',
      '.s90-cart-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}',
      '.s90-cart-qty{display:inline-flex;align-items:center;border:1px solid #cfd8ea;border-radius:20px;overflow:hidden}',
      '.s90-cart-qty button{border:none;background:#fff;color:#0d6efd;width:30px;height:28px;font-size:18px;cursor:pointer}',
      '.s90-cart-qty span{min-width:28px;text-align:center;font-weight:700}',
      '.s90-cart-line{font-weight:700;color:#d32f2f;white-space:nowrap}',
      '.s90-cart-del{border:none;background:none;color:#c62828;cursor:pointer;font-size:18px}',
      '.s90-cart-foot{border-top:1px solid #e3e6ec;padding:12px 16px;background:#f8fafd}',
      '.s90-cart-sum{display:flex;justify-content:space-between;margin-bottom:4px}',
      '.s90-cart-sum.big{font-weight:700;font-size:18px;color:#d32f2f}',
      '.s90-cart-note{font-size:12px;color:#a15c00;margin-bottom:6px}',
      '.s90-cart-actions{display:flex;gap:8px;margin-top:10px}',
      '.s90-cart-order{flex:1;border:none;border-radius:8px;background:#0b5ed7;color:#fff;font-weight:600;padding:10px;cursor:pointer}',
      '.s90-cart-order:disabled{opacity:.5;cursor:not-allowed}',
      '.s90-cart-clear{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:10px 14px;cursor:pointer;color:#444}',
      '.s90-cart-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:1080;background:#222;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .25s}',
      '.s90-cart-toast.on{opacity:.95}'
    ].join('');
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  function build() {
    injectStyle();
    fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 's90CartFab';
    fab.className = 's90-cart-fab';
    fab.setAttribute('aria-label', 'Open cart');
    fab.title = 'View cart';
    fab.innerHTML = '<i class="bi bi-cart3"></i><span class="s90-cart-badge">0</span>';
    badge = fab.querySelector('.s90-cart-badge');
    document.body.appendChild(fab);

    document.querySelectorAll('[data-s90-cart-open]').forEach(function (button) {
      mobileCartBadge = document.createElement('span');
      mobileCartBadge.className = 's90-cart-badge';
      mobileCartBadge.hidden = true;
      button.appendChild(mobileCartBadge);
      button.addEventListener('click', openCart);
    });

    overlay = document.createElement('div');
    overlay.id = 's90CartOverlay';
    overlay.className = 's90-cart-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="s90-cart-panel" role="dialog" aria-modal="true" aria-label="Your cart">' +
      '<div class="s90-cart-head"><span><i class="bi bi-cart3"></i> Your Cart <small id="s90CartCount"></small></span>' +
      '<button type="button" class="s90-cart-x" data-act="close" aria-label="Close">&times;</button></div>' +
      '<div class="s90-cart-body" id="s90CartBody"></div>' +
      '<div class="s90-cart-foot" id="s90CartFoot"></div></div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector('#s90CartBody');
    footEl = overlay.querySelector('#s90CartFoot');
    countEl = overlay.querySelector('#s90CartCount');

    toastEl = document.createElement('div');
    toastEl.className = 's90-cart-toast';
    document.body.appendChild(toastEl);

    fab.addEventListener('click', openCart);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) return closeCart();
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act'), i = Number(b.getAttribute('data-i'));
      if (act === 'close') closeCart();
      else if (act === 'plus' && items[i]) { items[i].qty += 1; save(); render(); }
      else if (act === 'minus' && items[i]) { items[i].qty = Math.max(1, items[i].qty - 1); save(); render(); }
      else if (act === 'del' && items[i]) { items.splice(i, 1); save(); render(); }
      else if (act === 'clear') { if (items.length && confirm('Remove all items from the cart?')) { items = []; save(); render(); } }
      else if (act === 'order') sendOrder();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeCart(); });
    window.addEventListener('storage', function (e) { if (e.key === STORAGE_KEY) { items = load(); render(); } });
    render();
  }

  function render() {
    if (!fab) return;
    var t = totals();
    badge.textContent = t.qty > 99 ? '99+' : String(t.qty);
    badge.style.display = t.qty ? '' : 'none';
    if (mobileCartBadge) {
      mobileCartBadge.textContent = t.qty > 99 ? '99+' : String(t.qty);
      mobileCartBadge.hidden = !t.qty;
    }
    countEl.textContent = t.qty ? '(' + t.qty + ')' : '';
    if (!items.length) {
      bodyEl.innerHTML = '<div class="s90-cart-empty"><i class="bi bi-cart3" style="font-size:40px"></i><p>Your cart is empty.<br>Open a product and press <b>Add to Cart</b>.</p></div>';
    } else {
      bodyEl.innerHTML = items.map(function (it, i) {
        return '<div class="s90-cart-item">' +
          (it.image ? '<img src="' + esc(it.image) + '" alt="" loading="lazy">' : '<div></div>') +
          '<div><div class="s90-cart-title">' + esc(it.title) + '</div>' +
          '<div class="s90-cart-meta">SKU: ' + esc(it.sku) + (it.label ? ' · ' + esc(it.label) : '') + '</div>' +
          '<div class="s90-cart-meta">Price: ' + esc(isNum(it.price) ? money(val(it.price)) : it.price) + '</div>' +
          '<div class="s90-cart-row"><span class="s90-cart-qty">' +
          '<button type="button" data-act="minus" data-i="' + i + '" aria-label="Decrease quantity">-</button><span>' + it.qty + '</span>' +
          '<button type="button" data-act="plus" data-i="' + i + '" aria-label="Increase quantity">+</button></span>' +
          '<span class="s90-cart-line">' + esc(lineTotalText(it)) + '</span>' +
          '<button type="button" class="s90-cart-del" data-act="del" data-i="' + i + '" aria-label="Remove item"><i class="bi bi-trash"></i></button></div></div></div>';
      }).join('');
    }
    footEl.innerHTML =
      (t.unknown ? '<div class="s90-cart-note">' + t.unknown + ' item(s) have no fixed price — we will confirm it with you.</div>' : '') +
      '<div class="s90-cart-sum"><span>Total Qty</span><span>' + t.qty + '</span></div>' +
      '<div class="s90-cart-sum big"><span>Total</span><span>' + money(t.sum) + '</span></div>' +
      '<div class="s90-cart-actions"><button type="button" class="s90-cart-clear" data-act="clear"' + (items.length ? '' : ' disabled') + '>Clear</button>' +
      '<button type="button" class="s90-cart-order" data-act="order"' + (items.length ? '' : ' disabled') + '><i class="bi bi-telegram"></i> Order Now</button></div>';
  }

  function openCart() { overlay.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeCart() { overlay.hidden = true; document.body.style.overflow = ''; }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
    fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
  }

  /* ---------- "Add to Cart" button inside the quick-view window ---------- */
  function injectAddButton() {
    var modalEl = document.getElementById('productQuickViewModal');
    if (!modalEl || modalEl.querySelector('#quickViewAddCartBtn')) return;
    var orderBtn = modalEl.querySelector('#quickViewOrderBtn');
    if (!orderBtn || !orderBtn.parentNode) return;
    var wrap = document.createElement('div');
    wrap.className = 'd-flex flex-wrap gap-2';
    orderBtn.parentNode.insertBefore(wrap, orderBtn);
    wrap.appendChild(orderBtn);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'quickViewAddCartBtn';
    btn.className = 'btn btn-outline-primary fw-semibold';
    btn.innerHTML = '<i class="bi bi-cart-plus"></i> <span>Add to Cart</span>';
    wrap.appendChild(btn);
    btn.addEventListener('click', function () {
      var order = window.S90QuickView && window.S90QuickView.getOrder && window.S90QuickView.getOrder();
      if (!order || !order.lines.length) { alert('Please add at least 1 item before adding to cart.'); return; }
      addOrder(order);
      try {
        var inst = window.bootstrap && window.bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      } catch (e) { /* ignore */ }
      toast('Added to cart (' + totals().qty + ' item' + (totals().qty === 1 ? '' : 's') + ')');
    });
  }

  function init() {
    build();
    injectAddButton();
    document.addEventListener('show.bs.modal', injectAddButton);
    window.S90Cart = { open: openCart, count: function () { return totals().qty; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
