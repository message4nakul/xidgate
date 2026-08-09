"use client";
import { useState, useEffect, useRef } from "react";
import { Btn, Chip, DUR, DUR_LABEL, Field, HOURS, Ico, MONO, PLAN, PRESETS, Pass, QRCode, SANS, T, Toggle, auth, clock, countdown, db, expiryFrom, hoursMeta, linkFor, nextOpen, preset, selectStyle, stampDate, useNarrow, withinHours } from "@/lib/core";

/* ------------------------------------------------------------- dashboard -- */
export function Dashboard({ state, go, onKill, onKillAll, onShare }) {
  const narrow = useNarrow();
  const [q, setQ] = useState("");
  const live = state.xids.filter((x) => x.status === "active");
  const done = state.xids.filter((x) => x.status !== "active");
  const match = (x) =>
    !q ||
    x.label.toLowerCase().includes(q.toLowerCase()) ||
    x.code.toLowerCase().includes(q.toLowerCase()) ||
    x.conversations.some((c) => c.messages.some((m) => m.text.toLowerCase().includes(q.toLowerCase())));
  const shown = [...live, ...done].filter(match);
  const atCap = state.plan === "free" && live.length >= PLAN.free.passes;

  return (
    <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
            Your passes
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: T.mute, maxWidth: 520, lineHeight: 1.5 }}>
            {live.length === 0
              ? "Nobody can reach you right now. Issue a pass when you need someone to."
              : `${live.length} ${live.length === 1 ? "person or group has" : "people and groups have"} a way to reach you. Each one ends on its own.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {live.length > 1 && <Btn kind="danger" icon={Ico.Bolt} onClick={onKillAll}>Kill everything</Btn>}
          <Btn icon={Ico.Plus} onClick={() => go("issue")}>Issue a pass</Btn>
        </div>
      </header>

      {atCap && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 10, background: T.amberWash, border: "1px solid #F0DEBE", marginBottom: 22 }}>
          <Ico.Clock size={17} style={{ color: T.amber, flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: T.ink, flex: 1 }}>
            You're using all 3 free passes. Kill one to free a slot, or go Pro for unlimited.
          </span>
          <Btn size="sm" kind="quiet" onClick={() => go("plans")}>See plans</Btn>
        </div>
      )}

      {state.xids.length > 2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 8, border: `1px solid ${T.rule}`, background: T.card, marginBottom: 20, maxWidth: 380 }}>
          <Ico.Search size={15} style={{ color: T.faint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search passes and messages"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: SANS, fontSize: 13.5, color: T.ink }} />
          {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", color: T.faint, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>}
        </div>
      )}

      {shown.length === 0 ? (
        <div style={{ border: `1px dashed ${T.rule}`, borderRadius: 14, padding: "56px 30px", textAlign: "center", background: T.card }}>
          <div style={{ color: T.faint, marginBottom: 14 }}><Ico.Pass size={30} /></div>
          <h3 style={{ margin: "0 0 7px", fontFamily: SANS, fontSize: 18, fontWeight: 650, color: T.ink, letterSpacing: "-0.02em" }}>
            {q ? "Nothing matches that" : "No passes yet"}
          </h3>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: T.mute }}>
            {q ? "Try a different word, or clear the search." : "Selling something? Meeting someone? Start there."}
          </p>
          {!q && <Btn icon={Ico.Plus} onClick={() => go("issue")}>Issue your first pass</Btn>}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
          {shown.map((x) => (
            <Pass key={x.id} x={x}
              onOpen={() => go("chat", x.id)}
              onShare={() => onShare(x)}
              onKill={() => onKill(x)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- issue -- */
export function Issue({ state, go, onIssue }) {
  const narrow = useNarrow();
  const [pid, setPid] = useState(null);
  const [adv, setAdv] = useState(false);
  const [cfg, setCfg] = useState(null);
  const labelRef = useRef(null);

  const choose = (p) => {
    setPid(p.id);
    setCfg({ label: p.label, dur: p.dur, conn: p.conn, msgs: p.msgs, hours: p.hours, type: p.type, oneShot: !!p.oneShot, autoExtend: p.id === "sell" });
    setAdv(p.id === "custom");
  };

  if (!pid) {
    return (
      <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 780, margin: "0 auto" }}>
        <button onClick={() => go("passes")} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: T.mute, fontFamily: SANS, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20 }}>
          <Ico.Back size={15} /> Passes
        </button>
        <h1 style={{ margin: "0 0 7px", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>What's this for?</h1>
        <p style={{ margin: "0 0 26px", fontSize: 14.5, color: T.mute }}>Pick the closest one. Every rule is set for you — you can change them after.</p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => choose(p)} style={{
              textAlign: "left", padding: "17px 18px", borderRadius: 11, border: `1px solid ${T.rule}`,
              background: T.card, cursor: "pointer", fontFamily: SANS, transition: "border-color .14s, box-shadow .14s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.signal; e.currentTarget.style.boxShadow = "0 6px 18px -12px rgba(27,59,255,.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.rule; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: T.ink, marginBottom: 5, letterSpacing: "-0.015em" }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: T.mute, lineHeight: 1.5, marginBottom: 11 }}>{p.blurb}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip>{DUR_LABEL[p.dur]}</Chip>
                <Chip>{p.conn === null ? "any number" : `${p.conn} max`}</Chip>
                {p.hours !== "any" && <Chip tone="warn">{hoursMeta(p.hours).label.split(" · ")[0]}</Chip>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const previewXid = {
    code: "•••••••", label: cfg.label || "Untitled pass", type: cfg.type,
    createdAt: Date.now(), expiresAt: expiryFrom(cfg.dur), maxConn: cfg.conn,
    hours: cfg.hours, oneShot: cfg.oneShot, status: "active", unread: 0, conversations: [],
  };
  const durOptions = Object.keys(DUR).filter((d) => state.plan === "pro" || DUR[d] <= DUR[PLAN.free.maxDur]);
  const atCap = state.plan === "free" && state.xids.filter((x) => x.status === "active").length >= PLAN.free.passes;

  return (
    <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => setPid(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: T.mute, fontFamily: SANS, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        <Ico.Back size={15} /> Change purpose
      </button>
      <div style={{ display: "grid", gap: narrow ? 26 : 34, gridTemplateColumns: narrow ? "1fr" : "minmax(0,1fr) 340px", alignItems: "start" }}>
        <div>
          <h1 style={{ margin: "0 0 22px", fontFamily: SANS, fontSize: 27, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>{preset(pid).title}</h1>

          <Field label="Name it" hint="Only you see this. It keeps your list readable.">
            <input ref={labelRef} defaultValue={cfg.label} onInput={(e) => setCfg((c) => ({ ...c, label: e.target.value }))}
              style={{ ...selectStyle, backgroundImage: "none", cursor: "text" }} />
          </Field>

          <Field label="Ends after" hint={state.plan === "free" ? "Free passes run up to 7 days. Pro goes to 30." : "When this runs out, the conversation is deleted from both sides."}>
            <select value={cfg.dur} onChange={(e) => setCfg((c) => ({ ...c, dur: e.target.value }))} style={selectStyle}>
              {durOptions.map((d) => <option key={d} value={d}>{DUR_LABEL[d]}</option>)}
            </select>
          </Field>

          <Field label="How many people" hint={cfg.type === "group" ? "Everyone lands in one shared room." : "Each person gets their own private thread. They can't see each other."}>
            <select value={cfg.conn === null ? "any" : String(cfg.conn)} onChange={(e) => setCfg((c) => ({ ...c, conn: e.target.value === "any" ? null : Number(e.target.value) }))} style={selectStyle}>
              <option value="1">Just 1 person</option>
              <option value="2">Up to 2</option>
              <option value="3">Up to 3</option>
              <option value="5">Up to 5</option>
              <option value="10">Up to 10</option>
              <option value="20">Up to 20</option>
              <option value="any">Anyone with the link</option>
            </select>
          </Field>

          <Field label="When they can message" hint={cfg.hours === "any" ? undefined : "Outside these hours they see a note telling them when you reopen. Nothing gets through."}>
            <select value={cfg.hours} onChange={(e) => setCfg((c) => ({ ...c, hours: e.target.value }))} style={selectStyle}>
              {HOURS.map((h) => <option key={h.v} value={h.v}>{h.label}</option>)}
            </select>
          </Field>

          <button onClick={() => setAdv(!adv)} style={{ border: "none", background: "none", color: T.signal, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 }}>
            {adv ? "Hide extra rules" : "Extra rules"}
          </button>

          {adv && (
            <div style={{ marginBottom: 20 }}>
              <Toggle on={cfg.oneShot} onChange={(v) => setCfg((c) => ({ ...c, oneShot: v }))}
                label="Close after the first person joins"
                sub="The link stops working the moment someone uses it. Nobody else can get in — even if it's been forwarded." />
              <Toggle on={cfg.autoExtend} onChange={(v) => setCfg((c) => ({ ...c, autoExtend: v }))}
                label="Add an hour when you're mid-conversation"
                sub="If either of you messaged in the last hour, the timer stretches — up to twice the original length. Stops deals dying at the wrong moment." />
              <Toggle on={cfg.type === "group"} onChange={(v) => setCfg((c) => ({ ...c, type: v ? "group" : "individual" }))}
                label="One shared room instead of separate threads"
                sub="Everyone sees everyone. Use for teams and plans, not for strangers." />
            </div>
          )}

          {atCap ? (
            <div style={{ padding: "16px 18px", borderRadius: 11, background: T.amberWash, border: "1px solid #F0DEBE" }}>
              <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55, marginBottom: 13 }}>
                <strong style={{ fontWeight: 650 }}>All three free passes are in use.</strong> Your pass is ready — kill one you're done with, or go Pro for unlimited at ₹99 a month.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn kind="quiet" onClick={() => go("passes")}>Free up a slot</Btn>
                <Btn onClick={() => go("plans")}>Go Pro and issue it</Btn>
              </div>
            </div>
          ) : (
            <Btn size="lg" icon={Ico.Arrow} onClick={() => onIssue(cfg, pid)}>Issue this pass</Btn>
          )}
        </div>

        <aside style={{ position: narrow ? "static" : "sticky", top: 24, order: narrow ? -1 : 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: T.mute, marginBottom: 10 }}>Preview</div>
          <Pass x={previewXid} compact />
          <div style={{ marginTop: 16, padding: "14px 15px", borderRadius: 10, background: T.signalWash, border: `1px solid #DCE2FF` }}>
            <div style={{ fontSize: 12.5, color: T.signalDeep, lineHeight: 1.55 }}>
              <strong style={{ fontWeight: 650 }}>They never sign up.</strong> They tap your link, pick a name, and start typing. No account, no app, nothing to install.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ share sheet -- */
export function ShareSheet({ x, onClose }) {
  const [copied, setCopied] = useState(null);
  const url = linkFor(x.code);
  const copy = (text, tag) => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
    setCopied(tag); setTimeout(() => setCopied(null), 1600);
  };
  return (
    <Modal onClose={onClose} width={460}>
      <h2 style={{ margin: "0 0 5px", fontFamily: SANS, fontSize: 21, fontWeight: 700, letterSpacing: "-0.025em", color: T.ink }}>Share this pass</h2>
      <p style={{ margin: "0 0 22px", fontSize: 13.5, color: T.mute, lineHeight: 1.5 }}>
        Put this wherever you'd normally put your number. Whoever opens it can message you — and only you — until it ends.
      </p>

      <div style={{ display: "flex", justifyContent: "center", padding: "18px", background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, marginBottom: 14 }}>
        <QRCode value={url} size={188} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.rule}`, background: "#F7F8FA", fontFamily: MONO, fontSize: 12.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
        <Btn kind={copied === "url" ? "primary" : "quiet"} icon={copied === "url" ? Ico.Check : Ico.Copy} onClick={() => copy(url, "url")}>{copied === "url" ? "Copied" : "Copy"}</Btn>
      </div>

      <Btn kind="quiet" style={{ width: "100%", marginBottom: 18 }} icon={copied === "msg" ? Ico.Check : Ico.Msg}
        onClick={() => copy(`Message me here instead of my number — it expires on its own: ${url}`, "msg")}>
        {copied === "msg" ? "Message copied" : "Copy a ready-made message"}
      </Btn>

      <div style={{ borderTop: `1px solid ${T.ruleSoft}`, paddingTop: 14, fontSize: 12.5, color: T.mute, lineHeight: 1.6 }}>
        Ends {stampDate(x.expiresAt)}
        {x.maxConn ? ` · ${x.maxConn} ${x.maxConn === 1 ? "person" : "people"} max` : " · anyone with the link"}
        {x.hours !== "any" ? ` · ${hoursMeta(x.hours).label.toLowerCase()}` : ""}
        {x.oneShot ? " · closes after the first join" : ""}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ chat -- */
export function Chat({ x, go, onSend, onKill, onBlock, onReveal, onShare }) {
  const narrow = useNarrow();
  const [cid, setCid] = useState(x.conversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [asGuest, setAsGuest] = useState(false);
  const [q, setQ] = useState("");
  const endRef = useRef(null);
  const cur = x.conversations.find((c) => c.id === cid) || x.conversations[0];
  const live = x.status === "active";
  const open = withinHours(x.hours);
  const waiting = x.conversations.length === 0;

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [cur?.messages.length, cid, asGuest]);

  const send = () => {
    if (!draft.trim() || !live || !cur) return;
    onSend(x.id, cur.id, draft.trim(), asGuest ? "them" : "me");
    setDraft("");
  };

  const bothRevealed = cur?.revealMe && cur?.revealThem;
  const hits = q ? x.conversations.filter((c) => c.guest.toLowerCase().includes(q.toLowerCase()) || c.messages.some((m) => m.text.toLowerCase().includes(q.toLowerCase()))) : x.conversations;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.card }}>
      {/* header stub */}
      <div style={{ display: "flex", alignItems: "center", gap: narrow ? 9 : 14, padding: narrow ? "11px 12px" : "13px 20px", borderBottom: `1px solid ${T.ruleSoft}`, flexShrink: 0 }}>
        <button onClick={() => go("passes")} aria-label="Back to your passes" title="Back to your passes" style={{ border: "none", background: "none", color: T.mute, cursor: "pointer", display: "flex", padding: 4 }}><Ico.Back size={18} /></button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 650, color: T.ink, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.label}</span>
            <Chip tone={live ? (open ? "live" : "warn") : "dead"}>{!live ? x.status : open ? "live" : "quiet hours"}</Chip>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, fontFamily: MONO, fontSize: 10.5, color: T.mute, marginTop: 3 }}>
            <span>{x.code}</span>
            <span style={{ color: T.rule }}>·</span>
            <span>{live ? `${countdown(x.expiresAt - Date.now()).text} left` : "ended"}</span>
            <span style={{ color: T.rule }}>·</span>
            <span>{x.type === "group" ? `${x.conversations[0]?.members ?? 0} in room` : `${x.conversations.length} connected`}</span>
          </div>
        </div>
        <button onClick={() => setAsGuest(!asGuest)} title="See what the other person sees" style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 7,
          border: `1px solid ${asGuest ? T.signal : T.rule}`, background: asGuest ? T.signalWash : T.card,
          color: asGuest ? T.signalDeep : T.mute, fontFamily: SANS, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        }}><Ico.Eye size={14} />{asGuest ? "Their view" : "Your view"}</button>
        {live && <Btn size="sm" kind="danger" icon={Ico.Kill} onClick={() => onKill(x)}>Kill</Btn>}
      </div>

      {waiting ? (
        <WaitingRoom x={x} onShare={onShare} />
      ) : (
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* thread list */}
        {!asGuest && !narrow && x.type === "individual" && x.conversations.length > 1 && (
          <div style={{ width: 216, borderRight: `1px solid ${T.ruleSoft}`, overflowY: "auto", flexShrink: 0, background: "#FAFBFC" }}>
            <div style={{ padding: "11px 12px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.rule}`, background: T.card }}>
                <Ico.Search size={13} style={{ color: T.faint }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: SANS, fontSize: 12.5, color: T.ink, minWidth: 0 }} />
              </div>
            </div>
            {hits.map((c) => (
              <button key={c.id} onClick={() => setCid(c.id)} style={{
                width: "100%", textAlign: "left", padding: "10px 14px", border: "none", cursor: "pointer",
                borderLeft: `2px solid ${cur?.id === c.id ? T.signal : "transparent"}`,
                background: cur?.id === c.id ? T.signalWash : "transparent", fontFamily: SANS,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.blocked ? T.faint : T.ink, textDecoration: c.blocked ? "line-through" : "none" }}>{c.guest}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint }}>{c.messages.length}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.messages[c.messages.length - 1]?.text ?? "No messages"}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* thread */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {narrow && !asGuest && x.type === "individual" && x.conversations.length > 1 && (
            <div style={{ display: "flex", gap: 7, padding: "10px 14px", overflowX: "auto", borderBottom: `1px solid ${T.ruleSoft}`, flexShrink: 0 }}>
              {x.conversations.map((c) => (
                <button key={c.id} onClick={() => setCid(c.id)} style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontFamily: SANS, fontSize: 12.5, fontWeight: 600,
                  borderWidth: 1, borderStyle: "solid", borderColor: cur?.id === c.id ? T.signal : T.rule,
                  background: cur?.id === c.id ? T.signalWash : T.card, color: cur?.id === c.id ? T.signalDeep : T.mute,
                }}>{c.guest}</button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: narrow ? "14px 14px" : "16px 22px" }}>
            <Banner x={x} asGuest={asGuest} live={live} open={open} cur={cur} />

            {cur?.messages.map((m) => {
              const mine = asGuest ? m.side === "them" : m.side === "me";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
                  <div style={{
                    maxWidth: "70%", padding: "9px 13px", borderRadius: 12,
                    borderBottomRightRadius: mine ? 4 : 12, borderBottomLeftRadius: mine ? 12 : 4,
                    background: mine ? T.signal : "#F1F3F6", color: mine ? "#fff" : T.ink,
                    fontFamily: SANS, fontSize: 14, lineHeight: 1.5,
                  }}>
                    {m.who && !mine && <div style={{ fontSize: 11, fontWeight: 650, color: T.signalDeep, marginBottom: 2 }}>{m.who}</div>}
                    {m.text}
                    <div style={{ fontFamily: MONO, fontSize: 9.5, marginTop: 4, color: mine ? "rgba(255,255,255,.65)" : T.faint }}>{clock(m.ts)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* reveal handshake */}
          {live && x.type === "individual" && cur && !cur.blocked && (
            <div style={{ padding: "10px 22px", borderTop: `1px solid ${T.ruleSoft}`, background: bothRevealed ? T.liveWash : "#FAFBFC" }}>
              {bothRevealed ? (
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: T.live }}>
                  <Ico.Handshake size={16} />
                  <span><strong style={{ fontWeight: 650 }}>Real contact shared both ways.</strong> {asGuest ? "You have their number now." : "They have yours, you have theirs."} The pass still ends on schedule.</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: T.mute, flex: 1, minWidth: 180 }}>
                    {(asGuest ? cur.revealThem : cur.revealMe)
                      ? "Waiting for the other side to agree. Nothing is shared until both of you do."
                      : (asGuest ? cur.revealMe : cur.revealThem)
                        ? "They're offering to swap real contact details. Nothing is shared unless you agree too."
                        : "Going ahead with this one? You can swap real contact details — but only if both of you agree."}
                  </span>
                  <Btn size="sm" kind={(asGuest ? cur.revealThem : cur.revealMe) ? "quiet" : "primary"} icon={Ico.Handshake}
                    disabled={asGuest ? cur.revealThem : cur.revealMe}
                    onClick={() => onReveal(x.id, cur.id, asGuest ? "them" : "me")}>
                    {(asGuest ? cur.revealThem : cur.revealMe) ? "You've agreed" : "Swap real contact"}
                  </Btn>
                  {!asGuest && <Btn size="sm" kind="ghost" icon={Ico.Ban} onClick={() => onBlock(x.id, cur.id)}>{cur.blocked ? "Unblock" : "Block"}</Btn>}
                </div>
              )}
            </div>
          )}

          {/* composer */}
          {live && !cur?.blocked && (open || !asGuest) ? (
            <div style={{ display: "flex", gap: 9, padding: narrow ? "10px 14px" : "12px 22px", borderTop: `1px solid ${T.ruleSoft}`, alignItems: "center" }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={asGuest ? "Reply as them…" : "Type a message"}
                style={{ flex: 1, padding: "11px 14px", borderRadius: 9, border: `1px solid ${T.rule}`, background: T.card, fontFamily: SANS, fontSize: 14, color: T.ink, outline: "none" }} />
              <Btn icon={Ico.Send} onClick={send} style={{ opacity: draft.trim() ? 1 : 0.4 }}>Send</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", padding: "13px 22px", borderTop: `1px solid ${T.ruleSoft}`, fontSize: 13, color: T.mute, fontFamily: SANS }}>
              <span>
                {cur?.blocked ? (asGuest ? "You can't send anything on this pass." : "You blocked this person. They can't send anything.") :
                  !live ? "This pass ended. Nothing here can be recovered." :
                    `Quiet hours. Messages reopen at ${nextOpen(x.hours)}.`}
              </span>
              {cur?.blocked && live && !asGuest && (
                <Btn size="sm" kind="quiet" icon={Ico.Check} onClick={() => onBlock(x.id, cur.id)}>Unblock</Btn>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

/* The moment right after issuing: nobody has joined yet. This screen used to be
   blank, which is the worst possible time to say nothing. */
export function WaitingRoom({ x, onShare }) {
  const url = linkFor(x.code);
  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "34px 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ display: "inline-block", padding: 14, background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, marginBottom: 20 }}>
          <QRCode value={url} size={148} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 19, fontWeight: 650, letterSpacing: "-0.02em", color: T.ink }}>
          Nobody has used this pass yet
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.mute, lineHeight: 1.6 }}>
          Share the link or let someone scan the code. They pick a name and start typing — no signup, no app.
        </p>
        <p style={{ margin: "0 0 20px", fontFamily: MONO, fontSize: 12, color: T.faint, wordBreak: "break-all" }}>{url}</p>
        <Btn icon={Ico.QR} onClick={() => onShare(x)}>Share this pass</Btn>
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.ruleSoft}`, fontSize: 12.5, color: T.faint, lineHeight: 1.6 }}>
          Their messages land here. You'll get an alert on the first one.
        </div>
      </div>
    </div>
  );
}

export function Banner({ x, asGuest, live, open, cur }) {
  const style = (bg, border, fg) => ({
    display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 13px", borderRadius: 9,
    background: bg, border: `1px solid ${border}`, color: fg, fontSize: 12.5, lineHeight: 1.55, marginBottom: 16, fontFamily: SANS,
  });
  if (!live) return <div style={style(T.stampWash, "#F2C9C1", T.stamp)}><Ico.Shield size={15} /><span><strong style={{ fontWeight: 650 }}>This pass is {x.status}.</strong> Everything in it was deleted. This view is a local demo copy — in production the messages are already gone from the database.</span></div>;
  if (asGuest) return (
    <div style={style(T.signalWash, "#DCE2FF", T.signalDeep)}>
      <Ico.Shield size={15} />
      <span>
        <strong style={{ fontWeight: 650 }}>You're messaging through XIDgate.</strong> You don't have their number or email, and they don't have yours. This conversation deletes itself in {countdown(x.expiresAt - Date.now()).text}.
        {!open && <> Right now it's outside their hours — you can read but not send until {nextOpen(x.hours)}.</>}
      </span>
    </div>
  );
  return (
    <div style={style("#F7F8FA", T.ruleSoft, T.mute)}>
      <Ico.Shield size={15} />
      <span>
        Nothing personal has been shared. Ends in {countdown(x.expiresAt - Date.now()).text}.
        {x.autoExtend && " Timer stretches while you're both active."}
        {cur?.strikes > 0 && <strong style={{ color: T.amber, fontWeight: 650 }}> {cur.strikes} spam {cur.strikes === 1 ? "flag" : "flags"} on this thread.</strong>}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- ledger -- */
/* The trust artifact. "It's really gone" is the entire promise, so it needs
   evidence. Receipts hold counts and timestamps — never content. One tiny row
   per dead pass, which is also why this costs nothing to keep forever.       */
export function Ledger({ state }) {
  const narrow = useNarrow();
  const rs = [...state.receipts].sort((a, b) => b.ended - a.ended);
  const total = rs.reduce((n, r) => n + r.destroyed, 0);
  return (
    <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Destruction ledger</h1>
      <p style={{ margin: "0 0 26px", fontSize: 14, color: T.mute, maxWidth: 560, lineHeight: 1.5 }}>
        A receipt for every pass that ended. We keep the counts and the timestamps so you can prove it happened. The messages themselves are gone — we can't show them to you, or to anyone else.
      </p>

      <div style={{ display: "flex", gap: 26, padding: "18px 22px", background: T.card, border: `1px solid ${T.rule}`, borderRadius: 11, marginBottom: 24, flexWrap: "wrap" }}>
        {[["Passes destroyed", rs.length], ["Messages erased", total], ["Kept on our servers", 0]].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: MONO, fontSize: 27, fontWeight: 500, color: T.ink, letterSpacing: "-0.02em" }}>{v}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: T.mute, marginTop: 3 }}>{k}</div>
          </div>
        ))}
      </div>

      {rs.length === 0 ? (
        <div style={{ border: `1px dashed ${T.rule}`, borderRadius: 12, padding: "44px 24px", textAlign: "center", color: T.mute, fontSize: 13.5, background: T.card }}>
          Nothing destroyed yet. Receipts land here when a pass ends.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {rs.map((r) => (
            <div key={r.id} style={{ background: T.card, border: `1px solid ${T.rule}`, borderRadius: 10, padding: "15px 18px", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 190 }}>
                <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 650, color: T.ink, letterSpacing: "-0.015em" }}>{r.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>{r.code} · issued {stampDate(r.issued)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 12.5, color: T.ink }}>{r.destroyed} messages · {r.connections} {r.connections === 1 ? "person" : "people"}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>{r.reason} · {stampDate(r.ended)}</div>
              </div>
              <Chip tone="dead">erased</Chip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- plans -- */
export function Plans({ state, go, onUpgrade }) {
  const narrow = useNarrow();
  const rows = [
    { k: "Active passes at once", free: "3", day: "3", pro: "Unlimited" },
    { k: "Longest a pass can run", free: "7 days", day: "7 days", pro: "30 days" },
    { k: "People per pass", free: "Up to 5", day: "Unlimited", pro: "Unlimited" },
    { k: "Group rooms", free: "—", day: "Yes", pro: "Yes" },
    { k: "Destruction receipts", free: "Yes", day: "Yes", pro: "Yes" },
    { k: "Alerts when someone messages", free: "Yes", day: "Yes", pro: "Yes" },
  ];
  const Card = ({ name, price, note, cta, tone, onClick, current }) => (
    <div style={{
      flex: 1, minWidth: 210, background: T.card, borderRadius: 12, padding: "22px 20px",
      border: `1px solid ${tone === "signal" ? T.signal : T.rule}`,
      boxShadow: tone === "signal" ? "0 10px 30px -20px rgba(27,59,255,.6)" : "none",
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: tone === "signal" ? T.signal : T.mute, marginBottom: 10 }}>{name}</div>
      <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>{price}</div>
      <div style={{ fontSize: 12.5, color: T.mute, margin: "6px 0 18px", lineHeight: 1.5, minHeight: 36 }}>{note}</div>
      <Btn kind={current ? "quiet" : tone === "signal" ? "primary" : "quiet"} style={{ width: "100%" }} disabled={current} onClick={onClick}>
        {current ? "Your plan" : cta}
      </Btn>
    </div>
  );
  return (
    <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Plans</h1>
      <p style={{ margin: "0 0 26px", fontSize: 14, color: T.mute, maxWidth: 540, lineHeight: 1.5 }}>
        Free covers most people. Pay when you need more than three things going at once — or buy a single day when something big is happening.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <Card name="Free" price="₹0" note="Three passes at a time, up to a week each. No card." cta="Current" current={state.plan === "free"} />
        <Card name="Day pass" price="₹49" note="24 hours of unlimited passes. For the weekend you're selling a car." cta="Buy a day" onClick={() => onUpgrade("day")} />
        <Card name="Pro" price="₹99" note="Per month. Unlimited passes, 30-day durations, group rooms." cta="Go Pro" tone="signal" current={state.plan === "pro"} onClick={() => onUpgrade("pro")} />
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.rule}`, borderRadius: 11, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={r.k} style={{ display: "grid", gridTemplateColumns: narrow ? "1.4fr 1fr 1fr 1fr" : "1.6fr 1fr 1fr 1fr", padding: narrow ? "11px 12px" : "12px 18px", borderTop: i ? `1px solid ${T.ruleSoft}` : "none", fontFamily: SANS, fontSize: 13 }}>
            <span style={{ color: T.mute }}>{r.k}</span>
            <span style={{ color: T.ink, textAlign: "center" }}>{r.free}</span>
            <span style={{ color: T.ink, textAlign: "center" }}>{r.day}</span>
            <span style={{ color: T.signalDeep, textAlign: "center", fontWeight: 600 }}>{r.pro}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- modals -- */
export function Modal({ children, onClose, width = 420 }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,24,31,.42)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card, borderRadius: 14, padding: "26px 26px 24px", width: "100%", maxWidth: width,
        border: `1px solid ${T.rule}`, boxShadow: "0 30px 60px -30px rgba(20,24,31,.5)", maxHeight: "88vh", overflowY: "auto",
      }}>{children}</div>
    </div>
  );
}

export function KillConfirm({ target, onCancel, onConfirm }) {
  const many = Array.isArray(target);
  const list = many ? target : [target];
  const msgs = list.reduce((n, x) => n + x.conversations.reduce((m, c) => m + c.messages.length, 0), 0);
  const people = list.reduce((n, x) => n + (x.type === "group" ? (x.conversations[0]?.members ?? 0) : x.conversations.length), 0);
  return (
    <Modal onClose={onCancel} width={420}>
      <div style={{ display: "inline-flex", padding: 9, borderRadius: 9, background: T.stampWash, color: T.stamp, marginBottom: 14 }}><Ico.Kill size={19} /></div>
      <h2 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em", color: T.ink }}>
        {many ? `Kill all ${list.length} passes?` : `Kill "${list[0].label}"?`}
      </h2>
      <p style={{ margin: "0 0 6px", fontSize: 13.5, color: T.mute, lineHeight: 1.6 }}>
        {msgs} {msgs === 1 ? "message" : "messages"} across {people} {people === 1 ? "person" : "people"} will be deleted immediately — on their side too. The link stops working. There's no undo and no archive.
      </p>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: T.mute, lineHeight: 1.6 }}>
        You'll get a receipt in your ledger.
      </p>
      <div style={{ display: "flex", gap: 9 }}>
        <Btn kind="quiet" style={{ flex: 1 }} onClick={onCancel}>Keep it</Btn>
        <Btn kind="solidDanger" style={{ flex: 1 }} icon={Ico.Kill} onClick={onConfirm}>{many ? "Kill everything" : "Kill this pass"}</Btn>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ auth -- */
export function Auth({ onIn }) {
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [sent, setSent] = useState(false);
  const narrow = useNarrow();

  const submit = async () => {
    setErr(null);
    if (!email.trim() || pw.length < 6) {
      setErr("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const res = mode === "in" ? await auth.signIn(email.trim(), pw) : await auth.signUp(email.trim(), pw);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "That didn't work. Check your details and try again."); return; }
    if (mode === "up" && !db.demo) { setSent(true); return; }
    onIn();
  };

  return (
    <div style={{ minHeight: "100%", height: "100%", overflowY: "auto", display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", background: T.paper }}>
      <div style={{ padding: narrow ? "38px 22px" : "56px 52px", display: "flex", flexDirection: "column", justifyContent: "center", background: T.ink, color: "#fff" }}>
        <Wordmark light />
        <h1 style={{ margin: "30px 0 16px", fontFamily: SANS, fontSize: narrow ? 30 : 40, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.06 }}>
          Stop handing out<br />a permanent number.
        </h1>
        <p style={{ margin: "0 0 30px", fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)", maxWidth: 400 }}>
          Issue a pass instead. It carries a conversation, obeys your rules, and deletes itself when it's done. The other person never signs up for anything.
        </p>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
          {[["Patent", "No. 550231"], ["They install", "Nothing"], ["We keep", "Nothing"]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".13em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>{k}</div>
              <div style={{ fontFamily: MONO, fontSize: 14, marginTop: 4, color: "#fff" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: narrow ? "30px 22px 44px" : "56px 52px", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 460, width: "100%" }}>
        {sent ? (
          <>
            <h2 style={{ margin: "0 0 10px", fontFamily: SANS, fontSize: 23, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Check your email</h2>
            <p style={{ margin: 0, fontSize: 14, color: T.mute, lineHeight: 1.6 }}>
              We sent a confirmation link to <strong style={{ color: T.ink }}>{email}</strong>. Open it and you're in.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 22px", fontFamily: SANS, fontSize: 23, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
              {mode === "in" ? "Sign in" : "Create your account"}
            </h2>
            {db.demo && (
              <div style={{ padding: "11px 13px", borderRadius: 9, background: T.amberWash, border: "1px solid #F0DEBE", fontSize: 12.5, color: T.ink, lineHeight: 1.55, marginBottom: 18 }}>
                <strong style={{ fontWeight: 650 }}>Demo mode.</strong> No database is connected yet, so anything you type here will sign you straight in and data resets on reload. Add your Supabase keys to go live.
              </div>
            )}
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{ ...selectStyle, backgroundImage: "none", cursor: "text" }} />
            </Field>
            <Field label="Password" hint={mode === "up" ? "Your email is only used to sign you in. It's never shown to anyone you talk to." : undefined}>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{ ...selectStyle, backgroundImage: "none", cursor: "text" }} />
            </Field>
            {err && (
              <div role="alert" style={{ padding: "10px 12px", borderRadius: 8, background: T.stampWash, border: "1px solid #F2C9C1", color: T.stamp, fontSize: 12.5, lineHeight: 1.5, marginBottom: 14 }}>{err}</div>
            )}
            <Btn size="lg" onClick={submit} disabled={busy} style={{ width: "100%", marginBottom: 14 }}>
              {busy ? "One moment…" : mode === "in" ? "Sign in" : "Create account"}
            </Btn>
            <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); }}
              style={{ border: "none", background: "none", color: T.signal, fontFamily: SANS, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Wordmark({ light }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
        borderRadius: 6, background: light ? "#fff" : T.ink, color: light ? T.ink : "#fff",
        fontFamily: MONO, fontSize: 13, fontWeight: 600, letterSpacing: "-0.04em",
      }}>X</span>
      <span style={{ fontFamily: SANS, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.035em", color: light ? "#fff" : T.ink }}>
        XIDgate
      </span>
    </div>
  );
}

