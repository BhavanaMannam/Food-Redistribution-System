import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useGPS } from '../hooks/useGPS';
import { Sparkles, Building2, Heart, ChevronLeft, MapPin, Lock, Globe, Search, Navigation } from 'lucide-react';

const BUSINESS_TYPES = ['Restaurant', 'Hotel', 'Supermarket', 'Cafeteria'];
const NGO_TYPES = ['NGO', 'Community Kitchen', 'Food Bank'];

export default function Login({ onLoginSuccess }) {
  const [portal, setPortal] = useState(null);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [locationResults, setLocationResults] = useState([]);
  const [searchingLoc, setSearchingLoc] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const searchTimeout = useRef(null);

  const gps = useGPS();

  const [form, setForm] = useState({
    username: '', password: '',
    email: '', org_name: '', org_type: '',
    location: '', phone: '',
    latitude: null, longitude: null,
    is_public: true,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Sync GPS result into form when hook resolves
  useEffect(() => {
    if (!gps.locating && gps.coords) {
      setForm(f => ({ ...f, latitude: gps.coords.lat, longitude: gps.coords.lng, location: gps.address || f.location }));
      if (gps.address) setLocationQuery(gps.address);
    }
  }, [gps.locating, gps.coords, gps.address]);

  const handleLocationSearch = (e) => {
    const q = e.target.value;
    setLocationQuery(q);
    setForm(f => ({ ...f, location: q }));
    clearTimeout(searchTimeout.current);
    if (q.length < 3) { setLocationResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingLoc(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`);
        const data = await res.json();
        setLocationResults(data);
      } catch { setLocationResults([]); }
      finally { setSearchingLoc(false); }
    }, 500);
  };

  const selectLocation = (place) => {
    setForm(f => ({ ...f, location: place.display_name, latitude: parseFloat(place.lat), longitude: parseFloat(place.lon) }));
    setLocationQuery(place.display_name);
    setLocationResults([]);
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
          <button onClick={() => { setPortal(null); setError(''); gps.stop(); }}
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

              {/* Address + GPS + Search */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Delivery / Pickup Address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={13} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input className="form-control" type="text" value={locationQuery}
                        onChange={handleLocationSearch}
                        placeholder="Search address or type manually…"
                        required style={{ paddingLeft: '2.1rem' }} />
                    </div>
                    {gps.locating ? (
                      <button type="button" onClick={gps.stop}
                        style={{ padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--accent-rose)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-rose)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Navigation size={13} /> Stop
                      </button>
                    ) : (
                      <button type="button" onClick={gps.start}
                        style={{ padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Navigation size={13} /> GPS
                      </button>
                    )}
                  </div>

                  {/* Search dropdown */}
                  {(locationResults.length > 0 || searchingLoc) && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                      {searchingLoc ? (
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Searching…</div>
                      ) : locationResults.map(place => (
                        <button key={place.place_id} type="button" onClick={() => selectLocation(place)}
                          style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <MapPin size={12} style={{ color: 'var(--accent-cyan)', marginTop: '0.15rem', flexShrink: 0 }} />
                          <span style={{ lineHeight: 1.4 }}>{place.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* GPS status + accuracy bar */}
                {gps.locating && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--accent-amber)', marginBottom: '0.2rem' }}>
                      <span><Navigation size={11} style={{ verticalAlign: 'middle' }} /> {gps.status}</span>
                      {gps.accuracy && <span style={{ color: gps.accuracyColor }}>±{gps.accuracy}m</span>}
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${gps.accuracyPct}%`, height: '100%', background: gps.accuracyColor, transition: 'width 0.4s ease' }} />
                    </div>
                    {gps.canAccept && (
                      <button type="button" onClick={gps.acceptCurrent}
                        style={{ marginTop: '0.35rem', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: `1px solid ${gps.accuracyColor}`, background: 'transparent', color: gps.accuracyColor, cursor: 'pointer' }}>
                        Use current location (±{gps.accuracy}m)
                      </button>
                    )}
                  </div>
                )}
                {!gps.locating && form.latitude && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={11} /> {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}{gps.accuracy ? ` ±${gps.accuracy}m` : ''}
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
              ? ['Manage inventory', 'Track expiry dates', 'View waste risk', 'Donate surplus food', 'Control profile privacy']
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
