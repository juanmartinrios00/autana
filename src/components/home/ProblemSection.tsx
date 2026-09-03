import './HomeSections.css'

/**
 * El problema, antes de la solución. Es la sección que más conecta en una
 * landing: nombra en voz alta lo que el visitante ya sabe que le pasa.
 */
const pains = [
  {
    title: 'Fotos que no muestran lo que importa',
    text: 'Tres fotos de lejos y ninguna del interior, del baúl ni del odómetro. Te enterás del estado real cuando ya cruzaste media ciudad.',
  },
  {
    title: 'Precios sin ninguna referencia',
    text: 'El mismo modelo, mismo año, con diferencias de miles de dólares y sin manera de saber cuál está bien puesto.',
  },
  {
    title: 'Publicaciones que no contestan',
    text: 'Escribís a cinco avisos, te responden dos, y uno te dice que lo vendió hace un mes.',
  },
  {
    title: 'Los datos aparecen tarde',
    text: 'Kilometraje, transmisión o si acepta permuta terminan siendo preguntas por chat en vez de estar en el aviso.',
  },
]

export function ProblemSection() {
  return (
    <section className="problem">
      <div className="page problem__inner">
        <header className="problem__head">
          <span className="over problem__eyebrow">El problema</span>
          <h2 className="problem__title">
            Comprar un usado no debería ser una apuesta.
          </h2>
        </header>

        <ul className="problem__list">
          {pains.map((pain) => (
            <li className="problem__item" key={pain.title}>
              <h3 className="problem__item-title">{pain.title}</h3>
              <p className="problem__item-text">{pain.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
