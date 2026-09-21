import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Note } from '../../components/blog/Note'
import { BRAND } from '../../config/brand'

/**
 * El cuerpo de cada artículo, indexado por el `slug` de `posts.ts`.
 *
 * Es JSX y no Markdown a propósito. Los artículos linkean a pantallas del
 * sitio —al buscador con filtros puestos, a publicar, a la ayuda— y con
 * Markdown esos links serían `<a href>` que recargan la página entera. Con
 * JSX son `<Link>` y la navegación sigue siendo interna.
 *
 * Los textos llevan la fecha de escritura encima cuando hablan de plata o de
 * trámites: los aranceles cambian, y un artículo que da un número sin decir
 * cuándo lo dijo envejece mintiendo.
 */

const transferir = (
  <>
    <p className="prose__lead">
      La transferencia es el único momento en que el auto deja de ser legalmente tuyo. Todo
      lo demás —el pago, la entrega de las llaves, el apretón de manos— no cambia nada frente
      al Estado. Mientras el título siga a tu nombre, las multas, las patentes y lo que pase
      con ese auto siguen siendo tuyos.
    </p>

    <h2>Qué se firma</h2>
    <p>
      El trámite se hace en un Registro Seccional de la Propiedad del Automotor, el que
      corresponda al domicilio del comprador. Lo que se presenta:
    </p>
    <ul>
      <li>
        <strong>Formulario 08.</strong> Es la solicitud de transferencia. La firman las dos
        partes y las firmas van certificadas: en el mismo registro, en un banco, ante
        escribano o ante la policía. Si el vendedor es una sociedad o hay un apoderado, se
        suma la documentación que acredite quién firma.
      </li>
      <li>
        <strong>Verificación policial (Formulario 12).</strong> Alguien mira físicamente el
        auto y comprueba que el número de motor y el de chasis sean los que dice el título.
        Tiene vencimiento, así que no conviene hacerla con demasiada anticipación.
      </li>
      <li>
        <strong>Título y cédula verde</strong> del vehículo.
      </li>
      <li>
        <strong>DNI</strong> de las dos partes.
      </li>
      <li>
        <strong>Libre deuda de patentes e infracciones</strong>, según la jurisdicción.
      </li>
      <li>
        <strong>CETA</strong>, el certificado de transferencia de AFIP, cuando el valor del
        vehículo supera el monto a partir del cual se exige.
      </li>
    </ul>

    <h2>Cuánto sale</h2>
    <p>
      No hay un precio único, y por eso conviene entender de qué está hecho el total en vez
      de buscar un número:
    </p>
    <ul>
      <li>
        <strong>El arancel de transferencia</strong>, que se calcula sobre el valor del auto
        según una tabla oficial —no sobre lo que ustedes acordaron—. Es la parte más grande.
      </li>
      <li>
        <strong>El impuesto de sellos</strong>, que es provincial: cambia bastante entre
        jurisdicciones y en algunas no se cobra.
      </li>
      <li>
        <strong>Los formularios y la verificación</strong>, que son montos fijos y chicos al
        lado de lo anterior.
      </li>
    </ul>

    <Note>
      Los aranceles y los topes se actualizan seguido. Antes de ir, consultá el monto vigente
      en el registro seccional o en la página de la DNRPA. Cualquier número que leas en una
      nota de hace seis meses —esta incluida— ya está viejo.
    </Note>

    <h3>Quién paga qué</h3>
    <p>
      La costumbre es que el comprador pague la transferencia y el vendedor llegue con el auto
      sin deudas. Pero es costumbre, no ley: se puede acordar distinto. Lo que no conviene es
      dejarlo sin hablar hasta el día del registro, que es cuando aparece la discusión con el
      turno ya sacado.
    </p>

    <h2>El riesgo real: que el comprador no transfiera</h2>
    <p>
      Es el problema más común y el más caro. Vendiste, entregaste el auto, cobraste — y el
      comprador no hace el trámite. Para el Estado ese auto sigue siendo tuyo: las multas te
      llegan a vos, la patente se acumula a tu nombre, y si el auto se ve involucrado en algo,
      el titular registral sos vos.
    </p>
    <p>
      Para eso existe la <strong>denuncia de venta</strong>. Se presenta en el registro, deja
      asentado que a partir de determinada fecha el auto ya no está en tu poder, y te saca la
      responsabilidad por lo que pase después. No completa la transferencia —el auto sigue a
      tu nombre— pero corta la sangría.
    </p>

    <Note>
      Si vendiste y pasaron semanas sin noticias del trámite, no esperes más. La denuncia de
      venta es barata y rápida; las multas de un auto que manejás sin saber quién, no.
    </Note>

    <h2>Cómo llegar con todo listo</h2>
    <ol>
      <li>Pedí el informe de dominio y fijate que no haya prendas, embargos ni inhibiciones.</li>
      <li>Sacá el libre deuda de patentes y el de infracciones.</li>
      <li>Hacé la verificación policial.</li>
      <li>Completá el 08 y certificá las firmas.</li>
      <li>Sacá el CETA si corresponde por el valor.</li>
      <li>Turno en el registro, y no te vayas sin el comprobante del trámite iniciado.</li>
    </ol>

    <p>
      Ese último punto no es un detalle. El comprobante es lo único que después prueba que
      fuiste, cuándo, y con qué. Guardalo, y sacale una foto.
    </p>

    <p>
      Si estás por publicar, en {BRAND} <Link to="/vender">cargás el aviso vos mismo</Link> y el
      contacto va directo a tu WhatsApp: no hay un intermediario que se meta en la
      negociación ni en el trámite.
    </p>
  </>
)

const revisar = (
  <>
    <p className="prose__lead">
      Se puede saber bastante de un auto en veinte minutos, sin levantarlo y sin ser mecánico.
      No reemplaza una revisión en un taller —eso hacelo antes de pagar— pero sirve para
      decidir si vale la pena llegar hasta ahí.
    </p>

    <h2>Antes de ir a verlo</h2>
    <p>
      La mitad del trabajo se hace desde el teléfono, y es la mitad que más descarta:
    </p>
    <ul>
      <li>
        <strong>Pedí el número de dominio y sacá el informe.</strong> Si hay prenda, el auto
        tiene una deuda con un banco encima y no se puede transferir hasta cancelarla. Si hay
        embargo o inhibición, tampoco.
      </li>
      <li>
        <strong>Consultá las infracciones.</strong> Es gratis y dice mucho, no tanto por la
        plata como por cómo se usó el auto.
      </li>
      <li>
        <strong>Mirá el kilometraje contra el año.</strong> Quince mil kilómetros por año es
        lo normal. Un auto de diez años con 40.000 km no es una ganga: o estuvo parado —lo que
        trae sus propios problemas— o el cuentakilómetros no dice la verdad.
      </li>
    </ul>

    <h2>Cuando llegás</h2>
    <p>
      Pedí verlo de día, con el motor frío, y en un lugar que no sea la calle si se puede. Un
      auto recién andado esconde arranques difíciles, ruidos de motor frío y humo.
    </p>

    <h3>La chapa</h3>
    <p>
      Parate en una punta y mirá el auto a lo largo, casi de perfil, con la luz a favor. Las
      ondulaciones y los cambios de tono aparecen desde ahí y no de frente. Después:
    </p>
    <ul>
      <li>
        Los <strong>espacios entre paneles</strong>: puerta con guardabarros, capot con
        ópticas. Tienen que ser parejos de arriba abajo. Un espacio que se abre de un lado
        habla de un golpe enderezado.
      </li>
      <li>
        Los <strong>tornillos de las bisagras</strong>. Si tienen la pintura marcada o saltada,
        esa puerta o ese capot se sacaron alguna vez.
      </li>
      <li>
        El <strong>burlete</strong> de las puertas y del baúl: si por debajo aparece pintura
        con textura de cáscara de naranja, ahí hubo pintura nueva.
      </li>
      <li>
        El <strong>piso del baúl</strong>, debajo de la alfombra y de la rueda de auxilio. Es
        donde la humedad y los arreglos se ven sin que nadie los disimule.
      </li>
    </ul>

    <h3>El motor, en frío</h3>
    <ul>
      <li>
        <strong>El aceite</strong>: sacá la varilla. Tiene que ser aceite, no una pasta clara y
        espumosa. Si parece café con leche, hay agua mezclada y eso es caro.
      </li>
      <li>
        <strong>El refrigerante</strong>: color parejo, sin manchas aceitosas flotando.
      </li>
      <li>
        <strong>El arranque</strong>: que prenda a la primera. Escuchá los primeros segundos,
        que es cuando se oyen los ruidos que después el motor caliente tapa.
      </li>
      <li>
        <strong>El humo</strong>: un poco de vapor blanco al principio es normal en invierno.
        Humo azul es aceite quemándose. Humo negro constante es mezcla rica.
      </li>
      <li>
        <strong>Las luces del tablero</strong>: todas prenden al dar contacto y todas se
        apagan al arrancar. Si alguna no prende nunca, puede estar quemada a propósito.
      </li>
    </ul>

    <h3>Andando</h3>
    <p>
      Manejalo vos, no lo escuches de acompañante. Buscá un lugar con lomos de burro y otro
      donde puedas llegar a 80.
    </p>
    <ul>
      <li>Soltá el volante un segundo en recta: no se tiene que ir para un costado.</li>
      <li>Frená fuerte una vez: sin tirones, sin vibración en el pedal, sin desviarse.</li>
      <li>Pasá todos los cambios, incluida la marcha atrás.</li>
      <li>Sobre los lomos, escuchá los ruidos secos: suelen ser la suspensión.</li>
      <li>Probá el aire acondicionado, aunque sea julio. Recargarlo no es gratis.</li>
    </ul>

    <h2>Qué es motivo para irse</h2>
    <p>
      Hay cosas que se negocian y cosas que no. Cubiertas gastadas, una óptica rayada o un
      service atrasado se descuentan del precio. Estas, no:
    </p>
    <ul>
      <li>Números de motor o chasis que no coinciden con el título, o se ven regrabados.</li>
      <li>El vendedor no es el titular y no tiene cómo justificarlo.</li>
      <li>Prenda vigente y ninguna intención clara de cancelarla antes de la operación.</li>
      <li>Aceite lechoso.</li>
      <li>No te dejan llevarlo a un taller a revisar.</li>
    </ul>

    <Note>
      Ese último es el más importante. Un vendedor que no tiene nada que esconder no tiene
      problema en que un mecánico mire el auto. Si aparece una excusa, ya sabés.
    </Note>

    <h2>Antes de la seña</h2>
    <p>
      Revisión en un taller de confianza tuyo, no del vendedor. Cuesta poco al lado de lo que
      cuesta equivocarse. Y la seña, por escrito: quién, qué auto, cuánto, y qué pasa si
      alguno se arrepiente.
    </p>

    <p>
      En {BRAND} podés <Link to="/autos">filtrar por año, kilometraje y ubicación</Link> y ver
      quién publica cada aviso antes de escribir.
    </p>
  </>
)

const precio = (
  <>
    <p className="prose__lead">
      El precio es lo primero que se mira y lo único que decide si tu aviso entra o no en la
      búsqueda de alguien. Un auto bien puesto se vende en semanas. El mismo auto con diez por
      ciento de más se queda meses, y termina vendiéndose por menos de lo que valía.
    </p>

    <h2>Cómo se arma el precio</h2>
    <p>
      No mires lo que salió nuevo ni lo que pagaste. Mirá lo que se está pidiendo hoy por
      autos como el tuyo:
    </p>
    <ol>
      <li>
        <strong>Buscá tu mismo modelo, año y versión.</strong> La versión importa más de lo que
        parece: entre una base y una full hay una diferencia que no se ve en el título del
        aviso.
      </li>
      <li>
        <strong>Anotá diez precios</strong> y descartá los dos más altos y los dos más bajos.
        Los extremos son un vendedor soñando y alguien con un problema.
      </li>
      <li>
        <strong>Ubicate en el medio</strong> y movete desde ahí según kilometraje, estado y
        papeles.
      </li>
    </ol>
    <p>
      Acordate de que lo que ves son precios <em>pedidos</em>, no precios de venta. Lo que
      cierra suele estar algo por debajo.
    </p>

    <h2>Qué sube y qué baja el precio</h2>
    <p>Suben: kilometraje bajo y demostrable, service al día con comprobantes, único dueño, papeles en orden, y el color que el mercado busca. Bajan: modificaciones, granizo, un motor cambiado, y las deudas.</p>
    <p>
      Lo que <em>no</em> sube el precio, aunque duela: el equipo de música que le pusiste, las
      llantas, el polarizado. Eso lo pagaste vos y no lo paga el que compra.
    </p>

    <h2>El primer mes es el que importa</h2>
    <p>
      Un aviso nuevo aparece en las búsquedas de todos los que vienen mirando hace semanas —la
      gente con la decisión ya tomada, que reconoce un buen precio apenas lo ve—. Ese público
      se agota rápido. Si arrancás caro, lo gastás mostrándoles un precio que descartan, y
      cuando bajás ya no están.
    </p>
    <p>
      Por eso conviene arrancar cerca del precio real y dejar un margen chico para negociar, en
      vez de arrancar alto "por las dudas".
    </p>

    <h2>Si no entra ni una consulta</h2>
    <p>
      Dos semanas sin que nadie escriba no es mala suerte. Es información, y casi siempre es el
      precio. Antes de bajarlo, revisá que el problema no sea otro:
    </p>
    <ul>
      <li>
        <strong>Las fotos.</strong> De día, el auto limpio, sin nada atrás que distraiga, y las
        cuatro caras completas. Una foto de noche en un garage oscuro tira abajo cualquier
        precio.
      </li>
      <li>
        <strong>La descripción.</strong> Qué service tiene, qué se cambió, por qué lo vendés.
        Un aviso de dos renglones da la impresión de que hay algo que no se cuenta.
      </li>
      <li>
        <strong>Los datos.</strong> Si el kilometraje o la versión están mal cargados, tu auto
        no aparece en los filtros de quien lo busca.
      </li>
    </ul>
    <p>
      Si eso está bien y sigue sin moverse, bajá una vez y que se note. Cinco bajadas de dos
      mil pesos le dicen a todo el que viene mirando que si espera, baja de nuevo.
    </p>

    <p>
      En {BRAND} el precio lo ponés vos y lo negociás directo con el que pregunta: no hay un
      asesor en el medio empujando para cerrar. Antes de decidir, podés{' '}
      <Link to="/autos">mirar lo que se está pidiendo</Link> por autos como el tuyo, y{' '}
      <Link to="/vender">cargar el aviso</Link> cuando lo tengas.
    </p>
  </>
)

const estafas = (
  <>
    <p className="prose__lead">
      Casi todas las estafas con autos se parecen. Alguien tiene mucho apuro, la oferta es
      demasiado buena, y en algún momento te pide que saques la operación del lugar donde se
      puede verificar. Si reconocés ese patrón, ya esquivaste la mayoría.
    </p>

    <h2>Las que le tocan al que compra</h2>

    <h3>El auto que no existe</h3>
    <p>
      Fotos lindas, precio bastante debajo del mercado, y un vendedor que no puede mostrarlo
      ahora: está en otra provincia, lo tiene un familiar, lo manda por transporte. Pide una
      seña para "reservarlo" porque hay otro interesado. No hay auto.
    </p>
    <p>
      <strong>La señal:</strong> el precio fuera de rango y la imposibilidad de verlo. Nadie
      que vende de verdad se niega a mostrar el auto.
    </p>

    <h3>El que no es el titular</h3>
    <p>
      El auto existe y está bien, pero quien lo vende no es quien figura en el título. A veces
      es legítimo —una sucesión, un apoderado, una agencia— y a veces el auto tiene una prenda
      sin cancelar, un embargo, o directamente no es de quien lo ofrece.
    </p>
    <p>
      <strong>La señal:</strong> el nombre del título no coincide y las explicaciones cambian.
      Pedí el informe de dominio antes de señar. Siempre.
    </p>

    <h3>La transferencia que nunca llega</h3>
    <p>
      Pagás, te llevás el auto, y el vendedor desaparece antes de firmar. Te quedás con un auto
      que no podés poner a tu nombre.
    </p>
    <p>
      <strong>Cómo se evita:</strong> el 08 con las firmas certificadas se hace en el mismo
      momento del pago. No después, no "la semana que viene".
    </p>

    <h2>Las que le tocan al que vende</h2>

    <h3>La transferencia bancaria trucha</h3>
    <p>
      El comprador te muestra un comprobante de transferencia en la pantalla del teléfono y se
      lleva el auto. El comprobante está editado, o la transferencia se hizo y se reversó.
    </p>
    <p>
      <strong>La regla:</strong> no entregás nada hasta que la plata esté acreditada en tu
      cuenta y la veas vos, en tu homebanking, con el auto todavía ahí. Un comprobante en una
      pantalla ajena no es plata.
    </p>

    <h3>Los billetes falsos</h3>
    <p>
      En efectivo y con montos grandes, el riesgo es obvio. Si se paga así, que sea adentro de
      un banco, con la plata contada por una máquina.
    </p>

    <h3>La prueba de manejo que no vuelve</h3>
    <p>
      Suena elemental y sin embargo pasa. Nadie prueba el auto solo. Vas de acompañante, y
      antes de salir sacás una foto del DNI de quien va a manejar.
    </p>

    <h3>El "pago de más"</h3>
    <p>
      Te transfieren más de lo acordado, dicen que fue un error, y piden que devuelvas la
      diferencia por otro medio. La transferencia original después se reversa y la diferencia
      ya se la mandaste vos. Si aparece un pago de más, no devuelvas nada: que se reverse por
      donde vino.
    </p>

    <h2>La regla que las corta a todas</h2>
    <p>
      Todas estas necesitan lo mismo: apuro y un canal donde nadie pueda verificar nada. De
      ahí salen tres cosas simples.
    </p>
    <ul>
      <li>
        <strong>Nunca pagues ni cobres antes de ver el auto y a la persona.</strong> Ni seña,
        ni reserva, ni "para que no se lo lleve otro".
      </li>
      <li>
        <strong>Encontrate de día y en un lugar con gente.</strong> Idealmente en el banco, si
        hay plata de por medio.
      </li>
      <li>
        <strong>El apuro es de él, no tuyo.</strong> Todo lo que empieza con "tiene que ser
        hoy" se puede mirar con más tiempo. El que vende de verdad espera.
      </li>
    </ul>

    <Note>
      {BRAND} no interviene en el pago ni retiene plata de nadie. Si alguien te dice que tiene
      una garantía, un depósito o un seguro nuestro, es mentira: no existe ese producto.
    </Note>

    <p>
      Si ves una publicación rara, reportala desde la ficha del aviso. Con tres reportes de
      personas distintas se bloquea sola mientras alguien la mira. Si te quedan dudas, en el{' '}
      <Link to="/ayuda">centro de ayuda</Link> está el resto, y podés{' '}
      <Link to="/contacto">escribirnos</Link>.
    </p>
  </>
)

export const bodies: Record<string, ReactElement> = {
  'transferir-un-auto-en-argentina': transferir,
  'que-mirar-antes-de-comprar-un-usado': revisar,
  'ponerle-precio-a-tu-auto': precio,
  'estafas-al-comprar-o-vender-un-auto': estafas,
}
