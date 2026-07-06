import React from 'react';

export default function DashboardCard({ title, value, icon: Icon, color = 'indigo', subtitle }) {
  const colorMap = {
    indigo: { bg: 'rgba(99, 102, 241, 0.12)', text: 'var(--accent-indigo)' },
    emerald: { bg: 'rgba(16, 185, 129, 0.12)', text: 'var(--accent-emerald)' },
    amber: { bg: 'rgba(245, 158, 11, 0.12)', text: 'var(--accent-amber)' },
    rose: { bg: 'rgba(239, 68, 68, 0.12)', text: 'var(--accent-rose)' },
    cyan: { bg: 'rgba(6, 182, 212, 0.12)', text: 'var(--accent-cyan)' }
  };

  const style = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-panel stat-card animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
        <div className="stat-val">{value}</div>
        {subtitle && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
      </div>
      <div className="stat-icon-wrapper" style={{ backgroundColor: style.bg, color: style.text }}>
        {Icon && <Icon size={22} />}
      </div>
    </div>
  );
}
