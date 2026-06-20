// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import axios from 'axios';
import { API_URL, SOCKET_URL } from './config';

// Configure axios
axios.defaults.baseURL = API_URL;

console.log(`🌐 API URL: ${API_URL}`);
console.log(`🔌 Socket URL: ${SOCKET_URL}`);
console.log(`📱 Environment: ${process.env.NODE_ENV}`);

if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
  console.warn('⚠️ Geolocation requires HTTPS on mobile.');
}

if (!navigator.geolocation) {
  console.warn('⚠️ Geolocation is not supported by this browser.');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();