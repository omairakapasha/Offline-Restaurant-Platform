import { BRAND, fontLinks, tokens, baseStyles, icon } from './theme';

export function trackPage(orderId: string, vapidPublicKey: string = ''): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Track Order — ${BRAND.name}</title>
  ${fontLinks()}
  <style>
    ${tokens('paper')}
    ${baseStyles()}

    .header { background: var(--surface); border-bottom: 1.5px solid var(--line); padding: 16px 20px; position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow-soft); }
    .header-inner { max-width: 560px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
    .header h1 { font-family: var(--font-display); font-size: 1.9rem; color: var(--brand-deep); display: flex; align-items: center; gap: 8px; }
    .header h1 svg { color: var(--brand); width: 1.3rem; height: 1.3rem; }

    .content { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    .order-id { font-size: .85rem; color: var(--ink-soft); margin-bottom: 20px; font-weight: 600; }
    .order-id span { font-weight: 800; color: var(--ink); }

    .progress-card { padding: 28px 24px; margin-bottom: 18px; }
    .status-label { font-family: var(--font-display); font-size: 2rem; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .status-label svg { color: var(--brand); width: 1.6rem; height: 1.6rem; }
    .status-sub { font-size: .92rem; color: var(--ink-soft); margin-bottom: 28px; }
    .eta { display: inline-flex; align-items: center; gap: 6px; margin: -16px 0 24px; font-size: .9rem; font-weight: 700; color: var(--blue-deep); background: var(--blue-bg); padding: 6px 12px; border-radius: var(--pill); }
    .eta svg { width: 1em; height: 1em; }

    .steps { display: flex; align-items: flex-start; gap: 0; }
    .step { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .step-dot { width: 42px; height: 42px; border-radius: 50%; border: 2.5px solid var(--line); background: var(--surface); display: flex; align-items: center; justify-content: center; transition: all .4s; position: relative; z-index: 1; color: var(--ink-soft); }
    .step-dot svg { width: 20px; height: 20px; }
    .step-dot.done { background: var(--green); border-color: var(--green-deep); color: #fff; }
    .step-dot.active { background: var(--brand); border-color: var(--brand-deep); color: #fff; animation: pulse 1.6s infinite; }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(200,82,26,.4); } 50% { box-shadow: 0 0 0 9px rgba(200,82,26,0); } }
    .step-label { font-size: .74rem; font-weight: 700; color: var(--ink-soft); margin-top: 8px; text-align: center; white-space: nowrap; }
    .step-label.active { color: var(--brand-deep); }
    .step-label.done { color: var(--green-deep); }
    .connector { flex: 1; height: 3px; background: var(--line); margin: 21px -2px 0; border-radius: 3px; position: relative; overflow: hidden; }
    .connector::after { content: ''; position: absolute; inset: 0; width: 0; background: var(--green); transition: width .5s ease; }
    .connector.done::after { width: 100%; }

    .info-card { padding: 18px 22px; margin-bottom: 16px; }
    .info-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px dashed var(--line); font-size: .92rem; }
    .info-row:last-child { border-bottom: none; }
    .info-row .label { color: var(--ink-soft); }
    .info-row .value { font-weight: 700; }

    .refresh-note { text-align: center; font-size: .82rem; color: var(--ink-soft); margin-top: 14px; }
    .error-box { background: var(--red-bg); border: 1.5px solid var(--red); border-radius: var(--radius-sm); padding: 16px; color: var(--red-deep); font-size: .92rem; text-align: center; font-weight: 600; }
    .done-banner { background: var(--green-bg); border: 1.5px solid var(--green); border-radius: var(--radius-sm); padding: 16px; text-align: center; color: var(--green-deep); font-weight: 700; margin-bottom: 18px; font-size: 1rem; }

    .skel-card { height: 240px; margin-bottom: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <button class="btn btn-icon btn-ghost btn-sm" onclick="history.length > 1 ? history.back() : window.location.href='/'" aria-label="Back">${icon('back')}</button>
      <h1 class="display">${icon('pin')} Track Order</h1>
    </div>
  </div>
  <div class="content">
    <div class="order-id">Order ID: <span>${orderId.slice(-8).toUpperCase()}</span></div>
    <div id="root"><div class="skeleton skel-card"></div></div>
  </div>
  <script>
    const ORDER_ID = '${orderId}';
    const VAPID_PUBLIC_KEY = '${vapidPublicKey}';
    const STATUSES = ['received','preparing','ready','served'];
    const STATUS_LABELS = { received:'Received', preparing:'Preparing', ready:'Ready', served:'Served' };
    const STATUS_ICONS = {
      received: \`${icon('inbox')}\`,
      preparing: \`${icon('chef')}\`,
      ready: \`${icon('bell')}\`,
      served: \`${icon('utensils')}\`,
      cancelled: \`${icon('close')}\`,
    };
    const ICON_CHECK = \`${icon('check')}\`;
    const ICON_CLOCK = \`${icon('clock')}\`;
    const STATUS_SUBS = {
      received:'Your order has been received and is queued.',
      preparing:'Our kitchen is preparing your food.',
      ready:'Your order is ready! Staff will bring it shortly.',
      served:'Your order has been served. Enjoy your meal!',
      cancelled:'This order was cancelled.',
    };

    let pollTimer = null;
    let lastCreatedAt = null;
    let lastEstimatedReadyTime = null;
    let pushSubscribed = false;

    function urlBase64ToUint8Array(b64) {
      const pad = '='.repeat((4 - b64.length % 4) % 4);
      const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(base64);
      return Uint8Array.from(raw, c => c.charCodeAt(0));
    }

    async function setupPush() {
      const btn = document.getElementById('notifyBtn');
      if (btn) btn.disabled = true;
      if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (btn) { btn.textContent = 'Notifications not supported'; }
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { if (btn) { btn.disabled = false; btn.textContent = 'Permission denied'; } return; }
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
        }
        await fetch('/api/push/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: ORDER_ID, subscription: sub.toJSON() }),
        });
        pushSubscribed = true;
        if (btn) { btn.classList.remove('btn-ghost'); btn.classList.add('btn-success'); btn.innerHTML = ICON_CHECK + " You'll be notified when ready"; btn.disabled = true; }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Notify me when ready'; }
      }
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/orders/' + ORDER_ID + '/status');
        if (!res.ok) { render(null, 'Order not found'); return; }
        const data = await res.json();
        lastCreatedAt = data.createdAt;
        lastEstimatedReadyTime = data.estimatedReadyTime || null;
        render(data.status, null);
        if (data.status === 'served' || data.status === 'cancelled') {
          clearInterval(pollTimer);
        }
      } catch {
        render(null, 'Network error — retrying…');
      }
    }

    async function cancelOrder() {
      const btn = document.getElementById('cancelBtn');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch('/api/orders/' + ORDER_ID + '/cancel', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Could not cancel order'); if (btn) btn.disabled = false; return; }
        fetchStatus();
      } catch { alert('Network error'); if (btn) btn.disabled = false; }
    }

    function render(status, errorMsg) {
      const root = document.getElementById('root');
      if (errorMsg) { root.innerHTML = '<div class="error-box">' + errorMsg + '</div>'; return; }
      if (!status) return;

      const idx = STATUSES.indexOf(status);
      const steps = STATUSES.map((s, i) => ({ s, done: i < idx, active: i === idx }));
      const connectors = steps.slice(0, -1).map((_, i) => i < idx);

      let stepsHtml = '<div class="steps">';
      steps.forEach((step, i) => {
        const cls = step.done ? 'done' : step.active ? 'active' : '';
        const inner = step.done ? ICON_CHECK : STATUS_ICONS[step.s];
        stepsHtml += '<div class="step">';
        stepsHtml += '<div class="step-dot ' + cls + '">' + inner + '</div>';
        stepsHtml += '<div class="step-label ' + cls + '">' + STATUS_LABELS[step.s] + '</div>';
        stepsHtml += '</div>';
        if (i < steps.length - 1) stepsHtml += '<div class="connector ' + (connectors[i] ? 'done' : '') + '"></div>';
      });
      stepsHtml += '</div>';

      const isFinal = status === 'served' || status === 'cancelled';
      let bannerHtml = '';
      if (status === 'served') bannerHtml = '<div class="done-banner">🎉 Your meal has been served!</div>';
      if (status === 'cancelled') bannerHtml = '<div class="error-box" style="margin-bottom:18px">This order was cancelled.</div>';

      const cancelAgeMs = lastCreatedAt ? Date.now() - new Date(lastCreatedAt).getTime() : Infinity;
      const showCancel = status === 'received' && cancelAgeMs < 2 * 60 * 1000;
      const cancelHtml = showCancel
        ? '<button id="cancelBtn" class="btn btn-danger btn-block" style="margin-top:12px" onclick="cancelOrder()">Cancel Order</button>'
        : '';

      const showNotify = !isFinal && !pushSubscribed && VAPID_PUBLIC_KEY && ('Notification' in window);
      const notifyHtml = showNotify
        ? '<button id="notifyBtn" class="btn btn-ghost btn-block" style="margin-top:12px" onclick="setupPush()">' + STATUS_ICONS.ready + ' Notify me when ready</button>'
        : '';

      const etaHtml = (status === 'preparing' && lastEstimatedReadyTime) ? (function() {
        const minLeft = Math.max(0, Math.round((new Date(lastEstimatedReadyTime) - Date.now()) / 60000));
        return '<div class="eta">' + ICON_CLOCK + ' Est. ready in ~' + minLeft + ' min</div>';
      })() : '';

      const stepsBlock = status === 'cancelled' ? '' : stepsHtml;

      root.innerHTML = bannerHtml +
        '<div class="card progress-card">' +
          '<div class="status-label display">' + STATUS_ICONS[status] + ' ' + STATUS_LABELS[status] + '</div>' +
          '<div class="status-sub">' + (STATUS_SUBS[status] || '') + '</div>' +
          etaHtml +
          stepsBlock +
        '</div>' +
        cancelHtml + notifyHtml +
        '<div class="refresh-note">' + (isFinal ? 'Final status' : 'Auto refreshes every 15 seconds') + '</div>';
    }

    fetchStatus();
    pollTimer = setInterval(fetchStatus, 15000);
  </script>
</body>
</html>`;
}
