/**
 * Topes de largo de los campos de texto libre.
 *
 * Las columnas son `text` de Postgres, que no tiene limite, y los formularios
 * solo pedian que no estuvieran vacios. Que nadie escriba una ciudad de
 * doscientos caracteres a proposito no quiere decir que no vaya a pasar: entra
 * pegando cualquier cosa desde el portapapeles, y una vez adentro sale por
 * donde no se espera. El preview del aviso fue el primero ---el encabezado se
 * comia el lugar del texto y el corte empezaba a devolver de mas--- pero el
 * titulo de un aviso tambien viaja al `<title>`, a la card, al sitemap y al
 * mensaje de WhatsApp.
 *
 * Los numeros no son redondos por casualidad: son lo que entra sin romper el
 * lugar donde se muestran. La descripcion es la unica generosa porque tiene
 * pantalla propia.
 */
export const LIMITS = {
  /** "Mercedes-Benz" son 13. Con 40 entra cualquier marca real. */
  make: 40,
  /** Los modelos largos son tipo "Grand Cherokee Trailhawk": 26. */
  model: 40,
  /** "Luxe 1.6 Tiptronic Techo Panoramico" son 35. */
  trim: 60,
  /** "San Miguel de Tucuman" son 21; los barrios largos, unos 30. */
  city: 60,
  /** El nombre que se muestra en el perfil y al lado de cada aviso. */
  name: 60,
  /** El nombre de una busqueda guardada, que va en una fila de la lista. */
  searchName: 60,
  /** Tiene pantalla propia: es el unico campo donde alguien cuenta algo. */
  description: 4000,
  /** La nota de cada auto del garage, que va abajo de la foto. */
  garageNote: 280,
} as const

/**
 * El formulario de contacto, que ademas tiene minimos.
 *
 * La migracion 019 los declara como `check` de la tabla: un nombre de una letra
 * o un mensaje de diez caracteres no se rechazan con un cartel del formulario,
 * se rechazan con un error de Postgres que dice `violates check constraint` y
 * que nadie va a entender ---ni el que escribe ni el que lo lee despues.
 *
 * Los numeros son los de la migracion, y hay un test que los compara contra el
 * SQL: el que los afloje en el formulario tiene que aflojarlos tambien alla.
 */
export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  email: { min: 6, max: 160 },
  message: { min: 20, max: 4000 },
} as const
