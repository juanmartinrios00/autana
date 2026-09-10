import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { User } from '../../types'
import './AccountMenu.css'

/**
 * El menú de la cuenta.
 *
 * Antes el avatar era un link directo al perfil y al lado, suelto, había un
 * botón "Salir". Esa era la parte confusa: cerrar sesión es la acción más
 * destructiva de la barra y estaba al mismo nivel visual que un link de
 * navegación, sin nada que dijera de qué cuenta se estaba saliendo.
 *
 * Acá el avatar abre el menú, arriba se ve de quién es la sesión, y salir
 * queda al final y separado por una línea. Es el único lugar de la barra donde
 * un desplegable se justifica: son cuatro destinos que la misma persona usa
 * seguido, que es distinto de esconder una pantalla que se lee una vez.
 */

interface AccountMenuProps {
  user: User
  onSignOut: () => void
}

export function AccountMenu({ user, onSignOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /* Escape y click afuera. Va en un efecto porque escucha al documento, que es
     un sistema externo; cerrar al navegar, en cambio, lo hace cada link en su
     `onClick`, que no necesita efecto ninguno. */
  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      /* El foco vuelve al avatar: si se queda dentro de un menú que ya no
         está, quien navega con teclado pierde el lugar. */
      triggerRef.current?.focus()
    }

    function handleDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleDown)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="account" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Cerrar menú de cuenta' : `Cuenta de ${user.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="account__avatar-img" />
        ) : (
          <Icon name="user" size={19} />
        )}
      </button>

      {open && (
        <div className="account__menu" role="menu">
          <div className="account__head">
            <span className="account__avatar" aria-hidden="true">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="account__avatar-img" />
              ) : (
                <Icon name="user" size={20} />
              )}
            </span>
            <div className="account__who">
              <strong className="account__name">{user.name}</strong>
              {/* El mail confirma de qué cuenta se trata, que es justo lo que
                  faltaba antes de apretar "Salir" sin más contexto. */}
              <span className="account__mail">{user.email}</span>
            </div>
          </div>

          <Link to="/profile" className="account__item" role="menuitem" onClick={close}>
            <Icon name="user" size={16} />
            Mi perfil
          </Link>
          <Link to="/my-listings" className="account__item" role="menuitem" onClick={close}>
            <Icon name="list" size={16} />
            Mis publicaciones
          </Link>
          <Link to={`/g/${user.id}`} className="account__item" role="menuitem" onClick={close}>
            <Icon name="car" size={16} />
            Mi garage
          </Link>
          <Link to="/settings" className="account__item" role="menuitem" onClick={close}>
            <Icon name="check" size={16} />
            Ajustes
          </Link>

          <button
            type="button"
            role="menuitem"
            className="account__item account__item--out"
            onClick={() => {
              close()
              onSignOut()
            }}
          >
            <Icon name="close" size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
