import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detect demo mode synchronously before React mounts.
// Any component or hook can read window.__DEMO_MODE__ safely.
const params = new URLSearchParams(window.location.search);
(window as any).__DEMO_MODE__ = params.has('seed');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
