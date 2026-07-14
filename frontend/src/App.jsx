import React, { useState } from 'react';
import Login from './pages/Login';
import BusinessDashboard from './pages/BusinessDashboard';
import NGODashboard from './pages/NGODashboard';
import ImpactDashboard from './pages/ImpactDashboard';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import {
  Building2, Heart, Leaf, LogOut, LayoutDashboard,
  Sparkles, History, UserCircle, Phone, MapPin
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLoginSuccess = (loginData) => {
    setSession(loginData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentPage('dashboard');
  };

  const handleTenantUpdate = (updatedTenant) => {
    setSession(s => ({ ...s, tenant: { ...s.tenant, ...updatedTenant } }));
  };

  if (!session) return <Login onLoginSuccess={handleLoginSuccess} />;

  const { user, tenant } = session;
  const isBusiness = tenant.type === 'business';
  const accentColor = isBusiness ? 'var(--accent-indigo)' : 'var(--accent-emerald)';

  const navItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'impact',    icon: Leaf,            label: 'Our Impact' },
    { key: 'history',  icon: History,          label: 'Transfer History' },
    { key: 'profile',  icon: UserCircle,       label: 'Profile' },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="app-logo">
          <Sparkles size={24} style={{ color: 'var(--accent-indigo)' }} />
          <span>ResQFood</span>
        </div>

        {/* Portal badge */}
        <div style={{ margin: '0 0.5rem 1rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: `${accentColor}18`, border: `1px solid ${accentColor}44`, fontSize: '0.75rem', fontWeight: 600, color: accentColor, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isBusiness ? <Building2 size={13} /> : <Heart size={13} />}
          {isBusiness ? 'Business Portal' : 'Recipient Portal'}
        </div>

        <ul className="nav-menu">
          {navItems.map(({ key, icon: Icon, label }) => (
            <li
              key={key}
              className={`nav-item ${currentPage === key ? 'active' : ''}`}
              onClick={() => setCurrentPage(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        {/* User / org footer */}
        <div className="user-profile-section" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', cursor: 'pointer' }} onClick={() => setCurrentPage('profile')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
            <div className="user-avatar">
              {isBusiness ? <Building2 size={16} /> : <Heart size={16} />}
            </div>
            <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
              <span className="user-name">{user.username}</span>
              <span className="user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tenant.name}>{tenant.name}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="btn btn-secondary"
              style={{ padding: '0.4rem', borderRadius: '8px', border: 'none', background: 'transparent', flexShrink: 0 }}
              title="Sign Out"
            >
              <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          {tenant.address && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', paddingLeft: '0.25rem' }}>
              <MapPin size={10} /> {tenant.address}
            </div>
          )}
          {tenant.contact_phone && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem', paddingLeft: '0.25rem' }}>
              <Phone size={10} /> {tenant.contact_phone}
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {currentPage === 'dashboard' && (
          isBusiness
            ? <BusinessDashboard user={user} tenant={tenant} />
            : <NGODashboard user={user} tenant={tenant} />
        )}
        {currentPage === 'impact' && <ImpactDashboard tenant={tenant} />}
        {currentPage === 'history' && <HistoryPage tenant={tenant} />}
        {currentPage === 'profile' && <ProfilePage user={user} tenant={tenant} onTenantUpdate={handleTenantUpdate} />}
      </main>
    </div>
  );
}
