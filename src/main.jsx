import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  try {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    const registration = await navigator.serviceWorker.ready
    const assetUrls = [...document.querySelectorAll('script[src], link[rel="stylesheet"]')]
      .map((element) => element.src || element.href)
      .filter(Boolean)

    registration.active?.postMessage({ type: 'CACHE_URLS', urls: assetUrls })
  } catch (error) {
    console.error('Service worker registration failed.', error)
  }
}

if (import.meta.env.PROD) {
  window.addEventListener('load', registerServiceWorker)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
