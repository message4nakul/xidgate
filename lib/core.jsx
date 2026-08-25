"use client";
/* =============================================================================
   XIDgate — core module

   Design tokens, formatting, the QR encoder, the shared interface pieces, and
   the data layer. Everything the app shares lives here, so there is exactly one
   place to look. Screens live in components/screens.jsx; the three routes live
   under app/.

   To change a colour everywhere:  the T object, immediately below.
   To change how data works:       the db object, at the bottom.
   ========================================================================== */
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

/* Design tokens. Change a colour here and it changes everywhere. */
/* ---------------------------------------------------------------- tokens -- */
export const T = {
  ink: "#14181F",
  paper: "#EEF0F3",
  card: "#FFFFFF",
  rule: "#D6DAE1",
  ruleSoft: "#E6E9EE",
  mute: "#6A7382",
  faint: "#9AA3B0",
  signal: "#1B3BFF",
  signalDeep: "#0E24B8",
  signalWash: "#EEF1FF",
  stamp: "#C0311C",
  stampWash: "#FDEEEB",
  amber: "#A5620A",
  amberWash: "#FDF3E3",
  live: "#16714A",
  liveWash: "#E8F5EF",
};

export const MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const SANS = "'Archivo', system-ui, -apple-system, sans-serif";

/* ------------------------------------------------------------- utilities -- */
export const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const newCode = () =>
  Array.from({ length: 7 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
export const uid = () => Math.random().toString(36).slice(2, 11);
export const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "https://xidgate.com");
export const linkFor = (code) => `${ORIGIN}/x/${code}`;

/* Duration is typed, not picked from a list, because the right answer depends on
   the conversation: a bike sale is days, a contractor is weeks, a tenant is
   months. The preset options remain as starting points.

   There is deliberately no "never expires". A pass that never ends is a phone
   number with extra steps — it breaks the one promise the product makes, and it
   turns storage from O(active passes) into O(everything ever). Long is fine;
   forever is a different product. */
export const UNITS = [
  { v: "hours",  label: "hours",  ms: 36e5 },
  { v: "days",   label: "days",   ms: 864e5 },
  { v: "weeks",  label: "weeks",  ms: 6048e5 },
  { v: "months", label: "months", ms: 2592e6 },
];
export const unitMs = (u) => (UNITS.find((x) => x.v === u) || UNITS[1]).ms;
export const customMs = (n, u) => Math.max(1, Math.floor(Number(n) || 1)) * unitMs(u);
/* One ceiling for everyone. It exists for storage, not for billing: expiry is
   what keeps this O(open XIDs) instead of O(everything ever), so an XID has to
   end sometime. A year is far past anything a real conversation needs, so it
   should never read as a limit to anyone using this normally. */
export const MAX_SPAN_MS = 365 * 864e5;

/* An abuse ceiling, not a plan. It is a rolling 24 hours rather than a calendar
   day so midnight can't be used to create twenty in two minutes, and so the
   allowance trickles back one at a time instead of all at once. Mirrored by a
   trigger in the database — this copy exists only to warn people early. */
export const DAILY_XID_LIMIT = 30;
export const DAILY_WINDOW_MS = 864e5;

/* How many are left, and when the next one frees up. */
export function dailyQuota(xids = []) {
  const since = Date.now() - DAILY_WINDOW_MS;
  const recent = xids
    .map((x) => x.createdAt)
    .filter((t) => t && t > since)
    .sort((a, b) => a - b);
  const used = recent.length;
  return {
    used,
    left: Math.max(0, DAILY_XID_LIMIT - used),
    /* The oldest of the batch is the one that ages out first. */
    nextAt: used >= DAILY_XID_LIMIT ? recent[0] + DAILY_WINDOW_MS : null,
  };
}
export const MAX_SPAN_LABEL = "a year";

/* Presets still speak in fixed strings; this turns one into an editable value. */
export const durToParts = (d) => {
  const m = { "1h": [1, "hours"], "6h": [6, "hours"], "24h": [24, "hours"],
              "3d": [3, "days"], "7d": [7, "days"], "30d": [30, "days"] }[d] || [24, "hours"];
  return { durN: m[0], durUnit: m[1] };
};

export const DUR = {
  "1h": 36e5, "6h": 216e5, "24h": 864e5,
  "3d": 2592e5, "7d": 6048e5, "30d": 25920e5,
};
export const DUR_LABEL = { "1h": "1 hour", "6h": "6 hours", "24h": "24 hours", "3d": "3 days", "7d": "7 days", "30d": "30 days" };
export const expiryFrom = (d) => Date.now() + (DUR[d] ?? 864e5);

export function countdown(ms) {
  if (ms <= 0) return { text: "00:00", sub: "expired", urgent: true };
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  if (d > 0) return { text: `${d}d ${String(h).padStart(2, "0")}h`, sub: "remaining", urgent: false };
  if (h > 0) return { text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, sub: "hours left", urgent: h < 2 };
  return { text: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, sub: "minutes left", urgent: true };
}

export const clock = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const stampDate = (ts) =>
  new Date(ts).toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/* Quiet hours — the host picks a window; outside it the guest is told why. */
export const HOURS = [
  { v: "any", label: "Any time", range: null },
  { v: "9-18", label: "Work hours · 9am–6pm", range: [9, 18] },
  { v: "10-20", label: "Daytime · 10am–8pm", range: [10, 20] },
  { v: "18-22", label: "Evenings · 6pm–10pm", range: [18, 22] },
  { v: "8-12", label: "Mornings · 8am–12pm", range: [8, 12] },
];
export const hoursMeta = (v) => HOURS.find((h) => h.v === v) || HOURS[0];
/* The hour is read in the XID's own zone, not the viewer's.

   These used to call Date.getHours(), which answers in whatever zone the device
   happens to be in. The server judges quiet hours in the host's zone, so a guest
   abroad saw "closed" while the server accepted their message — or the reverse.
   Both sides now ask the same question of the same clock. */
export const deviceZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"; }
  catch (_) { return "Asia/Kolkata"; }
};

export function hourIn(tz, at = new Date()) {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || "Asia/Kolkata", hour: "numeric", hour12: false,
    }).format(at));
  } catch (_) {
    /* An unrecognised zone must not silently become UTC and shift the window. */
    return Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "numeric", hour12: false,
    }).format(at));
  }
}

/* Names the zone the way a person would say it: "India time", "UK time". */
export function zoneLabel(tz) {
  if (!tz) return "";
  try {
    const name = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;
    return name || tz.split("/").pop().replace(/_/g, " ");
  } catch (_) { return tz; }
}

export function withinHours(v, tz, at = new Date()) {
  const r = hoursMeta(v).range;
  if (!r) return true;
  const h = hourIn(tz, at);
  return r[0] <= r[1] ? h >= r[0] && h < r[1] : h >= r[0] || h < r[1];
}
export function nextOpen(v, tz) {
  const r = hoursMeta(v).range;
  if (!r) return null;
  const h = hourIn(tz);
  const when = `${r[0] % 12 || 12}${r[0] < 12 ? "am" : "pm"}`;
  const zone = zoneLabel(tz);
  const day = h < r[0] ? "today" : "tomorrow";
  /* Say whose clock this is — the guest is often in a different one. */
  return zone ? `${when} ${day} (${zone})` : `${when} ${day}`;
}

/* -------------------------------------------------- QR (byte mode, ECC M) -- */
/* Self-contained on purpose: sending XID links to a third-party QR API would
   leak exactly the thing this product promises to protect. Verified against
   the `qrcode` reference library — byte-identical output. Versions 1–4.      */
const QR_SPEC = { 1: { ec: 10, blocks: [16] }, 2: { ec: 16, blocks: [28] }, 3: { ec: 26, blocks: [44] }, 4: { ec: 18, blocks: [32, 32] } };
const QR_CAP = { 1: 14, 2: 26, 3: 42, 4: 62 };
const QR_ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26] };
const GF_EXP = new Array(512), GF_LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]; })();
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);
function qrGen(n) { let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= gmul(g[j], 1); ng[j + 1] ^= gmul(g[j], GF_EXP[i]); } g = ng; } return g; }
function qrEcc(data, n) { const g = qrGen(n); const r = data.concat(new Array(n).fill(0)); for (let i = 0; i < data.length; i++) { const c = r[i]; if (!c) continue; for (let j = 0; j < g.length; j++) r[i + j] ^= gmul(g[j], c); } return r.slice(data.length); }
function qrEncode(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 0; for (const v of [1, 2, 3, 4]) if (bytes.length <= QR_CAP[v]) { ver = v; break; }
  if (!ver) throw new Error("QR payload too long");
  const spec = QR_SPEC[ver], totalData = spec.blocks.reduce((a, b) => a + b, 0);
  const bits = []; const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(4, 4); push(bytes.length, 8); bytes.forEach((b) => push(b, 8));
  const cap = totalData * 8;
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const pad = [0xec, 0x11]; let pi = 0;
  while (bits.length < cap) push(pad[pi++ % 2], 8);
  const dcw = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; dcw.push(b); }
  let off = 0; const dB = [], eB = [];
  for (const n of spec.blocks) { const blk = dcw.slice(off, off + n); off += n; dB.push(blk); eB.push(qrEcc(blk, spec.ec)); }
  const out = []; const maxD = Math.max(...spec.blocks);
  for (let i = 0; i < maxD; i++) for (const b of dB) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < spec.ec; i++) for (const b of eB) out.push(b[i]);
  return { ver, cw: out };
}
function qrMatrix(ver, cw, mask) {
  const size = 17 + ver * 4;
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const res = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (r, c, v) => { m[r][c] = v; res[r][c] = true; };
  const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) { const R = r0 + r, C = c0 + c; if (R < 0 || C < 0 || R >= size || C >= size) continue; const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); setF(R, C, on ? 1 : 0); } };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { setF(6, i, i % 2 === 0 ? 1 : 0); setF(i, 6, i % 2 === 0 ? 1 : 0); }
  const ac = QR_ALIGN[ver], last = ac[ac.length - 1];
  for (const r of ac) for (const c of ac) {
    if ((r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) setF(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0);
  }
  setF(size - 8, 8, 1);
  for (let i = 0; i < 9; i++) { if (m[8][i] === null) setF(8, i, 0); if (m[i][8] === null) setF(i, 8, 0); }
  for (let i = 0; i < 8; i++) { if (m[8][size - 1 - i] === null) setF(8, size - 1 - i, 0); if (m[size - 1 - i][8] === null) setF(size - 1 - i, 8, 0); }
  let bi = 0; const bitAt = (i) => (cw[i >> 3] >> (7 - (i & 7))) & 1;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < size; k++) {
      const row = up ? size - 1 - k : k;
      for (let c = 0; c < 2; c++) {
        const cc = col - c; if (res[row][cc]) continue;
        const v = bi < cw.length * 8 ? bitAt(bi) : 0; bi++;
        let mk;
        switch (mask) {
          case 0: mk = (row + cc) % 2 === 0; break;
          case 1: mk = row % 2 === 0; break;
          case 2: mk = cc % 3 === 0; break;
          case 3: mk = (row + cc) % 3 === 0; break;
          case 4: mk = (Math.floor(row / 2) + Math.floor(cc / 3)) % 2 === 0; break;
          case 5: mk = ((row * cc) % 2) + ((row * cc) % 3) === 0; break;
          case 6: mk = (((row * cc) % 2) + ((row * cc) % 3)) % 2 === 0; break;
          default: mk = (((row + cc) % 2) + ((row * cc) % 3)) % 2 === 0;
        }
        m[row][cc] = mk ? v ^ 1 : v;
      }
    }
    up = !up;
  }
  const fmt = mask; let d = fmt << 10;
  for (let i = 4; i >= 0; i--) if (d & (1 << (i + 10))) d ^= 0x537 << i;
  const fbits = ((fmt << 10) | d) ^ 0x5412;
  const fb = (i) => (fbits >> (14 - i)) & 1;
  for (let i = 0; i <= 5; i++) m[8][i] = fb(i);
  m[8][7] = fb(6); m[8][8] = fb(7); m[7][8] = fb(8);
  for (let i = 9; i <= 14; i++) m[14 - i][8] = fb(i);
  for (let i = 0; i <= 6; i++) m[size - 1 - i][8] = fb(i);
  for (let i = 7; i <= 14; i++) m[8][size - 15 + i] = fb(i);
  m[size - 8][8] = 1;
  return m.map((r) => r.map((v) => (v ? 1 : 0)));
}
function qrPenalty(m) {
  const n = m.length; let p = 0;
  const run = (get) => { for (let i = 0; i < n; i++) { let c = 1; for (let j = 1; j < n; j++) { if (get(i, j) === get(i, j - 1)) c++; else { if (c >= 5) p += 3 + (c - 5); c = 1; } } if (c >= 5) p += 3 + (c - 5); } };
  run((i, j) => m[i][j]); run((i, j) => m[j][i]);
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const v = m[i][j]; if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) p += 3; }
  const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const chk = (a) => { for (let i = 0; i + 11 <= a.length; i++) { let f = true, b = true; for (let k = 0; k < 11; k++) { if (a[i + k] !== pat[k]) f = false; if (a[i + k] !== pat[10 - k]) b = false; } if (f) p += 40; if (b) p += 40; } };
  for (let i = 0; i < n; i++) { chk(m[i]); chk(m.map((r) => r[i])); }
  let dark = 0; m.forEach((r) => r.forEach((v) => (dark += v)));
  return p + Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
}
export function makeQR(text) {
  const { ver, cw } = qrEncode(text);
  let best = null, bp = Infinity;
  for (let mk = 0; mk < 8; mk++) { const m = qrMatrix(ver, cw, mk); const s = qrPenalty(m); if (s < bp) { bp = s; best = m; } }
  return best;
}

export function QRCode({ value, size = 180, quiet = 4 }) {
  const path = useMemo(() => {
    const m = makeQR(value);
    const n = m.length + quiet * 2;
    let d = "";
    for (let r = 0; r < m.length; r++)
      for (let c = 0; c < m.length; c++)
        if (m[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    return { d, n };
  }, [value, quiet]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${value}`}>
      <rect width={path.n} height={path.n} fill="#fff" />
      <path d={path.d} fill={T.ink} />
    </svg>
  );
}

/* Viewport hook. Inline styles can't hold media queries and this product is
   mobile-first in practice, so layout switches are driven from state. */
export function useNarrow(bp = 760) {
  /* Starts false so the server render and the first client render agree — a
     hydration mismatch here makes React throw away the corrected layout.

     The measurement then happens on mount, which is the only moment a phone
     will ever report its real width. Registering a resize listener and waiting
     is useless on a handset: nobody resizes a phone, so the layout would stay
     stuck on the desktop branch forever. This bug is invisible on a laptop,
     because dragging the window fires resize and everything snaps into place. */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const measure = () => setNarrow(window.innerWidth < bp);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [bp]);
  return narrow;
}

/* ----------------------------------------------------------------- icons -- */
const svg = (p, vb = "0 0 24 24") => ({ size = 16, stroke = 1.7, ...r }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...r}>{p}</svg>
);
export const Ico = {
  Pass: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M9 5v14" /><circle cx="15.5" cy="10.5" r="1.5" /><path d="M13 15.5c.6-1.2 1.5-1.8 2.5-1.8s1.9.6 2.5 1.8" /></>),
  Plus: svg(<><path d="M12 5v14M5 12h14" /></>),
  Clock: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  Users: svg(<><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" /><circle cx="9" cy="7" r="3.2" /><path d="M22 19v-1a4 4 0 0 0-3-3.8" /><path d="M16 3.2A4 4 0 0 1 16 11" /></>),
  Msg: svg(<><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.4-.6L3 21l1.7-5a8.2 8.2 0 0 1-.7-3.4 8.4 8.4 0 0 1 8.4-8.4A8.4 8.4 0 0 1 21 11.5z" /></>),
  Send: svg(<><path d="M4 12 21 4l-7 17-2.5-7.5L4 12z" /></>),
  Kill: svg(<><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>),
  Link: svg(<><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></>),
  QR: svg(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v3M14 20h7" /></>),
  Check: svg(<><path d="M4 12.5 9.5 18 20 6.5" /></>),
  Back: svg(<><path d="M15 5l-7 7 7 7" /></>),
  Ledger: svg(<><path d="M5 3h11l4 4v14H5z" /><path d="M16 3v4h4" /><path d="M9 12h6M9 16h6" /></>),
  Shield: svg(<><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6l8-3z" /></>),
  Bolt: svg(<><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></>),
  Gear: svg(<><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>),
  Eye: svg(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  Ban: svg(<><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>),
  Copy: svg(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>),
  Search: svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  Handshake: svg(<><path d="M11 17l2 2a1.4 1.4 0 0 0 2-2l-.5-.5" /><path d="M13 15l2.5 2.5a1.4 1.4 0 0 0 2-2L13 11" /><path d="M3 9l4-4 3 1 4-1 4 4" /><path d="M7 13l3-3 3 1" /></>),
  Arrow: svg(<><path d="M5 12h14M13 6l6 6-6 6" /></>),
};
/* --------------------------------------------------------------- presets -- */
/* One tap should be enough. Presets carry the whole config so the common case
   is: pick why → issue. Everything else lives behind "Adjust rules".        */
export const PRESETS = [
  { id: "sell", title: "Selling something", blurb: "Buyers message you. Nobody keeps your number.", dur: "7d", conn: null, msgs: null, hours: "any", type: "individual", label: "For sale" },
  { id: "meet", title: "Meeting someone new", blurb: "One person, one day, then it's gone.", dur: "24h", conn: null, msgs: null, hours: "any", type: "individual", oneShot: true, label: "New contact" },
  { id: "quote", title: "Getting a quote", blurb: "Contractors reach you during work hours only.", dur: "3d", conn: 5, msgs: null, hours: "9-18", type: "individual", label: "Quote request" },
  { id: "work", title: "A client or job", blurb: "A month of access, on your schedule.", dur: "30d", conn: 3, msgs: null, hours: "9-18", type: "individual", label: "Client channel" },
  { id: "group", title: "A group", blurb: "Everyone in one room. No numbers exchanged.", dur: "7d", conn: 20, msgs: null, hours: "any", type: "group", label: "Group room" },
  { id: "custom", title: "Something else", blurb: "Set every rule yourself.", dur: "24h", conn: null, msgs: null, hours: "any", type: "individual", label: "Untitled XID" },
];
export const preset = (id) => PRESETS.find((p) => p.id === id) || PRESETS[5];

/* "How many people" used to be two controls that did the same thing. A numeric
   cap of 1 and "close after the first person joins" look identical to a guest —
   both admit one person and reject everyone after. They differ only in what the
   host can undo afterwards:

     a cap is a ceiling  — recounted on every attempt, so it can never reopen
     one-shot is a latch — flipped on first join, and the host can flip it back

   So "just 1 person" is implemented as the latch. Offering both was the bug:
   the "Meeting someone new" preset set a cap AND the latch, which made the
   reopen control silently do nothing on the passes most likely to need it. */
export const PEOPLE = [
  { v: "one", label: "Just 1 person — closes as soon as they join", conn: null, oneShot: true },
  { v: "2",   label: "Up to 2 people",  conn: 2,  oneShot: false },
  { v: "3",   label: "Up to 3 people",  conn: 3,  oneShot: false },
  { v: "5",   label: "Up to 5 people",  conn: 5,  oneShot: false },
  { v: "10",  label: "Up to 10 people", conn: 10, oneShot: false },
  { v: "20",  label: "Up to 20 people", conn: 20, oneShot: false },
  { v: "any", label: "Anyone with the link", conn: null, oneShot: false },
];
export const peopleValue = (cfg) =>
  cfg.oneShot ? "one" : cfg.conn === null ? "any" : String(cfg.conn);
export const peopleOption = (v) => PEOPLE.find((p) => p.v === v) || PEOPLE[PEOPLE.length - 1];


/* ------------------------------------------------------- UI primitives ---- */
export function Btn({ kind = "primary", size = "md", icon: I, children, style, ...rest }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: SANS, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer",
    borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "transparent", transition: "background .14s, border-color .14s, color .14s, transform .08s",
    whiteSpace: "nowrap",
  };
  const sizes = { sm: { padding: "6px 11px", fontSize: 12.5 }, md: { padding: "9px 15px", fontSize: 13.5 }, lg: { padding: "13px 22px", fontSize: 15 } };
  const kinds = {
    primary: { background: T.signal, color: "#fff" },
    quiet: { background: T.card, color: T.ink, borderColor: T.rule },
    ghost: { background: "transparent", color: T.mute },
    danger: { background: T.stampWash, color: T.stamp, borderColor: "#F2C9C1" },
    solidDanger: { background: T.stamp, color: "#fff" },
  };
  return (
    <button {...rest} style={{ ...base, ...sizes[size], ...kinds[kind], ...style }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "")}>
      {I && <I size={size === "lg" ? 17 : 15} />}{children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: T.mute, marginBottom: 7 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: T.faint, marginTop: 6, lineHeight: 1.45 }}>{hint}</div>}
    </label>
  );
}

export const selectStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 8, border: `1px solid ${T.rule}`,
  background: T.card, color: T.ink, fontFamily: SANS, fontSize: 14, appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4.5 6 8.5 10 4.5' fill='none' stroke='%236A7382' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", cursor: "pointer",
};

export function Toggle({ on, onChange, label, sub }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left",
      padding: "12px 13px", borderRadius: 8, border: `1px solid ${on ? T.signal : T.rule}`,
      background: on ? T.signalWash : T.card, cursor: "pointer", marginBottom: 10, fontFamily: SANS,
    }}>
      <span style={{
        width: 34, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
        background: on ? T.signal : "#C9CFD8", position: "relative", transition: "background .16s",
      }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left .16s" }} />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 12, color: T.mute, marginTop: 2, lineHeight: 1.45 }}>{sub}</span>}
      </span>
    </button>
  );
}

export function Chip({ tone = "mute", children }) {
  const tones = {
    live: { bg: T.liveWash, fg: T.live }, warn: { bg: T.amberWash, fg: T.amber },
    dead: { bg: T.stampWash, fg: T.stamp }, mute: { bg: "#EDEFF2", fg: T.mute },
    signal: { bg: T.signalWash, fg: T.signalDeep },
  }[tone];
  return <span style={{
    fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase",
    padding: "3px 7px", borderRadius: 4, background: tones.bg, color: tones.fg, fontWeight: 500,
  }}>{children}</span>;
}

/* --------------------------------------------------- THE PASS (signature) -- */
/* Every XID renders as a physical-feeling card: a perforated stub carrying the
   code, a countdown as the hero number, and a drain bar. Killing it stamps
   CLOSED across the face. The metaphor is the product.                        */
export function Pass({ x, onOpen, onShare, onKill, onReopen, compact = false }) {
  const live = x.status === "active";
  const left = x.expiresAt - Date.now();
  const cd = countdown(left);
  const span = x.expiresAt - x.createdAt;
  const pct = live ? Math.max(0, Math.min(1, left / span)) : 0;
  const msgs = x.conversations.reduce((n, c) => n + c.messages.length, 0);
  const conns = x.type === "group" ? (x.conversations[0]?.members ?? 0) : x.conversations.length;
  const tone = !live ? "dead" : cd.urgent ? "warn" : "live";
  const accent = !live ? T.stamp : cd.urgent ? T.amber : T.signal;

  return (
    <article style={{
      position: "relative", background: T.card, borderRadius: 12,
      border: `1px solid ${live ? T.rule : "#E8DAD6"}`, overflow: "hidden",
      display: "flex", opacity: live ? 1 : 0.72,
      boxShadow: live ? "0 1px 2px rgba(20,24,31,.04), 0 8px 24px -18px rgba(20,24,31,.35)" : "none",
    }}>
      {/* stub */}
      <div style={{
        width: 38, flexShrink: 0, background: live ? "#F7F8FA" : "#FAF5F4",
        borderRight: `1px dashed ${live ? T.rule : "#E8DAD6"}`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <span style={{
          fontFamily: MONO, fontSize: 10.5, letterSpacing: ".22em", color: accent,
          writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 500,
        }}>{x.code}</span>
        <span style={{ position: "absolute", top: -6, right: -6, width: 12, height: 12, borderRadius: 6, background: T.paper }} />
        <span style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, borderRadius: 6, background: T.paper }} />
      </div>

      <div style={{ flex: 1, padding: compact ? "13px 15px" : "16px 18px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 11 }}>
          <h3 style={{ margin: 0, fontFamily: SANS, fontSize: 15.5, fontWeight: 650, letterSpacing: "-0.015em", color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {x.label}
          </h3>
          <Chip tone={tone}>{live ? (x.type === "group" ? "room" : "live") : x.status}</Chip>
        </div>

        {/* hero: the countdown */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 9, marginBottom: 9 }}>
          <span style={{ fontFamily: MONO, fontSize: 30, lineHeight: 0.9, fontWeight: 500, color: accent, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
            {live ? cd.text : "—"}
          </span>
          <span style={{ fontFamily: SANS, fontSize: 11.5, color: T.mute, paddingBottom: 2 }}>
            {live ? cd.sub : x.status === "killed" ? "destroyed" : "expired"}
          </span>
        </div>

        <div style={{ height: 3, borderRadius: 2, background: "#E9ECF1", overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${pct * 100}%`, background: accent, transition: "width 1s linear" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 13, fontFamily: MONO, fontSize: 11, color: T.mute, flexWrap: "wrap", marginBottom: compact ? 0 : 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ico.Users size={12} />{conns}{x.maxConn ? `/${x.maxConn}` : ""}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ico.Msg size={12} />{msgs}</span>
          {x.hours !== "any" && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: withinHours(x.hours, x.tz) ? T.mute : T.amber }}><Ico.Clock size={12} />{withinHours(x.hours, x.tz) ? "open" : "quiet"}</span>}
          {x.oneShot && <Chip tone={x.sealed ? "warn" : "signal"}>{x.sealed ? "closed to new" : "one‑shot"}</Chip>}
          {x.unread > 0 && live && <span style={{ marginLeft: "auto", background: T.signal, color: "#fff", borderRadius: 9, padding: "1px 7px", fontSize: 10.5, fontWeight: 600 }}>{x.unread} new</span>}
        </div>

        {!compact && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Btn size="sm" kind={x.unread > 0 ? "primary" : "quiet"} icon={Ico.Msg} onClick={onOpen}>Open</Btn>
            {live && <Btn size="sm" kind="quiet" icon={Ico.QR} onClick={onShare}>Share</Btn>}
            {live && x.sealed && onReopen && (
              <Btn size="sm" kind="quiet" icon={Ico.Users} onClick={onReopen}>Let someone else in</Btn>
            )}
            {live && <Btn size="sm" kind="danger" icon={Ico.Kill} onClick={onKill}>End</Btn>}
          </div>
        )}
      </div>

      {!live && (
        <span aria-hidden style={{
          position: "absolute", right: 18, top: "50%", transform: "translateY(-50%) rotate(-13deg)",
          fontFamily: MONO, fontSize: 26, letterSpacing: ".18em", color: "rgba(192,49,28,.22)",
          border: "3px solid rgba(192,49,28,.22)", borderRadius: 6, padding: "3px 10px", fontWeight: 600, pointerEvents: "none",
        }}>CLOSED</span>
      )}
    </article>
  );
}

/* ------------------------------------------------------- demo seed data -- */
/* ------------------------------------------------------------ seed state -- */
export const seed = () => {
  const now = Date.now();
  return {
    xids: [
      {
        id: uid(), code: newCode(), label: "Royal Enfield · for sale", presetId: "sell",
        type: "individual", createdAt: now - 26 * 36e5, expiresAt: now + 4.2 * 36e5,
        maxConn: null, maxMsgs: null, hours: "any", oneShot: false, autoExtend: true, sealed: false,
        status: "active", unread: 2,
        conversations: [
          { id: uid(), guest: "Buyer 4471", joinedAt: now - 20 * 36e5, blocked: false, revealMe: false, revealThem: true, strikes: 0, messages: [
            { id: uid(), side: "them", text: "Hi, is the bike still available?", ts: now - 20 * 36e5 },
            { id: uid(), side: "me", text: "Yes it is. 2019 model, 18,400 km.", ts: now - 19.6 * 36e5 },
            { id: uid(), side: "them", text: "Can I see it this weekend? I'm in Indiranagar.", ts: now - 2.1 * 36e5 },
            { id: uid(), side: "them", text: "Also is the insurance current?", ts: now - 2 * 36e5 },
          ] },
          { id: uid(), guest: "Buyer 9082", joinedAt: now - 9 * 36e5, blocked: false, revealMe: false, revealThem: false, strikes: 0, messages: [
            { id: uid(), side: "them", text: "What's your lowest price?", ts: now - 9 * 36e5 },
            { id: uid(), side: "me", text: "1.42L, firm.", ts: now - 8.4 * 36e5 },
          ] },
        ],
      },
      {
        id: uid(), code: newCode(), label: "Kitchen quotes", presetId: "quote",
        type: "individual", createdAt: now - 3 * 864e5, expiresAt: now + 1.4 * 864e5,
        maxConn: 5, maxMsgs: null, hours: "9-18", oneShot: false, autoExtend: false, sealed: false,
        status: "active", unread: 0,
        conversations: [
          { id: uid(), guest: "Vendor 2210", joinedAt: now - 2.5 * 864e5, blocked: false, revealMe: false, revealThem: false, strikes: 0, messages: [
            { id: uid(), side: "them", text: "Sending the modular quote by evening.", ts: now - 30 * 36e5 },
          ] },
        ],
      },
      {
        id: uid(), code: newCode(), label: "Sunday football", presetId: "group",
        type: "group", createdAt: now - 5 * 864e5, expiresAt: now + 2 * 864e5,
        maxConn: 20, maxMsgs: null, hours: "any", oneShot: false, autoExtend: false, sealed: false,
        status: "active", unread: 0,
        conversations: [
          { id: uid(), guest: "Room", joinedAt: now - 5 * 864e5, blocked: false, revealMe: false, revealThem: false, strikes: 0, members: 7, messages: [
            { id: uid(), side: "them", text: "Pitch booked for 7am.", who: "Player 3", ts: now - 12 * 36e5 },
            { id: uid(), side: "them", text: "I'll bring the bibs.", who: "Player 6", ts: now - 11 * 36e5 },
          ] },
        ],
      },
    ],
    receipts: [
      { id: uid(), code: newCode(), label: "Sofa · Facebook Marketplace", issued: now - 12 * 864e5, ended: now - 9 * 864e5, reason: "Ended on schedule", connections: 4, destroyed: 31 },
      { id: uid(), code: newCode(), label: "Coffee, Saturday", issued: now - 21 * 864e5, ended: now - 20 * 864e5, reason: "Ended by you", connections: 1, destroyed: 12 },
    ],
  };
};

/* ------------------------------------------------------------ supabase -- */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/* When these are missing the whole app runs on in-memory demo data instead of
   erroring. That's deliberate: you can deploy and share a working link before
   you've created a database, then add the two keys and the same build goes
   live for real. Nothing else changes. */
export const LIVE = Boolean(url && key);

export const sb = LIVE
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/* Guests hold a token in their own browser instead of an account. It goes out
   as a header so row-level security can authorise someone with no login. */
export const guestKey = (code) => `xid_token_${code}`;

/* A guest's token is their only claim to the conversation, so it is written to
   two places. localStorage is the primary store; the cookie is the backup,
   because iOS Safari evicts localStorage after roughly seven days of not
   visiting a site — and for a guest, losing the token means losing the whole
   conversation with no way to prove it was theirs. */
const TOKEN_DAYS = 180;

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function writeCookie(name, value) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${TOKEN_DAYS * 86400}; path=/; SameSite=Lax${secure}`;
}

export function readToken(code) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(guestKey(code)) || readCookie(guestKey(code));
}

export function writeToken(code, token) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(guestKey(code), token); } catch (_) {}
  writeCookie(guestKey(code), token);
}

/* Two ways to be recognised as a guest:
   1. holding the token — the default, no account involved
   2. being signed in as the account that claimed this conversation — the
      opt-in path, and the only one that survives changing device
   The signed-in client carries the session, so row-level security matches on
   connections.guest_user instead of the header. */
export function guestClient(code) {
  if (!LIVE) return null;
  const token = readToken(code);
  if (token) {
    return createClient(url, key, {
      auth: { persistSession: false },
      global: { headers: { "x-xid-token": token } },
    });
  }
  return sb;
}

/* =============================================================================
   Every read and write in the app goes through this file. There are two
   implementations behind one API: Supabase when the env vars exist, and an
   in-memory store when they don't.

   If you're changing how data works, this is the only file you need to open.
   ========================================================================== */

/* ------------------------------------------------------------- demo store -- */
let mem = null;
const memory = () => (mem ||= { ...seed() });

const shape = (x) => ({
  id: x.id, code: x.code, label: x.label, presetId: x.preset,
  type: x.kind, createdAt: new Date(x.created_at).getTime(),
  expiresAt: new Date(x.expires_at).getTime(),
  maxConn: x.max_conn, maxMsgs: x.max_msgs, hours: x.hours, tz: x.tz,
  oneShot: x.one_shot, autoExtend: x.auto_extend, status: x.status, sealed: x.sealed,
  unread: 0, conversations: [],
});

/* ----------------------------------------------------------------- auth --- */
export const auth = {
  async user() {
    if (!LIVE) return { id: "demo", email: "you@example.com" };
    const { data } = await sb.auth.getUser();
    return data?.user ?? null;
  },
  async signIn(email, password) {
    if (!LIVE) return { ok: true };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { ok: !error, error: error?.message };
  },
  async signUp(email, password) {
    if (!LIVE) return { ok: true };
    const { error } = await sb.auth.signUp({ email, password });
    return { ok: !error, error: error?.message };
  },
  async signOut() {
    if (LIVE) await sb.auth.signOut();
  },
  onChange(cb) {
    if (!LIVE) return () => {};
    const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  },
};

/* ------------------------------------------------------------------ host -- */
export const db = {
  demo: !LIVE,

  /* Loads the host's whole world in three queries, then assembles the nested
     shape the UI already expects. Three round trips regardless of how many
     passes you have — don't turn this into a per-pass loop. */
  async load() {
    if (!LIVE) {
      const m = memory();
      m.kept = m.xids.reduce((n, x) =>
        n + x.conversations.filter((c) => c.keepMe && c.keepThem).length, 0);
      return m;
    }

    const [{ data: xids }, { data: receipts }] = await Promise.all([
      sb.from("xids").select("*").order("created_at", { ascending: false }),
      sb.from("receipts").select("*").order("ended_at", { ascending: false }).limit(200),
    ]);

    const ids = (xids ?? []).map((x) => x.id);
    let conns = [], msgs = [];
    if (ids.length) {
      const [c, m] = await Promise.all([
        sb.from("connections").select("*").in("xid_id", ids),
        sb.from("messages").select("*").in("xid_id", ids).order("created_at"),
      ]);
      conns = c.data ?? [];
      msgs = m.data ?? [];
    }

    const byConn = new Map();
    for (const m of msgs) {
      if (!byConn.has(m.conn_id)) byConn.set(m.conn_id, []);
      byConn.get(m.conn_id).push({
        id: m.id, side: m.from_host ? "me" : "them",
        text: m.body, ts: new Date(m.created_at).getTime(),
      });
    }

    const out = (xids ?? []).map(shape);
    for (const c of conns) {
      const x = out.find((v) => v.id === c.xid_id);
      if (!x) continue;
      x.conversations.push({
        id: c.id, guest: c.guest_label, joinedAt: new Date(c.joined_at).getTime(),
        blocked: c.blocked, strikes: c.strikes,
        revealMe: c.reveal_host, revealThem: c.reveal_guest,
        keepMe: c.keep_host, keepThem: c.keep_guest,
        messages: byConn.get(c.id) ?? [],
      });
    }

    /* Counted, not assumed. The ledger claims we keep nothing, so it must be
       able to say truthfully when that stops being true. */
    const kept = conns.filter((c) => c.keep_host && c.keep_guest).length;
    return {
      kept,
      xids: out,
      receipts: (receipts ?? []).map((r) => ({
        id: r.id, code: r.code, label: r.label, reason: r.reason,
        connections: r.connections, destroyed: r.destroyed,
        issued: new Date(r.issued_at).getTime(), ended: new Date(r.ended_at).getTime(),
      })),
    };
  },

  async issue(cfg, presetId) {
    /* Clamped in the data layer, not just the interface — a ceiling that exists
       only in the UI is not a ceiling. */
    const wanted = cfg.durN ? customMs(cfg.durN, cfg.durUnit) : (DUR[cfg.dur] ?? 864e5);
    const span = Math.min(wanted, MAX_SPAN_MS);
    const expires = Date.now() + span;
    if (!LIVE) {
      const x = {
        id: uid(), code: newCode(), label: cfg.label || preset(presetId).label,
        presetId, type: cfg.type, createdAt: Date.now(), expiresAt: expires,
        maxConn: cfg.conn, maxMsgs: cfg.msgs, hours: cfg.hours,
        oneShot: cfg.oneShot, autoExtend: cfg.autoExtend,
        status: "active", unread: 0, conversations: [],
      };
      memory().xids.unshift(x);
      return x;
    }
    const { data: u } = await sb.auth.getUser();
    /* hard_expiry caps auto-extend: the timer may stretch, but never past
       twice what the host originally agreed to. */
    const { data, error } = await sb.from("xids").insert({
      owner: u.user.id, code: newCode(), label: cfg.label || preset(presetId).label,
      preset: presetId, kind: cfg.type, max_conn: cfg.conn, max_msgs: cfg.msgs,
      hours: cfg.hours, tz: deviceZone(), one_shot: cfg.oneShot, auto_extend: cfg.autoExtend,
      expires_at: new Date(expires).toISOString(),
      hard_expiry: new Date(Date.now() + Math.min(span * 2, MAX_SPAN_MS * 2)).toISOString(),
    }).select().single();
    if (error) throw error;
    return shape(data);
  },

  async kill(xids) {
    if (!LIVE) {
      const m = memory(), ids = new Set(xids.map((x) => x.id));
      for (const x of m.xids) {
        if (!ids.has(x.id)) continue;
        m.receipts.push({
          id: uid(), code: x.code, label: x.label, reason: "Ended by you",
          issued: x.createdAt, ended: Date.now(),
          connections: x.conversations.length,
          destroyed: x.conversations.reduce((n, c) => n + c.messages.length, 0),
        });
        x.status = "killed";
        x.conversations = x.conversations.map((c) => ({ ...c, messages: [] }));
      }
      return;
    }
    /* One RPC per pass. It writes the receipt and deletes the content in a
       single transaction so a half-killed pass can never exist. */
    await Promise.all(xids.map((x) => sb.rpc("kill_xid", { p_id: x.id })));
  },

  async send(xidId, connId, text) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.id === xidId);
      const c = x?.conversations.find((v) => v.id === connId);
      c?.messages.push({ id: uid(), side: "me", text, ts: Date.now() });
      return;
    }
    const { error } = await sb.from("messages")
      .insert({ xid_id: xidId, conn_id: connId, from_host: true, body: text });
    if (error) throw new Error(friendly(error));
  },

  async setBlocked(xidId, connId, blocked) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.id === xidId);
      const c = x?.conversations.find((v) => v.id === connId);
      if (c) c.blocked = blocked;
      return;
    }
    await sb.from("connections").update({ blocked }).eq("id", connId);
  },

  /* Half of a mutual agreement. Nothing survives expiry until the other side
     agrees too — which is what stops this quietly becoming retention. */
  async setKeep(xidId, connId, on) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.id === xidId);
      const c = x?.conversations.find((v) => v.id === connId);
      if (c) c.keepMe = on;
      return;
    }
    const { error } = await sb.from("connections").update({ keep_host: on }).eq("id", connId);
    if (error) throw new Error(friendly(error));
  },

  /* Lets a host readmit someone after a one-shot XID has closed. Without it a
     guest who loses their token on a sealed XID is locked out for good and
     neither side can fix it. */
  async unseal(xidId) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.id === xidId);
      if (x) x.sealed = false;
      return;
    }
    const { error } = await sb.rpc("unseal_xid", { p_id: xidId });
    if (error) throw new Error(friendly(error));
  },

  /* Opened per open chat and closed the moment you leave — never globally. */
  watch(xidId, onChange) {
    if (!LIVE) return () => {};
    return poll(onChange);
  },
};

/* Live updates are polled, not pushed.

   Realtime was the obvious choice and it quietly did not work. A guest is
   identified by the x-xid-token header, and headers travel on HTTP requests —
   not on the realtime WebSocket. So the subscription authenticated as an
   anonymous visitor, row-level security found no matching connection, and the
   server correctly delivered nothing. No error, no events, and the guest had to
   reload to see a reply.

   Polling is also the better fit here. It survives a phone suspending the tab,
   it needs no reconnect logic, and it removes the concurrent-WebSocket ceiling
   that was the first thing due to break at scale. Four seconds is well inside
   what a conversation like this needs. */
const POLL_MS = 4000;

function poll(onTick) {
  if (typeof document === "undefined") return () => {};
  let stopped = false;
  const fire = () => { if (!stopped && document.visibilityState === "visible") onTick(); };
  const id = setInterval(fire, POLL_MS);
  /* Coming back to a backgrounded tab should feel instant rather than wait out
     the interval — this is the common case on a phone. */
  const onVisible = () => { if (document.visibilityState === "visible") onTick(); };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}

/* ----------------------------------------------------------------- guest -- */
export const guest = {
  hasToken(code) {
    return !!readToken(code);
  },

  async lookup(code) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.code === code);
      return x ? { id: x.id, code: x.code, label: x.label, kind: x.type, hours: x.hours, expires_at: new Date(x.expiresAt).toISOString(), status: x.status, sealed: !!x.sealed } : null;
    }
    /* Through a function, not the view. Someone holding a shared link has no
       session and no guest token, so no row-level policy can match them — the
       view returned nothing and every shared pass rendered as deactivated.
       Widening the policy instead would let anyone list every live pass. */
    const { data, error } = await sb.rpc("xid_by_code", { p_code: code });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  },

  async join(code, name) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.code === code);
      if (!x || x.status !== "active") throw new Error("XID_CLOSED");
      /* `sealed` closes the door to new people. It does NOT end the pass — the
         person who already walked through keeps their conversation until it
         expires. Killing the pass on join would lock out the one person it
         was issued for. */
      if (x.sealed) throw new Error("XID_FULL");
      if (x.maxConn !== null && x.conversations.length >= x.maxConn) throw new Error("XID_FULL");
      const c = { id: uid(), guest: name || "Guest", joinedAt: Date.now(), blocked: false, strikes: 0, revealMe: false, revealThem: false, messages: [] };
      x.conversations.push(c);
      writeToken(code, c.id);
      if (x.oneShot) x.sealed = true;
      return { connId: c.id, xidId: x.id };
    }
    const { data, error } = await sb.rpc("join_xid", { p_code: code, p_label: name });
    if (error) throw new Error(friendly(error));
    const row = Array.isArray(data) ? data[0] : data;
    writeToken(code, row.conn_token);
    return { xidId: row.xid };
  },

  async thread(code, xidId) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.code === code);
      const token = readToken(code);
      const c = x?.conversations.find((v) => v.id === token);
      return c ? { connId: c.id, claimed: !!c.claimed, blocked: c.blocked, keepMe: !!c.keepThem, keepThem: !!c.keepMe, revealMe: c.revealThem, revealThem: c.revealMe, messages: c.messages.map((m) => ({ ...m, side: m.side === "me" ? "them" : "me" })) } : null;
    }
    const g = guestClient(code);
    if (!g) return null;
    const [{ data: conn }, { data: msgs }] = await Promise.all([
      g.from("connections").select("*").eq("xid_id", xidId).maybeSingle(),
      g.from("messages").select("*").eq("xid_id", xidId).order("created_at"),
    ]);
    if (!conn) return null;
    return {
      connId: conn.id, blocked: conn.blocked, claimed: !!conn.guest_user,
      revealMe: conn.reveal_guest, revealThem: conn.reveal_host,
      keepMe: conn.keep_guest, keepThem: conn.keep_host,
      messages: (msgs ?? []).map((m) => ({
        id: m.id, side: m.from_host ? "them" : "me",
        text: m.body, ts: new Date(m.created_at).getTime(),
      })),
    };
  },

  async send(code, xidId, connId, text) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.code === code);
      const token = localStorage.getItem(guestKey(code));
      const c = x?.conversations.find((v) => v.id === token);
      c?.messages.push({ id: uid(), side: "them", text, ts: Date.now() });
      return;
    }
    const g = guestClient(code);
    const { error } = await g.from("messages")
      .insert({ xid_id: xidId, conn_id: connId, from_host: false, body: text });
    if (error) throw new Error(friendly(error));
  },

  /* Ties this conversation to an account so it survives a change of device.
     Runs on the device that still holds the token — that token is the only
     proof of ownership, so the claim has to happen while it's in hand. */
  async claim(code) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.code === code);
      const c = x?.conversations.find((v) => v.id === readToken(code));
      if (c) c.claimed = true;
      return true;
    }
    const token = readToken(code);
    if (!token) throw new Error("Nothing to keep on this device.");
    const { error } = await sb.rpc("claim_connection", { p_token: token });
    if (error) throw new Error(friendly(error));
    return true;
  },

  async setKeep(code, xidId, on) {
    if (!LIVE) {
      const x = memory().xids.find((v) => v.code === code);
      const c = x?.conversations.find((v) => v.id === readToken(code));
      if (c) c.keepThem = on;
      return;
    }
    const { error } = await guestClient(code).rpc("guest_set_keep", { p_xid: xidId, p_on: on });
    if (error) throw new Error(friendly(error));
  },

  watch(code, xidId, cb) {
    if (!LIVE) return () => {};
    return poll(cb);
  },
};

/* Lets either side keep their own record before an XID ends. This is the honest
   answer to "I need this conversation later": the copy lives with the person who
   asked for it, and the server still keeps nothing. */
export function buildTranscript(x, conv, whoAmI) {
  const when = (ts) => new Date(ts).toLocaleString();
  const lines = [
    `XIDgate conversation`,
    `XID:     ${x.label}  (${x.code})`,
    `Opened:  ${when(x.createdAt)}`,
    `Ends:    ${when(x.expiresAt)}`,
    `With:    ${conv.guest}`,
    `Saved:   ${when(Date.now())} by ${whoAmI}`,
    ``,
    `This is a personal copy. XIDgate clears the original when the XID ends.`,
    `─`.repeat(60),
    ``,
  ];
  for (const m of conv.messages) {
    const who = m.side === "me" ? (whoAmI === "host" ? "You" : "You") : conv.guest;
    lines.push(`[${when(m.ts)}] ${who}: ${m.text}`);
  }
  return lines.join("\n");
}

export function downloadTranscript(x, conv, whoAmI) {
  const text = buildTranscript(x, conv, whoAmI);
  const safe = (x.label || "conversation").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `xidgate-${safe || "conversation"}-${x.code}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return text;
}

/* The database raises named errors so the interface can explain what happened
   instead of showing a stack trace. Keep these in sync with schema.sql. */
function friendly(error) {
  const m = String(error?.message ?? error);
  if (m.includes("XID_CLOSED")) return "This XID has ended. Nothing here can be reopened.";
  if (m.includes("XID_FULL")) return "This XID is closed to new people. Whoever it was meant for has already joined.";
  if (m.includes("CONNECTION_BLOCKED")) return "You can't send messages on this XID.";
  if (m.includes("QUIET_HOURS")) return "It's outside the hours this XID accepts messages.";
  if (m.includes("MESSAGE_CAP")) return "This XID has reached its message limit.";
  if (m.includes("RATE_LIMIT")) return "Too many messages too quickly. Slow down and try again.";
  if (m.includes("DAILY_LIMIT")) return `That's ${DAILY_XID_LIMIT} XIDs in the last 24 hours. End one you're finished with, or try again a little later.`;
  if (m.includes("NOT_A_GUEST")) return "This conversation is no longer open to you.";
  if (m.includes("NOT_SIGNED_IN")) return "Create an account first, then we can keep this for you.";
  if (m.includes("CLAIM_FAILED")) return "This conversation is already linked to an account.";
  return "Something went wrong. Try again.";
}
