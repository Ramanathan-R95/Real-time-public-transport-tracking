// Encode: returns integer delta (multiply by 1e5 for precision)
function encodeDelta(prev, curr) {
  return {
    dLat: Math.round((curr.lat - prev.lat) * 1e5),
    dLng: Math.round((curr.lng - prev.lng) * 1e5),
  };
}

// Decode: reconstruct absolute coords from previous + delta
function decodeDelta(prev, delta) {
  return {
    lat: prev.lat + delta.dLat / 1e5,
    lng: prev.lng + delta.dLng / 1e5,
  };
}

module.exports = { encodeDelta, decodeDelta };