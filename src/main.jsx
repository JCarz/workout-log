import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    const announceUpdate = () => {
      if (!registration.waiting) return

      window.dispatchEvent(
        new CustomEvent('workout-log:update-ready', {
          detail: { waiting: registration.waiting },
        }),
      )
    }

    if (registration.waiting) announceUpdate()

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing
      if (!installingWorker) return

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          announceUpdate()
        }
      })
    })

    const readyRegistration = await navigator.serviceWorker.ready
    const assetUrls = [...document.querySelectorAll('script[src], link[rel="stylesheet"]')]
      .map((element) => element.src || element.href)
      .filter(Boolean)

    readyRegistration.active?.postMessage({ type: 'CACHE_URLS', urls: assetUrls })
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
