"use client";
import { useState, useEffect, useRef } from "react";
import { Btn, Chip, DAILY_XID_LIMIT, DUR, DUR_LABEL, Field, HOURS, Ico, MONO, MAX_SPAN_LABEL, MAX_SPAN_MS, PEOPLE, PRESETS, Pass, QRCode, SANS, T, Toggle, UNITS, auth, buildTranscript, clock, countdown, customMs, dailyQuota, db, deviceZone, downloadTranscript, durToParts, expiryFrom, hoursMeta, linkFor, nextOpen, peopleOption, peopleValue, preset, selectStyle, stampDate, useNarrow, withinHours, zoneLabel } from "@/lib/core";

/* ------------------------------------------------------------- dashboard -- */
export function Dashboard({ state, go, onKill, onKillAll, onShare, onReopen }) {
  const narrow = useNarrow();
  const [q, setQ] = useState("");
  const [showEnded, setShowEnded] = useState(false);
  const [scope, setScope] = useState("all");
  const live = state.xids.filter((x) => x.status === "active");

  /* A conversation both sides agreed to keep outlives its XID, so it needs a
     home of its own. Without one it sat in the ended list looking like a
     leftover, next to XIDs whose messages really are gone — which is exactly
     what made the two screens look inconsistent. */
  const kept = state.xids
    .filter((x) => x.status !== "active")
    .flatMap((x) => x.conversations
      .filter((c) => c.keepMe && c.keepThem)
      .map((c) => ({ x, c })));
  const keptIds = new Set(kept.map((k) => k.x.id));

  /* Ended XIDs with something kept are shown above instead, so nothing appears
     in two places at once. */
  const done = state.xids.filter((x) => x.status !== "active" && !keptIds.has(x.id));
  const match = (x) =>
    !q ||
    x.label.toLowerCase().includes(q.toLowerCase()) ||
    x.code.toLowerCase().includes(q.toLowerCase()) ||
    x.conversations.some((c) => c.messages.some((m) => m.text.toLowerCase().includes(q.toLowerCase())));
  const q0 = q.trim();
  const shownLive = live.filter(match);
  const shownKept = kept.filter(({ x, c }) => match(x) || c.messages.some((m) => m.text.toLowerCase().includes(q0.toLowerCase())));
  const shownDone = done.filter(match);

  /* Scope narrows which sections are on screen; the query filters within them.
     Kept separate on purpose — "show me only ended" and "find the word bike"
     are different questions and people ask them together. */
  const inScope = (name) => scope === "all" || scope === name;
  const SCOPES = [
    ["all", "All", live.length + kept.length + done.length],
    ["open", "Open", live.length],
    ["kept", "Kept", kept.length],
    ["ended", "Ended", done.length],
  ].filter(([k, , n]) => k === "all" || n > 0);

  /* A match hidden inside a collapsed section is a match nobody can see. */
  const endedOpen = showEnded || scope === "ended" || (q0.length > 0 && shownDone.length > 0);
  const visibleCount =
    (inScope("open") ? shownLive.length : 0) +
    (inScope("kept") ? shownKept.length : 0) +
    (inScope("ended") ? shownDone.length : 0);

  return (
    <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 1080, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>
            Your XIDs
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: T.mute, maxWidth: 520, lineHeight: 1.5 }}>
            {live.length === 0
              ? "No open XIDs. Create one when you want someone to reach you."
              : `${live.length} ${live.length === 1 ? "person or group has" : "people and groups have"} a way to reach you. Each one ends on its own.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {live.length > 1 && <Btn kind="danger" icon={Ico.Bolt} onClick={onKillAll}>End all</Btn>}
          <Btn icon={Ico.Plus} onClick={() => go("issue")}>Create an XID</Btn>
        </div>
      </header>

      

      {state.xids.length > 2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 8, border: `1px solid ${T.rule}`, background: T.card, marginBottom: 20, maxWidth: 380 }}>
          <Ico.Search size={15} style={{ color: T.faint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, codes and message text"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: SANS, fontSize: 13.5, color: T.ink }} />
          {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", color: T.faint, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>}
        </div>
      )}

      {(live.length + kept.length + done.length) > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
          {SCOPES.map(([k, label, n]) => (
            <button key={k} onClick={() => setScope(k)}
              style={{
                padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                fontFamily: SANS, fontSize: 12.5, fontWeight: 600,
                borderWidth: 1, borderStyle: "solid",
                borderColor: scope === k ? T.signal : T.rule,
                background: scope === k ? T.signalWash : T.card,
                color: scope === k ? T.signalDeep : T.mute,
              }}>
              {label} <span style={{ fontFamily: MONO, fontSize: 11, opacity: .7 }}>{n}</span>
            </button>
          ))}
        </div>
      )}

      {visibleCount === 0 ? (
        <div style={{ border: `1px dashed ${T.rule}`, borderRadius: 14, padding: "56px 30px", textAlign: "center", background: T.card }}>
          <div style={{ color: T.faint, marginBottom: 14 }}><Ico.Pass size={30} /></div>
          <h3 style={{ margin: "0 0 7px", fontFamily: SANS, fontSize: 18, fontWeight: 650, color: T.ink, letterSpacing: "-0.02em" }}>
            {q ? "Nothing matches that" : scope === "kept" ? "No kept conversations" : scope === "ended" ? "Nothing has ended yet" : scope === "open" ? "No open XIDs" : "No XIDs yet"}
          </h3>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: T.mute }}>
            {q
              ? (scope === "all" ? "Try a different word, or clear the search." : `Nothing in ${scope} matches. Try All, or a different word.`)
              : scope === "kept" ? "A conversation appears here when you and the other person both choose to keep it."
              : scope === "ended" ? "XIDs move here when they run out or you end them."
              : "Selling something? Meeting someone? Start there."}
          </p>
          {!q && <Btn icon={Ico.Plus} onClick={() => go("issue")}>Create your first XID</Btn>}
        </div>
      ) : (
        <>
          {inScope("open") && shownLive.length > 0 && (
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
              {shownLive.map((x) => (
                <Pass key={x.id} x={x}
                  onOpen={() => go("chat", x.id)}
                  onShare={() => onShare(x)}
                  onReopen={onReopen ? () => onReopen(x) : undefined}
                  onKill={() => onKill(x)} />
              ))}
            </div>
          )}

          {inScope("kept") && shownKept.length > 0 && (
            <div style={{ marginTop: (inScope("open") && shownLive.length) ? 34 : 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontFamily: SANS, fontSize: 17, fontWeight: 650, color: T.ink, letterSpacing: "-0.02em" }}>
                  Kept conversations
                </h2>
                <span style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>{q0 ? `${shownKept.length} of ${kept.length}` : shownKept.length}</span>
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: T.mute, lineHeight: 1.5, maxWidth: 560 }}>
                These outlived their XID because you and the other person both agreed to keep them. They stay readable until one of you stops keeping.
              </p>
              <div style={{ display: "grid", gap: 9 }}>
                {shownKept.map(({ x, c }) => (
                  <button key={c.id} onClick={() => go("chat", x.id)}
                    style={{ textAlign: "left", cursor: "pointer", background: T.card,
                      border: `1px solid ${T.rule}`, borderLeft: `3px solid ${T.live}`, borderRadius: 10,
                      padding: "14px 17px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 650, color: T.ink, letterSpacing: "-0.015em" }}>
                        {c.guest}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>
                        {x.label} · {x.code}
                      </div>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: T.mute }}>
                      {c.messages.length} {c.messages.length === 1 ? "message" : "messages"}
                    </div>
                    <Chip tone="live">kept</Chip>
                  </button>
                ))}
              </div>
            </div>
          )}

          {inScope("ended") && shownDone.length > 0 && (
            <div style={{ marginTop: ((inScope("open") && shownLive.length) || (inScope("kept") && shownKept.length)) ? 34 : 0 }}>
              <button onClick={() => setShowEnded((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
                  cursor: "pointer", padding: 0, marginBottom: endedOpen ? 14 : 0, fontFamily: SANS }}>
                <span style={{ fontSize: 17, fontWeight: 650, color: T.ink, letterSpacing: "-0.02em" }}>Ended</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>{q0 ? `${shownDone.length} of ${done.length}` : shownDone.length}</span>
                <span style={{ fontSize: 12, color: T.faint }}>{endedOpen ? "▲" : "▼"}</span>
              </button>
              {endedOpen && (
                <>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: T.mute, lineHeight: 1.5, maxWidth: 560 }}>
                    The messages in these were deleted when they ended. History keeps the receipt — how many were cleared and when — but not the messages themselves.
                    {q0 && <> Which means searching words from a conversation won't find anything here; only names, codes and dates can match.</>}
                  </p>
                  <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
                    {shownDone.map((x) => (
                      <Pass key={x.id} x={x} compact
                        onOpen={() => go("chat", x.id)}
                        onShare={() => onShare(x)}
                        onKill={() => onKill(x)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
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
    setCfg({ label: p.label, dur: p.dur, ...durToParts(p.dur),
      conn: p.conn, msgs: p.msgs, hours: p.hours, type: p.type,
      oneShot: !!p.oneShot, autoExtend: p.id === "sell" });
    setAdv(p.id === "custom");
  };

  if (!pid) {
    return (
      <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 780, margin: "0 auto" }}>
        <button onClick={() => go("passes")} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", color: T.mute, fontFamily: SANS, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20 }}>
          <Ico.Back size={15} /> XIDs
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
    code: "•••••••", label: cfg.label || "Untitled XID", type: cfg.type,
    createdAt: Date.now(), expiresAt: Date.now() + Math.min(customMs(cfg.durN, cfg.durUnit), MAX_SPAN_MS), maxConn: cfg.conn,
    hours: cfg.hours, oneShot: cfg.oneShot, status: "active", unread: 0, conversations: [],
  };

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

          <Field label="Ends after"
            hint={`Type any length, up to ${MAX_SPAN_LABEL}. There's no never-expires option: an XID that never ends is just a phone number again.`}>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" min="1" step="1" value={cfg.durN}
                onChange={(e) => setCfg((c) => ({ ...c, durN: e.target.value }))}
                style={{ ...selectStyle, backgroundImage: "none", cursor: "text", width: 110 }} />
              <select value={cfg.durUnit} onChange={(e) => setCfg((c) => ({ ...c, durUnit: e.target.value }))}
                style={{ ...selectStyle, flex: 1 }}>
                {UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
              </select>
            </div>
            {(() => {
              const want = customMs(cfg.durN, cfg.durUnit);
              const cap = MAX_SPAN_MS;
              const ends = new Date(Date.now() + Math.min(want, cap));
              return (
                <div style={{ marginTop: 7, fontFamily: MONO, fontSize: 11, color: want > cap ? T.amber : T.mute }}>
                  {want > cap
                    ? `That is longer than ${MAX_SPAN_LABEL}, so it ends ${stampDate(ends)}`
                    : `Ends ${stampDate(ends)}`}
                </div>
              );
            })()}
          </Field>

          <Field label="How many people"
            hint={cfg.conn === null && cfg.oneShot
              ? "Closes the moment they join — even if the link gets forwarded. You can let someone else in later."
              : cfg.conn === null
                ? "Anyone holding the link can start a thread."
                : cfg.type === "group"
                  ? "Everyone lands in one shared room."
                  : "Each person gets their own private thread. They can't see each other."}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" min="1" step="1" placeholder="—"
                value={cfg.oneShot && cfg.conn === null ? 1 : cfg.conn === null ? "" : cfg.conn}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") { setCfg((c) => ({ ...c, conn: null, oneShot: false })); return; }
                  const n = Math.max(1, Math.floor(Number(raw) || 1));
                  /* Typing 1 stores the latch, not a hard cap of one. A cap can
                     never be reopened; the latch can. Same behaviour for the
                     guest, but the host keeps a way back in. */
                  setCfg((c) => ({ ...c, conn: n === 1 ? null : n, oneShot: n === 1 }));
                }}
                style={{ ...selectStyle, backgroundImage: "none", cursor: "text", width: 110 }} />
              <button type="button"
                onClick={() => setCfg((c) => ({ ...c, conn: null, oneShot: false }))}
                style={{
                  padding: "10px 13px", borderRadius: 8, cursor: "pointer", fontFamily: SANS, fontSize: 13.5, fontWeight: 600,
                  borderWidth: 1, borderStyle: "solid",
                  borderColor: cfg.conn === null && !cfg.oneShot ? T.signal : T.rule,
                  background: cfg.conn === null && !cfg.oneShot ? T.signalWash : T.card,
                  color: cfg.conn === null && !cfg.oneShot ? T.signalDeep : T.mute,
                }}>
                No limit
              </button>
            </div>
            {cfg.conn !== null && cfg.conn > 1 && (
              <div style={{ marginTop: 9 }}>
                <Toggle on={cfg.oneShot} onChange={(v) => setCfg((c) => ({ ...c, oneShot: v }))}
                  label="Close as soon as the first person joins"
                  sub={`You've allowed ${cfg.conn}, but the door shuts after the first one through. Useful when the link might get forwarded.`} />
              </div>
            )}
          </Field>

          <Field label="When they can message"
            hint={cfg.hours === "any" ? undefined
              : `Outside these hours they see a note telling them when you reopen — nothing gets through. Your hours, in ${zoneLabel(deviceZone())}, wherever they happen to be.`}>
            <select value={cfg.hours} onChange={(e) => setCfg((c) => ({ ...c, hours: e.target.value }))} style={selectStyle}>
              {HOURS.map((h) => <option key={h.v} value={h.v}>{h.label}</option>)}
            </select>
          </Field>

          <button onClick={() => setAdv(!adv)} style={{ border: "none", background: "none", color: T.signal, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 }}>
            {adv ? "Hide extra rules" : "Extra rules"}
          </button>

          {adv && (
            <div style={{ marginBottom: 20 }}>
              <Toggle on={cfg.autoExtend} onChange={(v) => setCfg((c) => ({ ...c, autoExtend: v }))}
                label="Add an hour when you're mid-conversation"
                sub="If either of you messaged in the last hour, the timer stretches — up to twice the original length. Stops deals dying at the wrong moment." />
              <Toggle on={cfg.type === "group"} onChange={(v) => setCfg((c) => ({ ...c, type: v ? "group" : "individual" }))}
                label="One shared room instead of separate threads"
                sub="Everyone sees everyone. Use for teams and plans, not for strangers." />
            </div>
          )}

          {(() => {
            const q = dailyQuota(state.xids);
            if (q.left === 0) {
              return (
                <div style={{ padding: "16px 18px", borderRadius: 11, background: T.amberWash, border: "1px solid #F0DEBE" }}>
                  <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55, marginBottom: 13 }}>
                    <strong style={{ fontWeight: 650 }}>You've created {DAILY_XID_LIMIT} XIDs in the last 24 hours.</strong>{" "}
                    A guard against automated abuse, not a paywall — there's nothing to buy.{" "}
                    {q.nextAt && <>The next slot opens at <strong style={{ fontWeight: 650 }}>{clock(q.nextAt)}</strong>, and one more frees up every time an older one passes 24 hours.</>}{" "}
                    Ending an XID won't help here — this counts how many you've made, not how many are open.
                  </div>
                  <Btn kind="quiet" onClick={() => go("passes")}>Back to your XIDs</Btn>
                </div>
              );
            }
            return (
              <div>
                <Btn size="lg" icon={Ico.Arrow} onClick={() => onIssue(cfg, pid)}>Create this XID</Btn>
                {q.left <= 3 && (
                  <div style={{ marginTop: 9, fontFamily: MONO, fontSize: 11, color: T.mute }}>
                    {q.left} more today
                  </div>
                )}
              </div>
            );
          })()}
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
      <h2 style={{ margin: "0 0 5px", fontFamily: SANS, fontSize: 21, fontWeight: 700, letterSpacing: "-0.025em", color: T.ink }}>Share this XID</h2>
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
        {x.oneShot ? " · 1 person, then it closes" : x.maxConn ? ` · ${x.maxConn} people max` : " · anyone with the link"}
        {x.hours !== "any" ? ` · ${hoursMeta(x.hours).label.toLowerCase()}` : ""}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ chat -- */
export function Chat({ x, go, onSend, onKill, onBlock, onShare, onKeep }) {
  const narrow = useNarrow();
  const [cid, setCid] = useState(x.conversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [asGuest, setAsGuest] = useState(false);
  const [q, setQ] = useState("");
  const endRef = useRef(null);
  const cur = x.conversations.find((c) => c.id === cid) || x.conversations[0];
  const live = x.status === "active";
  const open = withinHours(x.hours, x.tz);
  const waiting = x.conversations.length === 0;

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [cur?.messages.length, cid, asGuest]);

  const send = () => {
    if (!draft.trim() || !live || !cur) return;
    onSend(x.id, cur.id, draft.trim(), asGuest ? "them" : "me");
    setDraft("");
  };

  const hits = q ? x.conversations.filter((c) => c.guest.toLowerCase().includes(q.toLowerCase()) || c.messages.some((m) => m.text.toLowerCase().includes(q.toLowerCase()))) : x.conversations;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.card }}>
      {/* header stub */}
      <div style={{ display: "flex", alignItems: "center", gap: narrow ? 9 : 14, padding: narrow ? "11px 12px" : "13px 20px", borderBottom: `1px solid ${T.ruleSoft}`, flexShrink: 0 }}>
        <button onClick={() => go("passes")} aria-label="Back to your XIDs" title="Back to your XIDs" style={{ border: "none", background: "none", color: T.mute, cursor: "pointer", display: "flex", padding: 4 }}><Ico.Back size={18} /></button>
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
        {/* Available for a kept conversation too — being able to read something
            you cannot save is backwards. */}
        {cur && cur.messages.length > 0 && (live || (cur.keepMe && cur.keepThem)) && (
          <Btn size="sm" kind="quiet" icon={Ico.Ledger} title="Save your own copy before this ends"
            onClick={() => downloadTranscript(x, cur, "host")}>{narrow ? "Save" : "Save a copy"}</Btn>
        )}
        {live && <Btn size="sm" kind="danger" icon={Ico.Kill} onClick={() => onKill(x)}>End</Btn>}
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

          {/* Mutual keep. Both sides must agree, and the copy is explicitly not
              the default — otherwise "we keep nothing" stops being true. */}
          {/* Shown after the XID ends as well. Otherwise a conversation you both
              agreed to keep becomes permanent with no way to undo it — which
              contradicts the one promise this product makes. */}
          {cur && !cur.blocked && (live || (cur.keepMe && cur.keepThem)) && (
            <div style={{ padding: "10px 22px", borderTop: `1px solid ${T.ruleSoft}`,
              background: cur.keepMe && cur.keepThem ? T.liveWash : "#FAFBFC" }}>
              {cur.keepMe && cur.keepThem ? (
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: T.live, flexWrap: "wrap" }}>
                  <Ico.Shield size={16} />
                  <span style={{ flex: 1, minWidth: 200 }}>
                    <strong style={{ fontWeight: 650 }}>You both agreed to keep this.</strong> It stays readable after the XID ends. Nothing else changes.
                  </span>
                  <Btn size="sm" kind="ghost" onClick={() => onKeep(x.id, cur.id, false)}>Stop keeping</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: T.mute, flex: 1, minWidth: 200 }}>
                    {cur.keepMe
                      ? "You've asked to keep this. It still closes when the XID ends unless they agree too."
                      : cur.keepThem
                        ? "They've asked to keep this past the end date. It's only kept if you agree as well."
                        : "By default this closes when the XID ends. If you both agree, it can be kept."}
                  </span>
                  <Btn size="sm" kind={cur.keepMe ? "quiet" : "quiet"} icon={Ico.Shield}
                    disabled={cur.keepMe}
                    onClick={() => onKeep(x.id, cur.id, true)}>
                    {cur.keepMe ? "You've agreed" : "Keep this"}
                  </Btn>
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
                {cur?.blocked ? (asGuest ? "You can't send anything on this XID." : "You blocked this person. They can't send anything.") :
                  !live ? "This XID has ended. Nothing here can be recovered." :
                    nextOpen(x.hours, x.tz) ? `Quiet hours. Messages reopen at ${nextOpen(x.hours, x.tz)}.` : "Outside the hours this XID accepts messages."}
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
          Nobody has opened this XID yet
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.mute, lineHeight: 1.6 }}>
          Share the link or let someone scan the code. They pick a name and start typing — no signup, no app.
        </p>
        <p style={{ margin: "0 0 20px", fontFamily: MONO, fontSize: 12, color: T.faint, wordBreak: "break-all" }}>{url}</p>
        <Btn icon={Ico.QR} onClick={() => onShare(x)}>Share this XID</Btn>
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
  if (!live) return <div style={style(T.stampWash, "#F2C9C1", T.stamp)}><Ico.Shield size={15} /><span><strong style={{ fontWeight: 650 }}>This XID is {x.status}.</strong> Everything in it was deleted. This view is a local demo copy — in production the messages are already gone from the database.</span></div>;
  if (asGuest) return (
    <div style={style(T.signalWash, "#DCE2FF", T.signalDeep)}>
      <Ico.Shield size={15} />
      <span>
        <strong style={{ fontWeight: 650 }}>You're messaging through XIDgate.</strong> You don't have their number or email, and they don't have yours. This conversation ends in {countdown(x.expiresAt - Date.now()).text}.
        {!open && (nextOpen(x.hours, x.tz)
          ? <> Right now it's outside their hours — you can read but not send until {nextOpen(x.hours, x.tz)}.</>
          : <> Right now it's outside the hours they accept messages.</>)}
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
export function Ledger({ state, go }) {
  const narrow = useNarrow();
  const [q, setQ] = useState("");
  const all = [...state.receipts].sort((a, b) => b.ended - a.ended);
  const total = all.reduce((n, r) => n + r.destroyed, 0);

  /* Which records still have a conversation behind them.

     Derived rather than stored. For a kept conversation the connection survives,
     so the guest's name is already loaded — and for a destroyed one those names
     were deleted, which is exactly why they should stay unfindable. Copying them
     onto the record would have made "we keep the counts, not the messages" less
     true for no gain. */
  const keptByCode = new Map();
  for (const x of state.xids) {
    const convs = x.conversations.filter((c) => c.keepMe && c.keepThem);
    if (convs.length) keptByCode.set(x.code, { xid: x, convs });
  }

  /* Records hold no message content, so search runs over what does exist: the
     name you gave the XID, its code, why it ended, the date — and, where a
     conversation was kept, who you were talking to. That last one is usually
     what a person actually remembers. */
  const needle = q.trim().toLowerCase();
  const guestsFor = (code) =>
    (keptByCode.get(code)?.convs || []).map((c) => c.guest).join(", ");
  const rs = needle
    ? all.filter((r) =>
        r.label.toLowerCase().includes(needle) ||
        r.code.toLowerCase().includes(needle) ||
        r.reason.toLowerCase().includes(needle) ||
        stampDate(r.ended).toLowerCase().includes(needle) ||
        guestsFor(r.code).toLowerCase().includes(needle))
    : all;

  return (
    <div style={{ padding: narrow ? "24px 16px 96px" : "34px 32px 64px", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>History</h1>
      <p style={{ margin: "0 0 26px", fontSize: 14, color: T.mute, maxWidth: 560, lineHeight: 1.5 }}>
        A record of every XID that has run its course. We keep the counts and the timestamps, not the messages — unless you and the other person both agreed to keep one, which is counted separately below.
      </p>

      <div style={{ display: "flex", gap: 26, padding: "18px 22px", background: T.card, border: `1px solid ${T.rule}`, borderRadius: 11, marginBottom: 18, flexWrap: "wrap" }}>
        {[["XIDs completed", all.length], ["Messages cleared", total], ["Kept by mutual consent", state.kept || 0]].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: MONO, fontSize: 27, fontWeight: 500, color: T.ink, letterSpacing: "-0.02em" }}>{v}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: T.mute, marginTop: 3 }}>{k}</div>
          </div>
        ))}
      </div>

      {all.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 8, border: `1px solid ${T.rule}`, background: T.card, marginBottom: 16, maxWidth: 420 }}>
          <Ico.Search size={15} style={{ color: T.faint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, code, date, reason or who you spoke to"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: SANS, fontSize: 13.5, color: T.ink, minWidth: 0 }} />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search"
              style={{ border: "none", background: "none", color: T.faint, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>×</button>
          )}
        </div>
      )}

      {needle && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: T.mute, marginBottom: 12 }}>
          {rs.length} of {all.length} records
        </div>
      )}

      {rs.length === 0 ? (
        <div style={{ border: `1px dashed ${T.rule}`, borderRadius: 12, padding: "44px 24px", textAlign: "center", color: T.mute, fontSize: 13.5, background: T.card }}>
          {needle
            ? <>Nothing matches “{q}”. Records hold the XID name, code, date and reason — plus who you spoke to, but only where you both kept the conversation. Names from cleared conversations were deleted with them.</>
            : "Nothing here yet. Records appear when an XID ends."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {rs.map((r) => {
            const k = keptByCode.get(r.code);
            const names = guestsFor(r.code);
            /* A kept record is a door, not a tombstone — clicking it opens the
               conversation it still refers to. */
            const Row = k ? "button" : "div";
            return (
              <Row key={r.id}
                onClick={k && go ? () => go("chat", k.xid.id) : undefined}
                style={{
                  textAlign: "left", width: "100%", font: "inherit",
                  cursor: k && go ? "pointer" : "default",
                  background: T.card,
                  border: `1px solid ${T.rule}`,
                  borderLeft: k ? `3px solid ${T.live}` : `1px solid ${T.rule}`,
                  borderRadius: 10, padding: "15px 18px",
                  display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap",
                }}>
                <div style={{ flex: 1, minWidth: 190 }}>
                  <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 650, color: T.ink, letterSpacing: "-0.015em" }}>{r.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>
                    {r.code} · issued {stampDate(r.issued)}{names && <> · with {names}</>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: MONO, fontSize: 12.5, color: T.ink }}>
                    {k
                      ? <>kept by agreement · {k.convs.reduce((n, c) => n + c.messages.length, 0)} {k.convs.reduce((n, c) => n + c.messages.length, 0) === 1 ? "message" : "messages"}</>
                      : <>{r.destroyed} {r.destroyed === 1 ? "message" : "messages"} · {r.connections} {r.connections === 1 ? "person" : "people"}</>}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.faint, marginTop: 3 }}>{r.reason} · {stampDate(r.ended)}</div>
                </div>
                <Chip tone={k ? "live" : "dead"}>{k ? "kept" : "cleared"}</Chip>
              </Row>
            );
          })}
        </div>
      )}
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
        {many ? `End all ${list.length} XIDs?` : `End “${list[0].label}”?`}
      </h2>
      <p style={{ margin: "0 0 6px", fontSize: 13.5, color: T.mute, lineHeight: 1.6 }}>
        {msgs} {msgs === 1 ? "message" : "messages"} across {people} {people === 1 ? "person" : "people"} will be cleared immediately — on their side too. The link stops working. There's no undo and no archive.
      </p>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: T.mute, lineHeight: 1.6 }}>
        You'll get a record in your history. If you need the conversation itself, close this and use <strong style={{ fontWeight: 650, color: T.ink }}>Save a copy</strong> first — afterwards nobody can recover it.
      </p>
      <div style={{ display: "flex", gap: 9 }}>
        <Btn kind="quiet" style={{ flex: 1 }} onClick={onCancel}>Keep it</Btn>
        <Btn kind="solidDanger" style={{ flex: 1 }} icon={Ico.Kill} onClick={onConfirm}>{many ? "End all" : "End this XID"}</Btn>
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
          One identity<br />per conversation.
        </h1>
        <p style={{ margin: "0 0 30px", fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)", maxWidth: 400 }}>
          Create an XID instead. It carries a conversation, obeys your rules, and deletes itself when it's done. The other person never signs up for anything.
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

