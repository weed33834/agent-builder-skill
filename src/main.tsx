import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './orig-styles.css'
import './page-styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
