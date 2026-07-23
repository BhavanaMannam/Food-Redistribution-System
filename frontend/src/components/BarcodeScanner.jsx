import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, X, Check, RefreshCw, AlertCircle, Search, PackagePlus } from 'lucide-react';
import { api } from '../api';

// ── Open Food Facts lookup via backend proxy (avoids CORS) ──────────────────

function guessCategory(p) {
  const text = [...(p.categories_tags || []), p.product_name || ''].join(' ').toLowerCase();
  if (/milk|dairy|cheese|yogurt|butter|cream/.test(text)) return 'Dairy';
  if (/meat|chicken|beef|pork|fish|salmon|seafood/.test(text)) return 'Meat';
  if (/bread|bakery|cake|pastry|biscuit|cookie|muffin/.test(text)) return 'Bakery';
  if (/fruit|vegetable|produce|fresh|salad|spinach|banana/.test(text)) return 'Produce';
  return 'Pantry';
}

async function lookupOFF(barcode) {
  try {
    // Calls our FastAPI proxy → Open Food Facts (no CORS issue)
    return await api.barcodes.lookupOFF(barcode);
  } catch {
    return null;
  }
}

const EMPTY_FORM = {
  barcode: '', product_name: '', brand: '', category: 'Pantry',
  quantity: '', unit: 'units', manufacturing_date: '', expiry_date: '',
  description: '', image_url: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BarcodeScanner({ onClose, onScanSuccess }) {
  // phase: scanning | looking | found | notfound | addForm | error
  const [phase, setPhase] = useState('scanning');
  const [statusMsg, setStatusMsg] = useState('Starting camera…');
  const [product, setProduct] = useState(null);
  const [rawBarcode, setRawBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualLooking, setManualLooking] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const mountedRef = useRef(true);
  const scannedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    scannedRef.current = false;
    startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scanner ───────────────────────────────────────────────────────────────

  async function startScanner() {
    if (!mountedRef.current) return;
    setPhase('scanning');
    setStatusMsg('Requesting camera…');

    try {
      // Get available video devices
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (!mountedRef.current) return;

      if (!devices || devices.length === 0) {
        setPhase('error');
        setStatusMsg('No camera found on this device.');
        return;
      }

      // Prefer back/rear camera on mobile
      const device =
        devices.find(d => /back|rear|environment/i.test(d.label)) ||
        devices[devices.length - 1];

      setStatusMsg('Point camera at a barcode…');

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const controls = await reader.decodeFromVideoDevice(
        device.deviceId,
        videoRef.current,
        (result, err) => {
          if (!result) return;                  // NotFoundException on empty frames — ignore
          if (!mountedRef.current) return;
          if (scannedRef.current) return;       // prevent double-fire
          scannedRef.current = true;

          // Stop via ref — safe even if callback fires before await returns
          try { controlsRef.current?.stop(); } catch { /* ignore */ }
          controlsRef.current = null;
          readerRef.current = null;

          handleBarcode(result.getText());
        }
      );

      controlsRef.current = controls;
      if (readerRef.current) readerRef.current._controls = controls;
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn('[BarcodeScanner] init error:', err);
      setPhase('error');
      setStatusMsg('Camera unavailable — enter barcode manually below.');
    }
  }

  function stopScanner() {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch { /* ignore */ }
      readerRef.current = null;
    }
  }

  // ── Barcode resolution: local DB → Open Food Facts ────────────────────────

  async function handleBarcode(barcode) {
    if (!mountedRef.current) return;
    setRawBarcode(barcode);
    setPhase('looking');
    setStatusMsg(`Found: ${barcode} — searching…`);

    // 1. Local DB
    const local = await api.barcodes.getByBarcode(barcode).catch(() => null);
    if (!mountedRef.current) return;
    if (local) { setProduct(local); setPhase('found'); return; }

    // 2. Open Food Facts
    setStatusMsg('Checking Open Food Facts…');
    const off = await lookupOFF(barcode);
    if (!mountedRef.current) return;
    if (off) { setProduct(off); setPhase('found'); return; }

    // 3. Not found
    setPhase('notfound');
    setManualBarcode(barcode);
  }

  // ── Rescan ────────────────────────────────────────────────────────────────

  function rescan() {
    stopScanner();
    setProduct(null);
    setRawBarcode('');
    setManualBarcode('');
    setSaveError('');
    setForm(EMPTY_FORM);
    scannedRef.current = false;
    startScanner();
  }

  // ── Manual lookup ─────────────────────────────────────────────────────────

  async function handleManualLookup(e) {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    stopScanner();
    setManualLooking(true);
    await handleBarcode(code);
    if (mountedRef.current) setManualLooking(false);
  }

  // ── Add-product form ──────────────────────────────────────────────────────

  function openAddForm() {
    setForm({ ...EMPTY_FORM, barcode: rawBarcode || manualBarcode });
    setSaveError('');
    setPhase('addForm');
  }

  const setField = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        ...form,
        quantity: form.quantity !== '' ? parseFloat(form.quantity) : null,
        manufacturing_date: form.manufacturing_date || null,
        expiry_date: form.expiry_date || null,
      };
      const saved = await api.barcodes.create(payload);
      if (!mountedRef.current) return;
      setProduct(saved);
      setPhase('found');
    } catch (err) {
      if (!mountedRef.current) return;
      setSaveError(err.message || 'Failed to save product');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  // ── Import to inventory ───────────────────────────────────────────────────

  function confirmImport() {
    if (!product || !onScanSuccess) return;
    onScanSuccess({
      barcode: product.barcode,
      name: product.product_name,
      brand: product.brand || '',
      category: product.category || 'Pantry',
      unit: product.unit || 'units',
      shelfLife: product.expiry_date
        ? Math.max(1, Math.round((new Date(product.expiry_date) - Date.now()) / 86400000))
        : 7,
      price: 0,
      imageUrl: product.image_url || null,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showCamera = !['found', 'addForm'].includes(phase);

  return (
    <div style={{ padding: '1.5rem', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
          <Camera size={18} style={{ color: 'var(--accent-indigo)' }} /> Barcode Scanner
        </h4>
        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Camera viewfinder — always in DOM so videoRef stays valid */}
      <div style={{
        position: 'relative', borderRadius: '10px', overflow: 'hidden',
        background: '#000', marginBottom: '1rem',
        display: showCamera ? 'block' : 'none',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block' }}
        />

        {/* Scan-frame overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* Corner brackets */}
          <div style={{ position: 'relative', width: '70%', height: '120px' }}>
            {/* dark mask around the frame */}
            <div style={{
              position: 'absolute', inset: 0,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
              borderRadius: '6px',
            }} />
            {/* Animated laser line */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, var(--accent-indigo) 40%, #a78bfa 60%, transparent 100%)',
              animation: 'laserScan 1.8s ease-in-out infinite',
              borderRadius: '2px',
            }} />
            {/* Corner marks */}
            {[
              { top: 0, left: 0, borderTop: '3px solid #818cf8', borderLeft: '3px solid #818cf8', borderRadius: '4px 0 0 0' },
              { top: 0, right: 0, borderTop: '3px solid #818cf8', borderRight: '3px solid #818cf8', borderRadius: '0 4px 0 0' },
              { bottom: 0, left: 0, borderBottom: '3px solid #818cf8', borderLeft: '3px solid #818cf8', borderRadius: '0 0 0 4px' },
              { bottom: 0, right: 0, borderBottom: '3px solid #818cf8', borderRight: '3px solid #818cf8', borderRadius: '0 0 4px 0' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.65)', padding: '0.45rem 0.75rem',
          fontSize: '0.78rem', color: '#fff', textAlign: 'center',
        }}>
          {phase === 'looking' ? `🔍 ${statusMsg}` : phase === 'error' ? `⚠️ ${statusMsg}` : `📷 ${statusMsg}`}
        </div>
      </div>

      <style>{`
        @keyframes laserScan {
          0%,100% { transform: translateY(-54px); opacity: 0.3; }
          50%      { transform: translateY(54px);  opacity: 1;   }
        }
      `}</style>

      {/* Not found / camera error */}
      {(phase === 'error' || phase === 'notfound') && (
        <div style={{ marginBottom: '1rem' }}>
          {phase === 'notfound' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: 'var(--accent-amber)', fontSize: '0.85rem',
              marginBottom: '0.75rem', padding: '0.6rem 0.85rem',
              background: 'rgba(245,158,11,0.1)', borderRadius: '8px',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              <AlertCircle size={15} />
              Barcode <strong>{rawBarcode}</strong> not found in any database. Add it manually.
            </div>
          )}

          <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-control"
              type="text"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              placeholder="Enter barcode number manually…"
              style={{ flex: 1 }}
              autoFocus
            />
            <button type="submit" className="btn btn-secondary" disabled={manualLooking} style={{ whiteSpace: 'nowrap' }}>
              <Search size={14} /> {manualLooking ? 'Looking…' : 'Lookup'}
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              onClick={openAddForm}>
              <PackagePlus size={14} /> Add Product Manually
            </button>
            <button className="btn btn-secondary"
              style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={rescan}>
              <RefreshCw size={14} /> Rescan
            </button>
          </div>
        </div>
      )}

      {/* Product found */}
      {phase === 'found' && product && (
        <div style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid var(--accent-emerald)',
          padding: '1.2rem', borderRadius: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '0.85rem' }}>
            <Check size={18} /> Product Detected
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.85rem' }}>
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.product_name}
                style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '4px', flexShrink: 0 }}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.85rem', alignContent: 'start', flex: 1 }}>
              <Cell label="Product"><strong>{product.product_name}</strong></Cell>
              {product.brand      && <Cell label="Brand">{product.brand}</Cell>}
              <Cell label="Category">{product.category}</Cell>
              <Cell label="Barcode"><code style={{ fontSize: '0.78rem' }}>{product.barcode}</code></Cell>
              {product.quantity != null && <Cell label="Qty">{product.quantity} {product.unit}</Cell>}
              {product.expiry_date        && <Cell label="Expiry">{product.expiry_date}</Cell>}
              {product.manufacturing_date && <Cell label="Mfg">{product.manufacturing_date}</Cell>}
              {product.nutriscore && <Cell label="Nutri-Score"><span style={{ textTransform: 'uppercase', fontWeight: 700, color: { a: '#22c55e', b: '#84cc16', c: '#eab308', d: '#f97316', e: '#ef4444' }[product.nutriscore] || 'var(--text-primary)' }}>{product.nutriscore}</span></Cell>}
              {product.countries && <Cell label="Countries">{product.countries}</Cell>}
              {product.description && (
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ingredients / Description</span><br />
                  <span style={{ fontSize: '0.8rem' }}>{product.description}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onScanSuccess && (
              <button className="btn btn-success" style={{ flex: 1 }} onClick={confirmImport}>
                <Check size={15} /> Import to Inventory
              </button>
            )}
            <button className="btn btn-secondary" onClick={rescan} title="Scan again">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Add product form */}
      {phase === 'addForm' && (
        <form onSubmit={handleSave} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-indigo)' }}>
            <PackagePlus size={16} /> Add New Product
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Row>
              <F label="Barcode *"><input className="form-control" value={form.barcode} onChange={setField('barcode')} required /></F>
              <F label="Product Name *"><input className="form-control" value={form.product_name} onChange={setField('product_name')} required /></F>
            </Row>
            <Row>
              <F label="Brand"><input className="form-control" value={form.brand} onChange={setField('brand')} /></F>
              <F label="Category">
                <select className="form-control" value={form.category} onChange={setField('category')}>
                  {['Dairy', 'Produce', 'Bakery', 'Meat', 'Pantry'].map(c => <option key={c}>{c}</option>)}
                </select>
              </F>
            </Row>
            <Row>
              <F label="Quantity"><input className="form-control" type="number" step="0.01" min="0" value={form.quantity} onChange={setField('quantity')} /></F>
              <F label="Unit">
                <select className="form-control" value={form.unit} onChange={setField('unit')}>
                  {['units', 'kg', 'liters', 'boxes'].map(u => <option key={u}>{u}</option>)}
                </select>
              </F>
            </Row>
            <Row>
              <F label="Mfg Date"><input className="form-control" type="date" value={form.manufacturing_date} onChange={setField('manufacturing_date')} /></F>
              <F label="Expiry Date"><input className="form-control" type="date" value={form.expiry_date} onChange={setField('expiry_date')} /></F>
            </Row>
            <F label="Description">
              <textarea className="form-control" rows={2} value={form.description} onChange={setField('description')} style={{ resize: 'vertical' }} />
            </F>
            <F label="Image URL">
              <input className="form-control" type="url" value={form.image_url} onChange={setField('image_url')} placeholder="https://…" />
            </F>
          </div>

          {saveError && <div style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{saveError}</div>}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              <Check size={15} /> {saving ? 'Saving…' : 'Save to Database'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={rescan}>
              <X size={15} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Cell({ label, children }) {
  return (
    <div>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</span><br />
      {children}
    </div>
  );
}

function Row({ children }) {
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
