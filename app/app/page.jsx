"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Dashboard, Issue, Ledger, Chat, ShareSheet, KillConfirm, Auth, Wordmark,
} from "@/components/screens";
import { Btn, Ico, MONO, SANS, T, auth, db, useNarrow } from "@/lib/core";

export default function HostApp() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [state, setState] = useState(null);
  const [view, setView] = useState("passes");
  const [openId, setOpenId] = useState(null);
  const [share, setShare] = useState(null);
  const [kill, setKill] = useState(null);
  const [toast, setToast] = useState(null);
  const [, setTick] = useState(0);
  const narrow = useNarrow();

  /* --------------------------------------------------------------- session */
  useEffect(() => {
    let alive = true;
    auth.user().then((u) => alive && setUser(u));
    const off = auth.onChange((u) => alive && setUser(u));
    return () => { alive = false; off(); };
  }, []);

  const refresh = useCallback(async () => {
    try { setState(await db.load()); }
    catch { flash("Couldn't reach the server. Check your connection."); }
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  /* Countdowns need a heartbeat. One interval for the whole app, not one per
     card — a hundred passes must not mean a hundred timers. */
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* Expiry is decided by the database cron job, not the browser. This only
     re-reads when something on screen has visibly run out, so the UI can't
     drift from the truth. */
  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => {
      const stale = state.xids.some((x) => x.status === "active" && x.expiresAt <= Date.now());
      if (stale) refresh();
    }, 5000);
    return () => clearInterval(t);
  }, [state, refresh]);

  /* Live messages, but only for the chat that's actually open. */
  useEffect(() => {
    if (!openId || view !== "chat") return;
    const off = db.watch(openId, refresh);
    return off;
  }, [openId, view, refresh]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2800); };
  const go = (v, id = null) => {
    setView(v); setOpenId(id);
    if (id) setState((s) => s && ({ ...s, xids: s.xids.map((x) => (x.id === id ? { ...x, unread: 0 } : x)) }));
  };

  const act = (fn, done) => async (...args) => {
    try { await fn(...args); await refresh(); if (done) flash(done); }
    catch (e) { flash(e.message || "That didn't work. Try again."); }
  };

  /* ---------------------------------------------------------------- states */
  if (user === undefined) return <Splash label="Checking your session" />;
  if (!user) return <Auth onIn={() => auth.user().then(setUser)} />;
  if (!state) return <Splash label="Loading your XIDs" />;

  const open = state.xids.find((x) => x.id === openId);
  const NAV = [
    { v: "passes", label: "XIDs", icon: Ico.Pass },
    { v: "ledger", label: "Ledger", icon: Ico.Ledger },
  ];

  return (
    <div style={{ height: "100dvh", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: narrow ? "column-reverse" : "row", height: "100%", background: T.paper }}>
        <nav style={narrow ? {
          flexShrink: 0, borderTop: `1px solid ${T.rule}`, background: T.card,
          display: "flex", padding: "6px 8px", paddingBottom: "max(6px, env(safe-area-inset-bottom))", gap: 4,
        } : {
          width: 208, flexShrink: 0, borderRight: `1px solid ${T.rule}`, background: T.card,
          display: "flex", flexDirection: "column", padding: "18px 12px",
        }}>
          {!narrow && <div style={{ padding: "0 8px 20px" }}><Wordmark /></div>}
          {(narrow && view === "chat" ? [] : NAV).map((n) => (
            <button key={n.v} onClick={() => go(n.v)} style={{
              display: "flex", alignItems: "center", justifyContent: narrow ? "center" : "flex-start",
              flexDirection: narrow ? "column" : "row", flex: narrow ? 1 : "none", gap: narrow ? 3 : 10,
              padding: narrow ? "7px 4px" : "9px 10px", borderRadius: 8, position: "relative",
              border: "none", cursor: "pointer", marginBottom: narrow ? 0 : 3, fontFamily: SANS,
              fontSize: narrow ? 10.5 : 13.5, fontWeight: 600,
              background: view === n.v && !narrow ? T.signalWash : "transparent",
              color: view === n.v ? T.signalDeep : T.mute, textAlign: "left",
            }}>
              <n.icon size={narrow ? 19 : 16} />{n.label}
            </button>
          ))}
          {!narrow && (
            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <button onClick={() => auth.signOut().then(() => setUser(null))}
                style={{ border: "none", background: "none", color: T.faint, fontFamily: SANS, fontSize: 12, cursor: "pointer", padding: 0 }}>
                Sign out
              </button>
            </div>
          )}
        </nav>

        <main style={{ flex: 1, overflowY: view === "chat" ? "hidden" : "auto", minWidth: 0, minHeight: 0 }}>
          {view === "passes" && (
            <Dashboard state={state} go={go} onShare={setShare}
              onReopen={act((x) => db.unseal(x.id), "Reopened. One more person can join.")}
              onKill={(x) => setKill(x)}
              onKillAll={() => setKill(state.xids.filter((x) => x.status === "active"))} />
          )}
          {view === "issue" && (
            <Issue state={state} go={go} onIssue={async (cfg, pid) => {
              try {
                const x = await db.issue(cfg, pid);
                await refresh();
                setShare(x);
                setView("passes");
              } catch (e) { flash(e.message || "Couldn't create that XID."); }
            }} />
          )}
          {view === "ledger" && <Ledger state={state} go={go} />}
          {view === "chat" && open && (
            <Chat x={open} go={go} onShare={setShare}
              onSend={act((xid, cid, text) => db.send(xid, cid, text))}
              onKill={(x) => setKill(x)}
              onBlock={act((xid, cid) => {
                const c = open.conversations.find((v) => v.id === cid);
                return db.setBlocked(xid, cid, !c.blocked);
              })}
              onKeep={act((xid, cid, on) => db.setKeep(xid, cid, on),
                "Saved. It's kept only once they agree too.")} />
          )}
        </main>
      </div>

      {share && <ShareSheet x={share} onClose={() => setShare(null)} />}
      {kill && (
        <KillConfirm target={kill} onCancel={() => setKill(null)}
          onConfirm={async () => {
            const list = Array.isArray(kill) ? kill : [kill];
            setKill(null);
            try {
              await db.kill(list);
              await refresh();
              setView("passes");
              flash(list.length > 1
                ? `${list.length} XIDs ended. Records are in your history.`
                : "XID ended. Record is in your history.");
            } catch { flash("Couldn't end that XID. Try again."); }
          }} />
      )}
      {toast && (
        <div role="status" style={{
          position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 300,
          background: T.ink, color: "#fff", padding: "11px 18px", borderRadius: 9,
          fontFamily: SANS, fontSize: 13.5, maxWidth: "90vw", textAlign: "center",
          boxShadow: "0 14px 34px -18px rgba(20,24,31,.9)",
        }}>{toast}</div>
      )}
    </div>
  );
}

function Splash({ label }) {
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: T.paper }}>
      <Wordmark />
      <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: ".08em", color: T.faint }}>{label}…</span>
    </div>
  );
}
