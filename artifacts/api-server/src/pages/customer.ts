import { BRAND, fontLinks, tokens, baseStyles, icon } from './theme';

export function customerPage(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${BRAND.name} — Order Now</title>
  ${fontLinks()}
  <style>
    ${tokens('paper')}
    ${baseStyles()}

    /* HEADER */
    .header {
      background: var(--surface); border: 1.5px solid var(--line); border-bottom: 3px solid var(--brand);
      padding: 18px 20px; text-align: center; margin: 12px 12px 0;
      border-radius: var(--radius); box-shadow: var(--shadow-soft);
    }
    .header h1 { font-size: 2.7rem; color: var(--ink); }
    .header .tagline { color: var(--ink-soft); font-size: 1.05rem; margin: 0 0 12px; font-weight: 600; }
    .table-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--surface); border: 2px solid var(--brand); color: var(--brand-deep);
      border-radius: var(--pill); padding: 7px 16px; font-size: 1.05rem; font-weight: 700;
    }
    .table-badge svg { color: var(--brand); }
    .table-input {
      border: none; background: transparent; width: 54px;
      font-size: 1.05rem; font-family: var(--font-body); font-weight: 800;
      color: var(--ink); text-align: center; outline: none;
    }
    .table-input::placeholder { color: var(--ink-soft); }
    .link-btn {
      display: inline-flex; align-items: center; gap: 5px; margin-top: 10px;
      background: none; border: none; color: var(--brand);
      font-family: var(--font-body); font-weight: 700; font-size: .92rem; cursor: pointer;
    }
    .link-btn:hover { color: var(--brand-deep); text-decoration: underline; }

    /* CONTROLS */
    .controls {
      background: var(--surface); border: 1.5px solid var(--line);
      padding: 14px 16px; margin: 10px 12px 0; border-radius: var(--radius);
      box-shadow: var(--shadow-soft); position: sticky; top: 8px; z-index: 50;
    }
    .search-wrap { position: relative; margin-bottom: 12px; }
    .search-wrap > svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--ink-soft); pointer-events: none; }
    .search-box {
      width: 100%; padding: 11px 16px 11px 44px;
      border: 1.5px solid var(--line); border-radius: var(--pill);
      font-size: 1rem; font-family: var(--font-body); background: var(--surface);
      color: var(--ink); outline: none; transition: border-color .2s, box-shadow .2s;
    }
    .search-box:focus { border-color: var(--brand); box-shadow: var(--ring); }
    .filter-btns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 10px; }
    .filter-btn {
      display: inline-flex; align-items: center; gap: 5px;
      background: var(--surface-2); color: var(--ink); border: 1.5px solid transparent;
      padding: 6px 14px; border-radius: var(--pill); font-size: .92rem;
      font-family: var(--font-body); font-weight: 700; cursor: pointer; transition: all .2s;
    }
    .filter-btn:hover { border-color: var(--line); }
    .filter-btn.active { background: var(--brand); color: #fff; border-color: var(--brand-deep); }
    .cat-tabs { display: flex; gap: 6px; padding-top: 10px; border-top: 1.5px dashed var(--line); flex-wrap: wrap; justify-content: center; }
    .cat-tab {
      font-family: var(--font-body); font-weight: 700; font-size: .9rem;
      padding: 5px 13px; border-radius: var(--pill); color: var(--ink-soft);
      background: none; border: none; cursor: pointer; transition: all .2s;
    }
    .cat-tab:hover { color: var(--ink); background: var(--surface-2); }
    .cat-tab.active { background: var(--brand-tint); color: var(--brand-deep); }

    /* MENU */
    .menu-wrap { padding: 12px 12px 130px; }
    .cat-section {
      background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius);
      padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-soft); overflow: hidden;
    }
    .cat-title { font-family: var(--font-display); font-size: 2rem; color: var(--ink); margin-bottom: 14px; text-align: center; }
    .cat-title::after { content: ''; display: block; width: 60px; height: 3px; background: var(--brand); border-radius: 3px; margin: 4px auto 0; }

    /* SLIDER — mobile: horizontal paging, desktop: grid */
    .slider-wrap { overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; display: flex; scrollbar-width: none; gap: 12px; }
    .slider-wrap::-webkit-scrollbar { display: none; }
    .slide { min-width: 100%; scroll-snap-align: start; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-shrink: 0; }

    /* DOTS */
    .dots { display: flex; justify-content: center; gap: 7px; margin-top: 14px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line); cursor: pointer; transition: all .2s; border: none; padding: 0; }
    .dot.active { background: var(--brand); transform: scale(1.3); }

    /* CARD */
    .menu-item {
      background: var(--surface); border: 1.5px solid var(--line); border-left: 4px solid var(--brand);
      border-radius: var(--radius-sm); overflow: hidden; box-shadow: var(--shadow-sketch);
      transition: transform .2s, box-shadow .2s; display: flex; flex-direction: column;
    }
    .menu-item:hover { transform: translateY(-3px); box-shadow: 4px 7px 0 rgba(42,37,32,0.13); }
    .item-image { width: 100%; height: 130px; object-fit: cover; display: block; flex-shrink: 0; border-bottom: 2px dashed var(--line); }
    .item-image-ph { width: 100%; height: 130px; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; background: var(--surface-2); color: var(--ink-soft); border-bottom: 2px dashed var(--line); }
    .item-content { padding: 12px 14px; display: flex; flex-direction: column; flex: 1; }
    .item-name { font-weight: 800; font-size: 1.08rem; color: var(--ink); margin-bottom: 6px; line-height: 1.25; }
    .item-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
    .item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; gap: 8px; }
    .item-price { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--brand-deep); }
    .qty-ctrl { display: flex; align-items: center; gap: 8px; }
    .qty-btn {
      background: var(--brand); color: #fff; border: 2px solid var(--brand-deep); border-radius: 50%;
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform .15s, background .15s; flex-shrink: 0;
    }
    .qty-btn:hover { background: var(--brand-deep); transform: scale(1.08); }
    .qty-btn:active { transform: scale(.92); }
    .qty-btn svg { width: 16px; height: 16px; }
    .qty-display { font-weight: 800; font-size: 1.1rem; min-width: 22px; text-align: center; }
    .qty-display.bump { animation: bump .35s; }
    @keyframes bump { 0%,100% { transform: scale(1); } 40% { transform: scale(1.4); color: var(--brand); } }

    /* DESKTOP */
    @media (min-width: 700px) {
      .slider-wrap { overflow: visible; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; scroll-snap-type: none; }
      .slide { display: contents; min-width: unset; }
      .dots { display: none; }
      .item-image, .item-image-ph { height: 180px; }
      .item-content { padding: 14px 16px; }
      .item-name { font-size: 1.18rem; }
    }

    /* CART BAR */
    .cart-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
      background: var(--surface); border-top: 2px solid var(--brand);
      padding: 14px 18px; box-shadow: 0 -6px 20px rgba(74,52,28,0.12);
      transform: translateY(120%); transition: transform .3s ease;
    }
    .cart-bar.visible { transform: translateY(0); }
    .cart-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .cart-info { display: flex; align-items: center; gap: 10px; font-weight: 700; }
    .cart-count-chip { background: var(--brand); color: #fff; border-radius: var(--pill); padding: 3px 11px; font-size: .85rem; font-weight: 800; }
    .cart-total { font-family: var(--font-display); font-size: 1.6rem; color: var(--brand-deep); }

    /* MENU SKELETON */
    .skel-section { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-soft); }
    .skel-title { height: 26px; width: 160px; margin: 0 auto 16px; }
    .skel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .skel-card { height: 220px; }
    @media (min-width: 700px) { .skel-grid { grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); } }

    /* MODAL ITEMS */
    .summary-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed var(--line); gap: 10px; }
    .summary-item:last-of-type { border-bottom: none; }
    .mi-name { font-weight: 700; font-size: 1.05rem; color: var(--ink); margin-bottom: 2px; }
    .mi-sub { color: var(--ink-soft); font-size: .9rem; }
    .mi-ctrl { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .adj-btn { background: var(--surface-2); color: var(--ink); border: 1.5px solid var(--line); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; }
    .adj-btn:hover { background: var(--brand); color: #fff; border-color: var(--brand-deep); }
    .adj-btn svg { width: 15px; height: 15px; }
    .summary-total { display: flex; justify-content: space-between; align-items: baseline; padding-top: 16px; margin-top: 4px; border-top: 3px solid var(--brand); }
    .summary-total .st-label { font-weight: 700; font-size: 1.1rem; }
    .summary-total .st-amt { font-family: var(--font-display); font-size: 2rem; color: var(--brand-deep); }
    .modal-actions { display: flex; gap: 10px; margin-top: 22px; }

    /* TOP NOTICE */
    .notice {
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-160%);
      background: var(--ink); color: var(--surface); padding: 12px 20px; border-radius: var(--radius-sm);
      font-size: .95rem; font-weight: 600; z-index: 400; transition: transform .35s ease;
      pointer-events: none; max-width: 90%; text-align: center; box-shadow: var(--shadow-soft);
      border: 1.5px solid var(--brand); white-space: pre-line;
    }
    .notice.show { transform: translateX(-50%) translateY(0); }

    /* SUCCESS */
    .success-wrap { text-align: center; padding: 10px 0; }
    .success-check { width: 72px; height: 72px; border-radius: 50%; background: var(--green-bg); border: 3px solid var(--green); color: var(--green-deep); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; animation: pop .45s cubic-bezier(.34,1.56,.64,1); }
    .success-check svg { width: 36px; height: 36px; }
    @keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }
    .success-title { font-family: var(--font-display); font-size: 2.2rem; color: var(--brand-deep); margin-bottom: 6px; }
    .order-receipt-box { background: var(--surface-2); border: 1.5px dashed var(--line); border-radius: var(--radius-sm); padding: 16px; margin: 14px 0 20px; }

    /* CHAT BUBBLE */
    #chatBubble { position: fixed; bottom: 84px; right: 16px; z-index: 250; }
    #chatToggle {
      width: 56px; height: 56px; border-radius: 50%; background: var(--brand); color: #fff;
      border: 2px solid var(--brand-deep); cursor: pointer; box-shadow: var(--shadow-soft);
      transition: transform .2s, background .2s; display: flex; align-items: center; justify-content: center;
    }
    #chatToggle svg { width: 26px; height: 26px; }
    #chatToggle:hover { background: var(--brand-deep); transform: scale(1.08); }
    #chatPanel {
      display: none; flex-direction: column; position: absolute; bottom: 66px; right: 0;
      width: 330px; height: 440px; max-height: 64vh; background: var(--surface);
      border: 1.5px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow-soft); overflow: hidden;
    }
    @media (max-width: 380px) { #chatPanel { width: 92vw; right: -8px; } }
    #chatHeader { background: var(--brand); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
    #chatHeader span { font-size: 1.05rem; font-weight: 800; display: flex; align-items: center; gap: 7px; }
    #chatHeader button { background: none; border: none; color: #fff; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background .2s; }
    #chatHeader button:hover { background: rgba(255,255,255,0.2); }
    #chatMessages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .chat-msg { max-width: 86%; padding: 9px 13px; border-radius: 16px; font-size: 1rem; line-height: 1.4; word-break: break-word; }
    .chat-msg-user { background: var(--brand); color: #fff; align-self: flex-end; border-bottom-right-radius: 5px; }
    .chat-msg-assistant { background: var(--surface-2); color: var(--ink); align-self: flex-start; border: 1px solid var(--line); border-bottom-left-radius: 5px; }
    .chat-typing { display: flex; align-items: center; gap: 5px; padding: 11px 14px; }
    .chat-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-soft); animation: chatBounce 1.2s ease-in-out infinite; display: block; }
    .chat-typing span:nth-child(2) { animation-delay: .2s; }
    .chat-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes chatBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    #chatInputArea { display: flex; padding: 9px 10px; gap: 7px; border-top: 1.5px solid var(--line); flex-shrink: 0; background: var(--surface); }
    #chatInput { flex: 1; padding: 9px 14px; border: 1.5px solid var(--line); border-radius: var(--pill); font-size: 1rem; font-family: var(--font-body); background: var(--surface); color: var(--ink); outline: none; transition: border-color .2s; }
    #chatInput:focus { border-color: var(--brand); }
    #chatSend { background: var(--brand); color: #fff; border: 2px solid var(--brand-deep); border-radius: 50%; width: 38px; height: 38px; cursor: pointer; flex-shrink: 0; transition: background .2s; display: flex; align-items: center; justify-content: center; }
    #chatSend svg { width: 17px; height: 17px; }
    #chatSend:hover { background: var(--brand-deep); }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="display">${BRAND.name}</h1>
    <p class="tagline">${BRAND.tagline}</p>
    <div class="table-badge">
      ${icon('table')} Table&nbsp;<input type="number" id="tableInput" class="table-input" placeholder="?" min="1" max="50">
    </div>
    <br>
    <button class="link-btn" onclick="showLookupModal()">${icon('pin')} Find my previous order</button>
  </div>

  <div class="controls">
    <div class="search-wrap">
      ${icon('search')}
      <input type="text" id="searchBox" class="search-box" placeholder="Search menu items..." oninput="filterMenu()">
    </div>
    <div class="filter-btns">
      <button class="filter-btn active" onclick="setFilter('all',this)">All Items</button>
      <button class="filter-btn" onclick="setFilter('popular',this)">${icon('star')} Popular</button>
      <button class="filter-btn" onclick="setFilter('vegetarian',this)">${icon('leaf')} Vegetarian</button>
      <button class="filter-btn" onclick="setFilter('non-spicy',this)">Non Spicy</button>
      <button class="filter-btn" onclick="setFilter('spicy',this)">${icon('flame')} Spicy</button>
    </div>
    <div class="cat-tabs" id="catTabs"></div>
  </div>

  <div class="menu-wrap" id="menuWrap"></div>

  <div class="cart-bar" id="cartBar">
    <div class="cart-inner">
      <div class="cart-info">
        ${icon('cart')}
        <span class="cart-count-chip" id="cartCount">0</span>
        <span class="cart-total" id="cartTotal">Rs. 0</span>
      </div>
      <button class="btn btn-success" onclick="showModal()">Review Order ${icon('back')}</button>
    </div>
  </div>

  <div class="notice" id="notice"></div>
  <div class="toast" id="toast"></div>

  <div class="overlay" id="overlay">
    <div class="modal">
      <div class="modal-head">
        <h2 id="modalTitle">Order Summary</h2>
        <button class="btn btn-icon btn-ghost btn-sm" onclick="hideModal()">${icon('close')}</button>
      </div>
      <div id="modalBody"></div>
    </div>
  </div>

  <!-- ORDER LOOKUP MODAL -->
  <div class="overlay" id="lookupOverlay">
    <div class="modal">
      <div class="modal-head">
        <h2>Find My Order</h2>
        <button class="btn btn-icon btn-ghost btn-sm" onclick="hideLookupModal()">${icon('close')}</button>
      </div>
      <div id="lookupBody">
        <p style="color:var(--ink-soft);font-size:1rem;margin-bottom:14px">Enter the phone number you used when ordering:</p>
        <div class="field">
          <input type="tel" id="lookupPhone" class="input" placeholder="e.g. 0300-1234567" onkeydown="if(event.key==='Enter')doLookup()">
        </div>
        <button class="btn btn-primary btn-block" onclick="doLookup()">${icon('search')} Look Up</button>
        <div id="lookupResults" style="margin-top:14px"></div>
      </div>
    </div>
  </div>

  <div id="chatBubble">
    <div id="chatPanel">
      <div id="chatHeader">
        <span>${icon('chat')} Menu Assistant</span>
        <button id="chatClose">${icon('close')}</button>
      </div>
      <div id="chatMessages"></div>
      <div id="chatInputArea">
        <input type="text" id="chatInput" placeholder="Ask about the menu...">
        <button id="chatSend">${icon('send')}</button>
      </div>
    </div>
    <button id="chatToggle">${icon('chat')}</button>
  </div>

  <script>
    const ICONS = {
      plus: \`${icon('plus')}\`,
      minus: \`${icon('minus')}\`,
      check: \`${icon('check')}\`,
      pin: \`${icon('pin')}\`,
      star: \`${icon('star')}\`,
      leaf: \`${icon('leaf')}\`,
      flame: \`${icon('flame')}\`,
    };

    function esc(s) { return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    let menuData = [];
    let cart = {};
    let custName = '';
    let custPhone = '';
    let activeFilter = 'all';
    let activeCategory = 'all';
    const urlParams = new URLSearchParams(location.search);
    const urlToken = urlParams.get('t');
    const chatSessionId = crypto.randomUUID();

    function saveCart() { try { localStorage.setItem('rms_cart', JSON.stringify(cart)); } catch {} }
    function loadCart() {
      try { const raw = localStorage.getItem('rms_cart'); if (raw) cart = JSON.parse(raw); } catch {}
    }

    function renderSkeleton() {
      const wrap = document.getElementById('menuWrap');
      const cards = Array.from({length:4}).map(()=>'<div class="skeleton skel-card"></div>').join('');
      wrap.innerHTML = Array.from({length:2}).map(()=>
        '<div class="skel-section"><div class="skeleton skel-title"></div><div class="skel-grid">'+cards+'</div></div>'
      ).join('');
    }

    document.addEventListener('DOMContentLoaded', async () => {
      loadCart();
      renderSkeleton();
      try {
        const res = await fetch('/api/menu');
        if (!res.ok) throw new Error('status ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('bad payload');
        menuData = data;
      } catch {
        showMenuError();
        return;
      }
      // Reconcile: drop cart items that are no longer on the menu
      for (const id of Object.keys(cart)) {
        if (!menuData.find(m => m.id == id)) delete cart[id];
      }
      buildCatTabs();
      filterMenu();
      refreshCartBar();
      setInterval(refreshMenu, 30000);
    });

    function showMenuError() {
      document.getElementById('menuWrap').innerHTML =
        '<div class="empty-state"><span class="empty-icon">📡</span>' +
        '<p>Could not load the menu — please check your connection.</p>' +
        '<button class="btn btn-primary" style="margin-top:14px" onclick="location.reload()">Retry</button></div>';
    }

    async function refreshMenu() {
      try {
        const res = await fetch('/api/menu');
        if (!res.ok) return;
        const fresh = await res.json();
        const freshIds = new Set(fresh.map(i => i.id));
        const removedNames = [];
        for (const id of Object.keys(cart)) {
          if (!freshIds.has(parseInt(id))) {
            const item = menuData.find(m => m.id == id);
            if (item) removedNames.push(item.name);
            delete cart[id];
          }
        }
        const getCats = arr => [...new Set(arr.map(i => i.category))].sort().join(',');
        const catsChanged = getCats(fresh) !== getCats(menuData);
        menuData = fresh;
        if (catsChanged) buildCatTabs();
        filterMenu();
        refreshCartBar();
        if (removedNames.length) {
          const names = removedNames.length === 1 ? removedNames[0] + ' is' : removedNames.join(', ') + ' are';
          showNotice(names + ' no longer available and ' + (removedNames.length === 1 ? 'has' : 'have') + ' been removed from your cart.');
        }
      } catch { /* silent on network error */ }
    }

    let noticeTimer;
    function showNotice(msg) {
      const el = document.getElementById('notice');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => el.classList.remove('show'), 5000);
    }

    let toastTimer;
    function toast(msg, kind) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.className = 'toast show' + (kind ? ' toast-' + kind : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    }

    function buildCatTabs() {
      const cats = ['all', ...new Set(menuData.filter(i => i.available !== false).map(i => i.category))];
      document.getElementById('catTabs').innerHTML = cats.map(c =>
        \`<button class="cat-tab \${c==='all'?'active':''}" onclick="setCat(\${JSON.stringify(c)},this)">\${c==='all'?'All':esc(c)}</button>\`
      ).join('');
    }

    function setCat(cat, btn) {
      activeCategory = cat;
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterMenu();
    }

    function setFilter(f, btn) {
      activeFilter = f;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterMenu();
    }

    function filterMenu() {
      const q = document.getElementById('searchBox').value.toLowerCase();
      const filtered = menuData.filter(i => {
        if (i.available === false) return false;
        const ok = !q || i.name.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
        if (!ok) return false;
        if (activeCategory !== 'all' && i.category !== activeCategory) return false;
        if (activeFilter === 'popular') return i.popular;
        if (activeFilter === 'vegetarian') return i.is_vegetarian;
        if (activeFilter === 'non-spicy') return i.spice_level === 0;
        if (activeFilter === 'spicy') return i.spice_level >= 2;
        return true;
      });
      renderMenu(filtered);
    }

    function cardHtml(item) {
      const qty = cart[item.id] || 0;
      const img = item.image_url
        ? \`<img src="\${esc(item.image_url)}" alt="\${esc(item.name)}" class="item-image" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'item-image-ph',textContent:'🍽️'}))">\`
        : '<div class="item-image-ph">🍽️</div>';
      const spiceLabels = ['','Mild','Medium','Spicy'];
      const badges = [
        item.popular ? \`<span class="badge badge-brand">\${ICONS.star} Popular</span>\` : '',
        item.is_vegetarian ? \`<span class="badge badge-green">\${ICONS.leaf} Veg</span>\` : '',
        item.spice_level > 0 ? \`<span class="badge badge-red">\${ICONS.flame} \${spiceLabels[item.spice_level]}</span>\` : '',
      ].filter(Boolean).join('');
      return \`<div class="menu-item">
        \${img}
        <div class="item-content">
          <div class="item-name">\${esc(item.name)}</div>
          \${badges ? \`<div class="item-badges">\${badges}</div>\` : ''}
          <div class="item-footer">
            <div class="qty-ctrl">
              <button class="qty-btn" aria-label="Remove one" onclick="updateCart(\${item.id},-1)">\${ICONS.minus}</button>
              <span class="qty-display" id="qty-\${item.id}">\${qty}</span>
              <button class="qty-btn" aria-label="Add one" onclick="updateCart(\${item.id},1)">\${ICONS.plus}</button>
            </div>
            <span class="item-price">Rs.\${parseFloat(item.price).toFixed(0)}</span>
          </div>
        </div>
      </div>\`;
    }

    function renderMenu(items) {
      const wrap = document.getElementById('menuWrap');
      if (!items.length) {
        wrap.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>No items found</p></div>';
        return;
      }
      const byCategory = {};
      items.forEach(i => { (byCategory[i.category] ??= []).push(i); });
      wrap.innerHTML = Object.entries(byCategory).map(([cat, its]) => {
        const pages = [];
        for (let i = 0; i < its.length; i += 4) pages.push(its.slice(i, i + 4));
        const catId = 'sw-' + cat.replace(/\\W/g, '_');
        const dots = pages.length > 1
          ? \`<div class="dots">\${pages.map((_,i) => \`<button class="dot \${i===0?'active':''}" onclick="goSlide('\${catId}',\${i})"></button>\`).join('')}</div>\`
          : '';
        return \`<div class="cat-section">
          <div class="cat-title display">\${esc(cat)}</div>
          <div class="slider-wrap" id="\${catId}" onscroll="syncDots('\${catId}')">
            \${pages.map(page => \`<div class="slide">\${page.map(cardHtml).join('')}</div>\`).join('')}
          </div>
          \${dots}
        </div>\`;
      }).join('');
    }

    function goSlide(id, idx) {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollTo({ left: el.offsetWidth * idx, behavior: 'smooth' });
    }

    function syncDots(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.offsetWidth);
      el.parentElement.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    function updateCart(id, delta) {
      const next = Math.max(0, (cart[id] || 0) + delta);
      if (next === 0) delete cart[id]; else cart[id] = next;
      const el = document.getElementById('qty-' + id);
      if (el) {
        el.textContent = String(next);
        if (delta > 0) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      }
      refreshCartBar();
      saveCart();
    }

    function refreshCartBar() {
      const entries = Object.entries(cart);
      const totalQty = entries.reduce((s,[,q]) => s+q, 0);
      const totalAmt = entries.reduce((s,[id,q]) => {
        const mi = menuData.find(m => m.id == id);
        return s + (mi ? parseFloat(mi.price)*q : 0);
      }, 0);
      document.getElementById('cartCount').textContent = totalQty;
      document.getElementById('cartTotal').textContent = 'Rs. ' + totalAmt.toFixed(0);
      document.getElementById('cartBar').classList.toggle('visible', totalQty > 0);
    }

    function showModal() {
      if (!Object.keys(cart).length) return;
      document.getElementById('modalTitle').textContent = 'Order Summary';
      renderModalItems();
      document.getElementById('overlay').classList.add('show');
    }
    function hideModal() { document.getElementById('overlay').classList.remove('show'); }

    function showLookupModal() {
      document.getElementById('lookupOverlay').classList.add('show');
      document.getElementById('lookupResults').innerHTML = '';
      document.getElementById('lookupPhone').value = '';
      setTimeout(() => document.getElementById('lookupPhone').focus(), 80);
    }
    function hideLookupModal() { document.getElementById('lookupOverlay').classList.remove('show'); }

    async function doLookup() {
      const phone = document.getElementById('lookupPhone').value.trim();
      if (!phone) return;
      const el = document.getElementById('lookupResults');
      el.innerHTML = '<p style="color:var(--ink-soft);text-align:center">Searching…</p>';
      try {
        const r = await fetch('/api/orders/lookup?phone=' + encodeURIComponent(phone));
        const orders = await r.json();
        if (!orders.length) { el.innerHTML = '<p style="color:var(--ink-soft);text-align:center">No orders found for that number.</p>'; return; }
        el.innerHTML = orders.map(o => {
          const date = new Date(o.createdAt).toLocaleDateString('en-PK', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
          const badgeCls = {received:'badge-amber',preparing:'badge-blue',ready:'badge-green',served:'badge-muted',cancelled:'badge-red'}[o.status] || 'badge-muted';
          return '<div class="card" style="padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
            '<div><div style="font-weight:800;font-size:1.05rem">Table ' + (o.tableNumber||'?') + ' · Rs.' + parseFloat(o.totalAmount||0).toFixed(0) + '</div>' +
            '<div style="font-size:.82rem;color:var(--ink-soft)">' + date + '</div></div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
              '<span class="badge ' + badgeCls + '">' + o.status + '</span>' +
              '<a href="/orders/' + o.id + '/track" style="font-size:.85rem;font-weight:700">Track →</a>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch { el.innerHTML = '<p style="color:var(--ink-soft);text-align:center">Network error. Please try again.</p>'; }
    }

    function renderModalItems() {
      const entries = Object.entries(cart);
      let total = 0;
      const rows = entries.map(([id,qty]) => {
        const mi = menuData.find(m => m.id == id);
        if (!mi) return '';
        const sub = parseFloat(mi.price)*qty;
        total += sub;
        return \`<div class="summary-item">
          <div><div class="mi-name">\${esc(mi.name)}</div><div class="mi-sub">Rs.\${parseFloat(mi.price).toFixed(0)} × \${qty} = Rs.\${sub.toFixed(0)}</div></div>
          <div class="mi-ctrl">
            <button class="adj-btn" onclick="modalAdj(\${id},-1)">\${ICONS.minus}</button>
            <span style="font-weight:800;min-width:20px;text-align:center">\${qty}</span>
            <button class="adj-btn" onclick="modalAdj(\${id},1)">\${ICONS.plus}</button>
          </div>
        </div>\`;
      });
      custName = document.getElementById('cust-name')?.value ?? custName;
      custPhone = document.getElementById('cust-phone')?.value ?? custPhone;
      document.getElementById('modalBody').innerHTML = rows.join('') +
        \`<div class="summary-total"><span class="st-label">Total</span><span class="st-amt display">Rs. \${total.toFixed(0)}</span></div>
        <div style="margin-top:18px;padding-top:14px;border-top:2px dashed var(--line)">
          <div class="field">
            <label>Your Name *</label>
            <input type="text" id="cust-name" class="input" value="\${esc(custName)}" placeholder="e.g. Ahmed Ali" oninput="custName=this.value">
          </div>
          <div class="field" style="margin-bottom:0">
            <label>Phone Number *</label>
            <input type="tel" id="cust-phone" class="input" value="\${esc(custPhone)}" placeholder="e.g. 0300-1234567" oninput="custPhone=this.value">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-block" onclick="hideModal()">Cancel</button>
          <button class="btn btn-success btn-block" onclick="placeOrder()">Confirm Order</button>
        </div>\`;
    }

    function modalAdj(id, delta) {
      updateCart(id, delta);
      if (!Object.keys(cart).length) { hideModal(); return; }
      renderModalItems();
    }

    async function placeOrder() {
      const nameEl = document.getElementById('cust-name');
      const phoneEl = document.getElementById('cust-phone');
      const customerName = (nameEl?.value || '').trim();
      const customerPhone = (phoneEl?.value || '').trim();
      if (!customerName) { nameEl?.focus(); toast('Please enter your name', 'error'); return; }
      if (!customerPhone) { phoneEl?.focus(); toast('Please enter your phone number', 'error'); return; }
      const tableInput = document.getElementById('tableInput').value;
      if (!tableInput && !urlToken) { toast('Please enter your table number', 'error'); return; }
      const items = Object.entries(cart).map(([id,qty])=>({ menuItemId:parseInt(id), quantity:qty }));
      const orderBody = urlToken
        ? { tableToken: urlToken, items, customerName, customerPhone }
        : { tableNumber: parseInt(tableInput), items, customerName, customerPhone };
      try {
        const res = await fetch('/api/orders', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(orderBody),
        });
        if (!res.ok) { const e=await res.json(); toast(e.error||'Failed to place order', 'error'); return; }
        const order = await res.json();
        showSuccess(order);
        cart = {}; custName = ''; custPhone = '';
        try { localStorage.removeItem('rms_cart'); } catch {}
        document.querySelectorAll('.qty-display').forEach(el=>el.textContent='0');
        refreshCartBar();
      } catch { toast('Network error. Please try again.', 'error'); }
    }

    function showSuccess(order) {
      document.getElementById('modalTitle').textContent = 'Order Placed!';
      document.getElementById('modalBody').innerHTML = \`
        <div class="success-wrap">
          <div class="success-check">\${ICONS.check}</div>
          <div class="success-title display">Thank you!</div>
          <p style="color:var(--ink-soft);margin-bottom:16px;font-size:1.05rem">Ready in ~<strong>\${order.estimatedMinutes} min</strong></p>
          <div class="order-receipt-box">
            <p style="font-weight:800;font-size:1.2rem;margin-bottom:4px">Order #\${order.id.slice(-8).toUpperCase()}</p>
            <p style="color:var(--ink-soft)">Total: Rs. \${parseFloat(order.totalAmount).toFixed(0)}</p>
          </div>
          <a href="\${order.trackingUrl}" class="btn btn-primary btn-block btn-lg" style="margin-bottom:10px">\${ICONS.pin} Track Your Order</a>
          <button class="btn btn-ghost btn-block" onclick="hideModal()">Continue Ordering</button>
        </div>\`;
    }

    document.getElementById('overlay').addEventListener('click', e => { if (e.target===document.getElementById('overlay')) hideModal(); });
    document.getElementById('lookupOverlay').addEventListener('click', e => { if (e.target===document.getElementById('lookupOverlay')) hideLookupModal(); });

    // Chat bubble
    (function() {
      var chatOpen = false;
      var greeted = false;
      function toggleChat() {
        chatOpen = !chatOpen;
        document.getElementById('chatPanel').style.display = chatOpen ? 'flex' : 'none';
        if (chatOpen && !greeted) {
          greeted = true;
          appendChatMsg('assistant', "Hi! Ask me anything about our menu — what's vegetarian, what's spicy, what I'd recommend, etc.");
        }
      }
      function appendChatMsg(role, text) {
        var wrap = document.getElementById('chatMessages');
        var div = document.createElement('div');
        div.className = 'chat-msg chat-msg-' + role;
        div.textContent = text;
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
      }
      function sendChat() {
        var input = document.getElementById('chatInput');
        var msg = input.value.trim();
        if (!msg) return;
        input.value = '';
        input.disabled = true;
        document.getElementById('chatSend').disabled = true;
        appendChatMsg('user', msg);
        var wrap = document.getElementById('chatMessages');
        var typing = document.createElement('div');
        typing.className = 'chat-msg chat-msg-assistant chat-typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        wrap.appendChild(typing);
        wrap.scrollTop = wrap.scrollHeight;
        fetch('/api/ai/menu-chat', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ message: msg, sessionId: chatSessionId })
        }).then(function(res) {
          typing.remove();
          if (!res.ok) throw new Error();
          return res.json();
        }).then(function(data) {
          appendChatMsg('assistant', data.reply);
        }).catch(function() {
          typing.remove();
          appendChatMsg('assistant', "Sorry, I couldn't connect right now. Please try again.");
        }).finally(function() {
          input.disabled = false;
          document.getElementById('chatSend').disabled = false;
        });
      }
      document.getElementById('chatToggle').addEventListener('click', toggleChat);
      document.getElementById('chatClose').addEventListener('click', toggleChat);
      document.getElementById('chatSend').addEventListener('click', sendChat);
      document.getElementById('chatInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
      });
    }());
  </script>
</body>
</html>`;
}
