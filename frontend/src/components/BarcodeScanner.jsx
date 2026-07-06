import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

const MOCK_BARCODES = [
  { barcode: "885012400122", name: "Whole Milk 1 Gallon", category: "Dairy", price: 3.50, unit: "units", shelfLife: 5 },
  { barcode: "034000002144", name: "Organic Bananas", category: "Produce", price: 1.20, unit: "kg", shelfLife: 4 },
  { barcode: "722252101004", name: "Greek Yogurt 500g", category: "Dairy", price: 2.00, unit: "units", shelfLife: 10 },
  { barcode: "075450096500", name: "Fresh Chicken Breasts", category: "Meat", price: 8.99, unit: "kg", shelfLife: 6 },
  { barcode: "011110038475", name: "Sourdough Bread Loaf", category: "Bakery", price: 2.50, unit: "units", shelfLife: 2 },
  { barcode: "041220194488", name: "Salmon Fillet", category: "Meat", price: 14.50, unit: "kg", shelfLife: 3 },
  { barcode: "071430000305", name: "Spinach Pre-packed", category: "Produce", price: 1.99, unit: "units", shelfLife: 5 }
];

export default function BarcodeScanner({ onScanSuccess, onClose }) {
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Start camera stream on mount
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prefer back camera
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraAccess(true);
        setIsScanning(true);
        
        // Simulate auto-detection of a random barcode after 3 seconds
        setTimeout(() => {
          triggerAutoScan();
        }, 3000);
      } else {
        setHasCameraAccess(false);
        setIsScanning(true);
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable: ", err);
      setHasCameraAccess(false);
      setIsScanning(true); // Still show scanner interface with list of mock barcodes
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const triggerAutoScan = () => {
    if (!streamRef.current) return; // Only autoscan if real camera is running
    // Pick a random mock barcode
    const randomItem = MOCK_BARCODES[Math.floor(Math.random() * MOCK_BARCODES.length)];
    handleBarcodeMatch(randomItem);
  };

  const handleBarcodeMatch = (item) => {
    stopCamera();
    setScannedItem(item);
  };

  const confirmScan = () => {
    if (scannedItem) {
      onScanSuccess(scannedItem);
    }
  };

  const resetScan = () => {
    setScannedItem(null);
    startCamera();
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', width: '100%', margin: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)' }}>
          <Camera size={18} style={{ color: 'var(--accent-indigo)' }} />
          Barcode / QR Scanner
        </h4>
        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {!scannedItem ? (
        <div>
          <div className="scanner-container">
            {hasCameraAccess ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }}
              />
            ) : (
              <div className="scanner-viewfinder">
                <span style={{ fontSize: '0.85rem' }}>Camera unavailable. Select a barcode below to simulate scan.</span>
              </div>
            )}
            <div className="scanner-laser"></div>
          </div>
          
          <div style={{ margin: '1rem 0' }}>
            <span className="form-label" style={{ fontSize: '0.78rem' }}>Simulation: Quick Select Barcode</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {MOCK_BARCODES.map((item) => (
                <button
                  key={item.barcode}
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => handleBarcodeMatch(item)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--accent-emerald)', padding: '1.2rem', borderRadius: '10px', animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '0.75rem' }}>
            <Check size={18} />
            Successfully Decoded Barcode!
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
            <div><strong>Product:</strong> {scannedItem.name}</div>
            <div><strong>Category:</strong> {scannedItem.category}</div>
            <div><strong>Price:</strong> ${scannedItem.price.toFixed(2)}</div>
            <div><strong>Barcode:</strong> {scannedItem.barcode}</div>
            <div><strong>Est. Shelf Life:</strong> {scannedItem.shelfLife} days</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-success" style={{ flexGrow: 1 }} onClick={confirmScan}>
              Import Details
            </button>
            <button className="btn btn-secondary" onClick={resetScan}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
