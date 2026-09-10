import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { saveSearch } from '../../lib/api'
import './SaveSearch.css'

/**
 * Guardar la búsqueda que se está mirando.
 *
 * Los filtros ya viven en la query string, así que guardar una búsqueda es
 * guardar el texto que ya está en la barra de direcciones. No hay que serializar
 * nada ni mantener dos representaciones en sincronía: lo que se guarda es
 * exactamente lo que se restaura.
 *
 * Sólo aparece con filtros puestos y con sesión iniciada. Guardar "todas las
 * publicaciones activas" no sirve para nada, y ofrecérselo a alguien sin cuenta
 * es un botón que lleva a un login que no pidió.
 */

interface SaveSearchProps {
  /** Para proponer un nombre que se entienda sin abrirla. */
  suggested: string
  activeCount: number
}

export function SaveSearch({ suggested, activeCount }: SaveSearchProps) {
  const { session } = useAuth()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (!session || activeCount === 0) return null

  async function save() {
    const label = name.trim() || suggested
    if (!label) {
      setError('Poné un nombre.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await saveSearch(session!.user.id, label, location.search.replace(/^\?/, ''))
      setSaved(true)
      setOpen(false)
      setName('')
    } catch {
      setError('No pudimos guardarla. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (saved) {
    return (
      <span className="savesearch__done">
        <Icon name="check" size={15} />
        Búsqueda guardada
      </span>
    )
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Icon name="heart" size={15} />
        Guardar búsqueda
      </Button>
    )
  }

  return (
    <div className="savesearch">
      <Input
        label="Nombre de la búsqueda"
        hideLabel
        placeholder={suggested}
        value={name}
        error={error || undefined}
        onChange={(event) => setName(event.target.value)}
      />
      <Button variant="yellow" size="sm" disabled={busy} onClick={() => void save()}>
        {busy ? 'Guardando…' : 'Guardar'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
    </div>
  )
}
