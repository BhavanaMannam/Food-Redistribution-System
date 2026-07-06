import React, { useState } from 'react';
import { api } from '../api';
import { Building2, Heart, Phone, MapPin, Mail, User, Edit2, Save, X, Globe, Lock } from 'lucide-react';

export default function ProfilePage({ user, tenant, onTenantUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name || '',
    address: tenant.address || '',
    contact_phone: tenant.contact_phone || '',
    contact_email: tenant.contact_email || '',
    latitude: tenant.latitude || null,
    longitude: tenant.longitude || null,
    is_public: tenant.is_public !== false,
  });
  const [saved, setSaved] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const detectLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocating(false);
      },
      () => { alert('Could not get location.'); setLocating(false); }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.tenants.update(tenant.id, form);
      onTenantUpdate(updated);
      setEditing(false);
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
        {!editing && (
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Edit2 size={15} /> Edit Profile
          </button>
        )}
      </div>

      {saved && (
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
          ✓ Profile updated successfully
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

          {/* Privacy badge — business only */}
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

          {/* Location */}
          {(tenant.latitude || tenant.longitude) && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <MapPin size={12} /> GPS: {(tenant.latitude || 0).toFixed(4)}, {(tenant.longitude || 0).toFixed(4)}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Capabilities</div>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0, lineHeight: 2 }}>
              {(isBusiness
                ? ['Manage inventory', 'Track expiry dates', 'View waste risk', 'Reorder recommendations', 'Donate surplus food', 'Control profile privacy']
                : ['View nearby donations', 'Accept donations', 'Delivery to your address', 'Track received donations']
              ).map(c => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>

        {/* Right — editable details */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Organization Details</h3>
            {editing && (
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <ProfileField icon={Building2} label="Organization Name" value={form.name} onChange={set('name')} editing={editing} />

              {/* Address with GPS button */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  {isBusiness ? 'Pickup Address' : 'Delivery Address'}
                </label>
                {editing ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="form-control" type="text" value={form.address} onChange={set('address')}
                      placeholder={isBusiness ? 'e.g. 123 Main St, City' : 'Delivery address for food'} style={{ flex: 1 }} />
                    <button type="button" onClick={detectLocation} disabled={locating}
                      style={{ padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <MapPin size={13} style={{ verticalAlign: 'middle' }} /> {locating ? '…' : 'GPS'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.92rem' }}>
                    <MapPin size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: form.address ? 'var(--text-primary)' : 'var(--text-muted)' }}>{form.address || '—'}</span>
                  </div>
                )}
                {editing && form.latitude && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                    ✓ GPS: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                  </div>
                )}
              </div>

              <ProfileField icon={Phone} label="Emergency Contact Phone" value={form.contact_phone} onChange={set('contact_phone')} editing={editing} type="tel" placeholder="+1 555 000 0000" />
              <ProfileField icon={Mail} label="Contact Email" value={form.contact_email} onChange={set('contact_email')} editing={editing} type="email" placeholder="you@org.com" />

              {/* Privacy toggle — business only */}
              {isBusiness && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Profile Privacy</label>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isPublic ? <Globe size={16} style={{ color: 'var(--accent-emerald)' }} /> : <Lock size={16} style={{ color: 'var(--accent-amber)' }} />}
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isPublic ? 'Public' : 'Private'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {isPublic ? 'Contact details shown after order acceptance' : 'Contact details hidden until order accepted'}
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

            {/* Read-only user info */}
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

            {editing && (
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
