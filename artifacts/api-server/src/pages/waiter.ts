import { BRAND, fontLinks, tokens, baseStyles, icon } from './theme';

export function waiterPage(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Waiter — ${BRAND.name}</title>
  ${fontLinks()}
  <style>
    ${tokens('espresso')}
    ${baseStyles()}

    /* LOGIN */
    #loginView { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .login-card { padding: 40px; max-width: 380px; width: 100%; }
    .login-card h1 { font-family: var(--font-display); font-size: 2.2rem; margin-bottom: 4px; color: var(--brand); display: flex; align-items: center; gap: 10px; }
    .login-card h1 svg { width: 1.5rem; height: 1.5rem; }
    .login-card .sub { color: var(--ink-soft); font-size: .92rem; margin-bottom: 26px; }
    .login-err { color: var(--red); font-size: .85rem; margin-top: 10px; display: none; }

    /* DASHBOARD */
    #dashView { display: none; }
    .topbar { background: var(--surface); border-bottom: 1.5px solid var(--line); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .topbar h1 { font-family: var(--font-display); font-size: 1.7rem; color: var(--brand); display: flex; align-items: center; gap: 8px; }
    .topbar h1 svg { width: 1.4rem; height: 1.4rem; }

    /* TABS */
    .tabs { display: flex; gap: 0; background: var(--surface); border-bottom: 1px solid var(--line); padding: 0 20px; }
    .tab-btn { background: none; border: none; color: var(--ink-soft); padding: 14px 16px; font-size: .9rem; font-weight: 700; cursor: pointer; border-bottom: 2.5px solid transparent; transition: all .2s; font-family: var(--font-body); }
    .tab-btn.active { color: var(--brand); border-bottom-color: var(--brand); }

    /* CONTENT */
    .content { padding: 20px; max-width: 900px; margin: 0 auto; }

    /* ORDER CARDS */
    .orders-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 16px; }
    .order-card { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow-soft); }
    .order-card.ready { border-color: var(--green); }
    .order-card.preparing { border-color: var(--blue); opacity: .8; }
    .order-card.received { opacity: .55; }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; }
    .order-table { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; }
    .order-customer { font-size: .85rem; color: var(--ink-soft); margin-bottom: 10px; }
    .order-items { list-style: none; margin-bottom: 14px; }
    .order-items li { font-size: .9rem; padding: 5px 0; border-bottom: 1px dashed var(--line); }
    .order-items li:last-child { border: none; }
    .item-qty { font-weight: 800; color: var(--brand); margin-right: 6px; }
    .empty-state .icon { font-size: 3rem; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div id="loginView">
    <div class="login-card card">
      <h1 class="display">${icon('utensils')} Waiter</h1>
      <p class="sub">Sign in to view and serve orders</p>
      <div class="field"><label>Username</label><input type="text" id="wUsername" placeholder="Enter username" autocomplete="username"></div>
      <div class="field"><label>Password</label><input type="password" id="wPassword" placeholder="Enter password" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"></div>
      <button class="btn btn-primary btn-block" onclick="doLogin()">Sign In</button>
      <div class="login-err" id="loginErr"></div>
    </div>
  </div>

  <div id="dashView">
    <div class="topbar">
      <h1 class="display">${icon('utensils')} Waiter Panel</h1>
      <button class="btn btn-ghost btn-sm" onclick="doLogout()">${icon('logout')} Sign Out</button>
    </div>
    <div class="tabs">
      <button class="tab-btn active" id="tabReady" onclick="switchTab('ready')">Ready to Serve</button>
      <button class="tab-btn" id="tabActive" onclick="switchTab('active')">All Active</button>
    </div>
    <div class="content">
      <div id="ordersList"></div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const ICONS = { check: \`${icon('check')}\` };
    let currentTab = 'ready';
    let refreshTimer = null;

    async function doLogin() {
      const u = document.getElementById('wUsername').value.trim();
      const p = document.getElementById('wPassword').value;
      if (!u || !p) { showErr('Enter username and password'); return; }
      try {
        const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p}) });
        if (!r.ok) { const d=await r.json(); showErr(d.error||'Invalid credentials'); return; }
        const me = await r.json();
        if (me.role !== 'waiter' && me.role !== 'kitchen' && me.role !== 'admin') { showErr('Access denied — waiter role required'); return; }
        showDash();
      } catch { showErr('Login failed. Please try again.'); }
    }

    function showErr(msg) {
      const e = document.getElementById('loginErr');
      e.textContent = msg; e.style.display = 'block';
    }

    function showDash() {
      document.getElementById('loginView').style.display = 'none';
      document.getElementById('dashView').style.display = 'block';
      loadOrders();
      refreshTimer = setInterval(loadOrders, 20000);
    }

    async function doLogout() {
      clearInterval(refreshTimer);
      await fetch('/api/auth/logout', { method:'POST' }).catch(() => {});
      document.getElementById('dashView').style.display = 'none';
      document.getElementById('loginView').style.display = 'flex';
      document.getElementById('wPassword').value = '';
    }

    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tabReady').classList.toggle('active', tab === 'ready');
      document.getElementById('tabActive').classList.toggle('active', tab === 'active');
      loadOrders();
    }

    async function loadOrders() {
      try {
        const r = await fetch('/api/orders');
        if (!r.ok) return;
        let orders = await r.json();
        if (currentTab === 'ready') {
          orders = orders.filter(o => o.status === 'ready');
        }
        renderOrders(orders);
      } catch {}
    }

    function renderOrders(orders) {
      const el = document.getElementById('ordersList');
      if (!orders.length) {
        const msg = currentTab === 'ready' ? 'No orders ready to serve' : 'No active orders';
        el.innerHTML = '<div class="empty-state"><div class="icon">✅</div><div>' + msg + '</div></div>';
        return;
      }
      const badgeMap = { ready:'badge-green', preparing:'badge-blue', received:'badge-muted' };
      el.innerHTML = '<div class="orders-grid">' + orders.map(o => {
        const age = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
        const items = (o.items||[]).map(i => '<li><span class="item-qty">×' + i.quantity + '</span>' + esc(i.name) + (i.specialInstructions ? ' <em style="color:var(--ink-soft);font-size:0.8rem">(' + esc(i.specialInstructions) + ')</em>' : '') + '</li>').join('');
        const serveBtn = o.status === 'ready'
          ? '<button class="btn btn-success btn-block" onclick="markServed(\\'' + o.id + '\\', this)">' + ICONS.check + ' Mark Served</button>'
          : '';
        return '<div class="order-card ' + o.status + '">' +
          '<div class="order-header"><div class="order-table display">Table ' + (o.tableNumber||'?') + '</div><span class="badge ' + (badgeMap[o.status]||'badge-muted') + '">' + o.status + '</span></div>' +
          '<div class="order-customer">' + esc(o.customerName||'') + ' · ' + age + ' min ago</div>' +
          '<ul class="order-items">' + items + '</ul>' +
          serveBtn +
        '</div>';
      }).join('') + '</div>';
    }

    async function markServed(orderId, btn) {
      btn.disabled = true;
      btn.textContent = 'Serving…';
      try {
        const r = await fetch('/api/orders/' + orderId + '/status', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ status:'served' })
        });
        if (r.ok) { toast('Order marked served'); loadOrders(); }
        else { const d=await r.json(); toast(d.error||'Failed',true); btn.disabled=false; btn.innerHTML = ICONS.check + ' Mark Served'; }
      } catch { toast('Network error',true); btn.disabled=false; btn.innerHTML = ICONS.check + ' Mark Served'; }
    }

    let toastTimer;
    function toast(msg, isErr) {
      clearTimeout(toastTimer);
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show ' + (isErr ? 'toast-error' : 'toast-success');
      toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
    }

    function esc(s) { return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  </script>
</body>
</html>`;
}
