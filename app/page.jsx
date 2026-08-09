"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/screens";
import { Btn, Chip, Ico, MONO, Pass, SANS, T, useNarrow } from "@/lib/core";

/* The hero is a real pass with a real countdown, ticking. Not a screenshot,
   not a stat block — the thing itself, expiring while you read about it. */
export default function Landing() {
  const narrow = useNarrow();
  const [demo] = useState(() => ({
    id: "demo", code: "Xt7mK2q", label: "Royal Enfield · for sale",
    type: "individual", createdAt: Date.now() - 20 * 36e5,
    expiresAt: Date.now() + 4 * 36e5 + 23 * 6e4,
    maxConn: null, maxMsgs: null, hours: "any", oneShot: false,
    status: "active", unread: 2,
    conversations: [
      { id: "a", guest: "Buyer 4471", messages: [{}, {}, {}, {}] },
      { id: "b", guest: "Buyer 9082", messages: [{}, {}] },
    ],
  }));
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  const pad = narrow ? "0 18px" : "0 32px";

  return (
    <main style={{ background: T.paper, minHeight: "100dvh" }}>
      {/* -------------------------------------------------------------- nav */}
      <header style={{ padding: narrow ? "16px 18px" : "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto" }}>
        <Wordmark />
        <Link href="/app" style={{ textDecoration: "none" }}>
          <Btn size={narrow ? "sm" : "md"} kind="quiet">Sign in</Btn>
        </Link>
      </header>

      {/* ------------------------------------------------------------- hero */}
      <section style={{ padding: pad, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: narrow ? 34 : 56, gridTemplateColumns: narrow ? "1fr" : "1.05fr .95fr", alignItems: "center", padding: narrow ? "26px 0 44px" : "52px 0 76px" }}>
          <div>
            <div style={{ marginBottom: 18 }}><Chip tone="signal">Indian Patent No. 550231</Chip></div>
            <h1 style={{ margin: "0 0 18px", fontFamily: SANS, fontSize: narrow ? 36 : 54, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.02, color: T.ink }}>
              Share a pass,<br />not your number.
            </h1>
            <p style={{ margin: "0 0 12px", fontSize: narrow ? 16 : 18.5, lineHeight: 1.55, color: T.mute, maxWidth: 480 }}>
              Give anyone a way to reach you that ends on its own. You set how long it lasts, how many people can use it, and when the conversation is over.
            </p>
            <p style={{ margin: "0 0 28px", fontSize: narrow ? 16 : 18.5, lineHeight: 1.55, color: T.ink, maxWidth: 480, fontWeight: 500 }}>
              When it ends, every message is deleted. On both sides.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/app" style={{ textDecoration: "none" }}>
                <Btn size="lg" icon={Ico.Arrow}>Issue your first pass</Btn>
              </Link>
              <span style={{ fontSize: 13, color: T.faint }}>Free · no card</span>
            </div>
          </div>

          <div>
            <Pass x={demo} onOpen={() => {}} onShare={() => {}} onKill={() => {}} />
            <p style={{ margin: "14px 4px 0", fontFamily: MONO, fontSize: 11, color: T.faint, lineHeight: 1.6 }}>
              A live pass. The countdown above is real — when it reaches zero, that conversation is gone.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ the problem */}
      <section style={{ background: T.ink, color: "#fff", padding: narrow ? "48px 18px" : "72px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 20px", fontFamily: SANS, fontSize: narrow ? 26 : 34, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.14 }}>
            You can't un-share a phone number.
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: narrow ? 15.5 : 17, lineHeight: 1.65, color: "rgba(255,255,255,.66)" }}>
            Sell one bike and the calls never stop. Ask one contractor for a quote and three more have your number by evening. Match with one person and they can reach you forever, whether the date went well or not.
          </p>
          <p style={{ margin: 0, fontSize: narrow ? 15.5 : 17, lineHeight: 1.65, color: "rgba(255,255,255,.66)" }}>
            Blocking is whack-a-mole. Unsubscribing is a promise nobody keeps. Once someone has your permanent identity, the relationship is theirs to end, not yours.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- how it works */}
      <section style={{ padding: narrow ? "48px 18px" : "72px 32px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: narrow ? 26 : 32, fontWeight: 700, letterSpacing: "-0.035em", color: T.ink }}>
          Three steps, and the last one happens by itself
        </h2>
        <p style={{ margin: "0 0 34px", fontSize: 15, color: T.mute, maxWidth: 520, lineHeight: 1.55 }}>
          The whole point is that you don't have to remember to end it.
        </p>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14, gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)" }}>
          {[
            ["Issue a pass", "Pick why you need it — selling something, meeting someone, getting a quote. The rules are set for you."],
            ["Share the link or QR", "Put it where your number would have gone. Whoever opens it can message you. They don't sign up for anything."],
            ["It ends itself", "At the time you chose, or the moment you tap kill. The messages are deleted and the link stops working."],
          ].map(([title, body], i) => (
            <li key={title} style={{ background: T.card, border: `1px solid ${T.rule}`, borderRadius: 12, padding: "20px 20px 22px" }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: T.signal, marginBottom: 11, letterSpacing: ".1em" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 style={{ margin: "0 0 7px", fontFamily: SANS, fontSize: 17, fontWeight: 650, letterSpacing: "-0.02em", color: T.ink }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: T.mute, lineHeight: 1.6 }}>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ pricing */}
      <section style={{ padding: narrow ? "8px 18px 56px" : "8px 32px 84px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 26px", fontFamily: SANS, fontSize: narrow ? 26 : 32, fontWeight: 700, letterSpacing: "-0.035em", color: T.ink }}>
          Free for most people
        </h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", marginBottom: 30 }}>
          {[
            ["Free", "₹0", "Three passes at a time, up to a week each. No card needed.", false],
            ["Day pass", "₹49", "Twenty-four hours of unlimited passes. For the weekend you're selling a car.", false],
            ["Pro", "₹99", "Per month. Unlimited passes, month-long durations, group rooms.", true],
          ].map(([name, price, note, hero]) => (
            <div key={name} style={{
              background: T.card, borderRadius: 12, padding: "22px 20px",
              border: `1px solid ${hero ? T.signal : T.rule}`,
              boxShadow: hero ? "0 10px 30px -20px rgba(27,59,255,.6)" : "none",
            }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: hero ? T.signal : T.mute, marginBottom: 10 }}>{name}</div>
              <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>{price}</div>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: T.mute, lineHeight: 1.55 }}>{note}</p>
            </div>
          ))}
        </div>
        <Link href="/app" style={{ textDecoration: "none" }}>
          <Btn size="lg" icon={Ico.Arrow}>Issue your first pass</Btn>
        </Link>
      </section>

      {/* ------------------------------------------------------------- footer */}
      <footer style={{ borderTop: `1px solid ${T.rule}`, padding: narrow ? "26px 18px" : "30px 32px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <Wordmark />
          <span style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>
            Indian Patent No. 550231 · Built in Bengaluru
          </span>
        </div>
      </footer>
    </main>
  );
}
