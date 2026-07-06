import React, { useState } from 'react';
import { api } from '../api';
import { Sparkles, Building2, Heart, ChevronLeft, MapPin, Lock, Globe } from 'lucide-react';

const BUSINESS_TYPES = ['Restaurant', 'Hotel', 'Supermarket', 'Cafeteria'];
const NGO_TYPES = ['NGO', 'Community Kitchen', 'Food Bank'];

export default function Login({ onLoginSuccess }) {
  const [portal, setPortal] = useState(null);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    username: '', password: '',
    email: '', org_name: '', org_type: '',
    location: '', phone: '',
    latitude: null, longitude: null,
    is_public: true,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const detectLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocating(false);
      },
      () => { alert('Could not get location. Please enter your address manually.'); setLocating(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.auth.login(form.username, form.password);
        onLoginSuccess(data);
      } else {
        const data = await api.auth.register({
          username: form.username,
          password: form.password,
          email: form.email,
          org_name: form.org_name,
          org_type: form.org_type,
          portal,
          location: form.location,
          phone: form.phone,
          latitude: form.latitude,
          longitude: form.longitude,
          is_public: form.is_public,
        });
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!portal) {
    return (
      <div className="auth-bg">
        <div className="glass-panel auth-card animate-fade-in" style={{ maxWidth: 480 }}>
          <div className="app-logo" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Sparkles size={26} style={{ color: 'var(--accent-indigo)' }} />
            <span>ResQFood AI</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.4rem' }}>Who are you?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '2rem' }}>Select your portal to continue.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="glass-panel" onClick={() => setPortal('business')}
              style={{ padding: '1.5rem 1rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '14px', textAlign: 'center', background: 'transparent' }}>
              <Building2 size={32} style={{ color: 'var(--accent-indigo)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>Business</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restaurants · Hotels<br />Supermarkets · Cafeterias</div>
            </button>
            <button className="glass-panel" onClick={() => setPortal('ngo')}
              style={{ padding: '1.5rem 1rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '14px', textAlign: 'center', background: 'transparent' }}>
              <Heart size={32} style={{ color: 'var(--accent-emerald)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>Recipient Org</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NGOs · Community Kitchens<br />Food Banks</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isBusiness = portal === 'business';
  const orgTypes = isBusiness ? BUSINESS_TYPES : NGO_TYPES;
  const accentColor = isBusiness ? 'var(--accent-indigo)' : 'var(--accent-emerald)';
  const PortalIcon = isBusiness ? Building2 : Heart;

  return (
    <div className="auth-bg">
      <div className="glass-panel auth-card animate-fade-in" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <button onClick={() => { setPortal(null); setError(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
            <ChevronLeft size={20} />
          </button>
          <PortalIcon size={22} style={{ color: accentColor }} />
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {isBusiness ? 'Business Portal' : 'Recipient Organization Portal'}
          </span>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px', marginBottom: '1.5rem' }}>
          {['login', 'register'].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
                background: mode === m ? accentColor : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-rose)', color: '#fca5a5', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {mode === 'register' && (
            <>
              <Field label="Organization Name" value={form.org_name} onChange={set('org_name')} placeholder="e.g. FreshMart" required />
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Organization Type</label>
                <select className="form-control" value={form.org_type} onChange={set('org_type')} required>
                  <option value="">Select type…</option>
                  {orgTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Address + GPS */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Delivery / Pickup Address</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" type="text" value={form.location} onChange={set('location')}
                    placeholder="e.g. 123 Main St, City" required style={{ flex: 1 }} />
                  <button type="button" onClick={detectLocation} disabled={locating}
                    style={{ padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    <MapPin size={14} style={{ verticalAlign: 'middle' }} /> {locating ? '…' : 'GPS'}
                  </button>
                </div>
                {form.latitude && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                    ✓ Location captured: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                  </div>
                )}
              </div>

              <Field label="Emergency Contact Phone" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" type="tel" required />
              <Field label="Email" value={form.email} onChange={set('email')} placeholder="you@org.com" type="email" required />

              {/* Privacy toggle — business only */}
              {isBusiness && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {form.is_public ? <Globe size={16} style={{ color: 'var(--accent-emerald)' }} /> : <Lock size={16} style={{ color: 'var(--accent-amber)' }} />}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{form.is_public ? 'Public Profile' : 'Private Profile'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {form.is_public ? 'Your details visible after order acceptance' : 'Your details hidden until order is accepted'}
                      </div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                      background: form.is_public ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: form.is_public ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    {form.is_public ? 'Set Private' : 'Set Public'}
                  </button>
                </div>
              )}
            </>
          )}

          <Field label="Username" value={form.username} onChange={set('username')} placeholder="your username" required />
          <Field label="Password" value={form.password} onChange={set('password')} type="password" required />

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.25rem', background: accentColor }}
            disabled={loading}>
            {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {isBusiness ? 'As a Business you can:' : 'As a Recipient Org you can:'}
          </p>
          <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1.1rem', margin: 0, lineHeight: '1.8' }}>
            {(isBusiness
              ? ['Manage inventory', 'Track expiry dates', 'View waste risk', 'Receive reorder recommendations', 'Donate surplus food', 'Control profile privacy']
              : ['View nearby food donations', 'Accept donations', 'Schedule deliveries to your address', 'Track received donations']
            ).map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <input className="form-control" type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} />
    </div>
  );
}
