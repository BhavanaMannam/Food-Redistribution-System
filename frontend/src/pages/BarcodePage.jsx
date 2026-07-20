import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import {
  Camera, Plus, Pencil, Trash2, RefreshCw, Search,
  PackageSearch, Check, X, AlertCircle,
} from 'lucide-react';

const EMPTY_FORM = {
  barcode: '', product_name: '', brand: '', category: 'Pantry',
  quantity: '', unit: 'units', manufacturing_date: '', expiry_date: '',
  description: '', image_url: '',
};

export default function BarcodePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Scanner overlay
  const [showScanner, setShowScanner] = useState(false);

  // Modal state: null | 'add' | 'edit'
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null); // product being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.barcodes.getAll();
      setProducts(data);
    } catch {
      setError('Failed to load barcode products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return !q || p.barcode.includes(q) || p.product_name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q);
  });

  // ── Form helpers ───────────────────────────────────────────────────────────

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = (prefill = {}) => {
    setForm({ ...EMPTY_FORM, ...prefill });
    setFormError('');
    setEditTarget(null);
    setModal('add');
  };

  const openEdit = (product) => {
    setForm({
      barcode: product.barcode,
      product_name: product.product_name,
      brand: product.brand || '',
      category: product.category || 'Pantry',
      quantity: product.quantity ?? '',
      unit: product.unit || 'units',
      manufacturing_date: product.manufacturing_date || '',
      expiry_date: product.expiry_date || '',
      description: product.description || '',
      image_url: product.image_url || '',
    });
    setFormError('');
    setEditTarget(product);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        quantity: form.quantity !== '' ? parseFloat(form.quantity) : null,
        manufacturing_date: form.manufacturing_date || null,
        expiry_date: form.expiry_date || null,
      };
      if (modal === 'add') {
        await api.barcodes.create(payload);
      } else {
        await api.barcodes.update(editTarget.id, payload);
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.barcodes.delete(deleteId);
      setDeleteId(null);
      load();
    } catch {
      setDeleteId(null);
    }
  };

  // ── Scanner callback ───────────────────────────────────────────────────────

  // When scanner finds a product not in DB, it opens the add form pre-filled
  const handleScanClose = () => setShowScanner(false);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackageSearch size={24} style={{ color: 'var(--accent-indigo)' }} />
            Barcode Products
          </h1>
          <p className="page-subtitle">Scan barcodes to look up products, or manage the catalogue manually</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15} /></button>
          <button className="btn btn-secondary" onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Camera size={15} /> Scan
          </button>
          <button className="btn btn-primary" onClick={() => openAdd()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rose)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.88rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="form-control" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by barcode, name or brand…" style={{ paddingLeft: '2.2rem' }} />
      </div>

      {/* Product table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading && products.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {search ? 'No products match your search.' : 'No barcode products yet. Scan or add one!'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {['Image','Barcode','Product','Brand','Category','Qty','Expiry',''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '6px', background: '#fff', padding: '2px' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PackageSearch size={16} style={{ color: 'var(--text-muted)' }} /></div>
                    }
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}><code style={{ fontSize: '0.78rem' }}>{p.barcode}</code></td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{p.product_name}</td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{p.brand || '—'}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{p.category || '—'}</span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{p.quantity != null ? `${p.quantity} ${p.unit}` : '—'}</td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{p.expiry_date || '—'}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-rose)' }} onClick={() => setDeleteId(p.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Scanner overlay */}
      {showScanner && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: 520, padding: 0 }}>
            <BarcodeScanner
              onClose={handleScanClose}
              onScanSuccess={(item) => {
                // If product not in DB yet, open add form pre-filled
                setShowScanner(false);
                openAdd({
                  barcode: item.barcode,
                  product_name: item.name || item.product_name || '',
                  brand: item.brand || '',
                  category: item.category || 'Pantry',
                  unit: item.unit || 'units',
                  image_url: item.imageUrl || item.image_url || '',
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div className="modal-overlay">
          <form className="modal-content glass-panel" onSubmit={handleSave} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={closeModal}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <TwoCol>
                <F label="Barcode *"><input className="form-control" value={form.barcode} onChange={set('barcode')} required disabled={modal === 'edit'} /></F>
                <F label="Product Name *"><input className="form-control" value={form.product_name} onChange={set('product_name')} required /></F>
              </TwoCol>
              <TwoCol>
                <F label="Brand"><input className="form-control" value={form.brand} onChange={set('brand')} /></F>
                <F label="Category">
                  <select className="form-control" value={form.category} onChange={set('category')}>
                    {['Dairy','Produce','Bakery','Meat','Pantry'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </F>
              </TwoCol>
              <TwoCol>
                <F label="Quantity"><input className="form-control" type="number" step="0.01" min="0" value={form.quantity} onChange={set('quantity')} /></F>
                <F label="Unit">
                  <select className="form-control" value={form.unit} onChange={set('unit')}>
                    {['units','kg','liters','boxes'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </F>
              </TwoCol>
              <TwoCol>
                <F label="Mfg Date"><input className="form-control" type="date" value={form.manufacturing_date} onChange={set('manufacturing_date')} /></F>
                <F label="Expiry Date"><input className="form-control" type="date" value={form.expiry_date} onChange={set('expiry_date')} /></F>
              </TwoCol>
              <F label="Description">
                <textarea className="form-control" rows={2} value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} />
              </F>
              <F label="Image URL">
                <input className="form-control" type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://…" />
              </F>
              {formError && <div style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>{formError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={15} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)' }}>Delete Product?</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>This will permanently remove the barcode record. This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }} onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TwoCol({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>{children}</div>;
}

function F({ label, children }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" style={{ fontSize: '0.78rem' }}>{label}</label>
      {children}
    </div>
  );
}
