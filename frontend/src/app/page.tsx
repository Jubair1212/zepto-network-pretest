'use client';

import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [balance, setBalance] = useState<number>(1250.50);
  const [isMining, setIsMining] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
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

  // Connect Wallet Action (Mock/Web3 Ready)
  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(`${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`);
        }
      } catch (err) {
        alert("Wallet connection failed!");
      }
    } else {
      alert("Please install MetaMask or Web3 Wallet!");
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <main style={{ minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        
        {/* Top Navbar with Connect Wallet Button */}
        <header style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontWeight: 'bold', fontSize: '24px', color: '#facc15' }}>⚡ ZEPTO</div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleConnectWallet}
              style={{
                backgroundColor: walletAddress ? '#1e293b' : '#3b82f6',
                color: '#ffffff',
                border: walletAddress ? '1px solid #3b82f6' : 'none',
                padding: '8px 14px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {walletAddress ? `👛 ${walletAddress}` : '🔗 Connect Wallet'}
            </button>
          </div>
        </header>

        {/* Main Dashboard Card */}
        <div style={{ marginTop: '20px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '16px' }}>Total Balance</span>
          <div style={{ fontSize: '42px', fontWeight: '800', color: '#f59e0b', margin: '12px 0' }}>
            {balance.toFixed(2)} <span style={{ fontSize: '20px', color: 'white' }}>Z-Points</span>
          </div>

          <div style={{ fontSize: '14px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '8px 16px', borderRadius: '8px', display: 'inline-block', marginBottom: '20px' }}>
            🔥 Mining Speed: <strong>+10.0 Z-Points/h</strong>
          </div>

          <div style={{ width: '100%' }}>
            {isMining ? (
              <div style={{ backgroundColor: '#020617', border: '1px solid #f59e0b', padding: '20px', borderRadius: '16px' }}>
                <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>SESSION ACTIVE</span>
                <span style={{ fontSize: '28px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            ) : (
              <button
                onClick={handleStartClaim}
                style={{ width: '100%', padding: '18px', backgroundColor: '#f59e0b', color: '#020617', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '16px', cursor: 'pointer' }}
              >
                Claim Z-Points (24h)
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '20px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '16px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block' }}>👥 Referrals</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>12 Active</span>
            <span style={{ fontSize: '11px', color: '#34d399', display: 'block', marginTop: '4px' }}>+7% Lifetime Share</span>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '16px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block' }}>🏆 Daily Streak</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Day 5/7</span>
            <span style={{ fontSize: '11px', color: '#c084fc', display: 'block', marginTop: '4px' }}>+35% Bonus Active</span>
          </div>
        </div>

      </div>
    </main>
  );
}
