// Car icon SVG for the moving vehicle
export const carIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- Car shadow -->
  <ellipse cx="32" cy="48" rx="20" ry="4" fill="rgba(0,0,0,0.2)"/>
  
  <!-- Car body -->
  <rect x="8" y="20" width="48" height="22" rx="4" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
  
  <!-- Car roof -->
  <rect x="16" y="8" width="32" height="16" rx="3" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
  
  <!-- Windshield -->
  <polygon points="18,10 28,10 24,22 18,22" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1"/>
  <polygon points="46,10 36,10 40,22 46,22" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1"/>
  
  <!-- Side windows -->
  <rect x="20" y="12" width="8" height="8" rx="2" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1"/>
  <rect x="36" y="12" width="8" height="8" rx="2" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1"/>
  
  <!-- Headlights -->
  <rect x="54" y="22" width="6" height="6" rx="2" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
  <rect x="54" y="34" width="6" height="6" rx="2" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
  
  <!-- Tail lights -->
  <rect x="4" y="22" width="6" height="6" rx="2" fill="#ef4444" stroke="#dc2626" stroke-width="1"/>
  <rect x="4" y="34" width="6" height="6" rx="2" fill="#ef4444" stroke="#dc2626" stroke-width="1"/>
  
  <!-- Front wheels -->
  <circle cx="20" cy="42" r="8" fill="#1f2937" stroke="#111827" stroke-width="2"/>
  <circle cx="20" cy="42" r="4" fill="#4b5563"/>
  <circle cx="20" cy="42" r="2" fill="#9ca3af"/>
  
  <!-- Rear wheels -->
  <circle cx="44" cy="42" r="8" fill="#1f2937" stroke="#111827" stroke-width="2"/>
  <circle cx="44" cy="42" r="4" fill="#4b5563"/>
  <circle cx="44" cy="42" r="2" fill="#9ca3af"/>
  
  <!-- Door lines -->
  <line x1="32" y1="8" x2="32" y2="34" stroke="#1d4ed8" stroke-width="1.5"/>
  
  <!-- Door handles -->
  <rect x="30" y="16" width="4" height="1.5" rx="0.5" fill="#1d4ed8"/>
  <rect x="30" y="24" width="4" height="1.5" rx="0.5" fill="#1d4ed8"/>
</svg>
`;

export const getCarIconUrl = () => {
  const encoded = encodeURIComponent(carIconSVG);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

// Driver icon (blue circle with person)
export const driverIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
  <circle cx="32" cy="24" r="10" fill="#ffffff" opacity="0.9"/>
  <circle cx="32" cy="24" r="8" fill="#93c5fd"/>
  <ellipse cx="32" cy="44" rx="16" ry="12" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="32" cy="44" rx="14" ry="10" fill="#93c5fd"/>
</svg>
`;

export const getDriverIconUrl = () => {
  const encoded = encodeURIComponent(driverIconSVG);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};