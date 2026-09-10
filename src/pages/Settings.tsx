import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { provinces } from '../data/makes'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getOwnWhatsapp, getProfile, updateProfile } from '../lib/api'
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
 */
export function Settings() {
  const { session } = useAuth()
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
            ¿Entraste con un link por mail porque no la recordás? Todavía no se puede
            cambiar sin saber la actual. Podés seguir entrando con el link mientras tanto.
          </p>
        </form>
      </div>
    </>
  )
}
