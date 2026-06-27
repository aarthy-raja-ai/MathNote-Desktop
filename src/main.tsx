import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Load sync credentials
(window as any).SUPABASE_URL = localStorage.getItem('SUPABASE_URL') || '';
(window as any).SUPABASE_KEY = localStorage.getItem('SUPABASE_KEY') || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
