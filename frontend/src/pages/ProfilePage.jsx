import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useGPS } from '../hooks/useGPS';
import { Building2, Heart, Phone, MapPin, Mail, User, Edit2, Save, X, Globe, Lock, Search, Eye, EyeOff, Navigation } from 'lucide-react';

export default function ProfilePage({ user, tenant, onTenantUpdate }) {
  const [step, setStep] = useState('view'); // 'view' | 'verify' | 'edit'
  const [saving, setSaving] = useState(false);
  const gps = useGPS();
  const [saved, setSaved] = useState(false);

  // Verification state
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showVerifyPw, setShowVerifyPw] = useState(false);

  // Location search state
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const searchTimeout = useRef(null);

  const [form, setForm] = useState({
    name: tenant.name || '',
    address: tenant.address || '',
    contact_phone: tenant.contact_phone || '',
    contact_email: tenant.contact_email || '',
    latitude: tenant.latitude || null,
    longitude: tenant.longitude || null,
    is_public: tenant.is_public !== false,
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Sync form if tenant prop changes
  useEffect(() => {
    setForm({
      name: tenant.name || '',
      address: tenant.address || '',
      contact_phone: tenant.contact_phone || '',
      contact_email: tenant.contact_email || '',
      latitude: tenant.latitude || null,
      longitude: tenant.longitude || null,
      is_public: tenant.is_public !== false,
    });
  }, [tenant]);

  // --- Verification ---
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifying(true);
    try {
      await api.auth.login(user.username, verifyPassword);
      setVerifyPassword('');
      setStep('edit');
    } catch {
      setVerifyError('Incorrect password. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const cancelEdit = () => {
    setStep('view');
    setVerifyPassword('');
    setVerifyError('');
    setLocationQuery('');
    setLocationResults([]);
    // Reset form to current tenant values
    setForm({
      name: tenant.name || '',
      address: tenant.address || '',
      contact_phone: tenant.contact_phone || '',
      contact_email: tenant.contact_email || '',
      latitude: tenant.latitude || null,
      longitude: tenant.longitude || null,
      is_public: tenant.is_public !== false,
    });
  };

  // Sync GPS result into form whenever hook resolves
  useEffect(() => {
    if (!gps.locating && gps.coords) {
      setForm(f => ({ ...f, latitude: gps.coords.lat, longitude: gps.coords.lng, address: gps.address || f.address }));
      if (gps.address) setLocationQuery(gps.address);
    }
  }, [gps.locating, gps.coords, gps.address]);

  // --- Location Search (Nominatim) ---
  const handleLocationSearch = (e) => {
    const q = e.target.value;
    setLocationQuery(q);
    setForm(f => ({ ...f, address: q }));
    clearTimeout(searchTimeout.current);
    if (q.length < 3) { setLocationResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingLocation(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`);
        const data = await res.json();
        setLocationResults(data);
      } catch { setLocationResults([]); }
      finally { setSearchingLocation(false); }
    }, 500);
  };

  const selectLocation = (place) => {
    setForm(f => ({ ...f, address: place.display_name, latitude: parseFloat(place.lat), longitude: parseFloat(place.lon) }));
    setLocationQuery(place.display_name);
    setLocationResults([]);
  };

  // --- Save ---
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.tenants.update(tenant.id, form);
      onTenantUpdate(updated);
      setStep('view');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const isBusiness = tenant.type === 'business';
  const accentColor = isBusiness ? 'var(--accent-indigo)' : 'var(--accent-emerald)';
  const PortalIcon = isBusiness ? Building2 : Heart;
  const isPublic = form.is_public !== false;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Profile</h1>
          <p className="page-subtitle">Manage your organization details, location, and privacy settings</p>
        </div>
        {step === 'view' && (
          <button className="btn btn-secondary" onClick={() => setStep('verify')}>
            <Edit2 size={15} /> Edit Profile
          </button>
        )}
      </div>

      {saved && (
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
          ✓ Profile updated successfully
        </div>
      )}

      {/* Password Verification Modal */}
      {step === 'verify' && (
        <div className="modal-overlay">
          <form className="modal-content glass-panel" onSubmit={handleVerify} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>Verify Identity</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={cancelEdit}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Enter your password to unlock profile editing.
              </p>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    type={showVerifyPw ? 'text' : 'password'}
                    value={verifyPassword}
                    onChange={e => setVerifyPassword(e.target.value)}
                    placeholder="Your account password"
                    autoFocus
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowVerifyPw(v => !v)}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                    {showVerifyPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {verifyError && (
                  <div style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '0.4rem' }}>{verifyError}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={verifying}>
                {verifying ? 'Verifying…' : 'Confirm & Edit'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem' }}>
        {/* Left — identity card */}
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${accentColor}22`, border: `2px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <PortalIcon size={32} style={{ color: accentColor }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.25rem' }}>{tenant.name}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{tenant.org_type}</div>
          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', background: `${accentColor}22`, color: accentColor, fontWeight: 600 }}>
            {isBusiness ? 'Business Portal' : 'Recipient Organization'}
          </span>

          {isBusiness && (
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px',
                background: isPublic ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                color: isPublic ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 600 }}>
                {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {isPublic ? 'Public Profile' : 'Private Profile'}
              </span>
            </div>
          )}

          {(tenant.latitude || tenant.longitude) && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <MapPin size={12} /> GPS: {(tenant.latitude || 0).toFixed(4)}, {(tenant.longitude || 0).toFixed(4)}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Capabilities</div>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0, lineHeight: 2 }}>
              {(isBusiness
                ? ['Manage inventory', 'Track expiry dates', 'View waste risk', 'Donate surplus food', 'Control profile privacy']
                : ['View nearby donations', 'Accept donations', 'Delivery to your address', 'Track received donations']
              ).map(c => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>

        {/* Right — editable details */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Organization Details</h3>
            {step === 'edit' && (
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={cancelEdit}>
                <X size={14} /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <ProfileField icon={Building2} label="Organization Name" value={form.name} onChange={set('name')} editing={step === 'edit'} />

              {/* Address with GPS + Search */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  {isBusiness ? 'Pickup Address' : 'Delivery Address'}
                </label>
                {step === 'edit' ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          className="form-control"
                          type="text"
                          value={locationQuery}
                          onChange={handleLocationSearch}
                          placeholder="Search address or type manually…"
                          style={{ paddingLeft: '2.1rem' }}
                        />
                      </div>
                      {gps.locating ? (
                        <button type="button" onClick={gps.stop}
                          style={{ padding: '0 0.85rem', borderRadius: '8px', border: '1px solid var(--accent-rose)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Navigation size={13} /> Stop
                        </button>
                      ) : (
                        <button type="button" onClick={gps.start}
                          style={{ padding: '0 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Navigation size={13} /> GPS
                        </button>
                      )}
                    </div>

                    {/* Search results dropdown */}
                    {(locationResults.length > 0 || searchingLocation) && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.25rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        {searchingLocation ? (
                          <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Searching…</div>
                        ) : (
                          locationResults.map((place) => (
                            <button key={place.place_id} type="button" onClick={() => selectLocation(place)}
                              style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              <MapPin size={13} style={{ color: 'var(--accent-cyan)', marginTop: '0.15rem', flexShrink: 0 }} />
                              <span style={{ lineHeight: 1.4 }}>{place.display_name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* GPS status */}
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
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.92rem' }}>
                    <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: form.address ? 'var(--text-primary)' : 'var(--text-muted)' }}>{form.address || '—'}</span>
                  </div>
                )}
              </div>

              <ProfileField icon={Phone} label="Contact Phone" value={form.contact_phone} onChange={set('contact_phone')} editing={step === 'edit'} type="tel" placeholder="+1 555 000 0000" />
              <ProfileField icon={Mail} label="Contact Email" value={form.contact_email} onChange={set('contact_email')} editing={step === 'edit'} type="email" placeholder="you@org.com" />

              {/* Privacy toggle — business only */}
              {isBusiness && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Profile Privacy</label>
                  {step === 'edit' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isPublic ? <Globe size={16} style={{ color: 'var(--accent-emerald)' }} /> : <Lock size={16} style={{ color: 'var(--accent-amber)' }} />}
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isPublic ? 'Public' : 'Private'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {isPublic ? 'Contact details visible after order acceptance' : 'Contact details hidden until order accepted'}
                          </div>
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                        style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          background: isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: isPublic ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {isPublic ? 'Set Private' : 'Set Public'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.92rem' }}>
                      {isPublic ? <Globe size={15} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} /> : <Lock size={15} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />}
                      <span style={{ color: isPublic ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {isPublic ? 'Public — details visible after acceptance' : 'Private — details hidden until acceptance'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Read-only account info */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Account</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{user.username}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {user.role} · ID: {user.id}</div>
                </div>
              </div>
            </div>

            {step === 'edit' && (
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }} disabled={saving}>
                <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, onChange, editing, type = 'text', placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>{label}</label>
      {editing ? (
        <input className="form-control" type={type} value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.92rem' }}>
          <Icon size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || '—'}</span>
        </div>
      )}
    </div>
  );
}
