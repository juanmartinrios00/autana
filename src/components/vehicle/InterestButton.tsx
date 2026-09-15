import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../hooks/useAuth'
import {
  ContactLimitError,
  expressInterest,
  hasInterest,
  type SellerContact,
} from '../../lib/api'
import { contactMailto, instagramUrl } from '../../lib/contact'
import { listingMessage, whatsappLink } from '../../lib/whatsapp'
import type { Vehicle } from '../../types'
import './InterestButton.css'

interface InterestButtonProps {
  vehicle: Vehicle
  title: string
  /** `detail` es el botón grande de la ficha; `card`, el de cada caja del listado. */
  size?: 'card' | 'detail'
  /** Avisa el número nuevo, para que el cartel de "a X les interesa" acompañe. */
  onCount?: (count: number) => void
}

/**
 * "Me interesa": el único camino al contacto de quien publicó.
 *
 * Pide cuenta. Sin sesión lleva al login y vuelve al mismo lugar. Es lo que
 * hace que el número público cuente personas y no clics —con incógnito no se
 * infla— y lo que pone un costo a juntar teléfonos, que la migración 008 ya
 * había cerrado para la lectura pública.
 *
 * Tocar anota el interés y trae el contacto en una sola llamada a la base. Si
 * fueran dos, se podría pedir el contacto sin sumar.
 *
 * El dueño no ve el botón en su propio aviso: no se interesa por lo que vende,
 * y la base tampoco lo contaría.
 */
export function InterestButton({ vehicle, title, size = 'card', onCount }: InterestButtonProps) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  const userId = session?.user.id ?? ''
  const own = userId !== '' && userId === vehicle.sellerId

  const [contact, setContact] = useState<SellerContact | null>(null)
  const [already, setAlready] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  /* Sólo en la ficha: que el botón diga "Te interesa" si ya lo tocaste. En el
     listado serían veinte consultas por página para cambiar una palabra. */
  useEffect(() => {
    if (size !== 'detail' || !userId || own) return
    let current = true
    hasInterest(userId, vehicle.id)
      .then((value) => {
        if (current) setAlready(value)
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [size, userId, own, vehicle.id])

  if (own) return null

  async function open() {
    if (!session) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }

    setFailure(null)

    /* Ya lo trajo en este mismo render de la página: no hace falta volver a
       preguntar, y tampoco sumaría. */
    if (contact) {
      dialogRef.current?.showModal()
      return
    }

    setBusy(true)
    try {
      const found = await expressInterest(vehicle.slug)
      if (!found) {
        setFailure('Este aviso ya no está publicado.')
        return
      }
      setContact(found)
      setAlready(true)
      onCount?.(found.interestCount)
      dialogRef.current?.showModal()
    } catch (cause) {
      setFailure(
        cause instanceof ContactLimitError
          ? cause.message
          : 'No pudimos traer el contacto. Probá de nuevo.',
      )
    } finally {
      setBusy(false)
    }
  }

  /* El link del aviso va en el mensaje de WhatsApp. Desde la caja del listado
     `location` es el listado, no el aviso, así que se arma a mano. */
  const listingUrl = `${window.location.origin}/cars/${vehicle.slug}`
  const whatsapp = contact?.whatsapp
    ? whatsappLink(contact.whatsapp, listingMessage(title, listingUrl))
    : null
  const nothing = contact && !whatsapp && !contact.instagram && !contact.contactEmail

  const label = busy ? 'Buscando…' : already ? 'Te interesa · ver contacto' : 'Me interesa'

  return (
    <>
      {size === 'detail' ? (
        <Button variant="yellow" size="lg" block onClick={() => void open()} disabled={busy}>
          <Icon name="message" size={18} />
          {label}
        </Button>
      ) : (
        <Button
          variant="yellow"
          size="sm"
          className="interest__card-button"
          onClick={() => void open()}
          disabled={busy}
        >
          {label}
        </Button>
      )}

      {failure && (
        <p className="interest__failure" role="alert">
          {failure}
        </p>
      )}

      <dialog ref={dialogRef} className="interest" aria-labelledby={titleId}>
        <div className="interest__inner">
          <header className="interest__head">
            <div>
              <h2 id={titleId} className="interest__title">
                {contact ? `Contacto de ${contact.sellerName}` : 'Contacto'}
              </h2>
              <p className="interest__lead">{title}</p>
            </div>
            <button
              type="button"
              className="interest__close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          {nothing ? (
            <p className="interest__text">
              Quien publicó no dejó datos de contacto. Tu interés quedó anotado igual.
            </p>
          ) : (
            <ul className="interest__channels">
              {whatsapp && (
                <li>
                  <a
                    className="btn btn--yellow btn--block"
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Icon name="message" size={16} />
                    Escribir por WhatsApp
                  </a>
                </li>
              )}
              {contact?.instagram && (
                <li>
                  <a
                    className="interest__channel"
                    href={instagramUrl(contact.instagram)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <span className="interest__channel-label">Instagram</span>
                    <span className="interest__channel-value mono">@{contact.instagram}</span>
                  </a>
                </li>
              )}
              {contact?.contactEmail && (
                <li>
                  <a className="interest__channel" href={contactMailto(contact.contactEmail, title)}>
                    <span className="interest__channel-label">Mail</span>
                    <span className="interest__channel-value mono">{contact.contactEmail}</span>
                  </a>
                </li>
              )}
            </ul>
          )}

          <p className="interest__safety">
            <Icon name="check" size={15} />
            Nunca transfieras dinero antes de ver el vehículo. {BRAND} no interviene en el pago.
          </p>
        </div>
      </dialog>
    </>
  )
}
