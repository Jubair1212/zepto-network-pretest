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
    <main style={{ backgroundColor: '#020617', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#facc15' }}>⚡ ZEPTO</div>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #10b981', color: '#34d399', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>
          🛡️ Fingerprint Active
        </div>
      </header>

      <div style={{ width: '100%', maxWidth: '400px', marginTop: '20px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '24px', textAlign: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Total Balance</span>
        <div style={{ fontSize: '36px', fontWeight: '800', color: '#f59e0b', margin: '10px 0' }}>
          {balance.toFixed(2)} <span style={{ fontSize: '18px', color: 'white' }}>Z-Points</span>
        </div>

        <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', display: 'inline-block', marginBottom: '15px' }}>
          🔥 Mining Speed: <strong>+10.0 Z-Points/h</strong>
        </div>

        <div style={{ width: '100%', marginTop: '15px' }}>
          {isMining ? (
            <div style={{ backgroundColor: '#020617', border: '1px solid #f59e0b', padding: '15px', borderRadius: '16px' }}>
              <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>SESSION ACTIVE</span>
              <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          ) : (
            <button
              onClick={handleStartClaim}
              style={{ width: '100%', padding: '16px', backgroundColor: '#f59e0b', color: '#020617', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '16px', cursor: 'pointer' }}
            >
              Claim Z-Points (24h)
            </button>
          )}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '15px', borderRadius: '16px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>👥 Referrals</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>12 Active</span>
          <span style={{ fontSize: '10px', color: '#34d399', display: 'block', marginTop: '2px' }}>+7% Lifetime Share</span>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '15px', borderRadius: '16px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>🏆 Daily Streak</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Day 5/7</span>
          <span style={{ fontSize: '10px', color: '#c084fc', display: 'block', marginTop: '2px' }}>+35% Bonus Active</span>
        </div>
      </div>
    </main>
  );
}
