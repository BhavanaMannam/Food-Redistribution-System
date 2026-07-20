import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DashboardCard from '../components/DashboardCard';
import {
  Heart, Users, MapPin, Phone, Mail, SlidersHorizontal,
  CheckCircle, Utensils, Clock, Truck, X, RefreshCw, Send
} from 'lucide-react';

export default function IndividualDashboard({ user, tenant }) {
  const [activeTab, setActiveTab] = useState('ngos');
  const [allNGOs, setAllNGOs] = useState([]);
  const [ngoFilter, setNgoFilter] = useState('');
  const [ngoDistFilter, setNgoDistFilter] = useState('all');
  const [myDonations, setMyDonations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [donateTarget, setDonateTarget] = useState(null);
  const [form, setForm] = useState({
    food_name: '', category: 'Produce', quantity: '', unit: 'units',
    notes: '', pickup_hours: 4,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ngos, donations] = await Promise.all([
        api.tenants.getNGOs(tenant.id),
        api.marketplace.getMyDonations(tenant.id),
      ]);
      setAllNGOs(ngos);
      setMyDonations(donations);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const openDonateModal = (ngo) => {
    setDonateTarget(ngo);
    setForm({ food_name: '', category: 'Produce', quantity: '', unit: 'units', notes: '', pickup_hours: 4 });
    setSubmitError('');
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.marketplace.donate(tenant.id, donateTarget.id, form);
      setDonateTarget(null);
      setActiveTab('history');
      loadData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to send donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = myDonations.filter(d => d.status === 'pending').length;
  const completedCount = myDonations.filter(d => d.status === 'completed').length;

  const filteredNGOs = allNGOs.filter(n => {
    const nameMatch = n.name.toLowerCase().includes(ngoFilter.toLowerCase());
    const distMatch = ngoDistFilter === 'all' || n.distance_km == null || n.distance_km <= parseFloat(ngoDistFilter);
    return nameMatch && distMatch;
  });

  const tabStyle = (key, color = 'var(--accent-amber)') => ({
    background: 'none', border: 'none',
    borderBottom: activeTab === key ? `2px solid ${color}` : 'none',
    color: activeTab === key ? color : 'var(--text-secondary)',
    padding: '0 0 0.75rem', cursor: 'pointer',
    fontWeight: activeTab === key ? 600 : 400,
    fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
  });

  const statusColors = { pending: 'badge-orange', confirmed: 'badge-indigo', completed: 'badge-green', cancelled: 'badge-red' };
  const statusLabel = { pending: '⏳ Awaiting NGO response', confirmed: '✓ Accepted by NGO', completed: '✓ Received', cancelled: '✗ Rejected by NGO' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Heart size={24} style={{ color: 'var(--accent-amber)' }} />
            Hi, {user.username} 👋
          </h1>
          <p className="page-subtitle">Share your extra food with nearby NGOs — it only takes a minute.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <DashboardCard title="Nearby NGOs" value={allNGOs.length} icon={Users} color="amber" subtitle="Ready to receive food" />
        <DashboardCard title="Pending Donations" value={pendingCount} icon={Clock} color="rose" subtitle="Awaiting NGO response" />
        <DashboardCard title="Completed Donations" value={completedCount} icon={CheckCircle} color="emerald" subtitle="Food successfully shared" />
        <DashboardCard title="Total Sent" value={myDonations.length} icon={Heart} color="indigo" subtitle="All time" />
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1.5rem' }}>
        <button style={tabStyle('ngos', 'var(--accent-amber)')} onClick={() => setActiveTab('ngos')}>
          <Users size={15} /> Nearby NGOs
        </button>
        <button style={tabStyle('history', 'var(--accent-emerald)')} onClick={() => setActiveTab('history')}>
          <CheckCircle size={15} /> My Donations
          {pendingCount > 0 && (
            <span style={{ background: 'var(--accent-rose)', color: '#fff', borderRadius: '10px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Nearby NGOs Tab */}
      {activeTab === 'ngos' && (
        <div className="glass-panel table-container">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.2rem' }}>Organizations Near You</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click "Donate Food" to send a request — the NGO will accept or reject it.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
              <input className="form-control" type="text" placeholder="Search by name…"
                value={ngoFilter} onChange={e => setNgoFilter(e.target.value)}
                style={{ width: 160, padding: '0.35rem 0.65rem', fontSize: '0.82rem' }} />
              <select className="form-control" value={ngoDistFilter} onChange={e => setNgoDistFilter(e.target.value)}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
                <option value="all">All distances</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="50">Within 50 km</option>
              </select>
            </div>
          </div>

          {filteredNGOs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No organizations found. Try adjusting the filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredNGOs.map(ngo => (
                <div key={ngo.id} style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{ngo.name}</span>
                      <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '20px', background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)' }}>
                        {ngo.org_type || 'NGO'}
                      </span>
                      {ngo.distance_km != null && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: ngo.distance_km <= 5 ? 'var(--accent-emerald)' : ngo.distance_km <= 15 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                          📍 {ngo.distance_km} km away
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {ngo.address && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {ngo.address}</span>}
                      {ngo.contact_phone && (
                        <a href={`tel:${ngo.contact_phone}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                          <Phone size={11} style={{ verticalAlign: 'middle' }} /> {ngo.contact_phone}
                        </a>
                      )}
                      {ngo.contact_email && <span><Mail size={11} style={{ verticalAlign: 'middle' }} /> {ngo.contact_email}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, var(--accent-amber), #d97706)', border: 'none', padding: '0.5rem 1.1rem', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={() => openDonateModal(ngo)}
                  >
                    <Heart size={14} /> Donate Food
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Donations Tab */}
      {activeTab === 'history' && (
        <div className="glass-panel table-container">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.2rem' }}>My Donations</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Track the status of food you've sent to NGOs.</p>
          </div>
          {myDonations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              You haven't donated anything yet. Go to "Nearby NGOs" and click Donate Food to get started!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {myDonations.map(d => (
                <div key={d.booking_id} style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}><Utensils size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{d.product_name}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.quantity} {d.unit}</span>
                      <span className={`badge ${statusColors[d.status] || 'badge-orange'}`}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <span>To: <strong style={{ color: 'var(--text-primary)' }}>{d.ngo_name}</strong></span>
                      {d.ngo_address && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {d.ngo_address}</span>}
                      <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                    {d.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>📝 {d.notes}</div>}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: d.status === 'confirmed' || d.status === 'completed' ? 'var(--accent-emerald)' : d.status === 'cancelled' ? 'var(--accent-rose)' : 'var(--accent-amber)', whiteSpace: 'nowrap' }}>
                    {statusLabel[d.status] || d.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Donate Modal */}
      {donateTarget && (
        <div className="modal-overlay">
          <form className="modal-content glass-panel animate-fade-in" onSubmit={handleDonate}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.2rem' }}>Donate Food</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Send size={13} style={{ color: 'var(--accent-amber)' }} />
                  Request to <strong style={{ color: 'var(--accent-amber)' }}>{donateTarget.name}</strong>
                  {donateTarget.distance_km != null && ` · ${donateTarget.distance_km} km away`}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDonateTarget(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{donateTarget.name}</div>
                {donateTarget.address && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={12} /> {donateTarget.address}
                  </div>
                )}
                {donateTarget.contact_phone && (
                  <a href={`tel:${donateTarget.contact_phone}`} style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', marginTop: '0.2rem' }}>
                    <Phone size={12} /> {donateTarget.contact_phone}
                  </a>
                )}
              </div>

              {submitError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-rose)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {submitError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Food Name</label>
                <input className="form-control" type="text" value={form.food_name}
                  onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))}
                  placeholder="e.g. Biryani, Birthday cake, Sandwiches…" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {['Produce', 'Dairy', 'Bakery', 'Meat', 'Pantry'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-control" value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {['units', 'kg', 'liters', 'boxes', 'plates'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-control" type="number" min="0.1" step="any"
                    value={form.quantity} placeholder="e.g. 5"
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Pickup within (hours)</label>
                  <input className="form-control" type="number" min="1" max="48"
                    value={form.pickup_hours}
                    onChange={e => setForm(f => ({ ...f, pickup_hours: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-control" rows="2" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Freshly cooked, vegetarian, packed in containers…" />
              </div>

              {tenant.address && (
                <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                  <Truck size={14} /> Pickup from: <strong>{tenant.address}</strong>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDonateTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}
                style={{ background: 'linear-gradient(135deg, var(--accent-amber), #d97706)', border: 'none' }}>
                <Send size={15} /> {submitting ? 'Sending…' : `Send Request to ${donateTarget.name}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
