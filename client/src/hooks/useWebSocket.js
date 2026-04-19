import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllBuffered, clearBuffer } from '../services/idbBuffer';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

export function useWebSocket({ token, onMessage }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const [status, setStatus] = useState('disconnected'); // connected | disconnected | reconnecting

  const connect = useCallback(() => {
    if (!token) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setStatus('reconnecting');
    ws.current = new WebSocket(`${WS_URL}?token=${token}`);

    ws.current.onopen = async () => {
      setStatus('connected');

      // Flush any buffered pings
      const buffered = await getAllBuffered();
      if (buffered.length > 0) {
        send({ type: 'buffer_flush', pings: buffered });
        await clearBuffer();
      }
    };

    ws.current.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };

    ws.current.onclose = () => {
      setStatus('disconnected');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
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