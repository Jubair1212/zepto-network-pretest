"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const BASE_RATE = 10;
const SESSION_SECONDS = 24 * 60 * 60;

const BALANCE_KEY = "zepto_balance";
const SESSION_KEY = "zepto_mining_session";
const WALLET_KEY = "zepto_wallet";
const TASKS_KEY = "zepto_tasks";

type MiningSession = {
  startedAt: number;
  endAt: number;
  baseBalance: number;
};

// FIX #1: replaced boolean `completed` with a status enum so a task can be
// marked "pending" the instant the user clicks it. This closes the window
// where rapid double-clicks could queue multiple 1.5s timeouts and pay out
// the reward more than once.
type TaskStatus = "idle" | "pending" | "completed";

type Task = {
  id: string;
  title: string;
  reward: number;
  url: string;
  status: TaskStatus;
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "follow-x",
    title: "Follow ZEPTO on X",
    reward: 25,
    url: "https://x.com",
    status: "idle",
  },
  {
    id: "like-post",
    title: "Like our latest post",
    reward: 15,
    url: "https://x.com",
    status: "idle",
  },
  {
    id: "join-community",
    title: "Join ZEPTO community",
    reward: 20,
    url: "https://x.com",
    status: "idle",
  },
];

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")}`;
}

function shortenAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getStoredNumber(key: string, fallback = 0) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage errors.
  }
}

// FIX: migrate any old-format tasks (boolean `completed`) saved in
// localStorage into the new `status` shape so existing users don't crash
// or lose their completed state after this update ships.
function normalizeTasks(raw: any): Task[] {
  if (!Array.isArray(raw)) return DEFAULT_TASKS;

  const byId = new Map(DEFAULT_TASKS.map((t) => [t.id, t]));

  return DEFAULT_TASKS.map((defaultTask) => {
    const saved = raw.find((t) => t && t.id === defaultTask.id);
    if (!saved) return defaultTask;

    let status: TaskStatus = "idle";
    if (saved.status === "pending" || saved.status === "completed") {
      status = saved.status;
    } else if (saved.completed === true) {
      status = "completed";
    }

    return { ...defaultTask, status };
  });
}

// FIX #2: pure helper that computes the mining balance for a session at a
// given point in time. Used both by the restore effect (so the very first
// render after reload already shows the correct number) and by the ticking
// timer, so there's exactly one source of truth for "how much has mining
// earned so far".
function computeMiningBalance(
  session: MiningSession,
  miningRate: number,
  now: number
) {
  const elapsed = Math.max(
    0,
    Math.min(SESSION_SECONDS, Math.floor((now - session.startedAt) / 1000))
  );
  const earned = (miningRate * elapsed) / 3600;
  return session.baseBalance + earned;
}

function getChainName(chainId: string | null) {
  if (!chainId) return "Unknown network";

  const id = chainId.toLowerCase();

  if (id === "0x38") return "BNB Smart Chain";
  if (id === "0x1") return "Ethereum";
  if (id === "0x89") return "Polygon";
  if (id === "0xa") return "Optimism";
  if (id === "0xa4b1") return "Arbitrum";

  return `Chain ${parseInt(id, 16) || "Unknown"}`;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const [tab, setTab] = useState("home");

  const [balance, setBalance] = useState(0);

  const [session, setSession] = useState<MiningSession | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);

  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);

  const [wallet, setWallet] = useState("");

  const [chainId, setChainId] = useState<string | null>(null);

  const [toast, setToast] = useState("");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX #1 (continued): keep a ref to the live session so the setTimeout
  // callback in completeTask can read the *current* session when it fires,
  // instead of a stale value captured at click time.
  const sessionRef = useRef<MiningSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const miningRate = BASE_RATE;

  const sessionElapsed = useMemo(() => {
    if (!session) return 0;

    const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);

    return Math.max(0, Math.min(SESSION_SECONDS, elapsed));
  }, [session, timeLeft]);

  const sessionEarned = useMemo(() => {
    if (!session) return 0;

    return (miningRate * sessionElapsed) / 3600;
  }, [session, sessionElapsed, miningRate]);

  const progress = useMemo(() => {
    if (!session) return 0;

    return Math.min(100, Math.max(0, (sessionElapsed / SESSION_SECONDS) * 100));
  }, [session, sessionElapsed]);

  const showToast = useCallback((message: string) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 2500);
  }, []);

  // --------------------------------
  // Restore saved data
  // --------------------------------

  useEffect(() => {
    try {
      const savedBalance = getStoredNumber(BALANCE_KEY, 0);

      const savedTasksRaw = localStorage.getItem(TASKS_KEY);
      if (savedTasksRaw) {
        setTasks(normalizeTasks(JSON.parse(savedTasksRaw)));
      }

      const savedWallet = localStorage.getItem(WALLET_KEY);
      if (savedWallet) {
        setWallet(savedWallet);
      }

      const savedSession = localStorage.getItem(SESSION_KEY);

      if (savedSession) {
        const parsed: MiningSession = JSON.parse(savedSession);

        if (parsed && parsed.startedAt && parsed.endAt && parsed.baseBalance >= 0) {
          const now = Date.now();

          if (now < parsed.endAt) {
            // FIX (flash bug): compute the in-progress balance right away
            // instead of showing the pre-session baseBalance for one frame.
            setSession(parsed);
            setTimeLeft(Math.ceil((parsed.endAt - now) / 1000));
            setBalance(computeMiningBalance(parsed, miningRate, now));
          } else {
            const finalBalance =
              parsed.baseBalance + (miningRate * SESSION_SECONDS) / 3600;

            setBalance(finalBalance);
            saveStorage(BALANCE_KEY, String(finalBalance));
            localStorage.removeItem(SESSION_KEY);
          }
        } else {
          setBalance(savedBalance);
        }
      } else {
        setBalance(savedBalance);
      }
    } catch {
      // Safe fallback for corrupted localStorage.
    } finally {
      setMounted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------
  // Mining timer
  // --------------------------------

  useEffect(() => {
    if (!session) {
      setTimeLeft(0);
      return;
    }

    const updateMining = () => {
      const now = Date.now();

      const remaining = Math.max(0, Math.ceil((session.endAt - now) / 1000));

      // FIX #2: use the shared helper so this always reflects
      // session.baseBalance, which task completions now update directly
      // (see completeTask) instead of being clobbered by it.
      const currentBalance = computeMiningBalance(session, miningRate, now);

      setTimeLeft(remaining);
      setBalance(currentBalance);

      if (remaining <= 0) {
        const finalBalance =
          session.baseBalance + (miningRate * SESSION_SECONDS) / 3600;

        setBalance(finalBalance);
        saveStorage(BALANCE_KEY, String(finalBalance));
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        showToast("Mining session completed! 🎉");
      }
    };

    updateMining();

    const interval = setInterval(updateMining, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [session, miningRate, showToast]);

  // --------------------------------
  // Save balance
  // --------------------------------

  useEffect(() => {
    if (!mounted || session) return;

    saveStorage(BALANCE_KEY, String(balance));
  }, [balance, mounted, session]);

  // --------------------------------
  // Save tasks
  // --------------------------------

  useEffect(() => {
    if (!mounted) return;

    saveStorage(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks, mounted]);

  // --------------------------------
  // Start mining
  // --------------------------------

  const startMining = () => {
    if (session) {
      showToast("Mining is already running.");
      return;
    }

    const now = Date.now();

    const newSession: MiningSession = {
      startedAt: now,
      endAt: now + SESSION_SECONDS * 1000,
      baseBalance: balance,
    };

    saveStorage(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setTimeLeft(SESSION_SECONDS);
    showToast("24-hour mining started! ⛏️");
  };

  // --------------------------------
  // Stop mining
  // --------------------------------

  const stopMining = () => {
    if (!session) {
      showToast("No active mining session.");
      return;
    }

    const now = Date.now();
    const finalBalance = computeMiningBalance(session, miningRate, now);
    const earned = finalBalance - session.baseBalance;

    setBalance(finalBalance);
    saveStorage(BALANCE_KEY, String(finalBalance));
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setTimeLeft(0);

    showToast(`Mining stopped. +${earned.toFixed(2)} ZP earned.`);
  };

  // --------------------------------
  // Wallet
  // --------------------------------

  const connectWallet = async () => {
    try {
      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        showToast("Please install MetaMask first.");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts?.length) {
        showToast("No wallet account found.");
        return;
      }

      const address = accounts[0];

      const currentChain = await ethereum.request({
        method: "eth_chainId",
      });

      setWallet(address);
      setChainId(currentChain);
      saveStorage(WALLET_KEY, address);
      showToast(`Wallet connected: ${shortenAddress(address)}`);
    } catch (error: any) {
      if (error?.code === 4001) {
        showToast("Wallet connection rejected.");
      } else {
        showToast("Could not connect wallet.");
      }
    }
  };

  const disconnectWallet = () => {
    setWallet("");
    setChainId(null);

    try {
      localStorage.removeItem(WALLET_KEY);
    } catch {}

    showToast("Wallet disconnected from ZEPTO.");
  };

  // --------------------------------
  // Wallet listeners
  // --------------------------------

  useEffect(() => {
    if (!mounted) return;

    const ethereum = (window as any).ethereum;

    if (!ethereum?.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts?.length) {
        setWallet("");
        setChainId(null);

        try {
          localStorage.removeItem(WALLET_KEY);
        } catch {}

        return;
      }

      setWallet(accounts[0]);
      saveStorage(WALLET_KEY, accounts[0]);
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [mounted]);

  // --------------------------------
  // Check wallet on startup
  // --------------------------------

  useEffect(() => {
    if (!mounted) return;

    const checkWallet = async () => {
      try {
        const ethereum = (window as any).ethereum;

        if (!ethereum) return;

        const accounts = await ethereum.request({ method: "eth_accounts" });
        const currentChain = await ethereum.request({
          method: "eth_chainId",
        });

        setChainId(currentChain);

        if (accounts?.length) {
          setWallet(accounts[0]);
          saveStorage(WALLET_KEY, accounts[0]);
        }
      } catch {}
    };

    checkWallet();
  }, [mounted]);

  // --------------------------------
  // Tasks
  // --------------------------------

  // FIX #1 + #2: completeTask now
  //   (a) flips the task to "pending" synchronously so a second click is a
  //       no-op (guarded below) and can't queue a second payout timeout;
  //   (b) re-checks status inside the timeout too, in case of any race;
  //   (c) if mining is active, adds the reward to session.baseBalance (and
  //       persists it) instead of calling setBalance directly, so the
  //       ticking mining timer doesn't overwrite it on the next tick.
  const completeTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);

    if (!task || task.status !== "idle") {
      return;
    }

    setTasks((previous) =>
      previous.map((item) =>
        item.id === taskId ? { ...item, status: "pending" } : item
      )
    );

    window.open(task.url, "_blank", "noopener,noreferrer");

    // Demo mode:
    // Real verification requires backend/API.
    setTimeout(() => {
      setTasks((previous) => {
        const current = previous.find((item) => item.id === taskId);
        if (!current || current.status !== "pending") {
          return previous;
        }

        return previous.map((item) =>
          item.id === taskId ? { ...item, status: "completed" } : item
        );
      });

      const activeSession = sessionRef.current;

      if (activeSession) {
        const updatedSession: MiningSession = {
          ...activeSession,
          baseBalance: activeSession.baseBalance + task.reward,
        };

        saveStorage(SESSION_KEY, JSON.stringify(updatedSession));
        setSession(updatedSession);
      } else {
        setBalance((previous) => {
          const next = previous + task.reward;
          saveStorage(BALANCE_KEY, String(next));
          return next;
        });
      }

      showToast(`+${task.reward} ZP reward claimed!`);
    }, 1500);
  };

  // --------------------------------
  // Referral
  // --------------------------------

  const referralCode = wallet ? wallet.slice(2, 8).toUpperCase() : "YOURCODE";

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${referralCode}`
      : `https://zepto.app/r/${referralCode}`;

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      showToast("Referral link copied! 🔗");
    } catch {
      showToast("Could not copy referral link.");
    }
  };

  // --------------------------------
  // Navigation
  // --------------------------------

  const navigation = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "mine", label: "Mine", icon: "⛏" },
    { id: "tasks", label: "Tasks", icon: "✓" },
    { id: "referrals", label: "Refer", icon: "👥" },
    { id: "wallet", label: "Wallet", icon: "◈" },
  ];

  if (!mounted) {
    return (
      <main style={styles.loading}>
        <div style={styles.loadingLogo}>Z</div>
        <div>Loading ZEPTO...</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      {/* Header */}

      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>Z</div>

          <div>
            <div style={styles.brand}>ZEPTO</div>
            <div style={styles.brandSub}>Web3 Mining Network</div>
          </div>
        </div>

        <button
          type="button"
          style={styles.walletTop}
          onClick={() => setTab("wallet")}
        >
          {wallet ? shortenAddress(wallet) : "Connect Wallet"}
        </button>
      </header>

      {/* Main */}

      <section style={styles.container}>
        {tab === "home" && (
          <>
            <div style={styles.hero}>
              <div>
                <div style={styles.eyebrow}>DECENTRALIZED REWARDS</div>

                <h1 style={styles.title}>
                  Mine Z-Points.
                  <br />
                  Build your future.
                </h1>

                <p style={styles.description}>
                  Earn ZEPTO points through daily mining, tasks and
                  referrals.
                </p>

                <div style={styles.heroButtons}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={() => setTab("mine")}
                  >
                    Start Mining →
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setTab("tasks")}
                  >
                    Earn More
                  </button>
                </div>
              </div>

              <div style={styles.balanceCard}>
                <div style={styles.cardLabel}>TOTAL Z-POINTS</div>

                <div style={styles.balanceNumber}>{formatNumber(balance)}</div>

                <div style={styles.balanceUnit}>ZP</div>

                <div style={styles.miniStats}>
                  <div>
                    <span>Mining Rate</span>
                    <strong>{miningRate} ZP/h</strong>
                  </div>

                  <div>
                    <span>Session</span>
                    <strong>24 Hours</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.grid}>
              <StatCard
                title="Mining Status"
                value={session ? "ACTIVE" : "READY"}
                description={
                  session ? formatTime(timeLeft) : "Start a new session"
                }
                icon="⛏"
              />

              <StatCard
                title="Tasks"
                value={`${
                  tasks.filter((t) => t.status === "completed").length
                }/${tasks.length}`}
                description="Completed"
                icon="✓"
              />

              <StatCard
                title="Referrals"
                value="0"
                description="Friends invited"
                icon="👥"
              />
            </div>
          </>
        )}

        {tab === "mine" && (
          <MiningPage
            balance={balance}
            session={session}
            timeLeft={timeLeft}
            progress={progress}
            sessionEarned={sessionEarned}
            miningRate={miningRate}
            onStart={startMining}
            onStop={stopMining}
          />
        )}

        {tab === "tasks" && (
          <TasksPage tasks={tasks} onComplete={completeTask} />
        )}

        {tab === "referrals" && (
          <ReferralPage
            link={referralLink}
            code={referralCode}
            onCopy={copyReferral}
          />
        )}

        {tab === "wallet" && (
          <WalletPage
            wallet={wallet}
            chainId={chainId}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        )}
      </section>

      {/* Bottom Navigation */}

      <nav style={styles.bottomNav}>
        {navigation.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              ...styles.navButton,
              ...(tab === item.id ? styles.navButtonActive : {}),
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Toast */}

      {toast && <div style={styles.toast}>{toast}</div>}
    </main>
  );
}

// ==================================
// Stat Card
// ==================================

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <div style={styles.cardLabel}>{title}</div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statDescription}>{description}</div>
      </div>
    </div>
  );
}

// ==================================
// Mining Page
// ==================================

function MiningPage({
  balance,
  session,
  timeLeft,
  progress,
  sessionEarned,
  miningRate,
  onStart,
  onStop,
}: {
  balance: number;
  session: MiningSession | null;
  timeLeft: number;
  progress: number;
  sessionEarned: number;
  miningRate: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const circumference = 2 * Math.PI * 76;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.eyebrow}>MINING</div>
          <h2 style={styles.sectionTitle}>Daily Mining</h2>
          <p style={styles.description}>
            Mine Z-Points continuously for 24 hours.
          </p>
        </div>

        <div style={styles.rateBadge}>⚡ {miningRate} ZP/hour</div>
      </div>

      <div style={styles.miningCard}>
        <div style={{ ...styles.ringContainer, minWidth: 0 }}>
          {/* FIX: width/height set via CSS (with a maxWidth cap) instead of
              fixed HTML attributes, so the ring shrinks to fit narrow
              screens instead of forcing the grid column to overflow. */}
          <svg
            viewBox="0 0 172 172"
            style={{ width: "100%", maxWidth: 230, height: "auto" }}
          >
            <circle
              cx="86"
              cy="86"
              r="76"
              fill="none"
              stroke="rgba(255,255,255,.08)"
              strokeWidth="8"
            />

            <circle
              cx="86"
              cy="86"
              r="76"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 86 86)"
              style={styles.ringProgress}
            />
          </svg>

          <div style={styles.ringCenter}>
            <span>{session ? "MINING" : "READY"}</span>
            <strong>{session ? formatTime(timeLeft) : "24:00:00"}</strong>
          </div>
        </div>

        <div style={{ ...styles.miningInfo, minWidth: 0 }}>
          <div>
            <span>Current Balance</span>
            <strong>{formatNumber(balance)} ZP</strong>
          </div>

          <div>
            <span>Current Session</span>
            <strong>+{sessionEarned.toFixed(2)} ZP</strong>
          </div>

          <div>
            <span>Session Reward</span>
            <strong>+240 ZP</strong>
          </div>

          {!session ? (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={onStart}
            >
              ⛏ Start 24H Mining
            </button>
          ) : (
            <button
              type="button"
              style={styles.dangerButton}
              onClick={onStop}
            >
              Stop Mining
            </button>
          )}
        </div>
      </div>

      <div style={styles.infoBox}>
        <strong>How mining works</strong>
        <p>
          Start a 24-hour session and earn Z-Points automatically. You can
          close the website and return later—the fixed session timestamps
          keep the timer accurate.
        </p>
      </div>
    </div>
  );
}

// ==================================
// Tasks Page
// ==================================

function TasksPage({
  tasks,
  onComplete,
}: {
  tasks: Task[];
  onComplete: (id: string) => void;
}) {
  const totalReward = tasks.reduce(
    (sum, task) => sum + (task.status === "completed" ? task.reward : 0),
    0
  );

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.eyebrow}>EARN</div>
          <h2 style={styles.sectionTitle}>Social Tasks</h2>
          <p style={styles.description}>
            Complete tasks and earn additional Z-Points.
          </p>
        </div>
      </div>

      <div style={styles.taskSummary}>
        <span>Earned from tasks</span>
        <strong>+{totalReward} ZP</strong>
      </div>

      <div style={styles.taskList}>
        {tasks.map((task) => (
          <div key={task.id} style={styles.taskCard}>
            <div style={styles.taskIcon}>
              {task.status === "completed" ? "✓" : "✦"}
            </div>

            <div style={styles.taskContent}>
              <strong>{task.title}</strong>
              <span>+{task.reward} ZP</span>
            </div>

            <button
              type="button"
              disabled={task.status !== "idle"}
              style={{
                ...styles.taskButton,
                ...(task.status === "completed"
                  ? styles.taskCompleted
                  : {}),
              }}
              onClick={() => onComplete(task.id)}
            >
              {task.status === "completed"
                ? "Completed"
                : task.status === "pending"
                ? "Verifying..."
                : "Complete"}
            </button>
          </div>
        ))}
      </div>

      <div style={styles.demoWarning}>
        <strong>Demo mode</strong>
        <p>
          These social tasks are client-side demo tasks. Real X/Twitter
          verification must be done through a backend and OAuth/API
          verification.
        </p>
      </div>
    </div>
  );
}

// ==================================
// Referral Page
// ==================================

function ReferralPage({
  link,
  code,
  onCopy,
}: {
  link: string;
  code: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.eyebrow}>COMMUNITY</div>
          <h2 style={styles.sectionTitle}>Invite & Earn</h2>
          <p style={styles.description}>
            Invite friends and grow the ZEPTO community.
          </p>
        </div>
      </div>

      <div style={styles.referralCard}>
        <div style={styles.referralIcon}>👥</div>
        <h3>Your Referral Code</h3>
        <div style={styles.referralCode}>{code}</div>

        <p style={styles.description}>
          Share your referral link with friends.
        </p>

        <div style={styles.referralLink}>{link}</div>

        <button type="button" style={styles.primaryButton} onClick={onCopy}>
          Copy Referral Link
        </button>
      </div>

      <div style={styles.grid}>
        <StatCard
          title="Invited"
          value="0"
          description="Total friends"
          icon="👤"
        />

        <StatCard
          title="Active"
          value="0"
          description="Active referrals"
          icon="⚡"
        />

        <StatCard
          title="Bonus"
          value="0 ZP"
          description="Referral rewards"
          icon="🎁"
        />
      </div>
    </div>
  );
}

// ==================================
// Wallet Page
// ==================================

function WalletPage({
  wallet,
  chainId,
  onConnect,
  onDisconnect,
}: {
  wallet: string;
  chainId: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const network = getChainName(chainId);

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.eyebrow}>WEB3</div>
          <h2 style={styles.sectionTitle}>Wallet</h2>
          <p style={styles.description}>
            Connect your EVM wallet to your ZEPTO account.
          </p>
        </div>
      </div>

      {!wallet ? (
        <div style={styles.walletCard}>
          <div style={styles.walletLargeIcon}>◈</div>
          <h3>Connect your wallet</h3>

          <p style={styles.description}>
            MetaMask or another EVM compatible wallet can be connected.
          </p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={onConnect}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div style={styles.walletCard}>
          <div style={styles.connectedBadge}>● Connected</div>
          <h3>{shortenAddress(wallet)}</h3>

          <div style={styles.walletDetails}>
            <div>
              <span>Network</span>
              <strong>{network}</strong>
            </div>

            <div>
              <span>Chain ID</span>
              <strong>{chainId || "Unknown"}</strong>
            </div>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      )}

      <div style={styles.infoBox}>
        <strong>Important</strong>
        <p>
          Connecting a wallet here does not automatically create a
          blockchain transaction. Real token withdrawals require a secure
          backend and smart contract integration.
        </p>
      </div>
    </div>
  );
}

// ==================================
// Styles
// ==================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #172554 0%, #07111f 38%, #030712 100%)",
    color: "#f8fafc",
    paddingBottom: 100,
    fontFamily: "Inter, Arial, sans-serif",
    position: "relative",
    overflowX: "hidden",
  },

  backgroundGlow: {
    position: "fixed",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "rgba(59,130,246,.12)",
    filter: "blur(100px)",
    top: -250,
    right: -200,
    pointerEvents: "none",
  },

  header: {
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    background: "rgba(3,7,18,.72)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  logoRow: { display: "flex", alignItems: "center", gap: 12 },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 900,
    background: "linear-gradient(135deg,#60a5fa,#8b5cf6)",
    boxShadow: "0 10px 30px rgba(59,130,246,.25)",
  },

  brand: { fontWeight: 900, letterSpacing: 1.5, fontSize: 17 },

  brandSub: { fontSize: 10, color: "#94a3b8", marginTop: 2 },

  walletTop: {
    border: "1px solid rgba(96,165,250,.3)",
    background: "rgba(59,130,246,.12)",
    color: "#bfdbfe",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  },

  container: {
    width: "min(1100px, calc(100% - 32px))",
    margin: "0 auto",
    paddingTop: 45,
  },

  hero: {
    display: "grid",
    // FIX: auto-fit + minmax lets this collapse to one column on narrow
    // screens instead of squeezing two fixed-ratio columns and overflowing.
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 30,
    alignItems: "center",
  },

  eyebrow: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 2,
    marginBottom: 10,
  },

  title: {
    fontSize: "clamp(40px, 7vw, 72px)",
    lineHeight: 1.02,
    letterSpacing: -3,
    margin: 0,
    fontWeight: 900,
  },

  sectionTitle: { fontSize: 38, margin: 0, letterSpacing: -1.5 },

  description: { color: "#94a3b8", lineHeight: 1.7, maxWidth: 600 },

  heroButtons: { display: "flex", gap: 12, marginTop: 25, flexWrap: "wrap" },

  primaryButton: {
    border: 0,
    background: "linear-gradient(135deg,#3b82f6,#6366f1)",
    color: "white",
    padding: "13px 20px",
    borderRadius: 13,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(59,130,246,.2)",
  },

  secondaryButton: {
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.05)",
    color: "white",
    padding: "13px 20px",
    borderRadius: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  dangerButton: {
    border: 0,
    background: "rgba(239,68,68,.15)",
    color: "#fca5a5",
    padding: "13px 20px",
    borderRadius: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  balanceCard: {
    padding: 28,
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 25,
    background:
      "linear-gradient(145deg,rgba(30,41,59,.85),rgba(15,23,42,.75))",
    boxShadow: "0 25px 70px rgba(0,0,0,.25)",
  },

  cardLabel: { color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 },

  balanceNumber: { fontSize: 50, fontWeight: 900, letterSpacing: -2, marginTop: 10 },

  balanceUnit: { color: "#60a5fa", fontWeight: 800 },

  miniStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 25,
  },

  statCard: {
    padding: 20,
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    background: "rgba(15,23,42,.65)",
    display: "flex",
    gap: 15,
    alignItems: "center",
  },

  statIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    background: "rgba(59,130,246,.12)",
    display: "grid",
    placeItems: "center",
    fontSize: 20,
  },

  statValue: { fontSize: 23, fontWeight: 900, marginTop: 4 },

  statDescription: { color: "#64748b", fontSize: 12, marginTop: 2 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 15,
    marginTop: 25,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 25,
    gap: 20,
  },

  rateBadge: {
    padding: "10px 14px",
    borderRadius: 12,
    background: "rgba(34,197,94,.1)",
    border: "1px solid rgba(34,197,94,.2)",
    color: "#86efac",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  miningCard: {
    display: "grid",
    // FIX: same auto-fit approach as `hero` — stacks vertically once a
    // column would drop below ~240px instead of overflowing the viewport.
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 35,
    alignItems: "center",
    padding: 30,
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 25,
    background: "rgba(15,23,42,.75)",
  },

  ringContainer: { position: "relative", display: "grid", placeItems: "center" },

  ringProgress: {
    color: "#60a5fa",
    filter: "drop-shadow(0 0 8px rgba(96,165,250,.5))",
  },

  ringCenter: {
    position: "absolute",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  miningInfo: { display: "flex", flexDirection: "column", gap: 18 },

  infoBox: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    background: "rgba(59,130,246,.07)",
    border: "1px solid rgba(59,130,246,.14)",
    color: "#cbd5e1",
  },

  taskSummary: {
    display: "flex",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    background: "rgba(59,130,246,.08)",
    marginBottom: 15,
  },

  taskList: { display: "flex", flexDirection: "column", gap: 12 },

  taskCard: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    padding: 18,
    borderRadius: 17,
    background: "rgba(15,23,42,.75)",
    border: "1px solid rgba(255,255,255,.08)",
  },

  taskIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    background: "rgba(96,165,250,.1)",
    color: "#60a5fa",
  },

  taskContent: { flex: 1, display: "flex", flexDirection: "column", gap: 5 },

  taskButton: {
    border: 0,
    background: "rgba(59,130,246,.15)",
    color: "#93c5fd",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },

  taskCompleted: {
    background: "rgba(34,197,94,.1)",
    color: "#86efac",
    cursor: "default",
  },

  demoWarning: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    background: "rgba(234,179,8,.07)",
    border: "1px solid rgba(234,179,8,.15)",
    color: "#fde68a",
  },

  referralCard: {
    textAlign: "center",
    padding: 40,
    borderRadius: 25,
    background: "rgba(15,23,42,.75)",
    border: "1px solid rgba(255,255,255,.08)",
  },

  referralIcon: { fontSize: 45 },

  referralCode: { fontSize: 32, fontWeight: 900, margin: "15px 0", letterSpacing: 3 },

  referralLink: {
    maxWidth: 600,
    margin: "15px auto",
    padding: 14,
    borderRadius: 12,
    background: "rgba(255,255,255,.05)",
    color: "#94a3b8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  walletCard: {
    textAlign: "center",
    padding: 40,
    borderRadius: 25,
    background: "rgba(15,23,42,.75)",
    border: "1px solid rgba(255,255,255,.08)",
  },

  walletLargeIcon: { fontSize: 55, marginBottom: 15 },

  connectedBadge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: 20,
    background: "rgba(34,197,94,.1)",
    color: "#86efac",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 15,
  },

  walletDetails: {
    maxWidth: 450,
    margin: "25px auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  bottomNav: {
    position: "fixed",
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 50,
    display: "flex",
    justifyContent: "center",
    gap: 5,
    padding: 8,
    borderRadius: 20,
    background: "rgba(3,7,18,.88)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,.1)",
    boxShadow: "0 20px 60px rgba(0,0,0,.4)",
  },

  navButton: {
    border: 0,
    background: "transparent",
    color: "#64748b",
    padding: "9px 15px",
    borderRadius: 13,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
  },

  navButtonActive: { background: "rgba(59,130,246,.13)", color: "#93c5fd" },

  navIcon: { fontSize: 18 },

  toast: {
    position: "fixed",
    left: "50%",
    bottom: 90,
    transform: "translateX(-50%)",
    zIndex: 100,
    padding: "12px 18px",
    borderRadius: 13,
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 15px 40px rgba(0,0,0,.35)",
    color: "white",
    fontWeight: 700,
    fontSize: 13,
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 15,
    background: "#030712",
    color: "white",
    fontFamily: "Inter, Arial, sans-serif",
  },

  loadingLogo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 28,
    fontWeight: 900,
    background: "linear-gradient(135deg,#3b82f6,#6366f1)",
  },
};
