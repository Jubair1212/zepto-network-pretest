"use client";

import React, { useState, useEffect, useCallback } from "react";

const BASE_RATE = 10; // Z-Points per hour
const SESSION_SECONDS = 24 * 3600;

const WEEK = [
  { d: "M", h: 4 }, { d: "T", h: 6 }, { d: "W", h: 5 }, { d: "T", h: 6.5 },
  { d: "F", h: 8 }, { d: "S", h: 7 }, { d: "S", h: 9 },
];

const INITIAL_TASKS = [
  { id: "x_follow", title: "Follow @ZeptoApp on X", reward: 50, url: "https://x.com", completed: false },
  { id: "x_like_retweet", title: "Like & Retweet Pinned Post", reward: 30, url: "https://x.com", completed: false },
  { id: "x_comment", title: "Comment & Tag 3 Friends on X", reward: 40, url: "https://x.com", completed: false },
  { id: "x_post_hashtag", title: "Post about Zepto with #ZeptoMining", reward: 100, url: "https://x.com", completed: false },
];

const SESSION_HISTORY = [
  { label: "Current session", earned: 8.33, status: "active" },
  { label: "Yesterday", earned: 240.0, status: "completed" },
  { label: "2 days ago", earned: 240.0, status: "completed" },
  { label: "3 days ago", earned: 168.0, status: "completed" },
];

const REFERRALS = [
  { addr: "0x8f3a…21bc", joined: "2h ago", earned: "16.8" },
  { addr: "0x1cd9…a4f0", joined: "1d ago", earned: "33.6" },
  { addr: "0x77be…09d3", joined: "2d ago", earned: "50.4" },
  { addr: "0x4a20…e771", joined: "4d ago", earned: "67.2" },
];

const TRANSACTIONS = [
  { label: "Session reward", amt: "+240.0", time: "Yesterday" },
  { label: "Referral share", amt: "+16.8", time: "2d ago" },
  { label: "Session reward", amt: "+240.0", time: "2d ago" },
  { label: "Streak bonus", amt: "+84.0", time: "3d ago" },
];

function formatTime(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

const C = {
  bg: "#07080d",
  panel: "rgba(255,255,255,0.03)",
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
  red: "#f87171",
  redSoft: "rgba(248,113,113,0.12)",
  blue: "#38bdf8",
  blueSoft: "rgba(56,189,248,0.12)",
};

const S = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    padding: "24px 20px 40px",
  } as React.CSSProperties,
  wrap: { width: "100%", maxWidth: 860, margin: "0 auto" } as React.CSSProperties,
  nav: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 20, borderBottom: `1px solid ${C.border}`,
  } as React.CSSProperties,
  brand: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 20, letterSpacing: 1 } as React.CSSProperties,
  walletBtn: (connected: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 8,
    background: connected ? C.panel : C.amber,
    color: connected ? C.text : "#0a0a0a",
    border: `1px solid ${connected ? C.border : "transparent"}`,
    padding: "9px 16px", borderRadius: 999, fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontVariantNumeric: "tabular-nums",
  }),
  hero: {
    marginTop: 24, background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 20, padding: "32px 28px",
    display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center",
  } as React.CSSProperties,
  label: { fontSize: 13, color: C.text2, fontWeight: 500 } as React.CSSProperties,
  balance: { fontSize: 46, fontWeight: 800, margin: "8px 0 4px", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  balanceUnit: { fontSize: 18, fontWeight: 600, color: C.text2 } as React.CSSProperties,
  chip: (color: string, soft: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, color, background: soft,
    border: `1px solid ${soft}`, padding: "5px 12px", borderRadius: 999,
  }),
  primaryBtn: (disabled: boolean): React.CSSProperties => ({
    marginTop: 24, width: "100%", padding: "16px",
    background: disabled ? C.panel : C.amber,
    color: disabled ? C.text3 : "#0a0a0a",
    fontWeight: 700, fontSize: 15,
    border: `1px solid ${disabled ? C.border : "transparent"}`,
    borderRadius: 14, cursor: disabled ? "default" : "pointer",
  }),
  quitBtn: {
    marginTop: 10, width: "100%", padding: "12px",
    background: C.redSoft,
    color: C.red,
    fontWeight: 600, fontSize: 14,
    border: `1px solid ${C.red}`,
    borderRadius: 14, cursor: "pointer",
    transition: "0.2s ease",
  } as React.CSSProperties,
  ringWrap: { position: "relative", width: 172, height: 172 } as React.CSSProperties,
  ringCenter: {
    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 4,
  } as React.CSSProperties,
  ringTime: { fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 } as React.CSSProperties,
  statCard: {
    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20,
  } as React.CSSProperties,
  statIcon: (soft: string): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 10, display: "flex",
    alignItems: "center", justifyContent: "center", background: soft, marginBottom: 12,
  }),
  statValue: { fontSize: 20, fontWeight: 700, margin: "2px 0 4px" } as React.CSSProperties,
  statSub: { fontSize: 12, fontWeight: 600 } as React.CSSProperties,
  streakRow: { display: "flex", gap: 6, marginTop: 10 } as React.CSSProperties,
  streakSeg: (filled: boolean): React.CSSProperties => ({
    flex: 1, height: 6, borderRadius: 3,
    background: filled ? C.purple : "rgba(255,255,255,0.08)",
  }),
  card: {
    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20,
  } as React.CSSProperties,
  pageTitle: { fontSize: 22, fontWeight: 800, margin: "24px 0 4px" } as React.CSSProperties,
  pageSub: { fontSize: 13, color: C.text2, marginBottom: 16 } as React.CSSProperties,
  row: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 0", borderBottom: `1px solid ${C.border}`,
  } as React.CSSProperties,
  rowAddr: { fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  rowMeta: { fontSize: 12, color: C.text3 } as React.CSSProperties,
  bottomNav: {
    position: "sticky", bottom: 12, marginTop: 24,
    display: "flex", justifyContent: "space-around",
    background: "rgba(24,24,27,0.92)", backdropFilter: "blur(12px)",
    border: `1px solid ${C.border}`, borderRadius: 18, padding: "10px 12px",
    zIndex: 20,
  } as React.CSSProperties,
  taskBtn: (completed: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    background: completed ? C.greenSoft : C.amber,
    color: completed ? C.green : "#0a0a0a",
    border: `1px solid ${completed ? C.green : "transparent"}`,
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 12,
    cursor: completed ? "default" : "pointer",
  }),
};

function Ring({ progress, active, size = 172 }: { progress: number; active: boolean; size?: number }) {
  const R = 76, STROKE = 8, CIRC = 2 * Math.PI * R;
  return (
    <svg width={size} height={size} viewBox="0 0 172 172" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="86" cy="86" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
      <circle
        cx="86" cy="86" r={R} fill="none"
        stroke={active ? C.amber : C.text3} strokeWidth={STROKE} strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(1, Math.max(0, progress)))}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
      />
    </svg>
  );
}

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
  target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  gift: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7c-1.5 0-4.5-.5-4.5-3S11 1.5 12 7zM12 7c1.5 0 4.5-.5 4.5-3S13 1.5 12 7z",
  up: "M7 17 17 7M7 7h10v10",
  tasks: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  xLogo: "M4 4l11.733 16h4.267l-11.733 -16z M4 20l6.768 -6.768 M13.232 10.768l6.768 -6.768",
};

type Tab = "home" | "mine" | "tasks" | "referrals" | "wallet";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("home");
  const [balance, setBalance] = useState(1250.5);
  const [isMining, setIsMining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [wallet, setWallet] = useState<string | null>(null);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  /* Hydration & Saved State Restoring */
  useEffect(() => {
    setMounted(true);
    try {
      const savedWallet = localStorage.getItem("zepto_wallet");
      if (savedWallet) setWallet(savedWallet);

      const savedTasks = localStorage.getItem("zepto_tasks");
      if (savedTasks) setTasks(JSON.parse(savedTasks));

      const savedState = localStorage.getItem("zepto_state");
      if (savedState) {
        const { balance: savedBal, endAt } = JSON.parse(savedState);
        const now = Date.now();

        if (endAt && endAt > now) {
          const remainingSeconds = Math.floor((endAt - now) / 1000);
          const elapsedSeconds = SESSION_SECONDS - remainingSeconds;
          setBalance(savedBal + (BASE_RATE / 3600) * elapsedSeconds);
          setTimeLeft(remainingSeconds);
          setIsMining(true);
        } else if (endAt && endAt <= now) {
          setBalance(savedBal + (BASE_RATE / 3600) * SESSION_SECONDS);
          setIsMining(false);
          setTimeLeft(0);
        } else {
          setBalance(savedBal);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  /* Persist State */
  useEffect(() => {
    if (!mounted) return;
    const endAt = isMining ? Date.now() + timeLeft * 1000 : 0;
    const baseBalance = isMining
      ? balance - ((SESSION_SECONDS - timeLeft) * BASE_RATE) / 3600
      : balance;

    localStorage.setItem(
      "zepto_state",
      JSON.stringify({ balance: baseBalance, endAt })
    );
    localStorage.setItem("zepto_tasks", JSON.stringify(tasks));
  }, [isMining, timeLeft, balance, tasks, mounted]);

  /* Mining Timer Interval */
  useEffect(() => {
    if (!isMining) return;
    const interval = setInterval(() => {
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

    return () => clearInterval(interval);
  }, [isMining, showToast]);

  const startSession = useCallback(() => {
    setIsMining(true);
    setTimeLeft(SESSION_SECONDS);
    showToast("Mining session started — 24h");
  }, [showToast]);

  const stopSession = useCallback(() => {
    setIsMining(false);
    setTimeLeft(0);
    showToast("Mining session stopped");
  }, [showToast]);

  const handleTaskClick = (task: typeof INITIAL_TASKS[0]) => {
    if (task.completed) return;
    window.open(task.url, "_blank");

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t))
      );
      setBalance((b) => b + task.reward);
      showToast(`+${task.reward} Z-Points earned from X Task!`);
    }, 1500);
  };

  const connectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          const a = accounts[0] as string;
          const formatted = `${a.slice(0, 6)}…${a.slice(-4)}`;
          setWallet(formatted);
          localStorage.setItem("zepto_wallet", formatted);
          showToast("Wallet connected");
        }
      } catch {
        showToast("Wallet connection rejected");
      }
    } else {
      showToast("MetaMask not detected — install a Web3 wallet");
    }
  }, [showToast]);

  const copyRef = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText("https://zepto.app/r/YOUR-CODE");
      showToast("Referral link copied");
    }
  };

  if (!mounted) return null;

  const progress = isMining ? 1 - timeLeft / SESSION_SECONDS : 0;
  const sessionEarned = isMining ? ((SESSION_SECONDS - timeLeft) * BASE_RATE) / 3600 : 0;

  const NAV: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: ICONS.home, label: "Home" },
    { id: "mine", icon: ICONS.target, label: "Mine" },
    { id: "tasks", icon: ICONS.tasks, label: "Tasks" },
    { id: "referrals", icon: ICONS.users, label: "Referrals" },
    { id: "wallet", icon: ICONS.wallet, label: "Wallet" },
  ];

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <header style={S.nav}>
          <div style={S.brand}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={C.amber}>
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
            ZEPTO
          </div>
          <button style={S.walletBtn(!!wallet)} onClick={connectWallet}>
            <I d={ICONS.wallet} color={wallet ? C.text2 : "#0a0a0a"} size={15} />
            {wallet ?? "Connect wallet"}
          </button>
        </header>

        {tab === "home" && (
          <div className="zpage">
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
                  {balance.toFixed(isMining ? 4 : 2)} <span style={S.balanceUnit}>Z-Points</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={S.chip(C.amber, C.amberSoft)}>
                    <I d={ICONS.gauge} color={C.amber} size={13} /> +{BASE_RATE.toFixed(1)} / hour
                  </span>
                  {isMining && (
                    <span style={S.chip(C.text2, C.panel)}>+{sessionEarned.toFixed(4)} this session</span>
                  )}
                </div>

                {!isMining ? (
                  <button style={S.primaryBtn(false)} onClick={startSession}>
                    Start 24h mining session
                  </button>
                ) : (
                  <>
                    <button style={S.primaryBtn(true)} disabled={true}>
                      Mining session in progress
                    </button>
                    <button style={S.quitBtn} onClick={stopSession}>
                      Quit / Stop Mining
                    </button>
                  </>
                )}
              </div>
              <div style={S.ringWrap}>
                <Ring progress={progress} active={isMining} />
                <div style={S.ringCenter}>
                  <span style={{ ...S.ringTime, color: isMining ? C.text : C.text3 }}>{formatTime(timeLeft)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: isMining ? C.amber : C.text3 }}>
                    {isMining ? "SESSION ACTIVE" : "READY"}
                  </span>
                </div>
              </div>
            </section>

            <section className="zstats" style={S.stats}>
              <div style={S.statCard}>
                <div style={S.statIcon(C.greenSoft)}><I d={ICONS.users} color={C.green} /></div>
                <span style={S.label}>Referrals</span>
                <div style={S.statValue}>12 active</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ ...S.statSub, color: C.green }}>+7% lifetime share</span>
                  <button onClick={() => setTab("referrals")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                    <I d={ICONS.up} color={C.text3} size={15} />
                  </button>
                </div>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon(C.purpleSoft)}><I d={ICONS.flame} color={C.purple} /></div>
                <span style={S.label}>Daily streak</span>
                <div style={S.statValue}>Day 5 of 7</div>
                <div style={S.streakRow}>
                  {[true, true, true, true, true, false, false].map((f, i) => (
                    <span key={i} style={S.streakSeg(f)} />
                  ))}
                </div>
                <span style={{ ...S.statSub, color: C.purple, marginTop: 8, display: "inline-block" }}>+35% bonus active</span>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon(C.amberSoft)}><I d={ICONS.bolt} color={C.amber} /></div>
                <span style={S.label}>Mining rate</span>
                <div style={S.statValue}>10.0 <span style={{ fontSize: 13, color: C.text2 }}>Z/hr</span></div>
                <span style={{ ...S.statSub, color: C.text2 }}>base rate</span>
              </div>
            </section>

            <section style={{ ...S.card, marginTop: 16, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={S.label}>Mining time this week</span>
                <span style={{ fontSize: 12, color: C.text3 }}>hours / day</span>
              </div>
              <svg width="100%" height="72" viewBox="0 0 320 72" preserveAspectRatio="none">
                {WEEK.map((d, i) => (
                  <rect key={i} x={8 + i * 44} y={72 - d.h * 6.6} width="24" height={d.h * 6.6} rx="3"
                    fill={i === WEEK.length - 1 ? C.amber : "rgba(245,158,11,0.3)"} />
                ))}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.text3, padding: "4px 6px 0" }}>
                {WEEK.map((d, i) => (
                  <span key={i} style={i === WEEK.length - 1 ? { color: C.amber, fontWeight: 700 } : undefined}>{d.d}</span>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "mine" && (
          <div className="zpage">
            <h2 style={S.pageTitle}>Mining</h2>
            <p style={S.pageSub}>Your session, rate and history</p>

            <section className="zhero" style={{ ...S.hero, gridTemplateColumns: "1fr auto" }}>
              <div>
                <span style={S.label}>{isMining ? "Session in progress" : "No active session"}</span>
                <div style={{ ...S.balance, fontSize: 34 }}>
                  +{sessionEarned > 0 ? sessionEarned.toFixed(4) : "0.0000"}{" "}
                  <span style={S.balanceUnit}>Z-Points</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={S.chip(C.amber, C.amberSoft)}>
                    <I d={ICONS.gauge} color={C.amber} size={13} /> {BASE_RATE.toFixed(1)} Z/hr base
                  </span>
                  {isMining && (
                    <span style={S.chip(C.purple, C.purpleSoft)}>
                      <I d={ICONS.flame} color={C.purple} size={13} /> streak +35%
                    </span>
                  )}
                </div>

                {!isMining ? (
                  <button style={S.primaryBtn(false)} onClick={startSession}>
                    Start 24h mining session
                  </button>
                ) : (
                  <>
                    <button style={S.primaryBtn(true)} disabled={true}>
                      Mining session in progress
                    </button>
                    <button style={S.quitBtn} onClick={stopSession}>
                      Quit / Stop Mining
                    </button>
                  </>
                )}
              </div>
              <div style={S.ringWrap}>
                <Ring progress={progress} active={isMining} />
                <div style={S.ringCenter}>
                  <span style={{ ...S.ringTime, color: isMining ? C.text : C.text3 }}>{formatTime(timeLeft)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: isMining ? C.amber : C.text3 }}>
                    {isMining ? "SESSION ACTIVE" : "READY"}
                  </span>
                </div>
              </div>
            </section>

            <section style={{ ...S.card, marginTop: 16 }}>
              <span style={S.label}>Session history</span>
              <div style={{ marginTop: 8 }}>
                {SESSION_HISTORY.map((s, i) => (
                  <div key={i} style={S.row}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
                      <div style={S.rowMeta}>{s.status === "active" ? "in progress" : "completed"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...S.statSub, color: s.status === "active" ? C.amber : C.green }}>+{s.earned.toFixed(1)}</div>
                      {s.status === "active" && (
                        <span style={{ ...S.chip(C.amber, C.amberSoft), fontSize: 10, padding: "2px 8px" }}>active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "tasks" && (
          <div className="zpage">
            <h2 style={S.pageTitle}>X Quests & Tasks</h2>
            <p style={S.pageSub}>Complete X (Twitter) tasks to earn bonus Z-Points instantly</p>

            <section style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={S.statIcon(C.blueSoft)}>
                  <I d={ICONS.xLogo} color={C.blue} size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Social Bounties</div>
                  <div style={{ fontSize: 12, color: C.text2 }}>Perform actions on X to earn extra Z-Points</div>
                </div>
              </div>
            </section>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tasks.map((task) => (
                <div key={task.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: C.amber, fontWeight: 700, marginTop: 2 }}>
                      +{task.reward} Z-Points
                    </div>
                  </div>
                  <button
                    style={S.taskBtn(task.completed)}
                    onClick={() => handleTaskClick(task)}
                    disabled={task.completed}
                  >
                    {task.completed ? "Completed" : "Start Task"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "referrals" && (
          <div className="zpage">
            <h2 style={S.pageTitle}>Referrals</h2>
            <p style={S.pageSub}>Earn 7% lifetime share from every referral</p>

            <section className="zhero" style={{ ...S.hero, gridTemplateColumns: "1fr" }}>
              <div>
                <span style={S.label}>Your referral link</span>
                <div style={{
                  marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px",
                }}>
                  <span style={{ ...S.rowAddr, color: C.text2 }}>zepto.app/r/YOUR-CODE</span>
                  <button onClick={copyRef} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                    <I d={ICONS.copy} color={C.amber} size={17} />
                  </button>
                </div>
              </div>
            </section>

            <section className="zstats" style={{ ...S.stats, gridTemplateColumns: "repeat(3, 1fr)" }}>
              {[
                { icon: ICONS.users, color: C.green, soft: C.greenSoft, label: "Total referrals", value: "24" },
                { icon: ICONS.bolt, color: C.amber, soft: C.amberSoft, label: "Active", value: "12" },
                { icon: ICONS.gift, color: C.purple, soft: C.purpleSoft, label: "Earned from refs", value: "168.0" },
              ].map((s) => (
                <div key={s.label} style={S.statCard}>
                  <div style={S.statIcon(s.soft)}><I d={s.icon} color={s.color} /></div>
                  <span style={S.label}>{s.label}</span>
                  <div style={S.statValue}>{s.value}</div>
                </div>
              ))}
            </section>

            <section style={{ ...S.card, marginTop: 16 }}>
              <span style={S.label}>Recent referrals</span>
              <div style={{ marginTop: 8 }}>
                {REFERRALS.map((r, i) => (
                  <div key={i} style={S.row}>
                    <div>
                      <div style={S.rowAddr}>{r.addr}</div>
                      <div style={S.rowMeta}>Joined {r.joined}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...S.statSub, color: C.green }}>+{r.earned}</div>
                      <span style={{ ...S.chip(C.green, C.greenSoft), fontSize: 10, padding: "2px 8px" }}>active</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "wallet" && (
          <div className="zpage">
            <h2 style={S.pageTitle}>Wallet</h2>
            <p style={S.pageSub}>Connect a wallet to withdraw at TGE</p>

            {!wallet ? (
              <section className="zhero" style={{ ...S.hero, gridTemplateColumns: "1fr", textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                  <div style={{ ...S.statIcon(C.amberSoft), width: 52, height: 52, borderRadius: 16, marginBottom: 4 }}>
                    <I d={ICONS.wallet} color={C.amber} size={26} />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>No wallet connected</div>
                  <p style={{ ...S.pageSub, margin: 0 }}>Connect MetaMask or any Web3 wallet to secure your Z-Points</p>
                  <button style={{ ...S.primaryBtn(false), maxWidth: 320 }} onClick={connectWallet}>Connect wallet</button>
                </div>
              </section>
            ) : (
              <>
                <section style={{ ...S.card, textAlign: "center" }}>
                  <span style={S.label}>Connected wallet</span>
                  <div style={{ ...S.rowAddr, fontSize: 17, margin: "6px 0 12px" }}>{wallet}</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <span style={S.chip(C.green, C.greenSoft)}><I d={ICONS.check} color={C.green} size={13} /> verified</span>
                    <span style={S.chip(C.text2, C.panel)}>BSC network</span>
                  </div>
                </section>

                <section style={{ ...S.card, marginTop: 16, textAlign: "center" }}>
                  <span style={S.label}>Withdrawable balance</span>
                  <div style={{ ...S.balance, fontSize: 36 }}>{balance.toFixed(2)} <span style={S.balanceUnit}>Z-Points</span></div>
                  <button
                    style={{ ...S.primaryBtn(false), marginTop: 12 }}
                    onClick={() => showToast("Withdrawals open at TGE — stay tuned")}
                  >
                    Withdraw
                  </button>
                </section>
              </>
            )}

            <section style={{ ...S.card, marginTop: 16 }}>
              <span style={S.label}>Recent activity</span>
              <div style={{ marginTop: 8 }}>
                {TRANSACTIONS.map((t, i) => (
                  <div key={i} style={S.row}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</div>
                      <div style={S.rowMeta}>{t.time}</div>
                    </div>
                    <span style={{ ...S.statSub, color: t.amt.startsWith("+") ? C.green : C.red }}>{t.amt}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <nav style={S.bottomNav}>
          {NAV.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer", padding: "4px 14px",
                  color: active ? C.amber : C.text3, fontSize: 11, fontWeight: active ? 700 : 500,
                }}
              >
                <I d={t.icon} color={active ? C.amber : C.text3} size={19} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

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
        @keyframes zfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .zpage { animation: zfade 0.25s ease-out; }
        button:hover { filter: brightness(1.08); }
        @media (max-width: 700px) {
          .zhero { grid-template-columns: 1fr !important; justify-items: center; text-align: center; }
          .zstats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
