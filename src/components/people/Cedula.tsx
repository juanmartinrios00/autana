import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import { patente } from '../../lib/patente'
import './Cedula.css'

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

interface CedulaProps {
  userId: string
  name: string
  /** "Particular" o "Concesionaria". */
  kind: string
  /** "Palermo, CABA". Vacío si no lo cargó. */
  place: string
  /** Cuándo se abrió la cuenta, ISO. */
  memberSince: string
  verified: boolean
  photoUrl: string | null
  /** Lo que va en la esquina de la foto: el botón de cambiarla, en el propio. */
  photoAction?: ReactNode
  /** En el perfil el nombre es el título de la página; en el garage, no. */
  nameAs?: 'h1' | 'span'
  /** Lo de abajo a la derecha: cuántos avisos, o el atajo a verlos. */
  footer?: ReactNode
}

/**
 * Quién es alguien, como la cédula verde del auto.
 *
 * Es el papel que cualquiera que tuvo un auto en Argentina llevó en la
 * billetera: verde claro, con el fondo de rayitas de seguridad, los campos en
 * mayúscula y el titular grande. Acá identifica a la persona y no al auto, así
 * que los campos son los del perfil ---titular, tipo, alta, domicilio--- y la
 * "patente" sale del id de la cuenta (`lib/patente`).
 *
 * Lo que dice son los mismos hechos que ve un comprador al lado de un aviso,
 * y nada más: el nivel y los logros van aparte, porque son un juego y esto se
 * lee como un documento. El sello de verificada es el único acento, y sólo
 * aparece cuando la cuenta lo está.
 */
export function Cedula({
  userId,
  name,
  kind,
  place,
  memberSince,
  verified,
  photoUrl,
  photoAction,
  nameAs = 'span',
  footer,
}: CedulaProps) {
  const alta = new Date(memberSince)
  const altaLabel = Number.isNaN(alta.getTime()) ? '—' : `${MESES[alta.getMonth()]} ${alta.getFullYear()}`
  const Name = nameAs

  return (
    <div className={verified ? 'cedula cedula--verified' : 'cedula'}>
      <div className="cedula__top">
        <span className="cedula__kind">Cédula del perfil</span>
        <span className="cedula__brand">auteando</span>
      </div>

      <div className="cedula__body">
        <div className="cedula__photo-shell">
          <span className="cedula__photo" aria-hidden="true">
            {photoUrl ? <img src={photoUrl} alt="" /> : initials(name) || <Icon name="user" size={28} />}
          </span>
          {photoAction}
        </div>

        <dl className="cedula__fields">
          <div className="cedula__field cedula__field--wide">
            <dt>Titular</dt>
            <dd>
              <Name className="cedula__name">{name}</Name>
            </dd>
          </div>
          <div className="cedula__field">
            <dt>Tipo</dt>
            <dd>{kind}</dd>
          </div>
          <div className="cedula__field">
            <dt>Alta</dt>
            <dd className="cedula__mono">{altaLabel}</dd>
          </div>
          {place && (
            <div className="cedula__field cedula__field--wide">
              <dt>Domicilio</dt>
              <dd>{place}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="cedula__foot">
        <span className="cedula__plate" aria-label={`Patente del perfil ${patente(userId)}`}>
          <span className="cedula__plate-band" aria-hidden="true">
            Argentina
          </span>
          <span className="cedula__plate-number" aria-hidden="true">
            {patente(userId)}
          </span>
        </span>
        {footer && <span className="cedula__footer">{footer}</span>}
      </div>

      {verified && (
        <span className="cedula__stamp" role="img" aria-label="Cuenta verificada">
          <Icon name="check" size={14} strokeWidth={2.4} />
          Verificada
        </span>
      )}
    </div>
  )
}
