'use client';

import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [balance, setBalance] = useState<number>(1250.50);
  const [isMining, setIsMining] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const baseRate = 10;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMining && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setBalance((prev) => prev + baseRate / 3600);
      }, 1000);
    } else if (timeLeft === 0 && isMining) {
      setIsMining(false);
    }
    return () => clearInterval(timer);
  }, [isMining, timeLeft]);

  const handleStartClaim = () => {
    setIsMining(true);
    setTimeLeft(24 * 3600);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-5 flex flex-col items-center font-sans">
      <header className="w-full max-w-sm flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="font-bold text-xl text-yellow-400">⚡ ZEPTO</div>
        <div className="bg-slate-900 border border-emerald-500 text-emerald-400 text-xs px-3 py-1 rounded-full">
          🛡️ Fingerprint Active
        </div>
      </header>

      <div className="w-full max-w-sm mt-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
        <span className="text-slate-400 text-sm">Total Balance</span>
        <div className="text-4xl font-extrabold text-amber-500 my-2">
          {balance.toFixed(2)} <span className="text-lg text-white">Z-Points</span>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg inline-block mb-4">
          🔥 Mining Speed: <strong>+10.0 Z-Points/h</strong>
        </div>

        <div className="w-full mt-3">
          {isMining ? (
            <div className="bg-slate-950 border border-amber-500 p-4 rounded-2xl">
              <span className="text-xs text-amber-500 font-bold block mb-1">SESSION ACTIVE</span>
              <span className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <button
              onClick={handleStartClaim}
              className="w-full py-4 bg-amber-500 text-slate-950 font-bold text-lg rounded-2xl cursor-pointer hover:bg-amber-400 transition-colors"
            >
              Claim Z-Points (24h)
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block">👥 Referrals</span>
          <span className="text-lg font-bold">12 Active</span>
          <span className="text-[10px] text-emerald-400 block mt-1">+7% Lifetime Share</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block">🏆 Daily Streak</span>
          <span className="text-lg font-bold">Day 5/7</span>
          <span className="text-[10px] text-purple-400 block mt-1">+35% Bonus Active</span>
        </div>
      </div>
    </main>
  );
}
