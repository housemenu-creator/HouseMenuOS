import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@house/db'; // Ensure Firebase initializes at root level

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
