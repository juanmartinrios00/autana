import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { provinces } from '../data/makes'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { deleteAccount, getOwnWhatsapp, getProfile, updateProfile } from '../lib/api'
import { changePassword, MIN_PASSWORD } from '../lib/auth'
import type { Seller } from '../types'
import './Settings.css'

/**
 * Ajustes de la cuenta.
 *
 * Existe porque hasta ahora no había forma de editar el perfil. `updateProfile`
 * estaba escrita y no la llamaba ninguna pantalla: el nombre, la ciudad y la
 * provincia sólo se cargaban de rebote al publicar un aviso, y para corregir un
 * WhatsApp mal tipeado había que editar una publicación.
 *
 * El tipo de vendedor se mudó acá desde el perfil por lo mismo: es un ajuste de
 * la cuenta, no una sección de una pantalla que además muestra el garage.
 *
 * Abajo de todo está el borrado de la cuenta. Va último y separado del resto: es
 * lo único de esta pantalla que no tiene vuelta atrás.
 */
export function Settings() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const userId = session?.user.id ?? ''
  const email = session?.user.email ?? ''

  useDocumentMeta({ title: 'Ajustes | Autana' })

  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [sellerType, setSellerType] = useState<Seller['type']>('private')

  const [dataBusy, setDataBusy] = useState(false)
  const [dataError, setDataError] = useState('')
  const [dataSaved, setDataSaved] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSaved, setPassSaved] = useState(false)

  const [killOpen, setKillOpen] = useState(false)
  const [killConfirm, setKillConfirm] = useState('')
  const [killBusy, setKillBusy] = useState(false)
  const [killError, setKillError] = useState('')

  useEffect(() => {
    if (!userId) return
    let alive = true

    /* El WhatsApp va por su propia función: desde la migración 008 no se lee de
       `profiles`, y la base sólo devuelve el propio. */
    void Promise.all([getProfile(userId), getOwnWhatsapp().catch(() => null)])
      .then(([profile, own]) => {
        if (!alive) return
        setName(profile.name)
        setCity(profile.city ?? '')
        setProvince(profile.province ?? '')
        setSellerType(profile.sellerType)
        setWhatsapp(own ?? '')
        setReady(true)
      })
      .catch(() => {
        if (alive) setReady(true)
      })

    return () => {
      alive = false
    }
  }, [userId])

  async function saveData(event: FormEvent) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setDataError('Poné tu nombre.')
      return
    }
    /* Mismo criterio que el formulario de publicar: si el número está mal, el
       comprador no llega, y es el único dato del perfil del que depende una
       venta. Vacío se permite — se carga al publicar. */
    if (whatsapp.trim() && !/^\+?\d[\d\s-]{7,}$/.test(whatsapp.trim())) {
      setDataError('Poné un WhatsApp válido con característica.')
      return
    }

    setDataBusy(true)
    setDataError('')
    setDataSaved(false)
    try {
      await updateProfile(userId, {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        city: city.trim(),
        province,
        sellerType,
      })
      setDataSaved(true)
    } catch {
      setDataError('No pudimos guardar los cambios. Probá de nuevo.')
    } finally {
      setDataBusy(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()

    if (next.length < MIN_PASSWORD) {
      setPassError(`La contraseña nueva tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (next !== repeat) {
      setPassError('Las dos contraseñas nuevas no coinciden.')
      return
    }

    setPassBusy(true)
    setPassError('')
    setPassSaved(false)
    try {
      await changePassword(email, current, next)
      setPassSaved(true)
      setCurrent('')
      setNext('')
      setRepeat('')
    } catch (cause) {
      setPassError(cause instanceof Error ? cause.message : 'No pudimos cambiarla.')
    } finally {
      setPassBusy(false)
    }
  }

  async function removeAccount() {
    /* Escribir el mail, no un tilde ni un "¿estás seguro?". Es lo único que
       obliga a leer qué cuenta se está borrando: un botón de confirmar se
       aprieta con el mismo impulso que el anterior. */
    if (killConfirm.trim().toLowerCase() !== email.toLowerCase()) {
      setKillError('Escribí tu mail tal cual para confirmar.')
      return
    }

    setKillBusy(true)
    setKillError('')
    try {
      await deleteAccount(userId)
      /* La cuenta ya no existe, así que el token no vale y cerrar sesión puede
         fallar. No importa: lo que hace falta es limpiar la sesión local. */
      await signOut().catch(() => {})
      void navigate('/', { replace: true })
    } catch {
      setKillError('No pudimos borrarla. Probá de nuevo; si sigue fallando, avisanos.')
      setKillBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="page section">
        <Skeleton height="180px" />
      </div>
    )
  }

  return (
    <>
      <section className="settings__head">
        <div className="page settings__head-inner">
          <span className="over over--invert">Tu cuenta</span>
          <h1 className="settings__title">Ajustes</h1>
          <p className="settings__mail mono">{email}</p>
        </div>
      </section>

      <div className="page settings__body">
        <form className="settings__card" onSubmit={(event) => void saveData(event)}>
          <h2 className="settings__section-title">Tus datos</h2>
          <p className="settings__note">
            El nombre y la ubicación se ven en tus avisos. El WhatsApp es el número con el
            que te escriben, y sólo lo recibe quien abre un aviso tuyo publicado.
          </p>

          <div className="settings__pair">
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="WhatsApp"
              inputMode="tel"
              placeholder="Ej. 11 2345 6789"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>

          <div className="settings__pair">
            <Input
              label="Ciudad"
              placeholder="Ej. Avellaneda"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Select
              label="Provincia"
              placeholder="Elegí una"
              options={provinces.map((item) => ({ value: item, label: item }))}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />
          </div>

          <Select
            label="Publico como"
            options={[
              { value: 'private', label: 'Particular' },
              { value: 'dealer', label: 'Concesionaria' },
            ]}
            value={sellerType}
            error={dataError || undefined}
            onChange={(e) => setSellerType(e.target.value as Seller['type'])}
          />
          <p className="settings__hint">
            Define el tope de publicaciones activas: 5 para particulares, 25 para
            concesionarias. <Link to="/dealers">Qué cambia si sos concesionaria</Link>.
          </p>

          <div className="settings__actions">
            <Button type="submit" variant="yellow" disabled={dataBusy}>
              {dataBusy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {dataSaved && <span className="settings__ok">Guardado.</span>}
          </div>
        </form>

        <form className="settings__card" onSubmit={(event) => void savePassword(event)}>
          <h2 className="settings__section-title">Tu contraseña</h2>
          <p className="settings__note">
            Pedimos la actual a propósito: sin eso, cualquiera que agarre tu teléfono
            desbloqueado con la sesión abierta te deja afuera de tu propia cuenta en dos
            toques.
          </p>

          <Input
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <div className="settings__pair">
            <Input
              label="Nueva"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <Input
              label="Repetila"
              type="password"
              autoComplete="new-password"
              value={repeat}
              error={passError || undefined}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </div>

          <div className="settings__actions">
            <Button type="submit" variant="outline" disabled={passBusy}>
              {passBusy ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
            {passSaved && <span className="settings__ok">Contraseña cambiada.</span>}
          </div>

          <p className="settings__hint">
            ¿No la recordás? Cerrá sesión y usá{' '}
            <Link to="/login">¿Olvidaste tu contraseña?</Link> en la pantalla de ingreso: te
            mandamos un link al correo y desde ahí la cambiás sin la anterior.
          </p>
        </form>

        {/* El borrado. Separado y último porque es lo único irreversible de la
            pantalla, y cerrado por defecto para que no esté a un resbalón de
            distancia mientras alguien corrige su ciudad. */}
        <section className="settings__card settings__card--danger">
          <h2 className="settings__section-title">Borrar tu cuenta</h2>
          <p className="settings__note">
            Se borra en el momento y no se puede deshacer: tus avisos y sus fotos, tu
            garage, tus favoritos, tus búsquedas guardadas y tu perfil. No hay período de
            gracia ni copia que podamos restaurar después.
          </p>
          <p className="settings__note">
            Lo único que queda son los reportes que hayas hecho sobre avisos de otros, y
            quedan sin tu nombre. Si se borraran, alguien podría limpiar el historial de
            moderación dándose de baja.
          </p>

          {!killOpen ? (
            <div className="settings__actions">
              <Button variant="outline" onClick={() => setKillOpen(true)}>
                Quiero borrar mi cuenta
              </Button>
            </div>
          ) : (
            <>
              <Input
                label={`Escribí ${email} para confirmar`}
                autoComplete="off"
                placeholder={email}
                value={killConfirm}
                error={killError || undefined}
                onChange={(e) => setKillConfirm(e.target.value)}
              />
              <div className="settings__actions">
                <Button variant="danger" disabled={killBusy} onClick={() => void removeAccount()}>
                  {killBusy ? 'Borrando…' : 'Borrar mi cuenta para siempre'}
                </Button>
                <Button
                  variant="ghost"
                  disabled={killBusy}
                  onClick={() => {
                    setKillOpen(false)
                    setKillConfirm('')
                    setKillError('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
