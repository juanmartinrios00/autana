import { CocheraPlano } from '../components/garage/CocheraPlano'
import { GarageScene } from '../components/garage/scenes'
import { Mojones } from '../components/levels/Mojones'
import { Oblea } from '../components/levels/Oblea'
import { LevelScene } from '../components/levels/scenes'
import { Button } from '../components/ui/Button'
import { EMPTY_SCENE_NAMES, EMPTY_SCENES } from '../components/ui/empty-scenes'
import { Icon } from '../components/ui/Icon'
import { iconNames } from '../components/ui/icon-paths'
import { pageTitle } from '../config/brand'
import { SLOTS } from '../data/garage-slots'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { achievementInfo, LEVELS } from '../lib/levels'
import './Sistema.css'

/**
 * El catálogo de las piezas propias del sitio: íconos, obleas, escenas y
 * botones, todo junto y con su nombre.
 *
 * No es para el público ---no está en el menú, ni en el sitemap, y el robots
 * la esconde---. Es para quien diseña: ver el set entero de un vistazo antes
 * de sumar una pieza, y para pasarle a Codex o a un ilustrador la referencia
 * de lo que ya existe y del registro en el que tiene que entrar lo nuevo.
 *
 * Todo sale de los mismos componentes que usa el sitio: si algo cambia allá,
 * cambia acá. Nada está copiado.
 */
export function Sistema() {
  useDocumentMeta({ title: pageTitle('Sistema'), noindex: true })
  const logros = achievementInfo()

  return (
    <div className="page section sistema">
      <header className="sistema__head">
        <span className="over">Sistema</span>
        <h1>Las piezas de auteando</h1>
        <p className="sistema__lead">
          Todo lo dibujado a mano para el sitio. Trazo en el color del texto, puntas rectas, y
          el amarillo sólo en un elemento por pieza.
        </p>
      </header>

      <section className="sistema__block">
        <h2>Íconos</h2>
        <p className="sistema__note">Grilla de 24, trazo 1.4, puntas y uniones rectas. {iconNames.length} en total.</p>
        <ul className="sistema__icons">
          {iconNames.map((name) => (
            <li key={name} className="sistema__icon">
              <Icon name={name} size={24} />
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="sistema__block">
        <h2>Obleas de logros</h2>
        <p className="sistema__note">Ganada, en amarillo pleno. Sin ganar, el lugar donde falta pegarla.</p>
        <ul className="sistema__obleas">
          {logros.map((logro, index) => (
            <li key={logro.id} className="sistema__oblea">
              <div className="sistema__oblea-pair">
                <Oblea id={logro.id} number={index + 1} done size={88} />
                <Oblea id={logro.id} number={index + 1} done={false} size={88} />
              </div>
              <span>{logro.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sistema__block">
        <h2>Escenas del garage</h2>
        <p className="sistema__note">320 × 200. El fondo es fijo por espacio; el auto sale de lo que cada uno cargó.</p>
        <ul className="sistema__scenes">
          {SLOTS.map((slot) => (
            <li key={slot.id}>
              <GarageScene slot={slot.id} className="sistema__scene" />
              <span>{slot.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sistema__block">
        <h2>Escenas de niveles</h2>
        <ul className="sistema__scenes">
          {LEVELS.map((level, index) => (
            <li key={level.title}>
              <LevelScene level={index + 1} className="sistema__scene" />
              <span>{level.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sistema__block">
        <h2>Estados vacíos</h2>
        <p className="sistema__note">
          240 × 150. Los que faltan muestran el ícono en la pantalla. El pedido de cada uno está en{' '}
          <code>docs/brief-ilustraciones.md</code>.
        </p>
        <ul className="sistema__scenes">
          {EMPTY_SCENE_NAMES.map((name) => {
            const Scene = EMPTY_SCENES[name]
            return (
              <li key={name}>
                {Scene ? (
                  <Scene className="sistema__scene" />
                ) : (
                  <div className="sistema__scene sistema__falta">Falta el dibujo</div>
                )}
                <code>{name}</code>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="sistema__block">
        <h2>Encabezados</h2>
        <p className="sistema__note">440 × 300, sobre la cabecera oscura. Se esconden en el celular.</p>
        <div className="sistema__heads">
          <figure>
            <CocheraPlano />
            <figcaption>El garage: la cochera desde arriba</figcaption>
          </figure>
          <figure>
            <Mojones />
            <figcaption>Niveles: un mojón por nivel, en el km de los logros que pide</figcaption>
          </figure>
        </div>
      </section>

      <section className="sistema__block">
        <h2>Botones</h2>
        <div className="sistema__buttons">
          <Button variant="yellow">Acción principal</Button>
          <Button variant="dark">Oscuro</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Callado</Button>
          <Button variant="danger">Peligro</Button>
        </div>
      </section>
    </div>
  )
}
