/* Centralized behavior for the SP pages. */

/* index page: analytics, navigation, product interactions, and responsive behavior. */
if (document.body.dataset.page === 'index') {
    (() => {
        (function () {
            const GA_ID = 'G-M0RPJXHL0D';
            let gaLoaded = false;

            function loadGA() {
                if (gaLoaded) return;
                gaLoaded = true;

                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
                document.head.appendChild(script);

                window.dataLayer = window.dataLayer || [];
                window.gtag = function () { dataLayer.push(arguments); };
                gtag('js', new Date());
                gtag('config', GA_ID, { anonymize_ip: true });
            }

            ['pointerdown', 'keydown', 'scroll'].forEach(function (eventName) {
                window.addEventListener(eventName, loadGA, { once: true, passive: true });
            });
        })();
    })();

    (() => {
        document.addEventListener('DOMContentLoaded', function () {
            const carousel = document.querySelector('#carouselExampleIndicators');
            new bootstrap.Carousel(carousel, {
                interval: 3000, // Auto-slide every 3 seconds
                ride: 'carousel'
            });
        });
    })();

    (() => {
        // Already in HTML, so just reference
        const goToBottomBtnEl = document.getElementById("goToBottomBtn");
        goToBottomBtnEl.style.opacity = 0;
        goToBottomBtnEl.style.transition = "opacity 0.4s";

        let lastScrollTopBottom = 0;
        let hideBottomBtnTimeout = null;

        window.addEventListener('scroll', function () {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;

            // Hide goToBottomBtn while scrolling down
            if (scrollTop > lastScrollTopBottom) {
                goToBottomBtnEl.style.opacity = 0;
                goToBottomBtnEl.addEventListener('transitionend', function handler() {
                    if (goToBottomBtnEl.style.opacity == 0) {
                        goToBottomBtnEl.style.display = "none";
                    }
                    goToBottomBtnEl.removeEventListener('transitionend', handler);
                });
                lastScrollTopBottom = scrollTop;
                return;
            }

            // Show go to bottom button if not at bottom and not scrolling down
            if (scrollTop + clientHeight < scrollHeight - 20) {
                goToBottomBtnEl.style.display = "block";
                setTimeout(() => {
                    goToBottomBtnEl.style.opacity = 1;
                }, 10);
            } else {
                goToBottomBtnEl.style.opacity = 0;
                goToBottomBtnEl.addEventListener('transitionend', function handler() {
                    if (goToBottomBtnEl.style.opacity == 0) {
                        goToBottomBtnEl.style.display = "none";
                    }
                    goToBottomBtnEl.removeEventListener('transitionend', handler);
                });
            }
            lastScrollTopBottom = scrollTop;
        });

        function scrollToBottom() {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
        window.scrollToBottom = scrollToBottom;
    })();

    (() => {
        let lastScrollTop = 0;
        const goToTopBtn = document.getElementById("goToTopBtn");

        // Initialize opacity and transition
        goToTopBtn.style.opacity = 0;
        goToTopBtn.style.transition = "opacity 0.4s";

        window.onscroll = function () {
            const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

            if (currentScrollTop > 20 && currentScrollTop > lastScrollTop) {
                goToTopBtn.style.display = "block";
                setTimeout(() => {
                    goToTopBtn.style.opacity = 1;
                }, 10);
            } else {
                goToTopBtn.style.opacity = 0;
                goToTopBtn.addEventListener('transitionend', function handler() {
                    if (goToTopBtn.style.opacity == 0) {
                        goToTopBtn.style.display = "none";
                    }
                    goToTopBtn.removeEventListener('transitionend', handler);
                });
            }

            lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
        };

        // Scroll to the top of the document when the button is clicked
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollToTop = scrollToTop;
    })();

    (() => {
        const desktopInput = document.getElementById('navbarSearchDesktop');
        const mobileInput = document.getElementById('navbarSearchMobile');

        // Helper to get active input (visible one)
        function getActiveInput() {
            if (window.getComputedStyle(desktopInput.closest('form')).display !== 'none') {
                return desktopInput;
            } else {
                return mobileInput;
            }
        }

        // Main search handler
        function handleSearch(event) {
            event.preventDefault();
            const input = getActiveInput();
            const query = input.value.trim().toLowerCase();
            filterCards(query);
            return false;
        }

        // Live search for both inputs
        [desktopInput, mobileInput].forEach(input => {
            input.addEventListener('input', () => {
                const query = input.value.trim().toLowerCase();
                filterCards(query);
            });
        });

        function filterCards(query) {
            const cards = document.querySelectorAll('.card');
            let found = false;

            cards.forEach(card => {
                const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
                const sku = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
                const match = title.includes(query) || sku.includes(query);

                card.parentElement.style.display = match ? '' : 'none';
                if (match) found = true;
            });

            if (found && query !== '') {
                const firstVisible = Array.from(cards).find(card => card.parentElement.style.display !== 'none');
                if (firstVisible) firstVisible.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        window.handleSearch = handleSearch;
    })();

    (() => {
        const scrollContainer = document.getElementById('categoryButtons');
        const btnLeft = document.querySelector('.scroll-btn.left');
        const btnRight = document.querySelector('.scroll-btn.right');

        // Click buttons scroll
        btnLeft?.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });
        btnRight?.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });

        // Desktop drag scroll (mouse only)
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        scrollContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            scrollContainer.classList.add('grabbing');
            startX = e.pageX - scrollContainer.getBoundingClientRect().left;
            scrollLeft = scrollContainer.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            scrollContainer.classList.remove('grabbing');
        });

        scrollContainer.addEventListener('mouseleave', () => {
            isDown = false;
            scrollContainer.classList.remove('grabbing');
        });

        scrollContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - scrollContainer.getBoundingClientRect().left;
            const walk = (x - startX) * 1.5;
            scrollContainer.scrollLeft = scrollLeft - walk;
        });
    })();

    (() => {
        document.addEventListener('DOMContentLoaded', function () {

            const buttons = document.querySelectorAll('.category-filter');
            const cards = Array.from(document.querySelectorAll('.card')).filter(card => !card.closest('.no-filter'));

            if (!buttons.length || !cards.length) return;

            // =========================
            // HELPERS
            // =========================

            function findWrapper(card) {
                return card.closest('[class*="col-"]') || card.parentElement || card;
            }

            function normalize(str) {
                return (str || '')
                    .toString()
                    .normalize('NFKC')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();
            }

            function getCategoryFromCard(card) {
                // S90-ADMIN: prefer data-category (used by dashboard-managed products)
                if (card.dataset && card.dataset.category) return card.dataset.category.trim();
                const img = card.querySelector('img');
                if (!img) return null;

                const src = img.getAttribute('src') || '';
                const parts = src.split('/');

                if (parts.length > 1) {
                    return parts[0].trim();
                }

                return null;
            }

            // =========================
            // CLICK FILTER
            // =========================

            function filterByCategory(category) {

                const normalizedCategory = normalize(category);

                cards.forEach(card => {

                    const wrapper = findWrapper(card);
                    if (!wrapper) return;

                    if (normalizedCategory === 'all') {
                        wrapper.style.display = '';
                        return;
                    }

                    const cardCategory = getCategoryFromCard(card);
                    const normalizedCardCategory = normalize(cardCategory);
                    const imageSource = normalize(card.querySelector('img')?.getAttribute('src') || '');
                    const isSpecialCategory = normalizedCategory === 'new arrivals' || normalizedCategory === 'best sellers';

                    if (isSpecialCategory
                        ? imageSource.startsWith(normalizedCategory === 'new arrivals' ? 'new arrivals/' : 'best sellers/')
                        : normalizedCardCategory === normalizedCategory) {
                        wrapper.style.display = '';
                    } else {
                        wrapper.style.display = 'none';
                    }

                });

                // highlight active button
                buttons.forEach(btn => {
                    if (normalize(btn.getAttribute('data-category')) === normalizedCategory) {
                        btn.classList.add('active');

                        btn.scrollIntoView({
                            behavior: "smooth",
                            inline: "center",
                            block: "nearest"
                        });

                    } else {
                        btn.classList.remove('active');
                    }
                });

                // close offcanvas if exists
                try {
                    const off = document.getElementById('sidebarMenu');
                    if (off && bootstrap && bootstrap.Offcanvas) {
                        const inst = bootstrap.Offcanvas.getInstance(off);
                        if (inst) inst.hide();
                    }
                } catch (err) { }
            }

            buttons.forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    const category = this.getAttribute('data-category');
                    filterByCategory(category);
                });
            });

            // =========================
            // AUTO HIGHLIGHT ON SCROLL
            // =========================

            window.addEventListener('scroll', function () {

                let currentCategory = null;

                for (let card of cards) {

                    const wrapper = findWrapper(card);
                    if (!wrapper || wrapper.style.display === 'none') continue;

                    const rect = wrapper.getBoundingClientRect();

                    if (rect.top >= 0 && rect.top <= window.innerHeight * 0.35) {
                        currentCategory = getCategoryFromCard(card);
                        break;
                    }
                }

                if (!currentCategory) return;

                    const normalizedCurrent = normalize(currentCategory);

                buttons.forEach(btn => {

                    const btnCategory = normalize(btn.getAttribute('data-category'));

                    if (btnCategory === normalizedCurrent) {

                        if (!btn.classList.contains('active')) {
                            btn.classList.add('active');

                            btn.scrollIntoView({
                                behavior: "smooth",
                                inline: "center",
                                block: "nearest"
                            });
                        }

                    } else {
                        btn.classList.remove('active');
                    }

                });

            });

        });
    })();

    (() => {
        document.addEventListener('DOMContentLoaded', function () {
            const cards = Array.from(document.querySelectorAll('.card.box:not(.hero-banner-card)'));
            if (!cards.length || !window.bootstrap) return;

            let modalEl = document.getElementById('productQuickViewModal');

            if (!modalEl) {
                modalEl = document.createElement('div');
                modalEl.className = 'modal fade';
                modalEl.id = 'productQuickViewModal';
                modalEl.tabIndex = -1;
                modalEl.setAttribute('aria-hidden', 'true');
                modalEl.innerHTML = `
                            <div class="modal-dialog modal-dialog-centered modal-lg">
                                <div class="modal-content border-0 shadow-lg">
                                    <div class="modal-header">
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body p-0">
                                        <div class="row g-0">
                                            <div class="col-md-5 quick-view-image-wrap d-flex align-items-center justify-content-center">
                                                <img id="quickViewImage" class="img-fluid quick-view-image" src="" alt="">
                                            </div>
                                            <div class="col-md-7 p-4">
                                                <h5 class="modal-title quick-view-title mb-3" id="quickViewTitle">Product details</h5>
                                                <p id="quickViewSku" class="quick-view-sku text-dark mb-2"></p>
                                                <div id="quickViewPrice" class="fw-bold quick-view-price mb-3"></div>
                                                <div id="quickViewDetails" class="quick-view-details text-dark"></div>
                                                <div class="quick-view-order-tools">
                                                    <div class="quick-view-qty">
                                                        <p class="quick-view-qty-label">Qty</p>
                                                        <div id="quickViewQtyControls" class="quick-view-qty-controls"></div>
                                                    </div>
                                                    <div id="quickViewSummary" class="quick-view-summary"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-footer justify-content-between">
                                        <a id="quickViewOrderBtn" class="btn fw-semibold quick-view-order-btn" href="tel:010288993">
                                            <i class="bi bi-cart3"></i>
                                            <span>Order Now</span>
                                        </a>
                                        <button type="button" class="btn quick-view-close-btn" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
                                    </div>
                                </div>
                            </div>
                        `;
                document.body.appendChild(modalEl);
            }

            const modal = new bootstrap.Modal(modalEl);
            const titleEl = modalEl.querySelector('#quickViewTitle');
            const imageEl = modalEl.querySelector('#quickViewImage');
            const skuEl = modalEl.querySelector('#quickViewSku');
            const priceEl = modalEl.querySelector('#quickViewPrice');
            const detailsEl = modalEl.querySelector('#quickViewDetails');
            const orderBtn = modalEl.querySelector('#quickViewOrderBtn');
            const qtyControlsEl = modalEl.querySelector('#quickViewQtyControls');
            const summaryEl = modalEl.querySelector('#quickViewSummary');
            let currentQty = 1;
            let currentSelection = null;
            let currentSelections = [];
            let currentInfo = null;
            let currentSelectionQuantities = {};

            function escapeHtml(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function extractOptions(priceHtml) {
                const plainText = String(priceHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (/^price\s*:/i.test(plainText)) {
                    return [];
                }

                const wrapper = document.createElement('div');
                wrapper.innerHTML = priceHtml || '';
                const items = Array.from(wrapper.querySelectorAll('li'));

                const parsedItems = items.map(function (item) {
                    const clone = item.cloneNode(true);
                    const priceNode = clone.querySelector('.multi-price');
                    const priceText = priceNode ? priceNode.textContent.trim().replace(/^=\s*/, '') : '';
                    if (priceNode) priceNode.remove();

                    const labelText = clone.textContent.replace(/=\s*\$?\s*[\d.,]+/g, '').trim();
                    return {
                        label: labelText || 'Option',
                        price: priceText || 'Contact us'
                    };
                }).filter(function (item) {
                    return item.label || item.price;
                });

                if (parsedItems.length) {
                    return parsedItems;
                }

                return String(priceHtml || '')
                    .split(/<br\s*\/?>/i)
                    .map(function (lineHtml) {
                        const line = lineHtml
                            .replace(/<\/?(ul|li)\b[^>]*>/gi, ' ')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                        const priceMatch = line.match(/=\s*\$?\s*[\d.,]+/);
                        const priceText = priceMatch ? priceMatch[0].replace(/^=\s*/, '').trim() : '';
                        const labelText = line
                            .replace(/^\d+\.\s*/, '')
                            .replace(/=\s*\$?\s*[\d.,]+/g, '')
                            .trim();

                        return {
                            label: labelText || 'Option',
                            price: priceText || 'Contact us'
                        };
                    })
                    .filter(function (item) {
                        return (item.label || item.price) && !/^price\s*:/i.test(item.label || '');
                    });
            }

            function parsePriceValue(text) {
                const normalized = String(text || '').replace(/,/g, '');
                const match = normalized.match(/-?\d+(?:\.\d+)?/);
                return match ? Number(match[0]) : 0;
            }

            function formatPriceValue(value) {
                return '$' + Number(value || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }

            function extractSinglePrice(priceHtml) {
                const text = String(priceHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return text.replace(/^Price:\s*/i, '').trim() || 'Contact us';
            }

            function hasKnownPrice(text) {
                return !/contact us/i.test(String(text || ''));
            }

            function getRenderedSelections() {
                return currentSelections.length ? currentSelections : (currentSelection ? [currentSelection] : []);
            }

            function getVisibleSelections() {
                const selections = getRenderedSelections();
                return currentInfo?.options?.length
                    ? selections.filter(function (item) {
                        return getSelectionQty(item) > 0;
                    })
                    : selections;
            }

            function getTotalQty() {
                return currentInfo?.options?.length
                    ? getVisibleSelections().reduce(function (sum, item) {
                        return sum + getSelectionQty(item);
                    }, 0)
                    : currentQty;
            }

            function getGrandTotal() {
                const selections = getVisibleSelections();
                return selections.reduce(function (sum, item) {
                    const qty = currentInfo?.options?.length ? getSelectionQty(item) : currentQty;
                    return sum + (parsePriceValue(item.price) * qty);
                }, 0);
            }

            function getImageShareUrl() {
                if (!currentInfo?.imageSrc) return '';
                try {
                    return new URL(currentInfo.imageSrc, window.location.href).href;
                } catch (error) {
                    return currentInfo.imageSrc;
                }
            }

            function normalizeSkuText(value) {
                const text = (value || '').trim();
                if (!text) return 'Contact us for SKU details';

                const matches = Array.from(text.matchAll(/sku\s*:\s*([^\s|,;]+)/gi));
                if (matches.length) {
                    return 'SKU: ' + matches[0][1].trim();
                }

                return text;
            }

            function buildTelegramOrderText() {
                const selections = getVisibleSelections();
                const lines = [];
                const imageUrl = getImageShareUrl();

                if (imageUrl) {
                    lines.push(imageUrl);
                    lines.push('');
                }

                lines.push(
                    'Order Summary',
                    'Product: ' + (currentInfo?.title || 'Product'),
                    (currentInfo?.sku || 'SKU: N/A')
                );

                if (currentInfo?.options?.length) {
                    lines.push('Items:');
                    selections.forEach(function (item) {
                        const qty = getSelectionQty(item);
                        const lineTotal = parsePriceValue(item.price) * qty;
                        lines.push('- ' + (item.label || 'Option') + ' | Qty: ' + qty + ' | Total: ' + (hasKnownPrice(item.price) ? formatPriceValue(lineTotal) : (item.price || 'Contact us')));
                    });
                } else {
                    lines.push('Qty: ' + currentQty);
                    lines.push('Price: ' + (hasKnownPrice(currentSelection?.price) ? formatPriceValue(parsePriceValue(currentSelection?.price) * currentQty) : (currentSelection?.price || 'Contact us')));
                }

                lines.push('Total Qty: ' + getTotalQty());
                lines.push('Grand Total: ' + formatPriceValue(getGrandTotal()));

                return lines.join('\n');
            }

            function isMobileDevice() {
                return window.matchMedia('(max-width: 767.98px)').matches
                    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            }

            function getTelegramShareUrls() {
                const text = encodeURIComponent(buildTelegramOrderText());
                return {
                    app: 'tg://resolve?domain=S90constructionsupply_1&text=' + text,
                    web: 'https://t.me/S90constructionsupply_1?text=' + text
                };
            }

            function openTelegramOrder() {
                const telegramUrls = getTelegramShareUrls();

                if (isMobileDevice()) {
                    const fallbackTimer = window.setTimeout(function () {
                        window.location.href = telegramUrls.web;
                    }, 900);

                    window.location.href = telegramUrls.app;
                    window.setTimeout(function () {
                        window.clearTimeout(fallbackTimer);
                    }, 1200);
                    return;
                }

                window.open(telegramUrls.web, '_blank', 'noopener');
            }

            function getSelectionKey(item) {
                return [item?.label || 'Option', item?.price || 'Contact us'].join('||');
            }

            function getSelectionQty(item) {
                const key = getSelectionKey(item);
                const storedQty = Object.prototype.hasOwnProperty.call(currentSelectionQuantities, key)
                    ? currentSelectionQuantities[key]
                    : 1;
                return Math.max(0, storedQty);
            }

            function renderQtyControls() {
                const displayedQty = currentInfo?.options?.length && currentSelection
                    ? getSelectionQty(currentSelection)
                    : currentQty;
                qtyControlsEl.innerHTML = `
                            <div class="d-inline-flex align-items-center border rounded-pill overflow-hidden">
                                <button type="button" class="quick-view-qty-btn px-3 border-0 bg-transparent" data-qty-action="minus" aria-label="Decrease quantity">-</button>
                                <span class="quick-view-qty-value px-3">${displayedQty}</span>
                                <button type="button" class="quick-view-qty-btn px-3 border-0 bg-transparent" data-qty-action="plus" aria-label="Increase quantity">+</button>
                            </div>
                        `;
            }

            function renderSummary() {
                const selections = getRenderedSelections();
                const visibleSelections = getVisibleSelections();
                const hasOptionChoices = Boolean(currentInfo?.options?.length);
                const totalQty = getTotalQty();
                const grandTotal = getGrandTotal();
                const optionRows = visibleSelections.map(function (item) {
                    const qty = getSelectionQty(item);
                    const lineTotal = parsePriceValue(item.price) * qty;
                    const linePriceText = hasKnownPrice(item.price) ? formatPriceValue(lineTotal) : (item.price || 'Contact us');
                    return `<div class="quick-view-summary-row"><span>${escapeHtml(item.label || 'Option')}</span><strong>x${qty} ${escapeHtml(linePriceText)}</strong></div>`;
                }).join('');
                const singleItemPrice = selections[0]?.price || 'Contact us';

                renderQtyControls();
                summaryEl.innerHTML = `
                            <div class="quick-view-summary-title">Order Summary</div>
                            <div class="quick-view-summary-row"><span>Item</span><span>${escapeHtml(currentInfo?.title || 'Product')}</span></div>
                            <hr class="my-2">
                            ${hasOptionChoices ? optionRows + '<hr class="my-2">' : `<div class="quick-view-summary-row"><span>Price</span><strong>x${totalQty} ${escapeHtml(singleItemPrice)}</strong></div>
                            <hr class="my-2">
                            <div class="quick-view-summary-row"><span>Total Qty</span><span>${totalQty}</span></div>`}
                            ${hasOptionChoices ? `<div class="quick-view-summary-row"><span>Total Qty</span><span>${totalQty}</span></div>` : ''}
                            <hr class="my-2">
                            <div class="quick-view-summary-row"><span>Total</span><strong>${hasKnownPrice(singleItemPrice) || hasOptionChoices ? escapeHtml(formatPriceValue(grandTotal)) : 'Contact us'}</strong></div>
                        `;
                orderBtn.setAttribute('aria-label', 'Order ' + (currentInfo?.title || 'product') + ', total qty ' + totalQty);
            }

            function getCardInfo(card) {
                const title = card.querySelector('.card-title')?.textContent.trim() || 'Product';
                const skuText = Array.from(card.querySelectorAll('.card-text')).find(function (node) {
                    return /sku/i.test(node.textContent);
                })?.textContent || '';
                const priceNode = Array.from(card.querySelectorAll('.card-text, .items')).find(function (node) {
                    return /price/i.test(node.textContent) || node.classList.contains('items');
                });
                const img = card.querySelector('img');

                return {
                    title: title,
                    sku: normalizeSkuText(skuText),
                    priceHtml: priceNode ? priceNode.innerHTML : 'Contact us for the latest price.',
                    options: priceNode ? extractOptions(priceNode.innerHTML) : [],
                    imageSrc: img ? img.getAttribute('src') : '',
                    imageAlt: img ? (img.getAttribute('alt') || title) : title
                };
            }

            function openQuickView(card) {
                const info = getCardInfo(card);
                currentInfo = info;
                currentQty = 1;
                currentSelection = null;
                currentSelections = [];
                currentSelectionQuantities = {};
                titleEl.textContent = info.title;
                skuEl.textContent = info.sku;
                priceEl.innerHTML = '';
                detailsEl.innerHTML = '';

                if (info.imageSrc) {
                    imageEl.src = info.imageSrc;
                    imageEl.alt = info.imageAlt;
                    imageEl.classList.remove('d-none');
                } else {
                    imageEl.classList.add('d-none');
                    imageEl.removeAttribute('src');
                }

                if (info.options.length) {
                    priceEl.textContent = 'Choose one or more options';
                    detailsEl.innerHTML = '<div class="quick-view-options">' + info.options.map(function (option, index) {
                        return `
                                    <button type="button" class="quick-view-option ${index === 0 ? 'active' : ''}" data-option-label="${escapeHtml(option.label)}" data-option-price="${escapeHtml(option.price)}">
                                        <span class="quick-view-option-label">${escapeHtml(option.label)}</span>
                                        <span class="quick-view-option-price">${escapeHtml(option.price)}</span>
                                    </button>
                                `;
                    }).join('') + '</div>';

                    const optionButtons = Array.from(detailsEl.querySelectorAll('.quick-view-option'));
                    const syncSelectedOptions = function () {
                        const activeButton = optionButtons.find(function (btn) {
                            return btn.classList.contains('active');
                        }) || optionButtons[0];

                        if (activeButton && !activeButton.classList.contains('active')) {
                            activeButton.classList.add('active');
                        }

                        currentSelection = activeButton ? {
                            label: activeButton.dataset.optionLabel || 'Option',
                            price: activeButton.dataset.optionPrice || 'Contact us'
                        } : null;

                        if (currentSelection) {
                            const exists = currentSelections.some(function (item) {
                                return item.label === currentSelection.label && item.price === currentSelection.price;
                            });
                            if (!exists) {
                                currentSelections.push(currentSelection);
                            }
                            currentSelectionQuantities[getSelectionKey(currentSelection)] = currentSelectionQuantities[getSelectionKey(currentSelection)] || 1;
                        }

                        const combinedPrice = currentSelections.reduce(function (sum, item) {
                            return sum + (parsePriceValue(item.price) * getSelectionQty(item));
                        }, 0);
                        priceEl.textContent = 'Price: ' + (combinedPrice ? formatPriceValue(combinedPrice) : 'Contact us');
                        renderSummary();
                    };

                    optionButtons.forEach(function (button) {
                        button.addEventListener('click', function () {
                            optionButtons.forEach(function (btn) {
                                btn.classList.remove('active');
                            });
                            button.classList.add('active');
                            syncSelectedOptions();
                        });
                    });

                    syncSelectedOptions();
                } else if (/^price/i.test(info.priceHtml.replace(/<[^>]+>/g, '').trim())) {
                    priceEl.innerHTML = info.priceHtml;
                    currentSelection = {
                        label: 'Standard',
                        price: extractSinglePrice(info.priceHtml)
                    };
                    currentSelections = [currentSelection];
                } else {
                    priceEl.innerHTML = 'Price options';
                    detailsEl.innerHTML = '<div class="quick-view-list">' + info.priceHtml + '</div>';
                    currentSelection = {
                        label: 'Standard',
                        price: 'Contact us'
                    };
                    currentSelections = [currentSelection];
                }

                orderBtn.href = 'https://t.me/S90constructionsupply_1';
                renderSummary();
                modal.show();
            }

            qtyControlsEl.addEventListener('click', function (event) {
                const button = event.target.closest('[data-qty-action]');
                if (!button) return;

                const action = button.dataset.qtyAction;
                if (currentInfo?.options?.length && currentSelection) {
                    const key = getSelectionKey(currentSelection);
                    const baseQty = getSelectionQty(currentSelection);
                    currentSelectionQuantities[key] = action === 'minus'
                        ? Math.max(0, baseQty - 1)
                        : baseQty + 1;
                } else {
                    currentQty = action === 'minus'
                        ? Math.max(0, currentQty - 1)
                        : currentQty + 1;
                }

                if (currentInfo?.options?.length) {
                    const selections = getRenderedSelections().filter(function (item) {
                        return getSelectionQty(item) > 0;
                    });
                    const combinedPrice = selections.reduce(function (sum, item) {
                        return sum + (parsePriceValue(item.price) * getSelectionQty(item));
                    }, 0);
                    priceEl.textContent = 'Price: ' + (combinedPrice ? formatPriceValue(combinedPrice) : 'Contact us');
                }

                renderSummary();
            });

            orderBtn.addEventListener('click', function (event) {
                const totalQty = getTotalQty();

                if (totalQty === 0) {
                    event.preventDefault();
                    alert('Please add at least 1 item before ordering.');
                    return;
                }

                event.preventDefault();
                openTelegramOrder();
            });

            // S90-ADMIN: cart hook (lets cart.js read what is selected in the quick view window)
            window.S90QuickView = {
                getOrder: function () {
                    if (!currentInfo) return null;
                    var multi = currentInfo.options && currentInfo.options.length;
                    var lines = multi
                        ? getVisibleSelections().map(function (it) { return { label: it.label || 'Option', price: it.price || 'Contact us', qty: getSelectionQty(it) }; })
                        : (currentSelection ? [{ label: '', price: currentSelection.price || 'Contact us', qty: currentQty }] : []);
                    return {
                        title: currentInfo.title,
                        sku: String(currentInfo.sku || '').replace(/^SKU:\s*/i, ''),
                        imageRel: currentInfo.imageSrc || '',
                        lines: lines.filter(function (l) { return l.qty > 0; })
                    };
                }
            };

            cards.forEach(function (card) {
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', 'Open price and order options');

                card.addEventListener('click', function (event) {
                    if (event.target.closest('a, button')) return;
                    openQuickView(card);
                });

                card.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openQuickView(card);
                    }
                });
            });
        });
    })();

    (() => {
        const navbar = document.querySelector('.navbar.fixed-top');
        const categoryBar = document.querySelector('.category-bar');

        function updateLayout() {
            if (!navbar) return;

            const h = Math.ceil(navbar.getBoundingClientRect().height);
            document.body.style.paddingTop = h + 'px';

            if (categoryBar) {
                categoryBar.style.top = h + 'px';
            }
        }

        updateLayout();
        window.addEventListener('load', updateLayout);
        window.addEventListener('resize', updateLayout);
        document.addEventListener('shown.bs.collapse', updateLayout);
        document.addEventListener('hidden.bs.collapse', updateLayout);
    })();

    document.getElementById('goToTopBtn')?.addEventListener('click', window.scrollToTop);
    document.getElementById('goToBottomBtn')?.addEventListener('click', window.scrollToBottom);
    document.querySelectorAll('form[role="search"]').forEach((form) => form.addEventListener('submit', window.handleSearch));
}

/* home page: analytics, navigation, product interactions, and responsive behavior. */
if (document.body.dataset.page === 'home') {
    (() => {
        (function () {
            const GA_ID = 'G-M0RPJXHL0D';
            let gaLoaded = false;

            function loadGA() {
                if (gaLoaded) return;
                gaLoaded = true;

                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
                document.head.appendChild(script);

                window.dataLayer = window.dataLayer || [];
                window.gtag = function () { dataLayer.push(arguments); };
                gtag('js', new Date());
                gtag('config', GA_ID, { anonymize_ip: true });
            }

            ['pointerdown', 'keydown', 'scroll'].forEach(function (eventName) {
                window.addEventListener(eventName, loadGA, { once: true, passive: true });
            });
        })();
    })();

    (() => {
        // Already in HTML, so just reference
        const goToBottomBtnEl = document.getElementById("goToBottomBtn");
        goToBottomBtnEl.style.opacity = 0;
        goToBottomBtnEl.style.transition = "opacity 0.4s";

        let lastScrollTopBottom = 0;
        let hideBottomBtnTimeout = null;

        window.addEventListener('scroll', function () {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;

            // Hide goToBottomBtn while scrolling down
            if (scrollTop > lastScrollTopBottom) {
                goToBottomBtnEl.style.opacity = 0;
                goToBottomBtnEl.addEventListener('transitionend', function handler() {
                    if (goToBottomBtnEl.style.opacity == 0) {
                        goToBottomBtnEl.style.display = "none";
                    }
                    goToBottomBtnEl.removeEventListener('transitionend', handler);
                });
                lastScrollTopBottom = scrollTop;
                return;
            }

            // Show go to bottom button if not at bottom and not scrolling down
            if (scrollTop + clientHeight < scrollHeight - 20) {
                goToBottomBtnEl.style.display = "block";
                setTimeout(() => {
                    goToBottomBtnEl.style.opacity = 1;
                }, 10);
            } else {
                goToBottomBtnEl.style.opacity = 0;
                goToBottomBtnEl.addEventListener('transitionend', function handler() {
                    if (goToBottomBtnEl.style.opacity == 0) {
                        goToBottomBtnEl.style.display = "none";
                    }
                    goToBottomBtnEl.removeEventListener('transitionend', handler);
                });
            }
            lastScrollTopBottom = scrollTop;
        });

        function scrollToBottom() {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
        window.scrollToBottom = scrollToBottom;
    })();

    (() => {
        let lastScrollTop = 0;
        const goToTopBtn = document.getElementById("goToTopBtn");

        // Initialize opacity and transition
        goToTopBtn.style.opacity = 0;
        goToTopBtn.style.transition = "opacity 0.4s";

        window.onscroll = function () {
            const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

            if (currentScrollTop > 20 && currentScrollTop > lastScrollTop) {
                goToTopBtn.style.display = "block";
                setTimeout(() => {
                    goToTopBtn.style.opacity = 1;
                }, 10);
            } else {
                goToTopBtn.style.opacity = 0;
                goToTopBtn.addEventListener('transitionend', function handler() {
                    if (goToTopBtn.style.opacity == 0) {
                        goToTopBtn.style.display = "none";
                    }
                    goToTopBtn.removeEventListener('transitionend', handler);
                });
            }

            lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
        };

        // Scroll to the top of the document when the button is clicked
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollToTop = scrollToTop;
    })();

    (() => {
        const desktopInput = document.getElementById('navbarSearchDesktop');
        const mobileInput = document.getElementById('navbarSearchMobile');

        // Helper to get active input (visible one)
        function getActiveInput() {
            if (window.getComputedStyle(desktopInput.closest('form')).display !== 'none') {
                return desktopInput;
            } else {
                return mobileInput;
            }
        }

        // Main search handler
        function handleSearch(event) {
            event.preventDefault();
            const input = getActiveInput();
            const query = input.value.trim().toLowerCase();
            filterCards(query);
            return false;
        }

        // Live search for both inputs
        [desktopInput, mobileInput].forEach(input => {
            input.addEventListener('input', () => {
                const query = input.value.trim().toLowerCase();
                filterCards(query);
            });
        });

        function filterCards(query) {
            const cards = document.querySelectorAll('.card');
            const homeScrollButtons = [
                document.getElementById('homeCategoryPrevBtn'),
                document.getElementById('homeCategoryNextBtn')
            ];
            let found = false;

            homeScrollButtons.forEach(btn => {
                if (btn) btn.style.display = query !== '' ? 'none' : '';
            });

            cards.forEach(card => {
                const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
                const sku = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
                const match = title.includes(query) || sku.includes(query);

                card.parentElement.style.display = match ? '' : 'none';
                if (match) found = true;
            });

            if (found && query !== '') {
                const firstVisible = Array.from(cards).find(card => card.parentElement.style.display !== 'none');
                if (firstVisible) firstVisible.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        window.handleSearch = handleSearch;
    })();

    (() => {
        const scrollContainer = document.getElementById('categoryButtons');
        const btnLeft = document.querySelector('.scroll-btn.left');
        const btnRight = document.querySelector('.scroll-btn.right');

        // Click buttons scroll
        btnLeft?.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });
        btnRight?.addEventListener('click', () => {
            scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });

        // Desktop drag scroll (mouse only)
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        scrollContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            scrollContainer.classList.add('grabbing');
            startX = e.pageX - scrollContainer.getBoundingClientRect().left;
            scrollLeft = scrollContainer.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            scrollContainer.classList.remove('grabbing');
        });

        scrollContainer.addEventListener('mouseleave', () => {
            isDown = false;
            scrollContainer.classList.remove('grabbing');
        });

        scrollContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - scrollContainer.getBoundingClientRect().left;
            const walk = (x - startX) * 1.5;
            scrollContainer.scrollLeft = scrollLeft - walk;
        });
    })();

    (() => {
        document.addEventListener('DOMContentLoaded', function () {
            const cards = Array.from(document.querySelectorAll('.card.box:not(.hero-banner-card)'));
            if (!cards.length || !window.bootstrap) return;

            let modalEl = document.getElementById('productQuickViewModal');

            if (!modalEl) {
                modalEl = document.createElement('div');
                modalEl.className = 'modal fade';
                modalEl.id = 'productQuickViewModal';
                modalEl.tabIndex = -1;
                modalEl.setAttribute('aria-hidden', 'true');
                modalEl.innerHTML = `
                            <div class="modal-dialog modal-dialog-centered modal-lg">
                                <div class="modal-content border-0 shadow-lg">
                                    <div class="modal-header">
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body p-0">
                                        <div class="row g-0">
                                            <div class="col-md-5 quick-view-image-wrap d-flex align-items-center justify-content-center">
                                                <img id="quickViewImage" class="img-fluid quick-view-image" src="" alt="">
                                            </div>
                                            <div class="col-md-7 p-4">
                                                <h5 class="modal-title quick-view-title mb-3" id="quickViewTitle">Product details</h5>
                                                <p id="quickViewSku" class="quick-view-sku text-dark mb-2"></p>
                                                <div id="quickViewPrice" class="fw-bold quick-view-price mb-3"></div>
                                                <div id="quickViewDetails" class="quick-view-details text-dark"></div>
                                                <div class="quick-view-order-tools">
                                                    <div class="quick-view-qty">
                                                        <p class="quick-view-qty-label">Qty</p>
                                                        <div id="quickViewQtyControls" class="quick-view-qty-controls"></div>
                                                    </div>
                                                    <div id="quickViewSummary" class="quick-view-summary"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-footer justify-content-between">
                                        <a id="quickViewOrderBtn" class="btn fw-semibold quick-view-order-btn" href="tel:010288993">
                                            <i class="bi bi-cart3"></i>
                                            <span>Order Now</span>
                                        </a>
                                        <button type="button" class="btn quick-view-close-btn" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
                                    </div>
                                </div>
                            </div>
                        `;
                document.body.appendChild(modalEl);
            }

            const modal = new bootstrap.Modal(modalEl);
            const titleEl = modalEl.querySelector('#quickViewTitle');
            const imageEl = modalEl.querySelector('#quickViewImage');
            const skuEl = modalEl.querySelector('#quickViewSku');
            const priceEl = modalEl.querySelector('#quickViewPrice');
            const detailsEl = modalEl.querySelector('#quickViewDetails');
            const orderBtn = modalEl.querySelector('#quickViewOrderBtn');
            const qtyControlsEl = modalEl.querySelector('#quickViewQtyControls');
            const summaryEl = modalEl.querySelector('#quickViewSummary');
            let currentQty = 1;
            let currentSelection = null;
            let currentSelections = [];
            let currentInfo = null;
            let currentSelectionQuantities = {};

            function escapeHtml(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function extractOptions(priceHtml) {
                const plainText = String(priceHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (/^price\s*:/i.test(plainText)) {
                    return [];
                }

                const wrapper = document.createElement('div');
                wrapper.innerHTML = priceHtml || '';
                const items = Array.from(wrapper.querySelectorAll('li'));

                const parsedItems = items.map(function (item) {
                    const clone = item.cloneNode(true);
                    const priceNode = clone.querySelector('.multi-price');
                    const priceText = priceNode ? priceNode.textContent.trim().replace(/^=\s*/, '') : '';
                    if (priceNode) priceNode.remove();

                    const labelText = clone.textContent.replace(/=\s*\$?\s*[\d.,]+/g, '').trim();
                    return {
                        label: labelText || 'Option',
                        price: priceText || 'Contact us'
                    };
                }).filter(function (item) {
                    return item.label || item.price;
                });

                if (parsedItems.length) {
                    return parsedItems;
                }

                return String(priceHtml || '')
                    .split(/<br\s*\/?>/i)
                    .map(function (lineHtml) {
                        const line = lineHtml
                            .replace(/<\/?(ul|li)\b[^>]*>/gi, ' ')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                        const priceMatch = line.match(/=\s*\$?\s*[\d.,]+/);
                        const priceText = priceMatch ? priceMatch[0].replace(/^=\s*/, '').trim() : '';
                        const labelText = line
                            .replace(/^\d+\.\s*/, '')
                            .replace(/=\s*\$?\s*[\d.,]+/g, '')
                            .trim();

                        return {
                            label: labelText || 'Option',
                            price: priceText || 'Contact us'
                        };
                    })
                    .filter(function (item) {
                        return (item.label || item.price) && !/^price\s*:/i.test(item.label || '');
                    });
            }

            function parsePriceValue(text) {
                const normalized = String(text || '').replace(/,/g, '');
                const match = normalized.match(/-?\d+(?:\.\d+)?/);
                return match ? Number(match[0]) : 0;
            }

            function formatPriceValue(value) {
                return '$' + Number(value || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }

            function extractSinglePrice(priceHtml) {
                const text = String(priceHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return text.replace(/^Price:\s*/i, '').trim() || 'Contact us';
            }

            function hasKnownPrice(text) {
                return !/contact us/i.test(String(text || ''));
            }

            function getRenderedSelections() {
                return currentSelections.length ? currentSelections : (currentSelection ? [currentSelection] : []);
            }

            function getVisibleSelections() {
                const selections = getRenderedSelections();
                return currentInfo?.options?.length
                    ? selections.filter(function (item) {
                        return getSelectionQty(item) > 0;
                    })
                    : selections;
            }

            function getTotalQty() {
                return currentInfo?.options?.length
                    ? getVisibleSelections().reduce(function (sum, item) {
                        return sum + getSelectionQty(item);
                    }, 0)
                    : currentQty;
            }

            function getGrandTotal() {
                const selections = getVisibleSelections();
                return selections.reduce(function (sum, item) {
                    const qty = currentInfo?.options?.length ? getSelectionQty(item) : currentQty;
                    return sum + (parsePriceValue(item.price) * qty);
                }, 0);
            }

            function getImageShareUrl() {
                if (!currentInfo?.imageSrc) return '';
                try {
                    return new URL(currentInfo.imageSrc, window.location.href).href;
                } catch (error) {
                    return currentInfo.imageSrc;
                }
            }

            function normalizeSkuText(value) {
                const text = (value || '').trim();
                if (!text) return 'Contact us for SKU details';

                const matches = Array.from(text.matchAll(/sku\s*:\s*([^\s|,;]+)/gi));
                if (matches.length) {
                    return 'SKU: ' + matches[0][1].trim();
                }

                return text;
            }

            function buildTelegramOrderText() {
                const selections = getVisibleSelections();
                const lines = [];
                const imageUrl = getImageShareUrl();

                if (imageUrl) {
                    lines.push(imageUrl);
                    lines.push('');
                }

                lines.push(
                    'Order Summary',
                    'Product: ' + (currentInfo?.title || 'Product'),
                    (currentInfo?.sku || 'SKU: N/A')
                );

                if (currentInfo?.options?.length) {
                    lines.push('Items:');
                    selections.forEach(function (item) {
                        const qty = getSelectionQty(item);
                        const lineTotal = parsePriceValue(item.price) * qty;
                        lines.push('- ' + (item.label || 'Option') + ' | Qty: ' + qty + ' | Total: ' + (hasKnownPrice(item.price) ? formatPriceValue(lineTotal) : (item.price || 'Contact us')));
                    });
                } else {
                    lines.push('Qty: ' + currentQty);
                    lines.push('Price: ' + (hasKnownPrice(currentSelection?.price) ? formatPriceValue(parsePriceValue(currentSelection?.price) * currentQty) : (currentSelection?.price || 'Contact us')));
                }

                lines.push('Total Qty: ' + getTotalQty());
                lines.push('Grand Total: ' + formatPriceValue(getGrandTotal()));

                return lines.join('\n');
            }

            function isMobileDevice() {
                return window.matchMedia('(max-width: 767.98px)').matches
                    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            }

            function getTelegramShareUrls() {
                const text = encodeURIComponent(buildTelegramOrderText());
                return {
                    app: 'tg://resolve?domain=S90constructionsupply_1&text=' + text,
                    web: 'https://t.me/S90constructionsupply_1?text=' + text
                };
            }

            function openTelegramOrder() {
                const telegramUrls = getTelegramShareUrls();

                if (isMobileDevice()) {
                    const fallbackTimer = window.setTimeout(function () {
                        window.location.href = telegramUrls.web;
                    }, 900);

                    window.location.href = telegramUrls.app;
                    window.setTimeout(function () {
                        window.clearTimeout(fallbackTimer);
                    }, 1200);
                    return;
                }

                window.open(telegramUrls.web, '_blank', 'noopener');
            }

            function getSelectionKey(item) {
                return [item?.label || 'Option', item?.price || 'Contact us'].join('||');
            }

            function getSelectionQty(item) {
                const key = getSelectionKey(item);
                const storedQty = Object.prototype.hasOwnProperty.call(currentSelectionQuantities, key)
                    ? currentSelectionQuantities[key]
                    : 1;
                return Math.max(0, storedQty);
            }

            function renderQtyControls() {
                const displayedQty = currentInfo?.options?.length && currentSelection
                    ? getSelectionQty(currentSelection)
                    : currentQty;
                qtyControlsEl.innerHTML = `
                            <div class="d-inline-flex align-items-center border rounded-pill overflow-hidden">
                                <button type="button" class="quick-view-qty-btn px-3 border-0 bg-transparent" data-qty-action="minus" aria-label="Decrease quantity">-</button>
                                <span class="quick-view-qty-value px-3">${displayedQty}</span>
                                <button type="button" class="quick-view-qty-btn px-3 border-0 bg-transparent" data-qty-action="plus" aria-label="Increase quantity">+</button>
                            </div>
                        `;
            }

            function renderSummary() {
                const selections = getRenderedSelections();
                const visibleSelections = getVisibleSelections();
                const hasOptionChoices = Boolean(currentInfo?.options?.length);
                const totalQty = getTotalQty();
                const grandTotal = getGrandTotal();
                const optionRows = visibleSelections.map(function (item) {
                    const qty = getSelectionQty(item);
                    const lineTotal = parsePriceValue(item.price) * qty;
                    const linePriceText = hasKnownPrice(item.price) ? formatPriceValue(lineTotal) : (item.price || 'Contact us');
                    return `<div class="quick-view-summary-row"><span>${escapeHtml(item.label || 'Option')}</span><strong>x${qty} ${escapeHtml(linePriceText)}</strong></div>`;
                }).join('');
                const singleItemPrice = selections[0]?.price || 'Contact us';

                renderQtyControls();
                summaryEl.innerHTML = `
                            <div class="quick-view-summary-title">Order Summary</div>
                            <div class="quick-view-summary-row"><span>Item</span><span>${escapeHtml(currentInfo?.title || 'Product')}</span></div>
                            <hr class="my-2">
                            ${hasOptionChoices ? optionRows + '<hr class="my-2">' : `<div class="quick-view-summary-row"><span>Price</span><strong>x${totalQty} ${escapeHtml(singleItemPrice)}</strong></div>
                            <hr class="my-2">
                            <div class="quick-view-summary-row"><span>Total Qty</span><span>${totalQty}</span></div>`}
                            ${hasOptionChoices ? `<div class="quick-view-summary-row"><span>Total Qty</span><span>${totalQty}</span></div>` : ''}
                            <hr class="my-2">
                            <div class="quick-view-summary-row"><span>Total</span><strong>${hasKnownPrice(singleItemPrice) || hasOptionChoices ? escapeHtml(formatPriceValue(grandTotal)) : 'Contact us'}</strong></div>
                        `;
                orderBtn.setAttribute('aria-label', 'Order ' + (currentInfo?.title || 'product') + ', total qty ' + totalQty);
            }

            function getCardInfo(card) {
                const title = card.querySelector('.card-title')?.textContent.trim() || 'Product';
                const skuText = Array.from(card.querySelectorAll('.card-text')).find(function (node) {
                    return /sku/i.test(node.textContent);
                })?.textContent || '';
                const priceNode = Array.from(card.querySelectorAll('.card-text, .items')).find(function (node) {
                    return /price/i.test(node.textContent) || node.classList.contains('items');
                });
                const img = card.querySelector('img');

                return {
                    title: title,
                    sku: normalizeSkuText(skuText),
                    priceHtml: priceNode ? priceNode.innerHTML : 'Contact us for the latest price.',
                    options: priceNode ? extractOptions(priceNode.innerHTML) : [],
                    imageSrc: img ? img.getAttribute('src') : '',
                    imageAlt: img ? (img.getAttribute('alt') || title) : title
                };
            }

            function openQuickView(card) {
                const info = getCardInfo(card);
                currentInfo = info;
                currentQty = 1;
                currentSelection = null;
                currentSelections = [];
                currentSelectionQuantities = {};
                titleEl.textContent = info.title;
                skuEl.textContent = info.sku;
                priceEl.innerHTML = '';
                detailsEl.innerHTML = '';

                if (info.imageSrc) {
                    imageEl.src = info.imageSrc;
                    imageEl.alt = info.imageAlt;
                    imageEl.classList.remove('d-none');
                } else {
                    imageEl.classList.add('d-none');
                    imageEl.removeAttribute('src');
                }

                if (info.options.length) {
                    priceEl.textContent = 'Choose one or more options';
                    detailsEl.innerHTML = '<div class="quick-view-options">' + info.options.map(function (option, index) {
                        return `
                                    <button type="button" class="quick-view-option ${index === 0 ? 'active' : ''}" data-option-label="${escapeHtml(option.label)}" data-option-price="${escapeHtml(option.price)}">
                                        <span class="quick-view-option-label">${escapeHtml(option.label)}</span>
                                        <span class="quick-view-option-price">${escapeHtml(option.price)}</span>
                                    </button>
                                `;
                    }).join('') + '</div>';

                    const optionButtons = Array.from(detailsEl.querySelectorAll('.quick-view-option'));
                    const syncSelectedOptions = function () {
                        const activeButton = optionButtons.find(function (btn) {
                            return btn.classList.contains('active');
                        }) || optionButtons[0];

                        if (activeButton && !activeButton.classList.contains('active')) {
                            activeButton.classList.add('active');
                        }

                        currentSelection = activeButton ? {
                            label: activeButton.dataset.optionLabel || 'Option',
                            price: activeButton.dataset.optionPrice || 'Contact us'
                        } : null;

                        if (currentSelection) {
                            const exists = currentSelections.some(function (item) {
                                return item.label === currentSelection.label && item.price === currentSelection.price;
                            });
                            if (!exists) {
                                currentSelections.push(currentSelection);
                            }
                            currentSelectionQuantities[getSelectionKey(currentSelection)] = currentSelectionQuantities[getSelectionKey(currentSelection)] || 1;
                        }

                        const combinedPrice = currentSelections.reduce(function (sum, item) {
                            return sum + (parsePriceValue(item.price) * getSelectionQty(item));
                        }, 0);
                        priceEl.textContent = 'Price: ' + (combinedPrice ? formatPriceValue(combinedPrice) : 'Contact us');
                        renderSummary();
                    };

                    optionButtons.forEach(function (button) {
                        button.addEventListener('click', function () {
                            optionButtons.forEach(function (btn) {
                                btn.classList.remove('active');
                            });
                            button.classList.add('active');
                            syncSelectedOptions();
                        });
                    });

                    syncSelectedOptions();
                } else if (/^price/i.test(info.priceHtml.replace(/<[^>]+>/g, '').trim())) {
                    priceEl.innerHTML = info.priceHtml;
                    currentSelection = {
                        label: 'Standard',
                        price: extractSinglePrice(info.priceHtml)
                    };
                    currentSelections = [currentSelection];
                } else {
                    priceEl.innerHTML = 'Price options';
                    detailsEl.innerHTML = '<div class="quick-view-list">' + info.priceHtml + '</div>';
                    currentSelection = {
                        label: 'Standard',
                        price: 'Contact us'
                    };
                    currentSelections = [currentSelection];
                }

                orderBtn.href = 'https://t.me/S90constructionsupply_1';
                renderSummary();
                modal.show();
            }

            qtyControlsEl.addEventListener('click', function (event) {
                const button = event.target.closest('[data-qty-action]');
                if (!button) return;

                const action = button.dataset.qtyAction;
                if (currentInfo?.options?.length && currentSelection) {
                    const key = getSelectionKey(currentSelection);
                    const baseQty = getSelectionQty(currentSelection);
                    currentSelectionQuantities[key] = action === 'minus'
                        ? Math.max(0, baseQty - 1)
                        : baseQty + 1;
                } else {
                    currentQty = action === 'minus'
                        ? Math.max(0, currentQty - 1)
                        : currentQty + 1;
                }

                if (currentInfo?.options?.length) {
                    const selections = getRenderedSelections().filter(function (item) {
                        return getSelectionQty(item) > 0;
                    });
                    const combinedPrice = selections.reduce(function (sum, item) {
                        return sum + (parsePriceValue(item.price) * getSelectionQty(item));
                    }, 0);
                    priceEl.textContent = 'Price: ' + (combinedPrice ? formatPriceValue(combinedPrice) : 'Contact us');
                }

                renderSummary();
            });

            orderBtn.addEventListener('click', function (event) {
                const totalQty = getTotalQty();

                if (totalQty === 0) {
                    event.preventDefault();
                    alert('Quantity is 0. Please add at least 1 item before ordering.');
                    return;
                }

                event.preventDefault();
                openTelegramOrder();
            });

            cards.forEach(function (card) {
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', 'Open price and order options');

                card.addEventListener('click', function (event) {
                    if (event.target.closest('a, button')) return;
                    openQuickView(card);
                });

                card.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openQuickView(card);
                    }
                });
            });
        });
    })();

    (() => {
        function scrollCards(direction) {
            const container = document.getElementById("categoryScroll");
            const card = container.querySelector(".scroll-card");
            const scrollAmount = card.offsetWidth * 3;

            container.scrollBy({
                left: direction * scrollAmount,
                behavior: "smooth"
            });
        }
        window.scrollCards = scrollCards;
    })();

    (() => {
        const wrapper = document.getElementById("categoryScroll");
        const row = document.getElementById("scrollRow");

        /* ===== INFINITE LOOP ===== */
        const originals = [...row.children];
        originals.forEach(c => row.appendChild(c.cloneNode(true)));
        originals.forEach(c => row.insertBefore(c.cloneNode(true), row.firstChild));

        setTimeout(() => {
            wrapper.scrollLeft = row.scrollWidth / 3;
        }, 50);

        /* ===== SCROLL AMOUNT ===== */
        function cardsPerScroll() {
            return window.innerWidth <= 576 ? 2 : 3;
        }

        function scrollCards(dir) {
            const cardWidth = row.querySelector(".scroll-card").offsetWidth;
            wrapper.scrollBy({
                left: dir * cardWidth * cardsPerScroll(),
                behavior: "smooth"
            });
        }

        /* ===== LOOP FIX ===== */
        wrapper.addEventListener("scroll", () => {
            const section = row.scrollWidth / 3;
            if (wrapper.scrollLeft < section * .5) wrapper.scrollLeft += section;
            if (wrapper.scrollLeft > section * 1.5) wrapper.scrollLeft -= section;
        });

        /* ===== TOUCH SWIPE ===== */
        let isDown = false, startX = 0, startScroll = 0;

        wrapper.addEventListener("pointerdown", e => {
            isDown = true;
            startX = e.pageX;
            startScroll = wrapper.scrollLeft;
            wrapper.style.scrollBehavior = "auto";
        });

        wrapper.addEventListener("pointermove", e => {
            if (!isDown) return;
            wrapper.scrollLeft = startScroll - (e.pageX - startX) * 1.2;
        });

        wrapper.addEventListener("pointerup", () => {
            isDown = false;
            wrapper.style.scrollBehavior = "smooth";
        });

        wrapper.addEventListener("pointerleave", () => isDown = false);
        window.scrollCards = scrollCards;
    })();

    (() => {
        const navbar = document.querySelector('.navbar.fixed-top');
        const categoryBar = document.querySelector('.category-bar');

        function updateLayout() {
            if (!navbar) return;

            const h = Math.ceil(navbar.getBoundingClientRect().height);
            document.body.style.paddingTop = h + 'px';

            if (categoryBar) {
                categoryBar.style.top = h + 'px';
            }
        }

        updateLayout();
        window.addEventListener('load', updateLayout);
        window.addEventListener('resize', updateLayout);
        document.addEventListener('shown.bs.collapse', updateLayout);
        document.addEventListener('hidden.bs.collapse', updateLayout);
    })();

    document.getElementById('goToTopBtn')?.addEventListener('click', window.scrollToTop);
    document.getElementById('goToBottomBtn')?.addEventListener('click', window.scrollToBottom);
    document.querySelectorAll('form[role="search"]').forEach((form) => form.addEventListener('submit', window.handleSearch));
    document.getElementById('homeCategoryPrevBtn')?.addEventListener('click', () => window.scrollCards(-1));
    document.getElementById('homeCategoryNextBtn')?.addEventListener('click', () => window.scrollCards(1));
}

/* navbar page: analytics, navigation, product interactions, and responsive behavior. */
document.querySelectorAll('[data-s90-search-toggle]').forEach((button) => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const input = panel?.querySelector('input[type="search"]');
    if (!panel) return;
    button.addEventListener('click', () => {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        button.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) input?.focus();
    });
    panel.addEventListener('submit', () => {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
    });
    panel.querySelector('[data-s90-search-close]')?.addEventListener('click', () => {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        button.focus();
    });
});

document.querySelectorAll('[data-s90-menu-toggle]').forEach((button) => {
    button.addEventListener('click', (event) => {
        event.preventDefault();
        const menu = document.getElementById('mobileNavMenu');
        if (!menu) return;
        if (window.bootstrap?.Offcanvas) {
            window.bootstrap.Offcanvas.getOrCreateInstance(menu).show();
            return;
        }
        menu.classList.add('s90-menu-fallback-open');
        menu.setAttribute('aria-modal', 'true');
        menu.setAttribute('role', 'dialog');
        document.body.classList.add('s90-menu-fallback-active');
    });
});

document.querySelectorAll('.s90-mobile-nav-panel, .s90-sidebar-panel').forEach((panel) => {
    panel.querySelectorAll('[data-bs-dismiss="offcanvas"], .btn-close').forEach((button) => {
        button.addEventListener('click', () => {
            if (window.bootstrap?.Offcanvas) return;
            panel.classList.remove('s90-menu-fallback-open');
            panel.removeAttribute('aria-modal');
            panel.removeAttribute('role');
            document.body.classList.remove('s90-menu-fallback-active');
        });
    });
});

document.querySelectorAll('.s90-sidebar-panel .category-filter').forEach((link) => {
    link.addEventListener('click', () => {
        const panel = link.closest('.s90-sidebar-panel');
        if (!panel) return;
        if (window.bootstrap?.Offcanvas) {
            window.bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
        } else {
            panel.classList.remove('s90-menu-fallback-open');
            panel.removeAttribute('aria-modal');
            panel.removeAttribute('role');
            document.body.classList.remove('s90-menu-fallback-active');
        }
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.s90-menu-fallback-open').forEach((panel) => {
        panel.classList.remove('s90-menu-fallback-open');
        panel.removeAttribute('aria-modal');
        panel.removeAttribute('role');
    });
    document.body.classList.remove('s90-menu-fallback-active');
});

document.querySelectorAll('[data-s90-open-categories]').forEach((button) => {
    button.addEventListener('click', () => {
        const menu = document.getElementById('mobileNavMenu');
        const categories = document.getElementById('sidebarMenu');
        if (!categories) return;
        if (!window.bootstrap?.Offcanvas) {
            menu?.classList.remove('s90-menu-fallback-open');
            categories.classList.add('s90-menu-fallback-open');
            categories.setAttribute('aria-modal', 'true');
            categories.setAttribute('role', 'dialog');
            document.body.classList.add('s90-menu-fallback-active');
            return;
        }
        const openCategories = () => window.bootstrap.Offcanvas.getOrCreateInstance(categories).show();
        if (menu && menu.classList.contains('show')) {
            menu.addEventListener('hidden.bs.offcanvas', openCategories, { once: true });
            window.bootstrap.Offcanvas.getOrCreateInstance(menu).hide();
        } else {
            openCategories();
        }
    });
});

if (document.body.dataset.page === 'navbar' || (!document.body.dataset.page && document.querySelector('.navbar'))) {
    (() => {
        (() => {
            const gaId = 'G-M0RPJXHL0D';
            let gaLoaded = false;

            function loadGA() {
                if (gaLoaded) return;
                gaLoaded = true;

                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
                document.head.appendChild(script);

                window.dataLayer = window.dataLayer || [];
                window.gtag = function () { dataLayer.push(arguments); };
                window.gtag('js', new Date());
                window.gtag('config', gaId, { anonymize_ip: true });
            }

            ['pointerdown', 'keydown', 'scroll'].forEach((eventName) => {
                window.addEventListener(eventName, loadGA, { once: true, passive: true });
            });
        })();

        document.addEventListener('DOMContentLoaded', function () {
            const carousel = document.querySelector('#carouselExampleIndicators');
            new bootstrap.Carousel(carousel, {
                interval: 3000, // Auto-slide every 3 seconds
                ride: 'carousel'
            });
        });
    })();
}

/* S90 compact navbar search and offcanvas navigation */
(function(){
  const toggle=document.querySelector('[data-s90-search-toggle]');
  const close=document.querySelector('[data-s90-search-close]');
  const panel=document.getElementById('mobileSearchPanel');
  const input=document.getElementById('navbarSearchMobile');
  if(toggle&&panel){toggle.addEventListener('click',function(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');window.setTimeout(function(){input&&input.focus()},30)});}
  if(close&&panel){close.addEventListener('click',function(){panel.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');if(input)input.value='';input&&input.dispatchEvent(new Event('input',{bubbles:true}));});}
  document.querySelectorAll('[data-s90-open-categories]').forEach(function(button){button.addEventListener('click',function(){const menu=document.getElementById('mobileNavMenu');const sidebar=document.getElementById('sidebarMenu');const run=function(){if(menu&&window.bootstrap)window.bootstrap.Offcanvas.getOrCreateInstance(menu).hide();if(sidebar&&window.bootstrap)window.bootstrap.Offcanvas.getOrCreateInstance(sidebar).show();};if(menu&&window.bootstrap){menu.addEventListener('hidden.bs.offcanvas',run,{once:true});window.bootstrap.Offcanvas.getOrCreateInstance(menu).hide()}else if(sidebar&&window.bootstrap)window.bootstrap.Offcanvas.getOrCreateInstance(sidebar).show();});});
})();
