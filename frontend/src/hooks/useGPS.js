import { useState, useRef, useCallback } from 'react';

const EXCELLENT = 20;    // <=20m  auto-lock
const GOOD      = 100;   // <=100m show "Use This" button
const MAX_WAIT  = 20000; // 20s timeout

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await res.json();
    return d.display_name || null;
  } catch { return null; }
}

async function ipFallback() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const d = await res.json();
    if (d.latitude && d.longitude)
      return { latitude: d.latitude, longitude: d.longitude, accuracy: 5000 };
  } catch { /* ignore */ }
  return null;
}

export function useGPS() {
  const [locating,      setLocating]      = useState(false);
  const [accuracy,      setAccuracy]      = useState(null);
  const [coords,        setCoords]        = useState(null);
  const [address,       setAddress]       = useState('');
  const [status,        setStatus]        = useState('');
  const [canAccept,     setCanAccept]     = useState(false);

  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const bestRef  = useRef(null);

  const stop = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    clearTimeout(timerRef.current);
    watchRef.current = null;
    setLocating(false);
  }, []);

  const commitFix = useCallback(async (lat, lng, acc) => {
    stop();
    setAccuracy(Math.round(acc));
    setCoords({ lat, lng });
    setCanAccept(false);
    setStatus('Finding address…');
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr || '');
    setStatus(addr ? '\u2713 Location detected' : '\u2713 Coordinates captured');
  }, [stop]);

  const acceptCurrent = useCallback(() => {
    if (bestRef.current) {
      const { latitude, longitude, accuracy: acc } = bestRef.current;
      commitFix(latitude, longitude, acc);
    }
  }, [commitFix]);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setLocating(true);
      setStatus('GPS not supported — using network location…');
      ipFallback().then(p => {
        if (p) commitFix(p.latitude, p.longitude, p.accuracy);
        else { setStatus('Could not detect location.'); setLocating(false); }
      });
      return;
    }

    setLocating(true);
    setAccuracy(null);
    setCoords(null);
    setAddress('');
    setCanAccept(false);
    setStatus('Starting GPS…');
    bestRef.current = null;

    // Auto-stop after MAX_WAIT
    timerRef.current = setTimeout(() => {
      if (bestRef.current) {
        commitFix(bestRef.current.latitude, bestRef.current.longitude, bestRef.current.accuracy);
      } else {
        setStatus('GPS timed out — trying network…');
        ipFallback().then(p => {
          if (p) commitFix(p.latitude, p.longitude, p.accuracy);
          else { setStatus('Could not get location.'); setLocating(false); }
        });
      }
    }, MAX_WAIT);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const rounded = Math.round(acc);

        if (!bestRef.current || acc < bestRef.current.accuracy)
          bestRef.current = pos.coords;

        setAccuracy(rounded);
        setCoords({ lat: latitude, lng: longitude });

        if (acc <= EXCELLENT) {
          clearTimeout(timerRef.current);
          setStatus(`Excellent \u00b1${rounded}m — locking in…`);
          commitFix(latitude, longitude, rounded);
        } else if (acc <= GOOD) {
          setStatus(`Good signal \u00b1${rounded}m — improving…`);
          setCanAccept(true);
        } else {
          setStatus(`Improving signal… \u00b1${rounded}m`);
          setCanAccept(acc < 500);
        }
      },
      (err) => {
        clearTimeout(timerRef.current);
        setStatus(err.code === 1 ? 'GPS denied — using network…' : 'GPS lost — using network…');
        ipFallback().then(p => {
          if (p) commitFix(p.latitude, p.longitude, p.accuracy);
          else { setStatus(err.code === 1 ? 'Location access denied.' : 'Could not get location.'); setLocating(false); }
        });
      },
      { enableHighAccuracy: true, timeout: MAX_WAIT, maximumAge: 0 }
    );
  }, [commitFix]);

  // Accuracy bar
  const accuracyColor = accuracy == null ? 'var(--text-muted)'
    : accuracy <= EXCELLENT ? 'var(--accent-emerald)'
    : accuracy <= GOOD      ? 'var(--accent-cyan)'
    : accuracy <= 300       ? 'var(--accent-amber)'
    : 'var(--accent-rose)';

  const accuracyPct = accuracy == null ? 0
    : Math.max(5, Math.round(100 - Math.min(accuracy, 500) / 5));

  return { locating, accuracy, coords, address, status, canAccept, accuracyColor, accuracyPct, start, stop, acceptCurrent };
}
