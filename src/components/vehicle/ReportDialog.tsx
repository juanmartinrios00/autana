import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'
import { useAuth } from '../../hooks/useAuth'
import {
  hasReported,
  hasReportedProfile,
  profileReportReasons,
  reportListing,
  reportProfile,
  reportReasons,
  type ProfileReportReason,
  type ReportReason,
} from '../../lib/api'
import { describeError } from '../../lib/errors'
import './ReportDialog.css'

/**
 * Qué se reporta, con lo que cambia de un caso al otro: los motivos, los
 * textos y a qué tabla va. Todo lo demás —pedir cuenta, uno por persona, el
 * diálogo— es igual para un aviso que para un garage.
 */
const KINDS = {
  listing: {
    trigger: 'Reportar esta publicación',
    heading: 'Reportar publicación',
    question: '¿Qué pasa con este aviso?',
    done: 'Ya reportaste esta publicación.',
    reasons: reportReasons as Record<string, string>,
    check: hasReported,
    send: (id: string, userId: string, reason: string, detail: string) =>
      reportListing(id, userId, reason as ReportReason, detail),
  },
  profile: {
    trigger: 'Reportar este garage',
    heading: 'Reportar garage',
    question: '¿Qué pasa con este garage?',
    done: 'Ya reportaste este garage.',
    reasons: profileReportReasons as Record<string, string>,
    check: hasReportedProfile,
    send: (id: string, userId: string, reason: string, detail: string) =>
      reportProfile(id, userId, reason as ProfileReportReason, detail),
  },
} as const

interface ReportDialogProps {
  kind: keyof typeof KINDS
  /** El id del aviso o del perfil. */
  targetId: string
  /** Lo que se muestra debajo del título: el auto, o el nombre de la persona. */
  title: string
}

/**
 * Reportar un aviso o un garage.
 *
 * Va en un `<dialog>` nativo: trae el foco atrapado, el cierre con Escape y el
 * fondo bloqueante sin una línea de JavaScript ni una dependencia.
 *
 * Exige cuenta, y lo dice antes de pedir nada en vez de dejar que alguien
 * escriba el motivo y recién ahí mandarlo a login.
 */
export function ReportDialog({ kind, targetId, title }: ReportDialogProps) {
  const config = KINDS[kind]
  const { session } = useAuth()
  const location = useLocation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  const [reason, setReason] = useState('')
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

    void config
      .check(targetId, userId)
      .then((already) => {
        if (current && already) setDone(true)
      })
      .catch((cause) => {
        /* Que falle esta consulta no puede impedir reportar: en el peor caso
           el índice único de la base rechaza el duplicado. */
        console.error('reporte: ya reportado', cause)
      })

    return () => {
      current = false
    }
  }, [config, targetId, userId])

  function open() {
    setFailure(null)
    dialogRef.current?.showModal()
  }

  async function send() {
    if (!reason || !userId) return

    setSending(true)
    setFailure(null)
    try {
      await config.send(targetId, userId, reason, detail)
      setDone(true)
      dialogRef.current?.close()
    } catch (cause) {
      console.error('reporte', cause)
      setFailure(describeError(cause, 'No pudimos enviar el reporte.'))
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <p className="report__done">
        <Icon name="check" size={15} />
        {config.done}
      </p>
    )
  }

  return (
    <>
      <button type="button" className="report__trigger" onClick={open}>
        {config.trigger}
      </button>

      <dialog ref={dialogRef} className="report" aria-labelledby={titleId}>
        <div className="report__inner">
          <header className="report__head">
            <h2 id={titleId} className="report__title">
              {config.heading}
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
              {/* Con `from`, el login devuelve acá: sin eso terminaba en la portada
                  y había que volver a buscar qué se quería reportar. */}
              <Link
                to="/login"
                state={{ from: location.pathname + location.search }}
                className="report__login"
              >
                <Button variant="yellow" block>
                  Entrar a mi cuenta
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Select
                label={config.question}
                placeholder="Elegí un motivo"
                options={Object.entries(config.reasons).map(([value, label]) => ({ value, label }))}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
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
