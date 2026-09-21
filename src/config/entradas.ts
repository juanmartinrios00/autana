/**
 * Las puertas de entrada: rutas que muestran la portada tal cual, para saber
 * de dónde vino la gente.
 *
 * En TikTok los videos no llevan links que se puedan tocar; el único es el de
 * la bio. Si ese link es `auteando.com/tiktok`, las visitas que trae aparecen
 * en Cloudflare Web Analytics como una página propia, separadas de las que
 * escriben la dirección a mano. Lo mismo con Instagram.
 *
 * No redirigen: una redirección pasa antes de que cargue el contador de
 * Cloudflare, que entonces anota la portada y la puerta se pierde. Muestran la
 * portada en su propia URL, y el worker les pone de canonical `/` para que
 * Google no las tome por páginas duplicadas.
 *
 * Para sumar una: agregarla acá. La ruta y el canonical salen de esta lista.
 */
export const ENTRADAS = ['tiktok', 'instagram'] as const
