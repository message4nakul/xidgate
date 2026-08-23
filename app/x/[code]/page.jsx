"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/screens";
import { Btn, Chip, Field, Ico, MONO, SANS, T, auth, clock, countdown, downloadTranscript, guest, hoursMeta, nextOpen, selectStyle, useNarrow, withinHours } from "@/lib/core";

/* =============================================================================
   This is the page a stranger lands on, and it is the most important screen in
   the product. They have no account, no context, and one reason to be
   suspicious: an unfamiliar link. So it says plainly what this is, what the
   rules are, and what nobody can do to them — before asking for anything.
   ========================================================================== */

export default function GuestPage() {
  const code = String(useParams().code || "");
  const [xid, setXid] = useState(undefined);
  const [thread, setThread] = useState(null);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [keepDone, setKeepDone] = useState(false);
  const [keepDismissed, setKeepDismissed] = useState(false);
  const [kEmail, setKEmail] = useState("");
  const [kPw, setKPw] = useState("");
  const [kErr, setKErr] = useState(null);
  const [kBusy, setKBusy] = useState(false);
  const [, setTick] = useState(0);
  const endRef = useRef(null);
  const narrow = useNarrow();

  const load = useCallback(async () => {
    const x = await guest.lookup(code);
    setXid(x);
    if (x && x.status === "active" && guest.hasToken(code)) {
      setThread(await guest.thread(code, x.id));
    }
  }, [code]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [thread?.messages.length]);

  /* Depend on the id, not the objects. lookup() and thread() return fresh
     objects every poll, so depending on them would tear the timer down and
     rebuild it on every tick. */
  useEffect(() => {
    if (!xid?.id || !thread) return;
    return guest.watch(code, xid.id, load);
  }, [xid?.id, !!thread, code, load]);

  const join = async () => {
    setErr(null); setBusy(true);
    try { await guest.join(code, name.trim()); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const send = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft(""); setErr(null);
    try { await guest.send(code, xid.id, thread.connId, text); await load(); }
    catch (e) { setErr(e.message); setDraft(text); }
  };

  /* Offered only after they've actually said something. Asking before the first
     message is asking a stranger to sign up for a product they haven't used
     yet — which is the whole thing this design avoids. */
  const keepIt = async () => {
    setKErr(null);
    if (!kEmail.trim() || kPw.length < 6) {
      setKErr("Enter your email and a password of at least 6 characters.");
      return;
    }
    setKBusy(true);
    const res = await auth.signUp(kEmail.trim(), kPw);
    if (!res.ok) {
      setKErr(res.error || "Couldn't create that account.");
      setKBusy(false);
      return;
    }
    try {
      await guest.claim(code);
      setKeepDone(true);
      setKeepOpen(false);
    } catch (e) {
      setKErr(e.message);
    }
    setKBusy(false);
  };

  if (xid === undefined) return <Shell><Center><span style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>Opening…</span></Center></Shell>;

  /* ------------------------------------------------------------ gone ----- */
  /* The conversion moment. They've just watched something disappear on
     purpose — that's when the idea lands, not before. */
  if (!xid || xid.status !== "active" || new Date(xid.expires_at) <= new Date()) {
    return (
      <Shell>
        <Center>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: 12, borderRadius: 11, background: T.stampWash, color: T.stamp, marginBottom: 18 }}>
              <Ico.Shield size={22} />
            </div>
            <h1 style={{ margin: "0 0 10px", fontFamily: SANS, fontSize: 25, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
              This conversation has ended
            </h1>
            <p style={{ margin: "0 0 8px", fontSize: 14.5, color: T.mute, lineHeight: 1.6 }}>
              The XID reached its end, so the conversation closed on both sides. There's no archive and no way to reopen it.
            </p>
            <p style={{ margin: "0 0 26px", fontSize: 14.5, color: T.mute, lineHeight: 1.6 }}>
              Nobody kept your details either. That was the point.
            </p>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Btn size="lg" icon={Ico.Arrow}>Create your own XID</Btn>
            </Link>
            <p style={{ margin: "16px 0 0", fontSize: 12.5, color: T.faint, lineHeight: 1.55 }}>
              Free. Give out an XID instead of your number next time you sell something, meet someone, or ask for a quote.
            </p>
          </div>
        </Center>
      </Shell>
    );
  }

  /* Sealed but you're not the joiner: say so plainly rather than showing a
     join form that will fail. */
  if (xid.sealed && !thread) {
    return (
      <Shell>
        <Center>
          <div style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: 12, borderRadius: 11, background: "#EDEFF2", color: T.mute, marginBottom: 18 }}>
              <Ico.Ban size={22} />
            </div>
            <h1 style={{ margin: "0 0 10px", fontFamily: SANS, fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
              This XID is closed
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 14.5, color: T.mute, lineHeight: 1.6 }}>
              It was set to accept one person, and someone has already joined. Even if this link was forwarded to you, nobody else can get in.
            </p>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Btn size="lg" icon={Ico.Arrow}>Create your own XID</Btn>
            </Link>
          </div>
        </Center>
      </Shell>
    );
  }

  const left = new Date(xid.expires_at).getTime() - Date.now();
  const cd = countdown(left);
  const open = withinHours(xid.hours);

  /* ------------------------------------------------------------ join ----- */
  if (!thread) {
    return (
      <Shell>
        <Center>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ background: T.card, border: `1px solid ${T.rule}`, borderRadius: 14, padding: narrow ? "24px 20px" : "30px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                <Chip tone="live">live</Chip>
                <span style={{ fontFamily: MONO, fontSize: 11, color: T.mute }}>{cd.text} {cd.sub}</span>
              </div>

              <h1 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 23, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
                {xid.label}
              </h1>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: T.mute, lineHeight: 1.6 }}>
                Someone opened a direct line to you. No app, no signup, no numbers exchanged — pick a name and start talking.
              </p>

              <ul style={{ margin: "0 0 22px", padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
                {[
                  ["You don't need an account", "No signup, no app, no password. Pick a name and start typing."],
                  ["They can't see who you are", "Not your number, not your email, not your name unless you type it."],
                  [`It ends in ${cd.text}`, "When it does, the conversation closes for both of you."],
                  ...(xid.hours !== "any" ? [["Messages only during set hours", hoursMeta(xid.hours).label]] : []),
                ].map(([k, v]) => (
                  <li key={k} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span style={{ color: T.signal, marginTop: 1, flexShrink: 0 }}><Ico.Check size={15} /></span>
                    <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                      <strong style={{ fontWeight: 650, color: T.ink }}>{k}.</strong>{" "}
                      <span style={{ color: T.mute }}>{v}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <Field label="What should they call you?" hint="Anything you like. A nickname is fine — this is the only thing they'll see.">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
                  placeholder="e.g. Ravi, or Buyer from Indiranagar"
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  style={{ ...selectStyle, backgroundImage: "none", cursor: "text" }} />
              </Field>

              {err && (
                <div role="alert" style={{ padding: "10px 12px", borderRadius: 8, background: T.stampWash, border: "1px solid #F2C9C1", color: T.stamp, fontSize: 12.5, lineHeight: 1.5, marginBottom: 14 }}>{err}</div>
              )}

              <Btn size="lg" style={{ width: "100%" }} onClick={join} disabled={busy}>
                {busy ? "Joining…" : "Start messaging"}
              </Btn>
            </div>

            <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 12, color: T.faint, lineHeight: 1.55 }}>
              XIDgate · Patent No. 550231 · <Link href="/" style={{ color: T.mute }}>What is this?</Link>
            </p>
          </div>
        </Center>
      </Shell>
    );
  }

  /* ------------------------------------------------------------ chat ----- */
  return (
    <Shell pad={false}>
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: T.card, maxWidth: 720, margin: "0 auto", borderLeft: narrow ? "none" : `1px solid ${T.ruleSoft}`, borderRight: narrow ? "none" : `1px solid ${T.ruleSoft}` }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: narrow ? "11px 14px" : "13px 20px", borderBottom: `1px solid ${T.ruleSoft}`, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 650, letterSpacing: "-0.015em", color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{xid.label}</span>
              <Chip tone={open ? "live" : "warn"}>{open ? "live" : "quiet hours"}</Chip>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.mute, marginTop: 3 }}>
              ends in {cd.text}
            </div>
          </div>
          {thread.messages.length > 0 && (
            <Btn size="sm" kind="quiet" icon={Ico.Ledger} title="Save your own copy before this ends"
              onClick={() => downloadTranscript(
                { label: xid.label, code, createdAt: Date.now(), expiresAt: new Date(xid.expires_at).getTime() },
                { guest: "Them", messages: thread.messages }, "guest")}>
              {narrow ? "Save" : "Save a copy"}
            </Btn>
          )}
          <Wordmark />
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: narrow ? "14px" : "16px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 13px", borderRadius: 9, background: T.signalWash, border: "1px solid #DCE2FF", color: T.signalDeep, fontSize: 12.5, lineHeight: 1.55, marginBottom: 16 }}>
            <Ico.Shield size={15} />
            <span>
              <strong style={{ fontWeight: 650 }}>You're messaging through XIDgate.</strong> You don't have their number or email, and they don't have yours. This conversation closes in {cd.text}.
              {!open && <> Right now it's outside their hours — you can read but not send until {nextOpen(xid.hours)}.</>}
            </span>
          </div>

          {thread.messages.map((m) => {
            const mine = m.side === "me";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{
                  maxWidth: "72%", padding: "9px 13px", borderRadius: 12,
                  borderBottomRightRadius: mine ? 4 : 12, borderBottomLeftRadius: mine ? 12 : 4,
                  background: mine ? T.signal : "#F1F3F6", color: mine ? "#fff" : T.ink,
                  fontFamily: SANS, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                }}>
                  {m.text}
                  <div style={{ fontFamily: MONO, fontSize: 9.5, marginTop: 4, color: mine ? "rgba(255,255,255,.65)" : T.faint }}>{clock(m.ts)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Continuity offer — appears only once they've sent something. */}
        {!thread.blocked && !thread.claimed && !keepDone && !keepDismissed &&
          thread.messages.some((m) => m.side === "me") && (
          <div style={{ padding: "11px 16px", borderTop: `1px solid ${T.ruleSoft}`, background: T.signalWash }}>
            {!keepOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: T.signalDeep, flex: 1, minWidth: 190, lineHeight: 1.5 }}>
                  Want this conversation to follow you to another device? Create an account — it takes about ten seconds.
                </span>
                <Btn size="sm" onClick={() => setKeepOpen(true)}>Keep it</Btn>
                <button onClick={() => setKeepDismissed(true)}
                  style={{ border: "none", background: "none", color: T.mute, fontFamily: SANS, fontSize: 12.5, cursor: "pointer" }}>
                  No thanks
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, color: T.signalDeep, lineHeight: 1.5, marginBottom: 10 }}>
                  <strong style={{ fontWeight: 650 }}>This only saves your side.</strong> They still can't see your email, and the XID still ends when it ends.
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                  <input type="email" value={kEmail} onChange={(e) => setKEmail(e.target.value)} placeholder="you@example.com"
                    autoComplete="email"
                    style={{ ...selectStyle, backgroundImage: "none", cursor: "text", flex: "1 1 180px", padding: "9px 11px", fontSize: 15 }} />
                  <input type="password" value={kPw} onChange={(e) => setKPw(e.target.value)} placeholder="Password"
                    autoComplete="new-password" onKeyDown={(e) => e.key === "Enter" && keepIt()}
                    style={{ ...selectStyle, backgroundImage: "none", cursor: "text", flex: "1 1 140px", padding: "9px 11px", fontSize: 15 }} />
                  <Btn size="sm" onClick={keepIt} disabled={kBusy}>{kBusy ? "Saving…" : "Save"}</Btn>
                  <Btn size="sm" kind="ghost" onClick={() => { setKeepOpen(false); setKErr(null); }}>Cancel</Btn>
                </div>
                {kErr && <div role="alert" style={{ fontSize: 12, color: T.stamp, lineHeight: 1.45 }}>{kErr}</div>}
              </div>
            )}
          </div>
        )}

        {keepDone && (
          <div style={{ padding: "11px 16px", borderTop: `1px solid ${T.ruleSoft}`, background: T.liveWash, display: "flex", alignItems: "center", gap: 9 }}>
            <Ico.Check size={16} style={{ color: T.live }} />
            <span style={{ fontSize: 12.5, color: T.live, lineHeight: 1.5 }}>
              Saved. Sign in with that email on any device and this conversation will be here — until the XID ends.
            </span>
          </div>
        )}

        {!thread.blocked && (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.ruleSoft}`,
            background: thread.keepMe && thread.keepThem ? T.liveWash : "#FAFBFC" }}>
            {thread.keepMe && thread.keepThem ? (
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: T.live, flexWrap: "wrap" }}>
                <Ico.Shield size={16} />
                <span style={{ flex: 1, minWidth: 190 }}>
                  <strong style={{ fontWeight: 650 }}>You both agreed to keep this.</strong> It stays readable after the XID ends.
                </span>
                <Btn size="sm" kind="ghost"
                  onClick={async () => { try { await guest.setKeep(code, xid.id, false); await load(); } catch (e) { setErr(e.message); } }}>
                  Stop keeping
                </Btn>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: T.mute, flex: 1, minWidth: 190 }}>
                  {thread.keepMe
                    ? "You've asked to keep this. It still closes when the XID ends unless they agree too."
                    : thread.keepThem
                      ? "They've asked to keep this past the end date. It's only kept if you agree as well."
                      : "This closes when the XID ends. If you both agree, it can be kept."}
                </span>
                <Btn size="sm" kind="quiet" icon={Ico.Shield} disabled={thread.keepMe}
                  onClick={async () => { try { await guest.setKeep(code, xid.id, true); await load(); } catch (e) { setErr(e.message); } }}>
                  {thread.keepMe ? "You've agreed" : "Keep this"}
                </Btn>
              </div>
            )}
          </div>
        )}

                {err && (
          <div role="alert" style={{ padding: "9px 16px", background: T.stampWash, borderTop: "1px solid #F2C9C1", color: T.stamp, fontSize: 12.5 }}>{err}</div>
        )}

        {thread.blocked || !open ? (
          <div style={{ padding: "15px 16px", borderTop: `1px solid ${T.ruleSoft}`, textAlign: "center", fontSize: 13, color: T.mute }}>
            {thread.blocked ? "You can't send messages on this XID." : `Quiet hours. You can send again from ${nextOpen(xid.hours)}.`}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 9, padding: narrow ? "10px 14px" : "12px 20px", paddingBottom: `max(${narrow ? 10 : 12}px, env(safe-area-inset-bottom))`, borderTop: `1px solid ${T.ruleSoft}`, alignItems: "center" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message" maxLength={2000}
              style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 9, border: `1px solid ${T.rule}`, background: T.card, fontFamily: SANS, fontSize: 16, color: T.ink, outline: "none" }} />
            <Btn icon={Ico.Send} onClick={send} style={{ opacity: draft.trim() ? 1 : 0.4 }}>Send</Btn>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, pad = true }) {
  return <div style={{ minHeight: "100dvh", background: T.paper, padding: pad ? "0 16px" : 0 }}>{children}</div>;
}
function Center({ children }) {
  return <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 0" }}>{children}</div>;
}
