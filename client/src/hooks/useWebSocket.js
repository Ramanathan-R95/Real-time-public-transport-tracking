import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllBuffered, clearBuffer } from '../services/idbBuffer';
import { WS_URL } from '../config';

export function useWebSocket({ token, onMessage }) {
  const ws             = useRef(null);
  const reconnectTimer = useRef(null);
  const [status, setStatus] = useState('disconnected');

  const connect = useCallback(() => {
    if (!token) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setStatus('reconnecting');

    ws.current = new WebSocket(`${WS_URL}?token=${token}`);

    ws.current.onopen = async () => {
      setStatus('connected');
      try {
        const buffered = await getAllBuffered();
        if (buffered.length > 0) {
          send({ type: 'buffer_flush', pings: buffered });
          await clearBuffer();
        }
      } catch (err) {
        console.error('[WS] Buffer flush error:', err);
      }
    };

    ws.current.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };

    ws.current.onclose = (e) => {
      setStatus('disconnected');
      if (e.code === 4001) return;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => ws.current?.close();
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}