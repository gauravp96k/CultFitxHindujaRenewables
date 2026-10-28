import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update handling
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version of HREPL Wellness Portal is available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('HREPL Wellness Portal is ready for offline use.');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);