/**
 * Aprovisionamiento GPON, tal como lo devuelve MS-RED.
 *
 * Los comandos llegan YA GENERADOS desde el servidor. Aquí no se arma ninguna
 * plantilla a propósito: es configuración que acaba en un equipo de red, y
 * tenerla escrita en dos sitios acaba con dos versiones distintas de la verdad.
 * Esta capa solo la muestra y la copia.
 */

/** Un comando con el paso que representa. */
export interface ComandoGpon {
  titulo: string;
  comando: string;
}

/** `GET /api/red/gpon/contratos/{codigo}` y respuesta del alta. */
export interface AprovisionamientoGpon {
  id: number;
  contratoId: number;
  contratoCodigo: string;
  nombreCliente: string;
  oltCodigo: string;
  oltNombre: string;
  /** Interfaz SIN el puerto ("0/1"); los comandos arman gpon {tarjeta}/{puerto}. */
  tarjeta: string;
  puerto: number;
  ontId: number;
  serialOnt: string;
  spGestion: number;
  spServicio: number;
  ipServicio: string | null;
  ipGestion: string | null;
  vlanGestion: number;
  vlanServicio: number;
  gemportGestion: number;
  userVlanGestion: number;
  gemportServicio: number;
  userVlanServicio: number;
  /** PENDIENTE = reservado pero aún no escrito en la OLT. */
  estado: 'PENDIENTE' | 'APLICADO' | 'ERROR';
  fechaAplicado: string | null;
  comandos: ComandoGpon[];
  scriptCompleto: string;
}

/**
 * Cuerpo de `POST /api/red/gpon/aprovisionar`.
 *
 * Solo lo que el sistema no puede saber solo. El número de ONT, los
 * service-port y las IP los reparte el backend: pedirlos aquí sería devolver a
 * una persona la decisión que precisamente se quiso automatizar.
 */
export interface AprovisionarGponRequest {
  contratoId: number;
  contratoCodigo: string;
  nombreCliente: string;
  serialOnt: string;
  /** Opcional: si va nulo, el backend elige el puerto PON menos ocupado. */
  puertoPonId?: number | null;
  /** Opcional: obligatorio solo cuando hay más de una OLT activa. */
  oltId?: number | null;
}

/** OLT para el selector del alta. */
export interface OltResumen {
  id: number;
  codigo: string;
  nombre: string;
  host: string | null;
  modelo: string | null;
}

/** Puerto PON con su ocupación; `libres` viene calculado del backend. */
export interface PuertoPonResumen {
  id: number;
  tarjeta: string;
  puerto: number;
  capacidadOnt: number;
  ocupados: number | null;
  libres: number | null;
  descripcion: string | null;
}
