import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import './index.css'
import App from './App.tsx'
import { installErrorReporting } from './lib/report'

installErrorReporting()

/* El de adentro, en `Layout`, cubre cada pantalla y deja la navegación viva.
   Este es el último recurso: agarra lo que se rompa en el armazón mismo
   —navbar, pie, los providers— que el otro ya no alcanza a envolver. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
