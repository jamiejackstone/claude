import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Prerendered routes have markup to hydrate. The SPA shell (unknown URLs) is empty.
if (rootElement.childNodes.length === 0) {
  createRoot(rootElement).render(app);
} else {
  hydrateRoot(rootElement, app);
}
