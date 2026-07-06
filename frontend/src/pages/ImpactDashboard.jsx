import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Leaf, Award, Utensils, PiggyBank, RefreshCw, BarChart2 } from 'lucide-react';

export default function ImpactDashboard({ tenant }) {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredWeek, setHoveredWeek] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch global impact analytics (if tenant is logged in, we fetch global metrics or can pass tenant.id for localized)
      const data = await api.analytics.getImpact(tenant?.id);
      setImpactData(data);
    } catch (err) {
      setError(err.message || 'Error loading sustainability metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !impactData) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Analyzing ESG metrics...</div>;
  }

  if (error) {
    return <div className="glass-panel" style={{ padding: '2rem', color: 'var(--accent-rose)' }}>{error}</div>;
  }

  const summary = impactData?.summary || {
    total_diverted_kg: 0.0,
    co2_saved_kg: 0.0,
    meals_redistributed: 0,
    total_value_saved_usd: 0.0
  };

  const weeklyTrend = impactData?.weekly_trend || [];
  const categoryBreakdown = impactData?.category_breakdown || [];

  // SVG Chart Dimensions & Calculations
  const chartWidth = 550;
  const chartHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  // Find max value in weekly trend to scale SVG height
  const maxDiverted = weeklyTrend.length > 0 ? Math.max(...weeklyTrend.map(w => w.diverted_kg)) * 1.2 : 100;

  const points = weeklyTrend.map((data, index) => {
    const divisor = weeklyTrend.length > 1 ? weeklyTrend.length - 1 : 1;
    const x = paddingX + (index / divisor) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (data.diverted_kg / maxDiverted) * (chartHeight - paddingY * 2);
    return { x, y, data, index };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  // Donut chart calculations
  const totalValue = categoryBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = [
    'var(--accent-indigo)',
    'var(--accent-cyan)',
    'var(--accent-emerald)',
    'var(--accent-amber)',
    'var(--accent-rose)'
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Leaf size={28} style={{ color: 'var(--accent-emerald)' }} />
            Sustainability Impact Dashboard
          </h1>
          <p className="page-subtitle">Diverting commercial food waste to ecological offsets & humanitarian benefits</p>
        </div>
        <button className="btn btn-secondary" onClick={loadData}>
          <RefreshCw size={16} /> Re-Calculate Impact
        </button>
      </div>

      {/* Hero impact summary */}
      <div className="glass-panel impact-hero">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={22} style={{ color: 'var(--accent-emerald)' }} />
          ResQFood Ecology Milestones
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {tenant ? `Aggregated metrics tracked for ${tenant.name}` : "Global community waste reduction ledger"}
        </p>

        <div className="impact-stats-large">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Food Waste Diverted</div>
            <div className="impact-stat-large-val">{summary.total_diverted_kg.toLocaleString()} kg</div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Rescued surplus inventory</span>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>CO2 Emissions Avoided</div>
            <div className="impact-stat-large-val" style={{ background: 'linear-gradient(135deg, #a5b4fc, var(--accent-indigo))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {summary.co2_saved_kg.toLocaleString()} kg
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Equivalent greenhouse offset</span>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>humanitarian meals served</div>
            <div className="impact-stat-large-val" style={{ background: 'linear-gradient(135deg, #67e8f9, var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {summary.meals_redistributed.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Redistributed nutrition</span>
          </div>
        </div>
      </div>

      {/* Grid splits */}
      <div className="dashboard-split">
        {/* Left Column: Line Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart2 size={18} style={{ color: 'var(--accent-indigo)' }} />
            Weekly Food Diversion Curve (kg)
          </h3>

          <div style={{ flexGrow: 1, position: 'relative' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              {/* Grid lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="var(--border-color)" strokeWidth={1} />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth={1} />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="var(--border-color)" strokeWidth={1} />

              {/* Area fill */}
              {areaPath && (
                <path 
                  d={areaPath} 
                  fill="url(#chart-gradient)" 
                  opacity={0.15} 
                />
              )}

              {/* Line path */}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="var(--accent-indigo)" 
                  strokeWidth={3} 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {points.map((p, idx) => (
                <g key={idx} onMouseEnter={() => setHoveredWeek(p)} onMouseLeave={() => setHoveredWeek(null)}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={hoveredWeek?.index === idx ? 7 : 4} 
                    fill="var(--bg-secondary)" 
                    stroke="var(--accent-indigo)" 
                    strokeWidth={2}
                    style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                  />
                </g>
              ))}

              {/* X Axis Labels */}
              {points.map((p, idx) => (
                <text 
                  key={idx} 
                  x={p.x} 
                  y={chartHeight - 10} 
                  fontSize={10} 
                  fill="var(--text-muted)" 
                  textAnchor="middle"
                >
                  {p.data.week}
                </text>
              ))}

              {/* Y Axis Max Label */}
              <text x={10} y={paddingY + 4} fontSize={9} fill="var(--text-muted)">{Math.round(maxDiverted)}kg</text>
              <text x={10} y={chartHeight - paddingY + 4} fontSize={9} fill="var(--text-muted)">0kg</text>

              {/* Tooltip render */}
              {hoveredWeek && (
                <g transform={`translate(${Math.min(chartWidth - 110, Math.max(10, hoveredWeek.x - 50))}, ${hoveredWeek.y - 45})`}>
                  <rect width={100} height={38} rx={6} fill="var(--bg-tertiary)" stroke="var(--border-color)" strokeWidth={1} />
                  <text x={50} y={15} fontSize={10} fontWeight="bold" fill="white" textAnchor="middle">{hoveredWeek.data.week}</text>
                  <text x={50} y={28} fontSize={10} fill="var(--accent-cyan)" textAnchor="middle">{hoveredWeek.data.diverted_kg} kg diverted</text>
                </g>
              )}

              {/* Definitions */}
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-indigo)" />
                  <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="chart-legend">
            <div className="chart-legend-item">
              <span className="chart-legend-color" style={{ background: 'var(--accent-indigo)' }}></span>
              <span>Diverted surplus inventory weekly trend</span>
            </div>
          </div>
        </div>

        {/* Right Column: Category Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Utensils size={18} style={{ color: 'var(--accent-emerald)' }} />
            Waste Category Share (kg)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flexGrow: 1, justifyContent: 'center' }}>
            {categoryBreakdown.map((item, idx) => {
              const percent = Math.round((item.value / totalValue) * 100);
              const color = colors[idx % colors.length];

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.value} kg ({percent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple economic stats */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <PiggyBank size={16} style={{ color: 'var(--accent-cyan)' }} />
              Estimated Sunk Costs Recovered:
            </span>
            <strong style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>
              ${summary.total_value_saved_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
