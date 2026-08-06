/**
 * MS-RED · esquema `red`
 * Estado de red de cada contrato: el perfil que debería tener aplicado en el RADIUS
 * frente al que tiene de verdad. El grueso del trabajo de este servicio entra por el
 * bus (eventos servicio.*); la API es para mirar y para forzar una re-sincronización.
 */

/** Fila de `GET /api/red/abonados`. Sin bitácora: eso lo trae el detalle. */
export interface AbonadoRedResumen {
  contratoId: number;
  contratoCodigo: string;
  tipoConexion: string | null;
  pppoeUsuario: string | null;
  nasIdentificador: string | null;
  estadoServicio: string | null;
  /** Lo que debería estar aplicado en la red. */
  perfilDeseado: string | null;
  /** Lo que la red tiene puesto de verdad. */
  perfilAplicado: string | null;
  sincronizado: boolean;
  ultimaSync: string | null;
  ultimoEvento: string | null;
}

/** Un asiento de la bitácora de red de un abonado. */
export interface OperacionRed {
  accion: string | null;
  resultado: string | null;
  perfil: string | null;
  canal: string | null;
  detalle: string | null;
  fecha: string;
}

/** `GET /api/red/abonados/{contratoId}` — el detalle con su bitácora. */
export interface AbonadoRed extends AbonadoRedResumen {
  nasIp: string | null;
  operaciones: OperacionRed[];
}

/** Tono del badge según el resultado de una operación en la red. */
export const RESULTADO_RED_TONO: Record<string, string> = {
  OK: 'ok',
  EXITO: 'ok',
  ERROR: 'danger',
  FALLO: 'danger',
  PENDIENTE: 'warn',
};
