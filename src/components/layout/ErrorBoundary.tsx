import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Qué ofrecer cuando se rompe. Por defecto, recargar. */
  fallback?: (retry: () => void) => ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * La red de seguridad del render.
 *
 * Sin esto, un error en cualquier componente —una fecha inválida, un campo que
 * llegó `null` cuando no debía— desmonta el árbol entero y deja la pantalla en
 * blanco. No un error: blanco, sin navbar, sin forma de volver. El visitante
 * cierra la pestaña y no sabemos que pasó.
 *
 * Tiene que ser una clase: `getDerivedStateFromError` no tiene equivalente en
 * hooks, es la única API de React que atrapa errores de render.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /* Por ahora a la consola, que es lo que se ve en el navegador del que
       reporta. Cuando haya monitoreo, el envío va acá y en ningún otro lado. */
    console.error('error de render', error, info.componentStack)
  }

  retry = () => {
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children

    if (this.props.fallback) return this.props.fallback(this.retry)

    return (
      <div className="page section">
        <EmptyState
          tone="error"
          icon="car"
          title="Se nos rompió algo"
          description="No es culpa tuya. Probá de nuevo y, si sigue pasando, volvé al inicio."
          action={
            <Button variant="yellow" onClick={this.retry}>
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }
}
