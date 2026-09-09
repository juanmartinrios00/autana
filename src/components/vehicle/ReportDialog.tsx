import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'
import { useAuth } from '../../hooks/useAuth'
import { hasReported, reportListing, reportReasons, type ReportReason } from '../../lib/api'
import { describeError } from '../../lib/errors'
import './ReportDialog.css'

/**
 * Reportar una publicación.
 *
 * Va en un `<dialog>` nativo: trae el foco atrapado, el cierre con Escape y el
 * fondo bloqueante sin una línea de JavaScript ni una dependencia.
 *
 * Exige cuenta, y lo dice antes de pedir nada en vez de dejar que alguien
 * escriba el motivo y recién ahí mandarlo a login.
 */
export function ReportDialog({ listingId, title }: { listingId: string; title: string }) {
  const { session } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [reason, setReason] = useState<ReportReason | ''>('')
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const userId = session?.user.id ?? ''

  /* Si ya lo reportó, el botón lo dice y no abre nada. Se consulta al entrar y
     no al abrir, para que el estado esté listo cuando el botón se ve. */
  useEffect(() => {
    if (!userId) return
    let current = true

    void hasReported(listingId, userId)
      .then((already) => {
        if (current && already) setDone(true)
      })
      .catch((cause) => {
        /* Que falle esta consulta no puede impedir reportar: en el peor caso
           el índice único de la base rechaza el duplicado. */
        console.error('hasReported', cause)
      })

    return () => {
      current = false
    }
  }, [listingId, userId])

  function open() {
    setFailure(null)
    dialogRef.current?.showModal()
  }

  async function send() {
    if (!reason || !userId) return

    setSending(true)
    setFailure(null)
    try {
      await reportListing(listingId, userId, reason, detail)
      setDone(true)
      dialogRef.current?.close()
    } catch (cause) {
      console.error('reportListing', cause)
      setFailure(describeError(cause, 'No pudimos enviar el reporte.'))
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <p className="report__done">
        <Icon name="check" size={15} />
        Ya reportaste esta publicación.
      </p>
    )
  }

  return (
    <>
      <button type="button" className="report__trigger" onClick={open}>
        Reportar esta publicación
      </button>

      <dialog ref={dialogRef} className="report" aria-labelledby="report-title">
        <div className="report__inner">
          <header className="report__head">
            <h2 id="report-title" className="report__title">
              Reportar publicación
            </h2>
            <button
              type="button"
              className="report__close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          <p className="report__lead">{title}</p>

          {!session ? (
            <>
              <p className="report__text">
                Para reportar hace falta tener cuenta. Es lo que evita que alguien tire cientos
                de reportes falsos con un script.
              </p>
              <Link to="/login" className="report__login">
                <Button variant="yellow" block>
                  Entrar a mi cuenta
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Select
                label="¿Qué pasa con este aviso?"
                placeholder="Elegí un motivo"
                options={(Object.keys(reportReasons) as ReportReason[]).map((value) => ({
                  value,
                  label: reportReasons[value],
                }))}
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
              />

              <label className="report__field">
                <span className="report__label">Contanos un poco más (opcional)</span>
                <textarea
                  className="report__textarea"
                  rows={3}
                  maxLength={500}
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="Lo que nos ayude a entender el problema."
                />
              </label>

              {failure && (
                <p className="report__failure" role="alert">
                  {failure}
                </p>
              )}

              <div className="report__actions">
                <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
                  Cancelar
                </Button>
                <Button variant="yellow" disabled={!reason || sending} onClick={() => void send()}>
                  {sending ? 'Enviando…' : 'Enviar reporte'}
                </Button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
