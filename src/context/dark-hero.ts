import { createContext } from 'react'

/**
 * Por dónde una pantalla avisa que arranca con un hero oscuro a sangre.
 *
 * La navbar tiene que ser legible sobre lo que tenga debajo, y eso lo sabe la
 * pantalla, no la barra. Antes lo decidía comparando la ruta con `/`, así que
 * la portada quedaba bien y las otras seis que también arrancan en tinta
 * ---concesionarias, el garage de alguien, la landing del garage, ayuda,
 * niveles y el perfil--- se llevaban una barra blanca encima de un fondo negro.
 *
 * Una lista de rutas acá adentro arreglaba esas seis y dejaba el mismo problema
 * para la séptima: nada obliga a acordarse de sumarla. Declarándolo la pantalla,
 * el que escribe el hero oscuro está mirando el hero oscuro.
 *
 * El valor es el `setState` del layout, que es estable, así que el contexto no
 * cambia de identidad y no repinta a nadie.
 */
export const DarkHeroContext = createContext<(dark: boolean) => void>(() => {})
