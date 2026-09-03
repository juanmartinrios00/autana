import './HomeSections.css'

const questions = [
  {
    q: '¿Cuánto cuesta publicar un auto?',
    a: 'Nada. Publicar es gratis y no nos quedamos con ninguna comisión de la venta. Vos arreglás directo con el comprador.',
  },
  {
    q: '¿Cómo me contactan los interesados?',
    a: 'Por WhatsApp, al número que dejás al publicar. El comprador abre el chat con un mensaje que ya menciona tu auto, así sabés de cuál te está hablando. Tu mail nunca se muestra.',
  },
  {
    q: '¿Autana verifica los vehículos?',
    a: 'No. Cada publicación es responsabilidad de quien la sube y no revisamos los autos ni la documentación. Antes de cerrar una operación, pedí el informe de dominio y hacé una verificación policial.',
  },
  {
    q: '¿Puedo pagar o cobrar a través de Autana?',
    a: 'No, y es a propósito: no intervenimos en el pago. Nunca transfieras dinero antes de ver el vehículo en persona.',
  },
  {
    q: '¿Puedo editar o pausar mi publicación?',
    a: 'Sí. Desde tu cuenta vas a poder editarla, pausarla mientras lo pensás o marcarla como vendida.',
  },
  {
    q: '¿Qué pasa con las fotos que subo?',
    a: 'Se comprimen en tu propio teléfono antes de subirse, y en ese proceso se les borra la ubicación GPS que guardan las cámaras. Nadie puede saber dónde fue tomada la foto.',
  },
]

export function Faq() {
  return (
    <section className="faq">
      <header className="faq__head">
        <span className="over">Dudas frecuentes</span>
        <h2 className="faq__title">Lo que suelen preguntar</h2>
      </header>

      <div className="faq__list">
        {questions.map((item) => (
          <details className="faq__item" key={item.q}>
            <summary className="faq__q">
              {item.q}
              <span className="faq__mark" aria-hidden="true" />
            </summary>
            <p className="faq__a">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
