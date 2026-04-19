const DB_NAME = 'campustrack';
const STORE = 'ping_buffer';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function bufferPing(ping) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).add(ping);
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = rej;
  });
}

export async function getAllBuffered() {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).getAll();
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}

export async function clearBuffer() {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  return new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = rej;
  });
}