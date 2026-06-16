import '@house/db'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import { initAnonymousAuth } from './lib/anonymousAuth'

async function startApp() {
  // Intentamos anonymous auth para tener una sesión de Firebase
  // (necesaria para que las reglas de RTDB auth != null no bloqueen)
  // Si falla (ej: no habilitado en Firebase Console), la app igual arranca
  // y las operaciones contra RTDB se manejan con fallback local
  try {
    await initAnonymousAuth();
  } catch {
    // Si falla, la app arranca igual — las operaciones RTDB fallarán
    // con PERMISSION_DENIED, pero los fallbacks locales las manejan
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
}

startApp();
