import L from 'leaflet';

export function createBusIcon(bearing = 0, vehicleNumber = '', isSelected = false) {
  const ring = isSelected ? '#ffffff' : '#444a5a';
  const fill = isSelected ? '#1a1f2e' : '#0d1117';
  const arrow = isSelected ? '#00e5a0' : '#6b7280';
  const labelBg = isSelected ? '#00e5a0' : '#1a1f2e';
  const labelColor = isSelected ? '#0a0c10' : '#9ca3af';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
      <circle cx="24" cy="24" r="20" fill="${fill}" stroke="${ring}" stroke-width="2"/>
      <circle cx="24" cy="24" r="14" fill="${fill}" stroke="${arrow}" stroke-width="1" stroke-opacity="0.4"/>
      <polygon points="24,10 29,22 24,19 19,22"
        fill="${arrow}"
        transform="rotate(${bearing}, 24, 24)"/>
      <rect x="6" y="44" width="36" height="14" rx="4" fill="${labelBg}"/>
      <text x="24" y="54"
        font-family="monospace"
        font-size="8"
        font-weight="bold"
        text-anchor="middle"
        fill="${labelColor}">
        ${vehicleNumber || 'BUS'}
      </text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    iconSize: [48, 60],
    iconAnchor: [24, 24],
    className: '',
  });
}

export function createStopIcon(isNext = false, label = '') {
  const color = isNext ? '#00e5a0' : '#374151';
  const textColor = isNext ? '#0a0c10' : '#9ca3af';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <circle cx="14" cy="14" r="10" fill="${color}" fill-opacity="${isNext ? 1 : 0.5}"
        stroke="${isNext ? '#ffffff' : '#4b5563'}" stroke-width="1.5"/>
      <text x="14" y="18"
        font-family="monospace"
        font-size="8"
        font-weight="bold"
        text-anchor="middle"
        fill="${textColor}">
        ${label}
      </text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: '',
  });
}