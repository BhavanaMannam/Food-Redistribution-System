import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Clock, CheckCircle, XCircle, AlertCircle, Phone, MapPin } from 'lucide-react';

const STATUS_STYLE = {
  completed: { color: 'var(--accent-emerald)', icon: CheckCircle, badge: 'badge-green' },
  confirmed: { color: 'var(--accent-indigo)', icon: CheckCircle, badge: 'badge-indigo' },
  pending:   { color: 'var(--accent-amber)',  icon: AlertCircle, badge: 'badge-orange' },
  cancelled: { color: 'var(--accent-rose)',   icon: XCircle,     badge: 'badge-red' },
};

export default function HistoryPage({ tenant }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.history.get(tenant.id)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenant.id]);

  const filtered = filter === 'all' ? history : history.filter(h => h.status === filter);

  const stats = {
    total: history.length,
    completed: history.filter(h => h.status === 'completed').length,
    pending: history.filter(h => h.status === 'pending' || h.status === 'confirmed').length,
    cancelled: history.filter(h => h.status === 'cancelled').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transfer History</h1>
          <p className="page-subtitle">
            {tenant.type === 'business' ? 'All food donations you have made to recipient organizations' : 'All food donations you have received from businesses'}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Transfers', val: stats.total, color: 'var(--accent-indigo)' },
          { label: 'Completed', val: stats.completed, color: 'var(--accent-emerald)' },
          { label: 'In Progress', val: stats.pending, color: 'var(--accent-amber)' },
          { label: 'Cancelled', val: stats.cancelled, color: 'var(--accent-rose)' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid var(--border-color)',
              background: filter === f ? 'var(--accent-indigo)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transfers found.</div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Qty</th>
                <th>{tenant.type === 'business' ? 'Recipient Org' : 'Donor Business'}</th>
                <th>Contact</th>
                <th>Pickup Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const s = STATUS_STYLE[h.status] || STATUS_STYLE.pending;
                const Icon = s.icon;
                return (
                  <tr key={h.booking_id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{h.booking_id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{h.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.category}</div>
                    </td>
                    <td>{h.quantity} {h.unit}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{h.partner_name}</div>
                      {h.partner_address && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <MapPin size={11} /> {h.partner_address}
                        </div>
                      )}
                    </td>
                    <td>
                      {h.partner_phone && (
                        <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-cyan)' }}>
                          <Phone size={13} /> {h.partner_phone}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={13} />
                        {h.pickup_time ? new Date(h.pickup_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Requested: {h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Icon size={11} /> {h.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
