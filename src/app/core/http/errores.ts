/**
 * Mensajes de error HTTP, en un solo lugar.
 *
 * Antes cada pantalla reimplementaba su propio `if (e.status === X) return '...'`,
 * repitiendo literalmente 15 veces el mismo texto para "no hay gateway" y su propia
 * versión del extractor del cuerpo de error de Spring. El contenido (qué decir para
 * cada código, en cada pantalla) sigue siendo de cada pantalla —"no tienes permiso
 * para cobrar" y "no tienes permiso para ver clientes" son mensajes distintos a
 * propósito—; lo que se centraliza es la mecánica: detectar que no hubo respuesta,
 * leer el detalle que manda el backend, y resolver cuál texto mostrar.
 */

/** Lo mínimo que hace falta leer de una respuesta HTTP fallida. */
export interface RespuestaError {
  status?: number;
  error?: unknown;
  statusText?: string;
}

/** Único texto para "el gateway no respondió" en toda la app. */
export const MENSAJE_SIN_GATEWAY = 'No se pudo contactar el gateway (¿está arriba en :8089?).';

/**
 * Extrae el mensaje que manda el backend en el cuerpo del error (formato Spring
 * típico: `message`, `mensaje`, o un arreglo `errors[]` de bean validation).
 * `null` si el cuerpo no trae nada legible, para que el llamador use su propio texto.
 */
export function detalleErrorBackend(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b['message'] === 'string') return b['message'];
  if (typeof b['mensaje'] === 'string') return b['mensaje'];
  if (Array.isArray(b['errors'])) {
    return b['errors']
      .map((x) => (typeof x === 'string' ? x : ((x as Record<string, unknown>)?.['defaultMessage'] ?? JSON.stringify(x))))
      .join('; ');
  }
  return null;
}

/**
 * Un texto fijo, o una función que arma el texto a partir del error completo (para
 * citar el propio código, o mirar el detalle que mandó el backend). Si la función
 * devuelve un valor falsy, `mensajeError` sigue probando las siguientes reglas —así
 * un código puede decir "usa el detalle del backend si lo hay, si no cae al resto".
 */
type ReglaMensaje = string | ((e: RespuestaError) => string | null | undefined | false);

export interface OpcionesMensajeError {
  /** Texto específico por código HTTP. Lo que no esté aquí cae a `generico`. */
  porEstado?: Partial<Record<number, ReglaMensaje>>;
  /** Cuando ningún código específico aplicó. Por defecto: "No se pudo completar la operación." */
  generico?: ReglaMensaje;
}

/**
 * Resuelve el texto a mostrar para un error HTTP.
 *
 * Orden: primero la regla de `porEstado` para ese código (si la hay y no cae al
 * genérico); si el código es 0 y nadie lo cubrió, {@link MENSAJE_SIN_GATEWAY}; si no,
 * `generico`.
 */
export function mensajeError(e: RespuestaError, opciones: OpcionesMensajeError = {}): string {
  const regla = e.status != null ? opciones.porEstado?.[e.status] : undefined;
  const especifico = typeof regla === 'function' ? regla(e) : regla;
  if (especifico) return especifico;

  if (e.status === 0) return MENSAJE_SIN_GATEWAY;

  const generico = typeof opciones.generico === 'function' ? opciones.generico(e) : opciones.generico;
  return generico || 'No se pudo completar la operación.';
}
