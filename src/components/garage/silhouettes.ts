import type { BodyType } from '../../types'

/**
 * Las siluetas de los autos del garage, una por carrocería.
 *
 * Son datos y no componentes para que la escena pueda poner la misma silueta
 * en cuatro fondos distintos —con otra escala, o punteada en el que se
 * extraña— sin dibujarla cuatro veces.
 *
 * ---------------------------------------------------------------------------
 * CONTRATO DE UNA SILUETA — además del de `scenes.tsx`
 * ---------------------------------------------------------------------------
 *
 * - Marco propio: el suelo es y = 0, hacia arriba es negativo, y el auto entra
 *   en x ∈ [-80, 80] con y ≥ -78. La escena la ubica con un `translate`, así
 *   que una silueta que se sale de ese marco se come el fondo.
 * - El frente mira a +x. Todas para el mismo lado, o dos garages juntos
 *   parecen autos chocando.
 * - `body` es el contorno abierto por abajo: arranca en el suelo atrás y
 *   termina en el suelo adelante. El borde de abajo lo pone la línea del
 *   suelo de la escena, como en los dibujos originales.
 * - Las ruedas se centran en el suelo, no apoyadas encima: es la convención
 *   que ya tenían las escenas.
 * - Sin acento. El amarillo lo lleva el fondo: el contrato permite uno solo
 *   por escena.
 */
export interface Silhouette {
  /** Contorno, de atrás a adelante. */
  body: string
  /** Ventanillas, parantes, lo que va adentro del contorno. */
  details: string[]
  /** Centro en x de la rueda trasera y la delantera. */
  wheels: [number, number]
  wheelRadius: number
  /**
   * Dónde van los paragolpes cromados de un clásico: el x de la cola, el x de
   * la trompa y la altura. Coinciden con los extremos del contorno.
   */
  bumpers: { rear: number; front: number; y: number }
}

export const SILHOUETTES: Record<BodyType, Silhouette> = {
  /* Tres volúmenes: baúl, cabina y capot bien separados. */
  sedan: {
    body: 'M-80 0V-20Q-80 -27 -72 -29L-52 -32L-34 -54Q-30 -59 -23 -59H17Q24 -59 28 -54L45 -33L71 -28Q80 -26 80 -17V0',
    details: ['M-52 -32H45', 'M-4 -32V-59'],
    wheels: [-48, 50],
    wheelRadius: 14,
    bumpers: { rear: -80, front: 80, y: -12 },
  },

  /* Corto de atrás: la luneta cae casi derecho desde el techo. */
  hatchback: {
    body: 'M-64 0V-24Q-64 -30 -61 -34L-51 -54Q-48 -59 -42 -59H4Q11 -59 15 -54L32 -33L56 -28Q65 -26 65 -17V0',
    details: ['M-60 -33H32', 'M-10 -33V-59'],
    wheels: [-40, 42],
    wheelRadius: 13,
    bumpers: { rear: -64, front: 65, y: -12 },
  },

  /* Alto y cuadrado, con barras en el techo: lo que se reconoce de lejos. */
  suv: {
    body: 'M-70 0V-30Q-70 -36 -67 -39L-61 -65Q-59 -72 -52 -72H10Q17 -72 21 -67L39 -45L61 -40Q70 -38 70 -29V0',
    details: ['M-65 -45H39', 'M-14 -45V-72', 'M-46 -77H4', 'M-38 -72V-77M-4 -72V-77'],
    wheels: [-44, 46],
    wheelRadius: 16,
    bumpers: { rear: -70, front: 70, y: -14 },
  },

  /* Cabina adelante y caja atrás, abierta: la caja es la mitad del auto. */
  pickup: {
    body: 'M-80 0V-34H-20V-60Q-20 -66 -14 -66H18Q25 -66 28 -61L42 -39L66 -35Q75 -33 75 -24V0',
    details: ['M-20 -39H42', 'M2 -39V-66'],
    wheels: [-52, 46],
    wheelRadius: 15,
    bumpers: { rear: -80, front: 75, y: -12 },
  },

  /* Bajo, capot largo, y la luneta que baja hasta la cola en una sola línea. */
  coupe: {
    body: 'M-80 0V-18Q-80 -24 -73 -26L-49 -32L-19 -44Q-13 -48 -6 -48H14Q22 -48 27 -43L43 -30L71 -26Q80 -24 80 -15V0',
    details: ['M-49 -32H43'],
    wheels: [-50, 52],
    wheelRadius: 14,
    bumpers: { rear: -80, front: 80, y: -10 },
  },

  /* Un solo volumen alto, con la puerta corrediza marcada. */
  van: {
    body: 'M-78 0V-66Q-78 -74 -70 -74H16Q24 -74 28 -68L46 -38L68 -32Q77 -29 77 -20V0',
    details: ['M-78 -44H42', 'M12 -44V-74', 'M-24 -44V-4'],
    wheels: [-50, 48],
    wheelRadius: 14,
    bumpers: { rear: -78, front: 77, y: -12 },
  },
}

/**
 * Hasta qué año un auto se dibuja como clásico: paragolpes cromados y tazas.
 *
 * No es una fecha técnica, es la que se ve: en Argentina los paragolpes de
 * plástico se generalizan a fines de los ochenta, y un Falcon del 80 o un 12
 * del 78 sin cromados no se reconocen.
 */
export const CLASSIC_BEFORE = 1990
