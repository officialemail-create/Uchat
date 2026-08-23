import { useState, useEffect, useRef } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'weak' | 'poor';

export function useNetworkQuality() {
  const [quality, setQuality] = useState<NetworkQuality>('good');
  const [latency, setLatency] = useState<number | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    const measure = async () => {
      if (!activeRef.current) return;
      try {
        const start = performance.now();
        await fetch('/api/healthz', { method: 'GET', cache: 'no-store' });
        const ms = Math.round(performance.now() - start);
        if (!activeRef.current) return;
        setLatency(ms);
        if (ms < 80) setQuality('excellent');
        else if (ms < 200) setQuality('good');
        else if (ms < 500) setQuality('weak');
        else setQuality('poor');
      } catch {
        if (!activeRef.current) return;
        setQuality('poor');
        setLatency(null);
      }
    };

    /* Also respond to navigator.connection if available */
    type NavConn = { effectiveType?: string; addEventListener?: (e: string, cb: () => void) => void; removeEventListener?: (e: string, cb: () => void) => void };
    const conn = (navigator as Navigator & { connection?: NavConn }).connection;
    const onConnChange = () => {
      const type = conn?.effectiveType;
      if (type === '4g') setQuality('excellent');
      else if (type === '3g') setQuality('good');
      else if (type === '2g') setQuality('weak');
      else if (type) setQuality('poor');
      measure();
    };
    conn?.addEventListener?.('change', onConnChange);

    measure();
    const interval = setInterval(measure, 30_000);

    return () => {
      activeRef.current = false;
      clearInterval(interval);
      conn?.removeEventListener?.('change', onConnChange);
    };
  }, []);

  return { quality, latency };
}

export const QUALITY_COLOR: Record<NetworkQuality, string> = {
  excellent: '#22C55E',
  good: '#f59e0b',
  weak: '#f97316',
  poor: '#ef4444',
};

export const QUALITY_LABEL: Record<NetworkQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  weak: 'Weak',
  poor: 'Poor',
};
