import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { Camera, X, Check, RefreshCw, AlertCircle, Search } from 'lucide-react';

// Category guesser from Open Food Facts categories/tags
function guessCategory(offProduct) {
  const text = [
    ...(offProduct.categories_tags || []),
    ...(offProduct.food_groups_tags || []),
    offProduct.product_name || '',
  ].join(' ').toLowerCase();

  if (/milk|dairy|cheese|yogurt|butter|cream/.test(text)) return 'Dairy';
  if (/meat|chicken|beef|pork|fish|salmon|seafood|poultry/.test(text)) return 'Meat';
  if (/bread|bakery|cake|pastry|biscuit|cookie|muffin/.test(text)) return 'Bakery';
  if (/fruit|vegetable|produce|fresh|salad|spinach|banana/.test(text)) return 'Produce';
  return 'Pantry';
}

function guessShelfLife(offProduct) {
  const cat = guessCategory(offProduct);
  const map = { Dairy: 7, Meat: 4, Bakery: 3, Produce: 5, Pantry: 180 };
  return map[cat];
}

function guessUnit(offProduct) {
  const q = (offProduct.quantity || '').toLowerCase();
  if (q.includes('kg') || q.includes('g')) return 'kg';
  if (q.includes('l') || q.includes('ml')) return 'liters';
  return 'units';
}

async function lookupBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  return {
    barcode,
    name: p.product_name || p.product_name_en || 'Unknown Product',
    brand: p.brands || '',
    category: guessCategory(p),
    price: 0,           // OFF doesn't have price — user fills it in
    unit: guessUnit(p),
    shelfLife: guessShelfLife(p),
    imageUrl: p.image_front_small_url || p.image_url || null,
    quantity: p.quantity || '',
  };
}

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const [phase, setPhase] = useState('scanning'); // scanning | found | notfound | error | manual
  const [statusMsg, setStatusMsg] = useState('Point camera at a barcode');
  const [scannedItem, setScannedItem] = useState(null);
  const [rawBarcode, setRawBarcode] = useState('');
  const [looking, setLooking] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualLooking, setManualLooking] = useState(false);
  const [manualError, setManualError] = useState('');

  // Manual fallback form
  const [manualForm, setManualForm] = useState({
    name: '', category: 'Dairy', price: '', unit: 'units', shelfLife: 7
  });

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    try {
      readerRef.current = new BrowserMultiFormatReader();
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      // Prefer back camera
      const device = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1];
      const deviceId = device?.deviceId;

      setPhase('scanning');
      setStatusMsg('Point camera at a barcode');

      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        async (result, err) => {
          if (result) {
            const code = result.getText();
            stopScanner();
            setRawBarcode(code);
            setLooking(true);
            setStatusMsg(`Decoded: ${code} — looking up product…`);
            setPhase('looking');
            try {
              const item = await lookupBarcode(code);
              setLooking(false);
              if (item) {
                setScannedItem(item);
                setPhase('found');
              } else {
                setPhase('notfound');
              }
            } catch {
              setLooking(false);
              setPhase('notfound');
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('Scan error:', err);
          }
        }
      );
    } catch (err) {
      console.warn('Camera error:', err);
      setPhase('error');
      setStatusMsg('Camera unavailable — enter barcode manually');
    }
  };

  const stopScanner = () => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
  };

  const rescan = () => {
    setPhase('scanning');
    setScannedItem(null);
    setRawBarcode('');
    setManualError('');
    startScanner();
  };

  const confirmScan = () => {
    if (scannedItem) onScanSuccess(scannedItem);
  };

  // Manual barcode lookup
  const handleManualLookup = async (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    setManualLooking(true);
    setManualError('');
    try {
      const item = await lookupBarcode(manualBarcode.trim());
      setManualLooking(false);
      if (item) {
        setScannedItem(item);
        setPhase('found');
      } else {
        setManualError('Product not found in database. Fill details manually below.');
        setPhase('manual');
      }
    } catch {
      setManualLooking(false);
      setManualError('Lookup failed. Fill details manually.');
      setPhase('manual');
    }
  };

  const confirmManual = () => {
    if (!manualForm.name.trim()) return;
    onScanSuccess({
      barcode: manualBarcode || rawBarcode || 'manual',
      name: manualForm.name,
      category: manualForm.category,
      price: parseFloat(manualForm.price) || 0,
      unit: manualForm.unit,
      shelfLife: parseInt(manualForm.shelfLife) || 7,
    });
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
          <Camera size={18} style={{ color: 'var(--accent-indigo)' }} />
          Barcode Scanner
        </h4>
        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Camera viewfinder — always mounted so ref is available */}
      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#000', marginBottom: '1rem', display: phase === 'found' || phase === 'manual' ? 'none' : 'block' }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }} />
        {/* Scan overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '70%', height: '100px', border: '2px solid rgba(99,102,241,0.8)', borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
          {/* Laser line */}
          <div style={{ position: 'absolute', width: '70%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent-indigo), transparent)',
            animation: 'laserScan 1.8s ease-in-out infinite', top: '50%' }} />
        </div>
        {/* Status bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#fff', textAlign: 'center' }}>
          {phase === 'looking' ? `🔍 ${statusMsg}` : phase === 'error' ? '⚠️ Camera unavailable' : `📷 ${statusMsg}`}
        </div>
      </div>

      {/* Laser animation */}
      <style>{`
        @keyframes laserScan {
          0%, 100% { transform: translateY(-40px); opacity: 0.4; }
          50% { transform: translateY(40px); opacity: 1; }
        }
      `}</style>

      {/* Camera error — manual barcode entry */}
      {(phase === 'error' || phase === 'notfound') && (
        <div style={{ marginBottom: '1rem' }}>
          {phase === 'notfound' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.6rem 0.85rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
              <AlertCircle size={15} /> Barcode <strong>{rawBarcode}</strong> not found in Open Food Facts. Enter it manually or fill details below.
            </div>
          )}
          <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="form-control" type="text" value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              placeholder="Enter barcode number…" style={{ flex: 1 }} />
            <button type="submit" className="btn btn-secondary" disabled={manualLooking} style={{ whiteSpace: 'nowrap' }}>
              <Search size={14} /> {manualLooking ? 'Looking…' : 'Lookup'}
            </button>
          </form>
          {manualError && <div style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', marginTop: '0.35rem' }}>{manualError}</div>}
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.82rem' }}
            onClick={() => setPhase('manual')}>
            Skip lookup — fill details manually
          </button>
        </div>
      )}

      {/* Found result */}
      {phase === 'found' && scannedItem && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid var(--accent-emerald)', padding: '1.2rem', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '0.85rem' }}>
            <Check size={18} /> Product Identified
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.85rem' }}>
            {scannedItem.imageUrl && (
              <img src={scannedItem.imageUrl} alt={scannedItem.name}
                style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '4px', flexShrink: 0 }} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.85rem', alignContent: 'start' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Product</span><br /><strong>{scannedItem.name}</strong></div>
              {scannedItem.brand && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Brand</span><br />{scannedItem.brand}</div>}
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Category</span><br />{scannedItem.category}</div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Barcode</span><br /><code style={{ fontSize: '0.78rem' }}>{scannedItem.barcode}</code></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unit</span><br />{scannedItem.unit}</div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Est. Shelf Life</span><br />{scannedItem.shelfLife} days</div>
            </div>
          </div>

          {/* Price — user must fill since OFF has no price */}
          <div className="form-group" style={{ margin: '0 0 0.85rem' }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Purchase Price ($) <span style={{ color: 'var(--accent-amber)', fontWeight: 400 }}>— required</span></label>
            <input className="form-control" type="number" step="0.01" min="0.01"
              value={scannedItem.price || ''}
              onChange={e => setScannedItem(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 3.50" />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={confirmScan} disabled={!scannedItem.price}>
              <Check size={15} /> Import to Inventory
            </button>
            <button className="btn btn-secondary" onClick={rescan} title="Scan again">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Manual entry fallback */}
      {phase === 'manual' && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.1rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Fill in product details manually:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Product Name</label>
              <input className="form-control" value={manualForm.name}
                onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Whole Milk 1 Gallon" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Category</label>
                <select className="form-control" value={manualForm.category}
                  onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}>
                  {['Dairy','Produce','Bakery','Meat','Pantry'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit</label>
                <select className="form-control" value={manualForm.unit}
                  onChange={e => setManualForm(f => ({ ...f, unit: e.target.value }))}>
                  {['units','kg','liters','boxes'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Purchase Price ($)</label>
                <input className="form-control" type="number" step="0.01" min="0.01"
                  value={manualForm.price}
                  onChange={e => setManualForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 3.50" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Days to Expiry</label>
                <input className="form-control" type="number" min="1"
                  value={manualForm.shelfLife}
                  onChange={e => setManualForm(f => ({ ...f, shelfLife: e.target.value }))} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={confirmManual} disabled={!manualForm.name.trim() || !manualForm.price}>
              <Check size={15} /> Add Item
            </button>
            <button className="btn btn-secondary" onClick={rescan}>
              <RefreshCw size={15} /> Rescan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
