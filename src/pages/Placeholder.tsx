import { Card } from '../components/ui/Card'

interface PlaceholderProps {
  title: string
  /** Qué fase del plan construye esta pantalla. */
  phase: string
}

/**
 * Ruta reservada. Existe para que la navegación no se rompa mientras la
 * pantalla real todavía no está construida.
 */
export function Placeholder({ title, phase }: PlaceholderProps) {
  return (
    <section className="page section">
      <Card pad>
        <span className="over">{phase}</span>
        <h1 className="placeholder__title">{title}</h1>
        <p className="placeholder__text">
          Ruta reservada. La pantalla se construye en {phase.toLowerCase()}.
        </p>
      </Card>
    </section>
  )
}
