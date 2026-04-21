import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';

export function useSSE({ routeId }) {
  const [position,    setPosition]    = useState(null);
  const [tripStatus,  setTripStatus]  = useState('waiting');
  const [eta,         setEta]         = useState(null);
  const [connected,   setConnected]   = useState(false);
  const [activeBuses, setActiveBuses] = useState([]);
  const esRef        = useRef(null);
  const retryRef     = useRef(null);
  const retryCount   = useRef(0);

  useEffect(() => {
    if (!routeId) return;

    function connect() {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const url = `${API_URL}/sse/route/${routeId}`;
      console.log('[SSE] Connecting:', url);

      let es;
      try {
        es = new EventSource(url);
      } catch (err) {
        console.error('[SSE] Failed to create EventSource:', err);
        retryRef.current = setTimeout(connect, 3000);
        return;
      }
      esRef.current = es;

      // Mark connected on open
      es.onopen = () => {
        console.log('[SSE] Connected');
        setConnected(true);
        retryCount.current = 0;
      };

      es.addEventListener('ping', () => {
        setConnected(true);
      });

      es.addEventListener('position', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[SSE] Position:', data.lat, data.lng);
          setConnected(true);
          setPosition(data);
          if (data.eta) setEta(data.eta);
        } catch (err) {
          console.error('[SSE] Position parse error:', err);
        }
      });

      es.addEventListener('trip_status', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[SSE] Trip status:', data.status);
          setTripStatus(data.status);
          if (data.status === 'ended') {
            setEta(null);
            setPosition(null);
          }
        } catch {}
      });

      es.addEventListener('buses_update', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[SSE] Buses update:', data);
          setConnected(true);
          setActiveBuses(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('[SSE] Buses parse error:', err);
        }
      });

      es.onerror = (err) => {
        console.error('[SSE] Error, retrying...', err);
        setConnected(false);
        es.close();
        esRef.current = null;
        retryCount.current += 1;
        const delay = Math.min(1000 * retryCount.current, 10000);
        retryRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      clearTimeout(retryRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [routeId]);

  return { position, tripStatus, eta, connected, activeBuses };
}