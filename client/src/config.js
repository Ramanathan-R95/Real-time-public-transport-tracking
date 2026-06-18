const isProd = window.location.hostname !== 'localhost';

export const API_URL = isProd
  ? 'https://real-time-public-transport-tracking-app-jqlx.onrender.com'
  : 'http://localhost:5000';

export const WS_URL = isProd
  ? 'wss://real-time-public-transport-tracking-app-jqlx.onrender.com/ws'
  : 'ws://localhost:5000/ws';