import '@house/db'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import { initAnonymousAuth } from './lib/anonymousAuth'

// Init anonymous auth for public ordering (CartDrawer → POST /api/orders)
initAnonymousAuth();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
