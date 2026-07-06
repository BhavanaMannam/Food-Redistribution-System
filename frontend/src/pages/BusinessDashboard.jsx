import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DashboardCard from '../components/DashboardCard';
import BarcodeScanner from '../components/BarcodeScanner';
import { 
  Plus, Upload, ShieldAlert, Sparkles, ShoppingBag, 
  Calendar, CheckCircle, RefreshCw, Trash2, BarChart3, X, MapPin, Phone, Truck, Lock, Globe
} from 'lucide-react';

export default function BusinessDashboard({ user, tenant }) {
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, forecasts, reorders, bookings
  const [inventory, setInventory] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forms states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [selectedItemForDonation, setSelectedItemForDonation] = useState(null);
  
  const [newItem, setNewItem] = useState({
    product_name: '',
    category: 'Dairy',
    quantity: 1,
    unit: 'units',
    purchase_price: 1.0,
    days_to_expiry: 7
  });

  const [newDonation, setNewDonation] = useState({
    quantity: 1,
    notes: '',
    pickup_hours: 4 // default 4 hours from now
  });

  const [matchingNGOs, setMatchingNGOs] = useState([]);
  const [selectedListingForMatch, setSelectedListingForMatch] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await api.inventory.getItems(tenant.id);
      setInventory(items);

      const risks = await api.predict.getWasteRisk(tenant.id);
      setPredictions(risks.predictions || []);

      const orders = await api.predict.getReorders(tenant.id);
      setReorders(orders.recommendations || []);

      const activeBookings = await api.marketplace.getBookings(tenant.id);
      setBookings(activeBookings);
    } catch (err) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Inventory
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + parseInt(newItem.days_to_expiry));
      
      const payload = {
        product_name: newItem.product_name,
        category: newItem.category,
        quantity: parseFloat(newItem.quantity),
        unit: newItem.unit,
        purchase_price: parseFloat(newItem.purchase_price),
        expiry_date: expiry.toISOString().split('T')[0],
      };
      
      await api.inventory.createItem(tenant.id, payload);
      setShowAddForm(false);
      setNewItem({
        product_name: '',
        category: 'Dairy',
        quantity: 1,
        unit: 'units',
        purchase_price: 1.0,
        days_to_expiry: 7
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    try {
      await api.inventory.deleteItem(itemId, tenant.id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  // CSV upload
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      await api.inventory.uploadCSV(tenant.id, file);
      loadData();
      alert("CSV imported successfully!");
    } catch (err) {
      alert(err.message || 'CSV Import failed. Make sure columns match guidelines.');
    } finally {
      setLoading(false);
    }
  };

  // Simulated POS sync
  const triggerPOSSync = async () => {
    const samplePOSPayload = [
      { product_name: "Whole Milk 1 Gallon", category: "Dairy", quantity: 10.0, purchase_price: 3.50, days_to_expiry: 6 },
      { product_name: "Organic Bananas", category: "Produce", quantity: 50.0, purchase_price: 1.20, days_to_expiry: 4 },
      { product_name: "Sourdough Bread Loaf", category: "Bakery", quantity: 15.0, purchase_price: 2.50, days_to_expiry: 2 }
    ];
    try {
      setLoading(true);
      const res = await api.inventory.syncPOS(tenant.id, samplePOSPayload);
      loadData();
      alert(res.message || "POS Sync Simulated Successfully!");
    } catch (err) {
      alert(err.message || 'POS Sync failed');
    } finally {
      setLoading(false);
    }
  };

  // QR Scan handler
  const handleScanSuccess = (scannedData) => {
    setNewItem({
      product_name: scannedData.name,
      category: scannedData.category,
      quantity: scannedData.unit === 'kg' ? 10.0 : 5,
      unit: scannedData.unit,
      purchase_price: scannedData.price,
      days_to_expiry: scannedData.shelfLife
    });
    setShowScan(false);
    setShowAddForm(true);
  };

  // Open listing donation modal
  const openDonationModal = (item) => {
    setSelectedItemForDonation(item);
    setNewDonation({
      quantity: item.current_stock || item.quantity,
      notes: 'Perfectly edible surplus stock.',
      pickup_hours: 4
    });
    setShowListForm(true);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      const now = new Date();
      const end = new Date();
      end.setHours(now.getHours() + parseInt(newDonation.pickup_hours));
      
      const payload = {
        inventory_item_id: selectedItemForDonation.id,
        product_name: selectedItemForDonation.product_name,
        category: selectedItemForDonation.category,
        quantity: parseFloat(newDonation.quantity),
        unit: selectedItemForDonation.unit,
        expiry_date: selectedItemForDonation.expiry_date,
        pickup_window_start: now.toISOString(),
        pickup_window_end: end.toISOString(),
        notes: newDonation.notes,
        status: "available"
      };

      const listing = await api.marketplace.createListing(tenant.id, payload);
      setShowListForm(false);
      loadData();
      
      // Immediately calculate matching NGOs
      setSelectedListingForMatch(listing);
      const matching = await api.marketplace.getMatchingNGOs(listing.id);
      setMatchingNGOs(matching);
    } catch (err) {
      alert(err.message || 'Failed to list surplus food');
    }
  };

  // Booking confirm/complete
  const handleUpdateBooking = async (bookingId, newStatus) => {
    try {
      await api.marketplace.updateBookingStatus(bookingId, tenant.id, newStatus);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update booking status');
    }
  };

  // Stats calculation
  const totalStockItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const highRiskCount = predictions.filter(p => p.waste_risk_score >= 70).length;
  const criticalExpiryCount = inventory.filter(item => {
    const days = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 2;
  }).length;
  const completedDonationsCount = bookings.filter(b => b.status === 'completed').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {tenant.name}
            {tenant.is_public === false
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)', fontWeight: 600 }}><Lock size={11} /> Private</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)', fontWeight: 600 }}><Globe size={11} /> Public</span>
            }
          </h1>
          <p className="page-subtitle">Business Management Dashboard & AI Engine</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={triggerPOSSync} disabled={loading}>
            <RefreshCw size={16} /> Sync POS API
          </button>
          <button className="btn btn-primary" onClick={() => { setShowScan(true); setShowAddForm(false); }}>
            <Plus size={16} /> Scan Barcode
          </button>
          <button className="btn btn-success" onClick={() => { setShowAddForm(true); setShowScan(false); }}>
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-rose)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="stats-grid">
        <DashboardCard 
          title="Total Inventory Stock" 
          value={`${totalStockItems.toFixed(0)} units`} 
          icon={ShoppingBag} 
          color="indigo" 
          subtitle="Active catalog items"
        />
        <DashboardCard 
          title="High Waste Risk Items" 
          value={highRiskCount} 
          icon={ShieldAlert} 
          color="rose" 
          subtitle="Flagged by AI Engine"
        />
        <DashboardCard 
          title="Expiring (≤ 2 days)" 
          value={criticalExpiryCount} 
          icon={Calendar} 
          color="amber" 
          subtitle="Requires urgent action"
        />
        <DashboardCard 
          title="Redistributed Bookings" 
          value={completedDonationsCount} 
          icon={CheckCircle} 
          color="emerald" 
          subtitle="Diverted from waste bins"
        />
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'inventory' ? 'active' : ''}`}
          style={{ background: 'none', color: activeTab === 'inventory' ? 'var(--accent-indigo)' : 'var(--text-secondary)', borderBottom: activeTab === 'inventory' ? '2px solid var(--accent-indigo)' : 'none', borderRadius: 0, paddingBottom: '0.75rem' }}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory Catalog
        </button>
        <button 
          className={`btn ${activeTab === 'forecasts' ? 'active' : ''}`}
          style={{ background: 'none', color: activeTab === 'forecasts' ? 'var(--accent-indigo)' : 'var(--text-secondary)', borderBottom: activeTab === 'forecasts' ? '2px solid var(--accent-indigo)' : 'none', borderRadius: 0, paddingBottom: '0.75rem' }}
          onClick={() => setActiveTab('forecasts')}
        >
          <Sparkles size={16} style={{ marginRight: '0.25rem', color: 'var(--accent-indigo)' }} />
          AI Waste Predictions
        </button>
        <button 
          className={`btn ${activeTab === 'reorders' ? 'active' : ''}`}
          style={{ background: 'none', color: activeTab === 'reorders' ? 'var(--accent-indigo)' : 'var(--text-secondary)', borderBottom: activeTab === 'reorders' ? '2px solid var(--accent-indigo)' : 'none', borderRadius: 0, paddingBottom: '0.75rem' }}
          onClick={() => setActiveTab('reorders')}
        >
          Smart Reorders
        </button>
        <button 
          className={`btn ${activeTab === 'bookings' ? 'active' : ''}`}
          style={{ background: 'none', color: activeTab === 'bookings' ? 'var(--accent-indigo)' : 'var(--text-secondary)', borderBottom: activeTab === 'bookings' ? '2px solid var(--accent-indigo)' : 'none', borderRadius: 0, paddingBottom: '0.75rem' }}
          onClick={() => setActiveTab('bookings')}
        >
          NGO Pickup Coordination
          {bookings.filter(b => b.status === 'pending').length > 0 && (
            <span style={{ marginLeft: '0.4rem', background: 'var(--accent-rose)', color: '#fff', borderRadius: '10px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
              {bookings.filter(b => b.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'inventory' && (
        <div className="glass-panel table-container">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Active Inventory</h3>
            
            {/* CSV Import Form */}
            <label className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
              <Upload size={14} /> Bulk Upload CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
            </label>
          </div>
          
          {inventory.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No inventory items found. Add items manually, scan barcodes, or import a CSV.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Purchase Cost</th>
                  <th>Expiry Date</th>
                  <th>Status Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const daysToExpiry = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                  let expiryClass = "badge-green";
                  if (daysToExpiry <= 2) expiryClass = "badge-red";
                  else if (daysToExpiry <= 5) expiryClass = "badge-orange";

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>${item.purchase_price.toFixed(2)}</td>
                      <td>{item.expiry_date}</td>
                      <td>
                        <span className={`badge ${expiryClass}`}>
                          {daysToExpiry <= 0 ? 'Expired' : `${daysToExpiry} days left`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-success" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => openDonationModal(item)}>
                            Donate
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'forecasts' && (
        <div className="glass-panel table-container">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-indigo)' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>AI Waste Risk Forecast Analysis</h3>
          </div>
          {predictions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Add inventory items to execute the time-series forecasting model.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock Level</th>
                  <th>Predicted 7-Day Demand</th>
                  <th>Days To Expiry</th>
                  <th>Waste Risk Score</th>
                  <th>Action Recommend</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, idx) => {
                  let gaugeColor = 'var(--accent-emerald)';
                  let badgeStyle = 'badge-green';
                  if (p.waste_risk_score >= 70) {
                    gaugeColor = 'var(--accent-rose)';
                    badgeStyle = 'badge-red';
                  } else if (p.waste_risk_score >= 35) {
                    gaugeColor = 'var(--accent-amber)';
                    badgeStyle = 'badge-orange';
                  }

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                      <td>{p.current_stock}</td>
                      <td>{p.predicted_7day_demand} units</td>
                      <td>{p.days_to_expiry} days</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '80px', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${p.waste_risk_score}%`, height: '100%', background: gaugeColor }}></div>
                          </div>
                          <span style={{ fontWeight: 600 }}>{p.waste_risk_score}%</span>
                          <span className={`badge ${badgeStyle}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>{p.risk_level}</span>
                        </div>
                      </td>
                      <td>
                        {p.waste_risk_score >= 35 ? (
                          <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                            const inventoryItem = inventory.find(i => i.product_name === p.product_name);
                            if (inventoryItem) openDonationModal({ ...p, id: inventoryItem.id });
                            else alert('Inventory item not found. Please refresh the page.');
                          }}>
                            Redistribute
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No action required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'reorders' && (
        <div className="glass-panel table-container">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Smart Replenishment Engine</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI generated purchasing recommendations to prevent stockouts while avoiding over-stocking waste.</span>
          </div>
          {reorders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              All product lines are optimally stocked. No reorder recommendations.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Predicted Demand (7 Days)</th>
                  <th>Recommended Reorder</th>
                  <th>Rationale</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reorders.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{r.product_name}</td>
                    <td>{r.category}</td>
                    <td>{r.current_stock}</td>
                    <td>{r.predicted_7day_demand}</td>
                    <td style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>+{r.recommended_reorder_qty}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.reason}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                        alert(`Reorder of ${r.recommended_reorder_qty} units of "${r.product_name}" processed through POS mock API!`);
                      }}>
                        Approve Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="glass-panel table-container">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Incoming NGO Requests & Deliveries</h3>
          </div>
          {bookings.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No incoming requests yet. NGOs will send requests when they need food from your inventory.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {bookings.map((booking) => {
                let bookingClass = 'badge-indigo';
                if (booking.status === 'completed') bookingClass = 'badge-green';
                else if (booking.status === 'cancelled') bookingClass = 'badge-red';
                const isAccepted = booking.status === 'confirmed' || booking.status === 'completed';
                const ngo = booking.ngo || {};

                return (
                  <div key={booking.id} style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                      <div>
                        {/* Product + status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700 }}>{booking.listing?.product_name || 'Surplus Item'}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{booking.listing?.quantity} {booking.listing?.unit}</span>
                          <span className={`badge ${bookingClass}`}>{booking.status}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            🕐 {new Date(booking.pickup_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* NGO details — always shown to business */}
                        <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Requesting Organization</div>
                          <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{ngo.name || '—'}</div>
                          {ngo.address && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                              <MapPin size={12} /> {ngo.address}
                            </div>
                          )}
                          {ngo.contact_phone && (
                            <a href={`tel:${ngo.contact_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                              <Phone size={12} /> {ngo.contact_phone}
                            </a>
                          )}
                        </div>

                        {/* Delivery address — shown after acceptance */}
                        {isAccepted && ngo.address && (
                          <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: 'rgba(6,182,212,0.08)', border: '1px solid var(--accent-cyan)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                            <Truck size={14} /> Deliver food to: <strong>{ngo.address}</strong>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {booking.status === 'pending' && (
                          <>
                            <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={() => handleUpdateBooking(booking.id, 'confirmed')}>
                              Accept & Reveal Details
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={() => handleUpdateBooking(booking.id, 'cancelled')}>
                              Reject
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={() => handleUpdateBooking(booking.id, 'completed')}>
                            <Truck size={14} /> Mark Delivered
                          </button>
                        )}
                        {booking.status === 'completed' && (
                          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <CheckCircle size={14} /> Delivered
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cancelled</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* NGO Proximity Matching Panel (Shown below listings creation) */}
      {selectedListingForMatch && matchingNGOs.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem', padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-indigo)' }} />
            AI NGO Proximity Matching Results
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Matched for listed item: <strong>{selectedListingForMatch.product_name}</strong> ({selectedListingForMatch.quantity} {selectedListingForMatch.unit})
          </p>
          <div className="table-container" style={{ margin: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>NGO Partner</th>
                  <th>Distance (Haversine)</th>
                  <th>Matching Categories</th>
                  <th>AI Match Score</th>
                  <th>Contact info</th>
                </tr>
              </thead>
              <tbody>
                {matchingNGOs.map((ngo) => {
                  let scoreClass = 'badge-green';
                  if (ngo.match_score < 50) scoreClass = 'badge-orange';
                  return (
                    <tr key={ngo.id}>
                      <td style={{ fontWeight: 600 }}>{ngo.name}</td>
                      <td>{ngo.distance_km} km</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {ngo.matching_categories.map((c, i) => (
                            <span key={i} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${scoreClass}`} style={{ fontWeight: 700 }}>{ngo.match_score}% Match</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div>{ngo.contact_email}</div>
                        <div>{ngo.contact_phone}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScan && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }}>
            <BarcodeScanner 
              onScanSuccess={handleScanSuccess} 
              onClose={() => setShowScan(false)} 
            />
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <form className="modal-content glass-panel" onSubmit={handleAddItem}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>Add New Catalog Item</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setShowAddForm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newItem.product_name}
                  onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                  required 
                  placeholder="e.g. Whole Milk 1 Gallon"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    <option value="Dairy">Dairy</option>
                    <option value="Produce">Produce</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Meat">Meat</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    required
                    placeholder="units, kg, liters"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-control" 
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    required
                    min="0.1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Price ($)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-control" 
                    value={newItem.purchase_price}
                    onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                    required
                    min="0.01"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Days to Expiry</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={newItem.days_to_expiry}
                  onChange={(e) => setNewItem({ ...newItem, days_to_expiry: e.target.value })}
                  required
                  min="1"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-success">Save Item</button>
            </div>
          </form>
        </div>
      )}

      {/* List Surplus Donation Modal */}
      {showListForm && selectedItemForDonation && (
        <div className="modal-overlay">
          <form className="modal-content glass-panel" onSubmit={handleCreateListing}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>List Surplus Food Donation</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setShowListForm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedItemForDonation.product_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category: {selectedItemForDonation.category} | Expiry: {selectedItemForDonation.expiry_date}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Listing Quantity (max: {selectedItemForDonation.current_stock || selectedItemForDonation.quantity})</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-control" 
                  value={newDonation.quantity}
                  onChange={(e) => setNewDonation({ ...newDonation, quantity: e.target.value })}
                  required 
                  max={selectedItemForDonation.current_stock || selectedItemForDonation.quantity}
                  min="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pickup Window (Hours from now)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={newDonation.pickup_hours}
                  onChange={(e) => setNewDonation({ ...newDonation, pickup_hours: e.target.value })}
                  required 
                  min="1"
                  max="48"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pickup Logistics Notes</label>
                <textarea 
                  className="form-control" 
                  value={newDonation.notes}
                  onChange={(e) => setNewDonation({ ...newDonation, notes: e.target.value })}
                  placeholder="e.g. Please bring cooler bags. Pickup at loading dock B."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowListForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Listing</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
