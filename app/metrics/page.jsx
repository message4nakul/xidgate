"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/screens";
import { Btn, Ico, MONO, SANS, T, auth, sb, stampDate, useNarrow } from "@/lib/core";

/* =============================================================================
   /metrics — the numbers, for one person.

   Everything here comes from admin_metrics(), a security-definer function that
   checks auth.uid() against the owner before returning anything. The page is
   therefore safe even though it reads across every account: the database, not
   this component, decides who may see it. Signed in as anyone else, the call
   returns 401 and this renders a refusal.

   It reports counts only. No message text, no guest names, no tokens — the
   product's promise applies to its own analytics too.
   ========================================================================== */

const card = { background: T.card, border: `1px solid ${T.rule}`, borderRadius: 14, padding: "20px 22px" };

function Stat({ label, value, note, accent }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 150 }}>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: SANS, fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", color: accent || T.ink, marginTop: 6, lineHeight: 1 }}>{value}</div>
      {note && <div style={{ fontSize: 12, color: T.mute, marginTop: 6, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ margin: 0, fontFamily: SANS, fontSize: 17, fontWeight: 650, color: T.ink, letterSpacing: "-0.02em" }}>{title}</h2>
      {hint && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.mute, lineHeight: 1.5, maxWidth: 640 }}>{hint}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

/* Drawn by hand rather than pulled from a chart library: the CSP only allows
   scripts from this origin, and a dozen SVG rects is less work than a CDN. */
function Bars({ rows }) {
  if (!rows.length) return <p style={{ fontSize: 13, color: T.mute }}>Nothing yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.app + r.api));
  const W = 1000, H = 190, pad = 26;
  const bw = (W - pad * 2) / rows.length;
  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 460, display: "block" }} role="img"
        aria-label="XIDs created per week, split between the app and the API">
        {rows.map((r, i) => {
          const total = r.app + r.api;
          const h = ((H - pad * 2) * total) / max;
          const ah = total ? (h * r.app) / total : 0;
          const x = pad + i * bw + bw * 0.18, w = bw * 0.64, y = H - pad - h;
          return (
            <g key={r.week}>
              <rect x={x} y={y} width={w} height={h - ah} rx={3} fill={T.signal} opacity="0.45" />
              <rect x={x} y={y + (h - ah)} width={w} height={ah} rx={3} fill={T.ink} />
              <text x={x + w / 2} y={H - pad + 14} textAnchor="middle"
                style={{ fontFamily: "monospace", fontSize: 10, fill: T.faint }}>
                {r.week.slice(5)}
              </text>
              {total > 0 && (
                <text x={x + w / 2} y={y - 6} textAnchor="middle"
                  style={{ fontFamily: "monospace", fontSize: 10, fill: T.mute }}>{total}</text>
              )}
            </g>
          );
        })}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={T.rule} strokeWidth="1" />
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11.5, color: T.mute }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: T.ink, borderRadius: 2, marginRight: 6 }} />from the app</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: T.signal, opacity: 0.45, borderRadius: 2, marginRight: 6 }} />from the API</span>
      </div>
    </div>
  );
}

function Funnel({ f }) {
  const steps = [
    ["Made an XID", f.made_an_xid],
    ["Someone joined it", f.got_a_guest],
    ["A message was sent", f.got_a_message],
  ];
  const top = Math.max(1, steps[0][1]);
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
      {steps.map(([label, n], i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 170, fontSize: 13.5, color: T.ink }}>{label}</div>
          <div style={{ flex: 1, height: 26, background: T.paper, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${(n / top) * 100}%`, height: "100%", background: i === 2 ? T.signal : T.ink, opacity: i === 1 ? 0.75 : 1 }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 15, color: T.ink, width: 40, textAlign: "right" }}>{n}</div>
        </div>
      ))}
    </div>
  );
}

export default function Metrics() {
  const narrow = useNarrow();
  const [m, setM] = useState(undefined);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const u = await auth.user();
      if (!u) { setErr("signin"); setM(null); return; }
      const { data, error } = await sb.rpc("admin_metrics");
      if (error) { setErr(/permission|forbidden/i.test(error.message) ? "forbidden" : error.message); setM(null); return; }
      setErr(null); setM(data);
    } catch (e) { setErr(e.message); setM(null); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (m === undefined) {
    return (
      <main style={{ minHeight: "100dvh", background: T.paper, display: "grid", placeItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>Counting&hellip;</span>
      </main>
    );
  }

  if (!m) {
    return (
      <main style={{ minHeight: "100dvh", background: T.paper, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ color: T.faint, marginBottom: 14 }}><Ico.Shield size={28} /></div>
          <h1 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 21, fontWeight: 700, color: T.ink, letterSpacing: "-0.03em" }}>
            {err === "signin" ? "Sign in first" : "Not your page"}
          </h1>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: T.mute, lineHeight: 1.6 }}>
            {err === "signin"
              ? "These numbers are only visible to the account that owns XIDgate."
              : "This account can't see these numbers. The database refuses the request, not the page."}
          </p>
          <Link href="/app" style={{ color: T.signalDeep, fontSize: 14 }}>Back to your XIDs</Link>
        </div>
      </main>
    );
  }

  const { accounts: a, funnel: f, xids: x, engagement: e, weekly, repeat_use, partners, health } = m;
  const apiShare = x.app + x.api ? Math.round((x.api / (x.app + x.api)) * 100) : 0;

  return (
    <main style={{ minHeight: "100dvh", background: T.paper }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: narrow ? "16px 12px 56px" : "26px 22px 72px" }}>

        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h1 style={{ margin: 0, fontFamily: SANS, fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Analytics</h1>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>
              as of {stampDate(new Date(m.generated_at).getTime())}
            </div>
          </div>
          <Btn size="sm" kind="quiet" onClick={load}>Refresh</Btn>
          <Wordmark />
        </header>

        <Section title="Accounts" hint="An account that has never created an XID has not used the product. That is the number worth quoting, not signups.">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Total" value={a.total} />
            <Stat label="New · 30d" value={a.new_30d} />
            <Stat label="New · 7d" value={a.new_7d} />
            <Stat label="Signed in · 30d" value={a.active_30d} />
            <Stat label="Made an XID" value={a.activated} accent={T.signalDeep}
              note={a.total ? `${Math.round((a.activated / a.total) * 100)}% of accounts` : null} />
          </div>
        </Section>

        <Section title="Does it get used" hint="Signing up is cheap. The drop between these three steps is where the product is failing.">
          <Funnel f={f} />
        </Section>

        <Section title="XIDs created each week" hint="App and API are stacked but kept distinct. Merging them makes partner testing look like consumer adoption.">
          <Bars rows={weekly || []} />
        </Section>

        <Section title="Volume">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="From the app" value={x.app} />
            <Stat label="From the API" value={x.api} note={`${apiShare}% of all XIDs`} />
            <Stat label="Live now" value={x.live} accent={T.signalDeep} />
            <Stat label="Ended" value={x.ended} />
          </div>
        </Section>

        <Section title="Engagement" hint="A guest is someone who opened a link with no account. That is the number that shows the other side works.">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Guests joined" value={e.guests} />
            <Stat label="XIDs with a guest" value={e.xids_with_guest} />
            <Stat label="Messages live" value={e.messages_live} />
            <Stat label="Kept by both" value={e.kept_conversations} note="survived their XID" />
          </div>
        </Section>

        {(partners || []).length > 0 && (
          <Section title="Partners" hint="What each integration is actually doing. Engaged means at least one person opened the link.">
            <div style={{ ...card, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.rule}` }}>
                    {["Key", "XIDs", "Engaged", "API calls", "Allowance", "Last used"].map((h, i) => (
                      <th key={h} style={{ textAlign: i ? "right" : "left", padding: "12px 16px", fontFamily: MONO, fontSize: 10.5, color: T.faint, fontWeight: 400, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => (
                    <tr key={p.label} style={{ borderBottom: `1px solid ${T.ruleSoft}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: T.ink }}>{p.label}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: MONO }}>{p.xids}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: MONO, color: p.engaged ? T.signalDeep : T.faint }}>{p.engaged}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: MONO, color: T.mute }}>{p.calls}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: MONO, color: T.mute }}>{p.daily_limit}/day</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: MONO, fontSize: 11, color: T.faint }}>
                        {p.last_used_at ? stampDate(new Date(p.last_used_at).getTime()) : "never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {(repeat_use || []).length > 0 && (
          <Section title="Repeat use" hint="Accounts grouped by how many XIDs they have made. Anyone past one came back on purpose.">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {repeat_use.map((r) => (
                <Stat key={r.made} label={`${r.made} XID${r.made === 1 ? "" : "s"}`} value={r.accounts}
                  note={r.made === 1 ? "tried it once" : "came back"} accent={r.made > 1 ? T.signalDeep : null} />
              ))}
            </div>
          </Section>
        )}

        <Section title="The promise, measured" hint="Destruction is the whole claim. Overdue should always be zero — anything else means expired XIDs are not being cleared.">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Messages destroyed" value={health.destroyed} accent={T.signalDeep} />
            <Stat label="Overdue, not purged" value={health.overdue}
              accent={health.overdue > 0 ? T.stamp : T.ink}
              note={health.overdue > 0 ? "the purge is lagging — look into it" : "purge is keeping up"} />
          </div>
        </Section>

        <p style={{ margin: "36px 4px 0", fontSize: 12, color: T.faint, lineHeight: 1.6, maxWidth: 680 }}>
          Counts only. This page never reads a message, a guest&rsquo;s name or a token &mdash; the same rule the
          product applies to everyone else applies to its own analytics.
        </p>
      </div>
    </main>
  );
}
