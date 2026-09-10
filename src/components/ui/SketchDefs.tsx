/**
 * El temblor del trazo, compartido por los dibujos del garage y los de niveles.
 *
 * Una línea recta de SVG se lee como diagrama. `feTurbulence` genera ruido y
 * `feDisplacementMap` empuja cada punto del trazo con ese ruido, así que la
 * recta queda apenas ondulada — que es lo que hace la mano.
 *
 * La escala es baja a propósito: pasando de 3 deja de parecer dibujado y
 * empieza a parecer roto.
 *
 * Se declara una sola vez por página. Si no está, los dibujos se ven igual pero
 * con el trazo recto: el filtro es una mejora, no un requisito.
 */
export function SketchDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="autana-sketch" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
