"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

const BASE_RATE = 10; // Z-Points per hour

const WEEK = [
  { d: "M", h: 4 }, { d: "T", h: 6 }, { d: "W", h: 5 }, { d: "T", h: 6.5 },
  { d: "F", h: 8 }, { d: "S", h: 7 }, { d: "S", h: 9 },
];
const SESSION_SECONDS = 24 * 3600;

/* ---------------------------------- utils --------------------------------- */

function loadState() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("zepto_state") ?? "null");
  } catch {
    return null;
  }
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/* --------------------------------- styles --------------------------------- */
/* Single style object so the whole UI stays consistent and easy to theme.   */

const C = {
  bg: "#07080d",
  panel: "rgba(255,255,255,0.03)",
  panelHover: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.07)",
  text: "#f4f4f5",
  text2: "#a1a1aa",
  text3: "#52525b",
  amber: "#f59e0b",
  amberSoft: "rgba(245,158,11,0.12)",
  green: "#34d399",
  greenSoft: "rgba(52,211,153,0.12)",
  purple: "#c084fc",
  purpleSoft: "rgba(192,132,252,0.12)",
};

const S = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    padding: "24px 20px 64px",
  } as React.CSSProperties,
  wrap: { width: "100%", maxWidth: 860, margin: "0 auto" } as React.CSSProperties,

  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 20,
    borderBottom: `1px solid ${C.border}`,
  } as React.CSSProperties,

  brand: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 20, letterSpacing: 1 } as React.CSSProperties,

  walletBtn: (connected: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: connected ? C.panel : C.amber,
    color: connected ? C.text : "#0a0a0a",
    border: `1px solid ${connected ? C.border : "transparent"}`,
    padding: "9px 16px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",
    fontVariantNumeric: "tabular-nums",
  }),

  hero: {
    marginTop: 24,
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: "32px 28px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 24,
    alignItems: "center",
  } as React.CSSProperties,

  label: { fontSize: 13, color: C.text2, fontWeight: 500 } as React.CSSProperties,
  balance: { fontSize: 46, fontWeight: 800, margin: "8px 0 4px", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  balanceUnit: { fontSize: 18, fontWeight: 600, color: C.text2 } as React.CSSProperties,

  chip: (color: string, soft: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color,
    background: soft,
    border: `1px solid ${soft}`,
    padding: "5px 12px",
    borderRadius: 999,
  }),

  primaryBtn: (disabled: boolean): React.CSSProperties => ({
    marginTop: 24,
    width: "100%",
    padding: "16px",
    background: disabled ? C.panel : C.amber,
    color: disabled ? C.text3 : "#0a0a0a",
    fontWeight: 700,
    fontSize: 15,
    border: `1px solid ${disabled ? C.border : "transparent"}`,
    borderRadius: 14,
    cursor: disabled ? "default" : "pointer",
    transition: "background 0.2s, transform 0.1s",
  }),

  ringWrap: { position: "relative", width: 172, height: 172 } as React.CSSProperties,
  ringCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  } as React.CSSProperties,
  ringTime: { fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  ringLabel: { fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const },

  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 } as React.CSSProperties,
  statCard: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20,
    transition: "background 0.2s",
  } as React.CSSProperties,
  statIcon: (soft: string): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: soft, marginBottom: 12,
  }),
  statValue: { fontSize: 20, fontWeight: 700, margin: "2px 0 4px" } as React.CSSProperties,
  statSub: { fontSize: 12, fontWeight: 600 } as React.CSSProperties,

  streakRow: { display: "flex", gap: 6, marginTop: 10 } as React.CSSProperties,
  streakSeg: (filled: boolean): React.CSSProperties => ({
    flex: 1, height: 6, borderRadius: 3,
    background: filled ? C.purple : "rgba(255,255,255,0.08)",
  }),
};

/* ------------------------------- ring chart ------------------------------- */

function Ring({ progress, active }: { progress: number; active: boolean }) {
  const R = 76, STROKE = 8, CIRC = 2 * Math.PI * R;
  const color = active ? C.amber : C.text3;
  return (
    <svg width="172" height="172" viewBox="0 0 172 172" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="86" cy="86" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
      <circle
        cx="86" cy="86" r={R} fill="none"
        stroke={color} strokeWidth={STROKE} strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - progress)}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
      />
    </svg>
  );
}

/* ---------------------------------- icons --------------------------------- */

const I = ({ d, color, size = 17 }: { d: string; color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 0 1-8 0 4 4 0 0 1 8 0z",
  flame: "M12 22c4 0 7-2.7 7-7 0-3-2-5.5-3.5-7C14 6.5 13 4 13 2c-3 2-5 5-5 8-1-.7-1.7-1.7-2-3-1.5 1.7-3 4-3 7 0 4.3 3 7 9 8z",
  gauge: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-12 0H3a9 9 0 0 1 9-9zM12 21a9 9 0 0 0 9-9",
  wallet: "M20 7H4a2 2 0 0 1 0-4h14v4M4 7v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1M16 13h4v4h-4a2 2 0 0 1 0-4z",
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  check: "M20 6 9 17l-5-5",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
};

/* --------------------------------- component ------------------------------ */

export default function Dashboard() {
  const [balance, setBalance] = useState(1250.5);
  const [isMining, setIsMining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [wallet, setWallet] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const stateRef = useRef({ balance: 1250.5, endAt: 0 });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  /* restore session from localStorage (survives refresh) */
  useEffect(() => {
    const saved = loadState();
    if (!saved) return;
    const now = Date.now();
    if (saved.endAt && saved.endAt > now) {
      const elapsed = (now - (saved.endAt - SESSION_SECONDS * 1000)) / 1000;
      setBalance(saved.balance + (BASE_RATE / 3600) * elapsed);
      setTimeLeft(Math.max(0, Math.floor((saved.endAt - now) / 1000)));
      setIsMining(true);
    } else {
      setBalance(saved.balance);
    }
  }, []);

  /* persist */
  useEffect(() => {
    stateRef.current.balance = balance;
  }, [balance]);
  useEffect(() => {
    stateRef.current.endAt = isMining ? Date.now() + timeLeft * 1000 : 0;
    localStorage.setItem(
      "zepto_state",
      JSON.stringify({ balance: stateRef.current.balance, endAt: stateRef.current.endAt }),
    );
  }, [balance, isMining, timeLeft]);

  /* single stable interval while mining */
  useEffect(() => {
    if (!isMining) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsMining(false);
          showToast("Session complete — rewards claimed");
          return 0;
        }
        return prev - 1;
      });
      setBalance((b) => b + BASE_RATE / 3600);
    }, 1000);
    return () => clearInterval(t);
  }, [isMining]);

  const startSession = useCallback(() => {
    setIsMining(true);
    setTimeLeft(SESSION_SECONDS);
    showToast("Mining session started — 24h");
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          const a = accounts[0] as string;
          setWallet(`${a.slice(0, 6)}…${a.slice(-4)}`);
          showToast("Wallet connected");
        }
      } catch {
        showToast("Wallet connection rejected");
      }
    } else {
      showToast("MetaMask not detected — install a Web3 wallet");
    }
  }, []);

  const copyRef = () => {
    navigator.clipboard?.writeText("https://zepto.app/r/YOUR-CODE");
    showToast("Referral link copied");
  };

  const progress = isMining ? 1 - timeLeft / SESSION_SECONDS : 0;
  const sessionEarned = isMining ? ((SESSION_SECONDS - timeLeft) * BASE_RATE) / 3600 : 0;

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        {/* ------------------------------ top nav ------------------------------ */}
        <header style={S.nav}>
          <div style={S.brand}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={C.amber}>
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
            ZEPTO
          </div>
          <button
            style={S.walletBtn(!!wallet)}
            onClick={connectWallet}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <I d={ICONS.wallet} color={wallet ? C.text2 : "#0a0a0a"} size={15} />
            {wallet ?? "Connect wallet"}
          </button>
        </header>

        {/* ------------------------------- hero -------------------------------- */}
        <section className="zhero" style={S.hero}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={S.label}>Total balance</span>
              {isMining && (
                <span style={S.chip(C.green, C.greenSoft)}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: C.green, animation: "pulse 1.2s infinite" }} />
                  live
                </span>
              )}
            </div>
            <div style={S.balance}>
              {balance.toFixed(isMining ? 4 : 2)}{" "}
              <span style={S.balanceUnit}>Z-Points</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={S.chip(C.amber, C.amberSoft)}>
                <I d={ICONS.gauge} color={C.amber} size={13} /> +{BASE_RATE.toFixed(1)} / hour
              </span>
              {isMining && (
                <span style={S.chip(C.text2, C.panel)}>
                  +{sessionEarned.toFixed(4)} this session
                </span>
              )}
            </div>
            <button
              style={S.primaryBtn(isMining)}
              disabled={isMining}
              onClick={startSession}
              onMouseEnter={(e) => { if (!isMining) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              {isMining ? "Mining session in progress" : "Start 24h mining session"}
            </button>
          </div>

          <div style={S.ringWrap}>
            <Ring progress={progress} active={isMining} />
            <div style={S.ringCenter}>
              <span style={{ ...S.ringTime, color: isMining ? C.text : C.text3 }}>
                {formatTime(timeLeft)}
              </span>
              <span style={{ ...S.ringLabel, color: isMining ? C.amber : C.text3 }}>
                {isMining ? "session active" : "ready"}
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------ stats -------------------------------- */}
        <section className="zstats" style={S.stats}>
          <div
            style={S.statCard}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.panelHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.panel)}
          >
            <div style={S.statIcon(C.greenSoft)}>
              <I d={ICONS.users} color={C.green} />
            </div>
            <span style={S.label}>Referrals</span>
            <div style={S.statValue}>12 active</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...S.statSub, color: C.green }}>+7% lifetime share</span>
              <button
                onClick={copyRef}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
                title="Copy referral link"
              >
                <I d={ICONS.copy} color={C.text3} size={15} />
              </button>
            </div>
          </div>

          <div
            style={S.statCard}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.panelHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.panel)}
          >
            <div style={S.statIcon(C.purpleSoft)}>
              <I d={ICONS.flame} color={C.purple} />
            </div>
            <span style={S.label}>Daily streak</span>
            <div style={S.statValue}>Day 5 of 7</div>
            <div style={S.streakRow}>
              {[true, true, true, true, true, false, false].map((f, i) => (
                <span key={i} style={S.streakSeg(f)} />
              ))}
            </div>
            <span style={{ ...S.statSub, color: C.purple, marginTop: 8, display: "inline-block" }}>
              +35% bonus active
            </span>
          </div>

          <div
            style={S.statCard}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.panelHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.panel)}
          >
            <div style={S.statIcon(C.amberSoft)}>
              <I d={ICONS.bolt} color={C.amber} />
            </div>
            <span style={S.label}>Mining rate</span>
            <div style={S.statValue}>
              10.0 <span style={{ fontSize: 13, color: C.text2 }}>Z/hr</span>
            </div>
            <span style={{ ...S.statSub, color: C.text2 }}>base rate</span>
          </div>
        </section>

        {/* ---------------------------- weekly chart --------------------------- */}
        <section className="zcard" style={{ marginTop: 16, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={S.label}>Mining time this week</span>
            <span style={{ fontSize: 12, color: C.text3 }}>hours / day</span>
          </div>
          <svg width="100%" height="72" viewBox="0 0 320 72" preserveAspectRatio="none">
            {WEEK.map((d, i) => (
              <rect
                key={i}
                x={8 + i * 44}
                y={72 - d.h * 6.6}
                width="24"
                height={d.h * 6.6}
                rx="3"
                fill={i === WEEK.length - 1 ? C.amber : "rgba(245,158,11,0.3)"}
              />
            ))}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.text3, padding: "4px 6px 0" }}>
            {WEEK.map((d, i) => (
              <span key={i} style={i === WEEK.length - 1 ? { color: C.amber, fontWeight: 600 } : undefined}>
                {d.d}
              </span>
            ))}
          </div>
        </section>

        {/* ------------------------------ bottom nav --------------------------- */}
        <nav
          className="zbottomnav"
          style={{
            position: "sticky", bottom: 12, marginTop: 24,
            display: "flex", justifyContent: "space-around",
            background: "rgba(24,24,27,0.92)", backdropFilter: "blur(12px)",
            border: `1px solid ${C.border}`, borderRadius: 18, padding: "10px 12px",
          }}
        >
          {[
            { icon: ICONS.home, label: "Home", active: true },
            { icon: ICONS.gauge, label: "Mine", active: false },
            { icon: ICONS.users, label: "Referrals", active: false },
            { icon: ICONS.wallet, label: "Wallet", active: false },
          ].map((t) => (
            <button
              key={t.label}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer", padding: "4px 14px",
                color: t.active ? C.amber : C.text3, fontSize: 11, fontWeight: t.active ? 700 : 500,
              }}
            >
              <I d={t.icon} color={t.active ? C.amber : C.text3} size={19} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* -------------------------------- toast -------------------------------- */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "#18181b", border: `1px solid ${C.border}`, color: C.text,
            padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)", zIndex: 50,
          }}
        >
          <I d={ICONS.check} color={C.green} size={15} />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        button:hover { filter: brightness(1.08); }
        @media (max-width: 700px) {
          .zhero { grid-template-columns: 1fr !important; justify-items: center; text-align: center; }
          .zstats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
