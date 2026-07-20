import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DashboardCard from '../components/DashboardCard';
import {
  Heart, Calendar, MapPin, Sparkles, Clock,
  CheckCircle, Phone, Mail, RefreshCw, X, ArrowRight, Package, Lock, Truck
} from 'lucide-react';

export default function NGODashboard({ user, tenant }) {
  const [tab, setTab] = useState('feed');
  const [allStock, setAllStock] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [incomingDonations, setIncomingDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [sortByDistance, setSortByDistance] = useState(true);

  const [reqItem, setReqItem] = useState(null);
  const [reqQty, setReqQty] = useState(1);
  const [reqPickup, setReqPickup] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [stock, myBookings, incoming] = await Promise.all([
        api.inventory.getAllBusiness(),
        api.marketplace.getBookings(tenant.id),
        api.marketplace.getIncomingDonations(tenant.id),
      ]);
      setAllStock(stock);
      setBookings(myBookings);
      setIncomingDonations(incoming);
    } catch (err) {
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const openRequest = (item) => {
    setReqItem(item);
    setReqQty(Math.min(item.quantity, 10));
    const d = new Date();
    d.setHours(d.getHours() + 4);
    setReqPickup(d.toISOString().slice(0, 16));
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await api.marketplace.requestDonation(tenant.id, reqItem.id, reqQty, new Date(reqPickup).toISOString());
      setReqItem(null);
      await loadData();
      setTab('bookings');
      setReqSuccess(res.message || `Request sent! Awaiting acceptance from the business.`);
      setTimeout(() => setReqSuccess(''), 6000);
    } catch (err) {
      alert(err.message || 'Request failed');
    }
  };

  const handleCompletePickup = async (bookingId) => {
    try {
      await api.marketplace.updateBookingStatus(bookingId, tenant.id, 'completed');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
  };

  // Haversine distance in km
  const haversine = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const myLat = tenant.latitude;
  const myLon = tenant.longitude;

  const filtered = allStock
    .filter(item => {
      const matchSearch = item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.donor_name || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'All' || item.category === catFilter;
      return matchSearch && matchCat;
    })
    .map(item => ({
      ...item,
      _distance: haversine(myLat, myLon, item.donor_latitude, item.donor_longitude),
    }))
    .sort((a, b) => {
      if (!sortByDistance) return 0;
      if (a._distance === null) return 1;
      if (b._distance === null) return -1;
      return parseFloat(a._distance) - parseFloat(b._distance);
    });

  const pendingCount = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const urgentCount = allStock.filter(i => i.days_to_expiry <= 2).length;
  const pendingDonations = incomingDonations.filter(d => d.status === 'pending').length;

  const handleDonationResponse = async (bookingId, status) => {
    try {
      await api.marketplace.updateBookingStatus(bookingId, tenant.id, status);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update');
    }
  };

  const statusColors = { pending: 'badge-orange', confirmed: 'badge-indigo', completed: 'badge-green', cancelled: 'badge-red' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{tenant.name}</h1>
          <p className="page-subtitle">Recipient Organization Dashboard</p>
        </div>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-rose)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {reqSuccess && (
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {reqSuccess}
        </div>
      )}

      {/* Delivery address notice */}
      {tenant.address && (
        <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid var(--accent-cyan)', borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '1.25rem', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
          <Truck size={15} />
          Food will be delivered to: <strong>{tenant.address}</strong>
        </div>
      )}

      <div className="stats-grid">
        <DashboardCard title="Available Stock Items" value={allStock.length} icon={Package} color="indigo" subtitle="From nearby businesses" />
        <DashboardCard title="Expiring Soon (≤2 days)" value={urgentCount} icon={Clock} color="rose" subtitle="Urgent — act fast" />
        <DashboardCard title="Pending Pickups" value={pendingCount} icon={Calendar} color="amber" subtitle="Awaiting confirmation" />
        <DashboardCard title="Completed Donations" value={completedCount} icon={CheckCircle} color="emerald" subtitle="Successfully received" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1rem' }}>
        {[['feed', 'Available Food Stock'], ['bookings', 'My Requests & Deliveries'], ['incoming', 'Incoming Donations']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: 'none', border: 'none', borderBottom: tab === key ? '2px solid var(--accent-emerald)' : 'none',
            color: tab === key ? 'var(--accent-emerald)' : 'var(--text-secondary)',
            padding: '0 0 0.75rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem',
          }}>
            {label}
            {key === 'bookings' && pendingCount > 0 && (
              <span style={{ background: 'var(--accent-amber)', color: '#000', borderRadius: '10px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', marginLeft: '0.3rem' }}>{pendingCount}</span>
            )}
            {key === 'incoming' && pendingDonations > 0 && (
              <span style={{ background: 'var(--accent-rose)', color: '#fff', borderRadius: '10px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', marginLeft: '0.3rem' }}>{pendingDonations}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <input className="form-control" placeholder="Search food or business name…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {['Dairy', 'Produce', 'Bakery', 'Meat', 'Pantry'].map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => setSortByDistance(s => !s)}
              style={{ padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: sortByDistance ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)', color: sortByDistance ? 'var(--accent-indigo)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              {sortByDistance ? 'Nearest First' : 'Default Order'}
            </button>
          </div>

          {!myLat && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid var(--accent-amber)', borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
              ⚠ No GPS location set. Go to Profile → Edit → GPS to enable distance sorting and see nearby businesses.
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No available stock found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filtered.map(item => {
                const urgent = item.days_to_expiry <= 2;
                const soon = item.days_to_expiry <= 5;
                const expiryBadge = urgent ? 'badge-red' : soon ? 'badge-orange' : 'badge-green';
                const isPrivate = item.donor_is_public === false;

                return (
                  <div key={item.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.product_name}</span>
                        <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-muted)' }}>{item.category}</span>
                        <span className={`badge ${expiryBadge}`}>
                          {item.days_to_expiry === 0 ? 'Expires today' : `${item.days_to_expiry}d left`}
                        </span>
                        {urgent && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', fontWeight: 700 }}>⚠ URGENT</span>}
                        {isPrivate && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                            <Lock size={11} /> Private
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <span><strong style={{ color: 'var(--text-primary)' }}>{item.quantity} {item.unit}</strong> available</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={13} style={{ color: 'var(--accent-indigo)' }} />
                          {isPrivate
                            ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Details hidden until accepted</span>
                            : <><strong style={{ color: 'var(--text-primary)' }}>{item.donor_name}</strong>{item.donor_address && ` · ${item.donor_address}`}</>
                          }
                        </span>
                        {item._distance && (
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.82rem' }}>
                            📍 {item._distance} km away
                          </span>
                        )}
                      </div>

                      {/* Donor contact — only shown if public */}
                      {!isPrivate && (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          {item.donor_phone && (
                            <a href={`tel:${item.donor_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                              <Phone size={13} /> {item.donor_phone}
                            </a>
                          )}
                          {item.donor_email && (
                            <a href={`mailto:${item.donor_email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--accent-indigo)', textDecoration: 'none' }}>
                              <Mail size={13} /> {item.donor_email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', alignSelf: 'center' }} onClick={() => openRequest(item)}>
                      Request <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No pickup requests yet. Browse the feed and request food donations.
            </div>
          ) : bookings.map(b => {
            const donor = b.listing?.tenant || {};
            const isAccepted = b.status === 'confirmed' || b.status === 'completed';
            const isPrivateDonor = donor.is_public === false;
            const showDonorDetails = !isPrivateDonor || isAccepted;

            return (
              <div key={b.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                  <div>
                    {/* Product + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{b.listing?.product_name}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{b.listing?.quantity} {b.listing?.unit}</span>
                      <span className={`badge ${statusColors[b.status] || 'badge-orange'}`}>{b.status}</span>
                    </div>

                    {/* Pickup time */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <Clock size={13} />
                      {new Date(b.pickup_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Donor details — revealed only after acceptance for private donors */}
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Donor</div>
                      {showDonorDetails ? (
                        <>
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{donor.name || '—'}</div>
                          {donor.address && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                              <MapPin size={12} /> {donor.address}
                            </div>
                          )}
                          {donor.contact_phone && (
                            <a href={`tel:${donor.contact_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none', marginBottom: '0.2rem' }}>
                              <Phone size={12} /> {donor.contact_phone}
                            </a>
                          )}
                          {donor.contact_email && (
                            <a href={`mailto:${donor.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--accent-indigo)', textDecoration: 'none' }}>
                              <Mail size={12} /> {donor.contact_email}
                            </a>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                          <Lock size={13} /> Donor details will be revealed once they accept your request
                        </div>
                      )}
                    </div>

                    {/* Delivery address — shown on confirmed/completed */}
                    {isAccepted && tenant.address && (
                      <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(6,182,212,0.08)', border: '1px solid var(--accent-cyan)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                        <Truck size={14} />
                        <span>Delivery to: <strong>{tenant.address}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                    {b.status === 'confirmed' && (
                      <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={() => handleCompletePickup(b.id)}>
                        <CheckCircle size={14} /> Mark Received
                      </button>
                    )}
                    {b.status === 'pending' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting business</span>}
                    {b.status === 'completed' && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem' }}>✓ Done</span>}
                    {b.status === 'cancelled' && <span style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>Cancelled</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incoming Donations from Individuals Tab */}
      {tab === 'incoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {incomingDonations.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No incoming donations yet. When an individual donates food to your NGO, it will appear here.
            </div>
          ) : incomingDonations.map(d => (
            <div key={d.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{d.listing?.product_name}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.listing?.quantity} {d.listing?.unit}</span>
                    <span className={`badge ${statusColors[d.status] || 'badge-orange'}`}>{d.status}</span>
                  </div>
                  {d.pickup_time && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <Clock size={13} />
                      Pickup by: {new Date(d.pickup_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {d.listing?.notes && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>📝 {d.listing.notes}</div>
                  )}
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>From (Individual Donor)</div>
                    <div style={{ fontWeight: 600 }}>{d.donor?.name || '—'}</div>
                    {d.donor?.address && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <MapPin size={12} /> {d.donor.address}
                      </div>
                    )}
                    {d.donor?.contact_phone && (
                      <a href={`tel:${d.donor.contact_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none', marginTop: '0.2rem' }}>
                        <Phone size={12} /> {d.donor.contact_phone}
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {d.status === 'pending' && (
                    <>
                      <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                        onClick={() => handleDonationResponse(d.id, 'confirmed')}>
                        <CheckCircle size={14} /> Accept
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                        onClick={() => handleDonationResponse(d.id, 'cancelled')}>
                        <X size={13} /> Decline
                      </button>
                    </>
                  )}
                  {d.status === 'confirmed' && (
                    <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                      onClick={() => handleDonationResponse(d.id, 'completed')}>
                      <CheckCircle size={14} /> Mark Received
                    </button>
                  )}
                  {d.status === 'completed' && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.82rem' }}>✓ Received</span>}
                  {d.status === 'cancelled' && <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Declined</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Donation Modal */}
      {reqItem && (
        <div className="modal-overlay">
          <form className="modal-content glass-panel animate-fade-in" onSubmit={handleRequest}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>Request Donation</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setReqItem(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{reqItem.product_name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {reqItem.category} · {reqItem.quantity} {reqItem.unit} available · expires in {reqItem.days_to_expiry}d
                </div>
                {reqItem.donor_is_public !== false && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{reqItem.donor_name}</div>
                    {reqItem.donor_address && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={12} /> {reqItem.donor_address}
                      </div>
                    )}
                    {reqItem.donor_phone && (
                      <a href={`tel:${reqItem.donor_phone}`} style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                        <Phone size={12} /> {reqItem.donor_phone}
                      </a>
                    )}
                    {reqItem.donor_email && (
                      <a href={`mailto:${reqItem.donor_email}`} style={{ fontSize: '0.8rem', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                        <Mail size={12} /> {reqItem.donor_email}
                      </a>
                    )}
                  </div>
                )}
                {reqItem.donor_is_public === false && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                    <Lock size={13} /> Business details revealed after acceptance
                  </div>
                )}
              </div>

              {/* Delivery address confirmation */}
              {tenant.address && (
                <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                  <Truck size={14} /> Delivery to: <strong>{tenant.address}</strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Quantity to Request (max: {reqItem.quantity} {reqItem.unit})</label>
                <input type="number" className="form-control" value={reqQty} min={0.1} max={reqItem.quantity} step="any"
                  onChange={e => setReqQty(parseFloat(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Proposed Pickup / Delivery Time</label>
                <input type="datetime-local" className="form-control" value={reqPickup}
                  onChange={e => setReqPickup(e.target.value)} required />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setReqItem(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Send Request to Business</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
