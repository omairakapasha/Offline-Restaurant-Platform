// Shared design system for all server-rendered pages.
//
// The six pages are self-contained HTML strings (no framework / build step), so
// this module is the single source of truth they all inline: brand identity,
// design tokens (two palettes — warm "paper" light + warm "espresso" dark),
// a shared component stylesheet, fonts, and a small inline-SVG icon set.
//
// Design language: an *elevated handwritten café* look — Caveat for display,
// Nunito for body, one warm-orange brand, soft layered depth plus a refined
// signature offset "sketch" shadow, and tasteful hand-drawn (dashed) accents.

import config from '../config';

export const BRAND = {
  name: config.BRAND_NAME,
  tagline: config.BRAND_TAGLINE,
};

export const CURRENCY = {
  symbol: config.CURRENCY_SYMBOL,
  code: config.CURRENCY_CODE,
};

/** One Google Fonts link for every page: Caveat (display) + Nunito (body/UI). */
export function fontLinks(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;
}

export type ThemeVariant = 'paper' | 'espresso';

/** Emits the :root custom properties for a palette variant. */
export function tokens(variant: ThemeVariant = 'paper'): string {
  const shared = `
    --font-display: 'Caveat', 'Comic Sans MS', cursive;
    --font-body: 'Nunito', system-ui, -apple-system, sans-serif;

    --brand: #C8521A;
    --brand-deep: #9E3D0F;
    --brand-tint: #FBEADD;

    --green: #1A8045; --green-deep: #13683A; --green-bg: #E6F4EC;
    --blue: #1D4ED8; --blue-deep: #1739A3; --blue-bg: #E8EFFE;
    --red: #DC2626; --red-deep: #B21F1F; --red-bg: #FDECEC;
    --amber: #B45309; --amber-deep: #92400E; --amber-bg: #FCF1DC;

    --radius: 16px;
    --radius-sm: 12px;
    --pill: 999px;
    --ring: 0 0 0 3px rgba(200,82,26,0.22);`;

  const paper = `
    --paper: #F7F3EC;
    --surface: #FFFDF8;
    --surface-2: #F2EBDF;
    --ink: #2A2520;
    --ink-soft: #6F6457;
    --line: #E7DFD2;
    --skeleton-base: #ECE4D6;
    --skeleton-hi: rgba(255,255,255,0.65);
    --shadow-soft: 0 6px 22px rgba(74,52,28,0.10);
    --shadow-sketch: 3px 4px 0 rgba(42,37,32,0.10);
    --overlay-bg: rgba(40,32,24,0.55);`;

  const espresso = `
    --brand: #E07A3E;
    --brand-deep: #B85A23;
    --brand-tint: #3A2A1C;
    --green: #34D399; --green-deep: #10B981; --green-bg: #123A2C;
    --blue: #60A5FA; --blue-deep: #3B82F6; --blue-bg: #16294A;
    --red: #F87171; --red-deep: #EF4444; --red-bg: #3A1A1A;
    --amber: #FBBF24; --amber-deep: #F59E0B; --amber-bg: #3A2A12;

    --paper: #17130F;
    --surface: #211B15;
    --surface-2: #2C241C;
    --ink: #F3ECE1;
    --ink-soft: #B8AB9B;
    --line: #3A2F25;
    --skeleton-base: #2C241C;
    --skeleton-hi: rgba(255,255,255,0.10);
    --shadow-soft: 0 8px 26px rgba(0,0,0,0.45);
    --shadow-sketch: 3px 4px 0 rgba(0,0,0,0.35);
    --ring: 0 0 0 3px rgba(224,122,62,0.28);
    --overlay-bg: rgba(0,0,0,0.65);`;

  return `:root {${shared}${variant === 'espresso' ? espresso : paper}
  }`;
}

/** Shared component stylesheet built on the tokens above. */
export function baseStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font-family: var(--font-body);
      background: var(--paper);
      color: var(--ink);
      min-height: 100vh;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .display { font-family: var(--font-display); line-height: 1.05; }
    a { color: var(--brand); }
    ::selection { background: var(--brand-tint); }

    /* BUTTONS */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-body); font-weight: 700; font-size: 1rem;
      line-height: 1; text-decoration: none; white-space: nowrap;
      padding: 11px 20px; border-radius: var(--pill); border: 2px solid transparent;
      cursor: pointer; transition: transform .15s ease, background .18s ease,
        box-shadow .18s ease, color .18s ease, border-color .18s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:focus-visible { outline: none; box-shadow: var(--ring); }
    .btn:active { transform: translateY(1px); }
    .btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn svg { width: 1.1em; height: 1.1em; }

    .btn-primary { background: var(--brand); color: #fff; border-color: var(--brand-deep); box-shadow: var(--shadow-sketch); }
    .btn-primary:hover { background: var(--brand-deep); transform: translateY(-2px); }
    .btn-success { background: var(--green); color: #fff; border-color: var(--green-deep); box-shadow: var(--shadow-sketch); }
    .btn-success:hover { background: var(--green-deep); transform: translateY(-2px); }
    .btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
    .btn-ghost:hover { border-color: var(--brand); color: var(--brand); background: var(--surface); }
    .btn-danger { background: var(--red-bg); color: var(--red); border-color: transparent; }
    .btn-danger:hover { background: var(--red); color: #fff; }
    .btn-block { width: 100%; }
    .btn-sm { padding: 7px 14px; font-size: .9rem; }
    .btn-lg { padding: 14px 28px; font-size: 1.1rem; }
    .btn-icon { width: 42px; height: 42px; padding: 0; border-radius: 50%; }
    .btn-icon.btn-sm { width: 34px; height: 34px; }

    /* FIELDS */
    .field { margin-bottom: 16px; }
    .field label, .label {
      display: block; font-weight: 700; font-size: .85rem;
      color: var(--ink-soft); margin-bottom: 6px;
    }
    .input, .field input, .field select, .field textarea {
      width: 100%; padding: 11px 14px; font-family: var(--font-body); font-size: 1rem;
      color: var(--ink); background: var(--surface);
      border: 1.5px solid var(--line); border-radius: var(--radius-sm);
      outline: none; transition: border-color .2s ease, box-shadow .2s ease;
    }
    .input:focus, .field input:focus, .field select:focus, .field textarea:focus {
      border-color: var(--brand); box-shadow: var(--ring);
    }
    .input::placeholder, .field input::placeholder { color: var(--ink-soft); opacity: .7; }

    /* CARD */
    .card {
      background: var(--surface); border: 1.5px solid var(--line);
      border-radius: var(--radius); box-shadow: var(--shadow-soft);
    }

    /* BADGES */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: var(--pill);
      font-size: .75rem; font-weight: 800; letter-spacing: .01em; white-space: nowrap;
    }
    .badge svg { width: .9em; height: .9em; }
    .badge-brand { background: var(--brand-tint); color: var(--brand-deep); }
    .badge-green { background: var(--green-bg); color: var(--green-deep); }
    .badge-blue { background: var(--blue-bg); color: var(--blue-deep); }
    .badge-red { background: var(--red-bg); color: var(--red-deep); }
    .badge-amber { background: var(--amber-bg); color: var(--amber-deep); }
    .badge-muted { background: var(--surface-2); color: var(--ink-soft); }

    /* MODAL */
    .overlay {
      position: fixed; inset: 0; background: var(--overlay-bg);
      -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
      z-index: 300; display: none; align-items: center; justify-content: center; padding: 20px;
    }
    .overlay.show { display: flex; }
    .modal {
      background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius);
      padding: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 60px rgba(20,14,8,.35); animation: modalIn .28s cubic-bezier(.34,1.4,.64,1);
    }
    @keyframes modalIn { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px;
      margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px dashed var(--line); }
    .modal-head h2, .modal-head h3 { font-family: var(--font-display); font-size: 1.7rem; color: var(--ink); font-weight: 700; }

    /* TOAST */
    .toast {
      position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(160%);
      background: var(--ink); color: var(--surface); padding: 12px 22px; border-radius: var(--pill);
      font-weight: 700; font-size: .95rem; z-index: 9999; box-shadow: var(--shadow-soft);
      transition: transform .4s cubic-bezier(.34,1.56,.64,1); max-width: 90%; text-align: center;
      pointer-events: none; white-space: pre-line;
    }
    .toast.show { transform: translateX(-50%) translateY(0); }
    .toast-error { background: var(--red); color: #fff; }
    .toast-success { background: var(--green); color: #fff; }

    /* SKELETON */
    .skeleton {
      background: linear-gradient(100deg, var(--skeleton-base) 30%, var(--skeleton-hi) 50%, var(--skeleton-base) 70%);
      background-size: 200% 100%; animation: shimmer 1.3s linear infinite; border-radius: var(--radius-sm);
    }
    @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

    /* EMPTY STATE */
    .empty-state { text-align: center; padding: 56px 20px; color: var(--ink-soft); }
    .empty-state .empty-icon { font-size: 3rem; margin-bottom: 12px; display: block; }

    /* MISC HELPERS */
    .spin { width: 1em; height: 1em; border: 2px solid currentColor; border-top-color: transparent;
      border-radius: 50%; display: inline-block; animation: spin .7s linear infinite; vertical-align: -2px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
}

// ── Inline SVG icon set ────────────────────────────────────────────────────
// Stroke-based, inherit `currentColor`, sized to 1em. Keeps the friendly,
// hand-drawn line feel without shipping an icon font.
const ICONS: Record<string, string> = {
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  chef: '<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/>',
  table: '<path d="M3 9h18"/><path d="M5 9V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M7 9v11"/><path d="M17 9v11"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
  utensils: '<path d="M3 2v7a3 3 0 0 0 6 0V2"/><path d="M6 9v13"/><path d="M18 2c-1.7 0-3 2-3 5s1 4 1 4v11"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1Z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-6 5-9 16-10 0 9-3 15-9 17Z"/><path d="M4 21c2-4 5-7 9-9"/>',
  flame: '<path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s2 1 2 3c0-3 2-6 2-9Z"/>',
  play: '<path d="m6 4 14 8-14 8Z"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
};

/** Returns an inline SVG for `name`. Unknown names render nothing. */
export function icon(name: string, size = '1em'): string {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0" aria-hidden="true">${body}</svg>`;
}
