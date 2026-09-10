import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import './NotFound.css'

/**
 * La pantalla de dirección inexistente.
 *
 * Antes acá había un `Placeholder` de obra que le mostraba "Fase 5" a
 * cualquiera que tipeara mal una URL.
 *
 * No se carga con `lazy` a propósito, al revés que el resto: es la pantalla que
 * aparece cuando algo ya salió mal, y hacerla depender de bajar otro archivo es
 * pedirle a un camino roto que funcione mejor que el sano.
 *
 * Lo que dice arriba de todo es la causa más probable en un sitio de autos
 * usados, no la más genérica: el aviso se vendió y lo borraron. Alguien que
 * llega desde un link viejo de WhatsApp merece esa explicación y no un 404
 * pelado.
 */
export function NotFound() {
  useDocumentMeta({ title: 'Página no encontrada | Autana' })

  return (
    <div className="page section notfound">
      <span className="over">Error 404</span>
      <h1 className="notfound__title">Esta página no existe</h1>
      <p className="notfound__text">
        Lo más común: el aviso se vendió y su dueño lo borró. También puede ser un link
        cortado a la mitad al copiarlo, o una letra de más en la dirección.
      </p>

      <div className="notfound__actions">
        <Link to="/cars">
          <Button variant="yellow">Ver los autos publicados</Button>
        </Link>
        <Link to="/">
          <Button variant="outline">Ir a la portada</Button>
        </Link>
      </div>

      <p className="notfound__hint">
        Si llegaste desde un link nuestro que no debería estar roto, contanos en{' '}
        <Link to="/help">Ayuda</Link>.
      </p>
    </div>
  )
}
