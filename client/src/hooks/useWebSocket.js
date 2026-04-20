import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllBuffered, clearBuffer } from '../services/idbBuffer';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

export function useWebSocket({ token, onMessage }) {
  const ws             = useRef(null);
  const reconnectTimer = useRef(null);
  const [status, setStatus] = useState('disconnected');

  const connect = useCallback(() => {
    if (!token) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setStatus('reconnecting');

    const url = `${WS_BASE}?token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = async () => {
      setStatus('connected');
      // Flush offline buffer on reconnect
      try {
        const buffered = await getAllBuffered();
        if (buffered.length > 0) {
          send({ type: 'buffer_flush', pings: buffered });
          await clearBuffer();
        }
      } catch (err) {
        console.error('Buffer flush error:', err);
      }
    };

    ws.current.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };

    ws.current.onclose = (e) => {
      setStatus('disconnected');
      // Don't reconnect on auth failure
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