"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/screens";
import { Btn, Chip, Ico, MONO, SANS, T, clock, countdown, host,
         nextOpen, useNarrow, withinHours } from "@/lib/core";

/* =============================================================================
   /h#<token> — the reply side of an XID minted through the API.

   The credential is in the URL fragment, not the path, and that is the whole
   point of this route's shape. A fragment is never transmitted to a server, so
   the token stays out of hosting access logs, out of any proxy in between, and
   out of anything downstream that records request paths. Put it in the path and
   the owner's only credential is sitting in plaintext in a log file forever.

   It is still a bearer link: whoever holds it can read and reply. It remains in
   the owner's browser history and in the address bar. Those are inherent to
   handing someone a link and are why the listing site must keep it behind its
   own login rather than emailing it.

   Read and reply only. Ending an XID belongs to the site, through the API, so
   destructive actions stay in one place and this page stays small.
   ========================================================================== */
export default function HostReply() {
  const narrow = useNarrow();
  const [token, setToken] = useState(undefined);   // undefined = not read yet
  const [xid, setXid] = useState(undefined);
  const [cid, setCid] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const foot = useRef(null);

  /* The fragment is only available in the browser, never during render on the
     server, so it has to be read after mount. */
  useEffect(() => {
    const read = () => setToken((window.location.hash || "").replace(/^#/, "").trim() || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try { setXid(await host.view(token)); }
    catch (e) { setErr(e.message); setXid(null); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);
  useEffect(() => { if (xid) return host.watch(load); }, [!!xid, load]);

  const cur = xid?.conversations.find((c) => c.id === cid) || xid?.conversations[0];
  useEffect(() => { if (cur && cid !== cur.id) setCid(cur.id); }, [cur, cid]);
  useEffect(() => { foot.current?.scrollIntoView({ behavior: "smooth" }); }, [cur?.messages.length]);

  if (token === undefined || (token && xid === undefined)) {
    return (
      <main style={{ minHeight: "100dvh", background: T.paper, display: "grid", placeItems: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>Opening&hellip;</div>
      </main>
    );
  }

  if (!token || !xid) {
    return (
      <main style={{ minHeight: "100dvh", background: T.paper, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 430, textAlign: "center" }}>
          <div style={{ color: T.faint, marginBottom: 14 }}><Ico.Pass size={30} /></div>
          <h1 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
            This link isn&rsquo;t valid
          </h1>
          <p style={{ margin: "0 0 6px", fontSize: 14, color: T.mute, lineHeight: 1.6 }}>
            {!token
              ? "This page needs the full link you were given, including everything after the # symbol."
              : (err || "It may have been replaced, or the conversation it belonged to has ended.")}
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: T.faint, lineHeight: 1.55 }}>
            Open it again from wherever you found it, rather than retyping it.
          </p>
        </div>
      </main>
    );
  }

  const live = xid.status === "active" && xid.expiresAt > Date.now();
  const open = live && withinHours(xid.hours, xid.tz);
  const cd = countdown(xid.expiresAt - Date.now());

  const send = async () => {
    const body = draft.trim();
    if (!body || !cur) return;
    setBusy(true); setErr(null);
    try { await host.send(token, cur.id, body); setDraft(""); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <main style={{ minHeight: "100dvh", background: T.paper }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: narrow ? "14px 12px 28px" : "24px 20px 40px" }}>

        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, letterSpacing: "-0.025em", color: T.ink }}>
                {xid.label}
              </span>
              <Chip tone={live ? (open ? "live" : "warn") : "dead"}>
                {live ? (open ? "live" : "quiet hours") : "ended"}
              </Chip>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>
              {live ? `ends in ${cd.text}` : "this conversation has ended"}
            </div>
          </div>
          <Wordmark />
        </header>

        <div style={{ background: T.card, border: `1px solid ${T.rule}`, borderRadius: 13, overflow: "hidden" }}>

          <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.ruleSoft}`, background: T.signalWash, fontSize: 12.5, color: T.signalDeep, lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 650 }}>You&rsquo;re replying through XIDgate.</strong>{" "}
            They don&rsquo;t have your number or email, and you don&rsquo;t have theirs.{" "}
            {live ? <>Everything here is cleared when this ends.</> : <>Nothing more can be sent.</>}
          </div>

          {xid.conversations.length > 1 && (
            <div style={{ display: "flex", gap: 6, padding: "10px 12px", borderBottom: `1px solid ${T.ruleSoft}`, overflowX: "auto" }}>
              {xid.conversations.map((c) => (
                <button key={c.id} onClick={() => setCid(c.id)}
                  style={{
                    padding: "6px 11px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: SANS, fontSize: 12.5, fontWeight: 600,
                    borderWidth: 1, borderStyle: "solid",
                    borderColor: c.id === cur?.id ? T.signal : T.rule,
                    background: c.id === cur?.id ? T.signalWash : T.card,
                    color: c.id === cur?.id ? T.signalDeep : T.mute,
                  }}>
                  {c.guest}{" "}
                  <span style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.7 }}>{c.messages.length}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: 16, minHeight: 220, maxHeight: "56dvh", overflowY: "auto" }}>
            {!cur || cur.messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "44px 16px", color: T.mute, fontSize: 13.5, lineHeight: 1.55 }}>
                {xid.conversations.length === 0
                  ? "Nobody has opened this link yet. When someone does, their message appears here."
                  : "No messages yet."}
              </div>
            ) : cur.messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.side === "me" ? "flex-end" : "flex-start", marginBottom: 9 }}>
                <div style={{
                  maxWidth: "78%", padding: "9px 13px", borderRadius: 13,
                  background: m.side === "me" ? T.ink : T.paper,
                  color: m.side === "me" ? "#fff" : T.ink,
                  border: m.side === "me" ? "none" : `1px solid ${T.rule}`,
                  fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                }}>
                  {m.text}
                  <div style={{ fontFamily: MONO, fontSize: 9.5, marginTop: 4, opacity: 0.55 }}>{clock(m.ts)}</div>
                </div>
              </div>
            ))}
            <div ref={foot} />
          </div>

          {err && (
            <div role="alert" style={{ padding: "9px 16px", borderTop: `1px solid ${T.ruleSoft}`, background: T.amberWash, fontSize: 12.5, color: T.stamp, lineHeight: 1.45 }}>
              {err}
            </div>
          )}

          {live && open && cur ? (
            <div style={{ display: "flex", gap: 8, padding: "11px 12px", borderTop: `1px solid ${T.ruleSoft}` }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type a reply" maxLength={4000}
                style={{ flex: 1, padding: "10px 13px", borderRadius: 9, border: `1px solid ${T.rule}`,
                         fontFamily: SANS, fontSize: 15, color: T.ink, outline: "none", minWidth: 0 }} />
              <Btn onClick={send} disabled={busy || !draft.trim()}>{busy ? "\u2026" : "Send"}</Btn>
            </div>
          ) : (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.ruleSoft}`, fontSize: 12.5, color: T.mute, lineHeight: 1.5 }}>
              {!live
                ? "This conversation has ended, so nothing more can be sent."
                : nextOpen(xid.hours, xid.tz)
                  ? <>Outside the hours set for this listing &mdash; you can reply again from {nextOpen(xid.hours, xid.tz)}.</>
                  : <>Outside the hours set for this listing.</>}
            </div>
          )}
        </div>

        <p style={{ margin: "16px 4px 0", fontSize: 12, color: T.faint, lineHeight: 1.6 }}>
          This link is how you reply. Keep it private &mdash; anyone holding it can read and answer
          this conversation. <Link href="/" style={{ color: T.signalDeep }}>What is XIDgate?</Link>
        </p>
      </div>
    </main>
  );
}
