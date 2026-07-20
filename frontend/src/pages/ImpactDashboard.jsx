import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Leaf, Utensils, Wind, IndianRupee, RefreshCw, TrendingUp } from 'lucide-react';

export default function ImpactDashboard({ tenant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredWeek, setHoveredWeek] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.analytics.getImpact(tenant?.id);
      setData(result);
    } catch (err) {
      setError('Could not load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading your good work…</div>;
  if (error) return <div className="glass-panel" style={{ padding: '2rem', color: 'var(--accent-rose)' }}>{error}</div>;

  const s = data?.summary || { total_diverted_kg: 0, co2_saved_kg: 0, meals_redistributed: 0, total_value_saved_inr: 0 };
  const weekly = data?.weekly_trend || [];
  const categories = data?.category_breakdown || [];

  // Simple line chart
  const W = 520, H = 180, px = 40, py = 24;
  const maxKg = weekly.length > 0 ? Math.max(...weekly.map(w => w.diverted_kg)) * 1.2 || 1 : 1;
  const pts = weekly.map((w, i) => {
    const div = weekly.length > 1 ? weekly.length - 1 : 1;
    return {
      x: px + (i / div) * (W - px * 2),
      y: H - py - (w.diverted_kg / maxKg) * (H - py * 2),
      w
    };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = pts.length > 0 ? `${line} L ${pts[pts.length-1].x} ${H-py} L ${pts[0].x} ${H-py} Z` : '';

  const totalCat = categories.reduce((s, c) => s + c.value, 0) || 1;
  const catColors = ['var(--accent-indigo)', 'var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-amber)', 'var(--accent-rose)'];

  const cards = [
    {
      icon: Leaf,
      color: 'var(--accent-emerald)',
      bg: 'rgba(16,185,129,0.1)',
      value: `${s.total_diverted_kg.toLocaleString()} kg`,
      label: 'Food Saved from Bin',
      desc: 'Total food that was rescued and given to people instead of being thrown away'
    },
    {
      icon: Utensils,
      color: 'var(--accent-cyan)',
      bg: 'rgba(6,182,212,0.1)',
      value: s.meals_redistributed.toLocaleString(),
      label: 'Meals Provided',
      desc: 'Number of meals that reached people who needed food'
    },
    {
      icon: Wind,
      color: 'var(--accent-indigo)',
      bg: 'rgba(99,102,241,0.1)',
      value: `${s.co2_saved_kg.toLocaleString()} kg`,
      label: 'Pollution Prevented',
      desc: "Amount of harmful gas that was NOT released into the air because food didn't rot in a landfill"
    },
    {
      icon: IndianRupee,
      color: 'var(--accent-amber)',
      bg: 'rgba(245,158,11,0.1)',
      value: `₹${s.total_value_saved_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      label: 'Value Saved / Distributed',
      desc: 'Estimated worth of food redistributed to the community instead of being wasted'
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Leaf size={26} style={{ color: 'var(--accent-emerald)' }} />
            Our Good Work So Far
          </h1>
          <p className="page-subtitle">
            {tenant ? `Here's what ${tenant.name} has achieved` : 'Here\'s what our community has achieved together'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* 4 simple stat cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {cards.map(({ icon: Icon, color, bg, value, label, desc }) => (
          <div key={label} className="glass-panel" style={{ padding: '1.5rem', borderTop: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-split">
        {/* Weekly chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={17} style={{ color: 'var(--accent-indigo)' }} /> Food Rescued Each Week
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>How many kg of food was saved from the bin each week</p>

          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
              <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-indigo)" />
                <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <line x1={px} y1={py} x2={W-px} y2={py} stroke="var(--border-color)" strokeWidth={1} />
            <line x1={px} y1={H/2} x2={W-px} y2={H/2} stroke="var(--border-color)" strokeWidth={1} />
            <line x1={px} y1={H-py} x2={W-px} y2={H-py} stroke="var(--border-color)" strokeWidth={1} />
            {area && <path d={area} fill="url(#ig)" opacity={0.18} />}
            {line && <path d={line} fill="none" stroke="var(--accent-indigo)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
            {pts.map((p, i) => (
              <g key={i} onMouseEnter={() => setHoveredWeek(p)} onMouseLeave={() => setHoveredWeek(null)}>
                <circle cx={p.x} cy={p.y} r={hoveredWeek === p ? 7 : 4}
                  fill="var(--bg-secondary)" stroke="var(--accent-indigo)" strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.15s' }} />
                <text x={p.x} y={H - 6} fontSize={9} fill="var(--text-muted)" textAnchor="middle">{p.w.week}</text>
              </g>
            ))}
            <text x={8} y={py + 4} fontSize={9} fill="var(--text-muted)">{Math.round(maxKg)}kg</text>
            <text x={8} y={H - py + 4} fontSize={9} fill="var(--text-muted)">0</text>
            {hoveredWeek && (
              <g transform={`translate(${Math.min(W-110, Math.max(10, hoveredWeek.x - 50))}, ${hoveredWeek.y - 48})`}>
                <rect width={105} height={40} rx={6} fill="var(--bg-tertiary)" stroke="var(--border-color)" strokeWidth={1} />
                <text x={52} y={15} fontSize={10} fontWeight="bold" fill="white" textAnchor="middle">{hoveredWeek.w.week}</text>
                <text x={52} y={30} fontSize={10} fill="var(--accent-cyan)" textAnchor="middle">{hoveredWeek.w.diverted_kg} kg saved</text>
              </g>
            )}
          </svg>
        </div>

        {/* Category breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Utensils size={17} style={{ color: 'var(--accent-emerald)' }} /> What Type of Food Was Saved?
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Breakdown of food categories rescued</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map((item, i) => {
              const pct = Math.round((item.value / totalCat) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.value} kg &nbsp;·&nbsp; {pct}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: catColors[i % catColors.length], borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
