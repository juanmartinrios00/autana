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

/* Cuando el deploy borra los hashes viejos, una pestania que quedo abierta
   pide un chunk que ya no existe. Eso no es un error de render: es una version
   vieja de la pagina hablando con una nueva, y la unica salida es recargar
   para traer el `index.html` con los hashes de ahora. El boton de reintentar
   no alcanza —`lazy` cachea la promesa rechazada, asi que el segundo intento
   falla sin siquiera volver a pedir el archivo— y sin esto el visitante queda
   en un cartel de error que no se va con nada. */
const RELOADED_AT = 'autana:chunk-reload'

/* Cada navegador lo dice distinto y ninguno expone un codigo. */
function isChunkLoadError(error: Error) {
  return /dynamically imported module|Importing a module script failed/i.test(error.message)
}

/* El guard de tiempo es contra el bucle: si el chunk sigue sin bajar despues
   de recargar —el visitante se quedo sin senial a mitad de camino— recargar
   otra vez lo deja girando. Pasados unos segundos ya es otro episodio y vale
   volver a intentarlo. */
function shouldReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0)
    if (Date.now() - last < 10_000) return false
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
    return true
  } catch {
    /* Modo privado o storage bloqueado: sin memoria no hay forma de descartar
       el bucle, asi que preferimos el cartel de error antes que arriesgarlo. */
    return false
  }
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
    if (isChunkLoadError(error) && shouldReload()) {
      window.location.reload()
      return
    }

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
