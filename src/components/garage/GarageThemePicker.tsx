import { useState } from 'react'
import { setGarageTheme } from '../../lib/api'
import { GARAGE_THEMES } from '../../lib/garage-theme'
import './GarageThemePicker.css'

interface GarageThemePickerProps {
  userId: string
  value: string
  onChange: (theme: string) => void
}

/**
 * Elegir el fondo de la cabecera del propio garage.
 *
 * Se aplica al tocar, sin botón de guardar: el cambio se ve en el acto sobre la
 * misma cabecera, que es la mejor vista previa posible. Si la base rechaza,
 * vuelve al color anterior y lo dice.
 */
export function GarageThemePicker({ userId, value, onChange }: GarageThemePickerProps) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function pick(next: string) {
    if (next === value || busy) return
    const previous = value
    onChange(next)
    setBusy(true)
    setFailed(false)
    try {
      await setGarageTheme(userId, next)
    } catch {
      onChange(previous)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gtheme">
      <span className="gtheme__label" id="gtheme-label">
        Color de tu garage
      </span>
      <div className="gtheme__swatches" role="radiogroup" aria-labelledby="gtheme-label">
        {GARAGE_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={theme.id === value}
            aria-label={theme.label}
            title={theme.label}
            className={`gtheme__swatch${theme.id === value ? ' gtheme__swatch--on' : ''}`}
            style={{ background: theme.color }}
            onClick={() => void pick(theme.id)}
          />
        ))}
      </div>
      {failed && (
        <span className="gtheme__error" role="alert">
          No pudimos guardar el color.
        </span>
      )}
    </div>
  )
}
