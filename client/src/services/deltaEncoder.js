let lastPos = null;

export function encodePosition(lat, lng) {
  if (!lastPos) {
    lastPos = { lat, lng };
    return { type: 'full', lat, lng };
  }
  const dLat = Math.round((lat - lastPos.lat) * 1e5);
  const dLng = Math.round((lng - lastPos.lng) * 1e5);
  lastPos = { lat, lng };
  return { type: 'delta', dLat, dLng };
}

export function resetEncoder() {
  lastPos = null;
}