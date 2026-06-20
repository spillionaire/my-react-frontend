// src/config.js
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const WS_URL = process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const SOCKET_URL = WS_URL; // Alias for consistency

export const isMobile = () => {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const getCurrentHost = () => {
  return window.location.hostname;
};

export const isHTTPS = () => {
  return window.location.protocol === 'https:';
};

console.log(`🔗 API_URL: ${API_URL}`);
console.log(`🔗 WS_URL: ${WS_URL}`);
console.log(`🔗 SOCKET_URL: ${SOCKET_URL}`);
console.log(`🔒 HTTPS: ${isHTTPS()}`);
console.log(`📱 Mobile: ${isMobile()}`);