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
