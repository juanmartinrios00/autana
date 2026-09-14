/**
 * Los fondos posibles para la cabecera del garage.
 *
 * Tiene que coincidir con el `check` de la migración 015: la base rechaza
 * cualquier id que no esté ahí.
 *
 * Todos oscuros a propósito. Encima va texto blanco, los dibujos en blanco y el
 * botón amarillo; un fondo claro los borra. Son colores con nombre de auto y no
 * "azul 3": el que elige está pensando en su garage, no en una paleta.
 */
export const GARAGE_THEMES = [
  { id: 'ink', label: 'Negro', color: '#0a100c' },
  { id: 'night', label: 'Azul noche', color: '#14233a' },
  { id: 'racing', label: 'Verde inglés', color: '#12382a' },
  { id: 'bordo', label: 'Bordó', color: '#4a1624' },
  { id: 'leather', label: 'Cuero', color: '#3d2617' },
  { id: 'graphite', label: 'Grafito', color: '#2a2e33' },
] as const

export type GarageThemeId = (typeof GARAGE_THEMES)[number]['id']

/** El color de un tema, o el negro de siempre si llega algo que no se conoce. */
export function garageThemeColor(id: string | null | undefined): string {
  return GARAGE_THEMES.find((theme) => theme.id === id)?.color ?? GARAGE_THEMES[0].color
}
