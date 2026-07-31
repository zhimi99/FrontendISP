/**
 * MS-INVENTARIO · esquema `inventario`
 * Tipos derivados de V1__init_inventario.sql y de los DTOs de la capa REST
 * (catalogo/*, stock/*, equipos/*).
 *
 * Dos naturalezas conviven y no se mezclan:
 *  · EQUIPO   — unidad serializada (router, ONT), trazada de una en una.
 *  · MATERIAL — a granel (cable, conectores): solo cuánto queda y dónde.
 */

export type UnidadMedida = 'UNIDAD' | 'METRO' | 'ROLLO' | 'CAJA';
export type TipoUbicacion = 'BODEGA' | 'TECNICO';
export type TipoEquipo = 'ROUTER' | 'ONT' | 'ONU' | 'SWITCH' | 'ANTENA' | 'SPLITTER' | 'OTRO';
export type EstadoEquipo = 'DISPONIBLE' | 'ASIGNADO' | 'AVERIADO' | 'BAJA';
export type TipoMovimiento = 'INGRESO' | 'EGRESO' | 'TRASLADO' | 'AJUSTE';

/** `GET /api/materiales` */
export interface Material {
  id: number;
  codigo: string;
  nombre: string;
  unidad: UnidadMedida;
  stockMinimo: number;
  activo: boolean;
}

/** `GET /api/ubicaciones` */
export interface Ubicacion {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoUbicacion;
  usuarioId: number | null;
  activa: boolean;
}

/** `GET /api/materiales/bajo-stock` — lo que hay que reponer, con el faltante calculado. */
export interface MaterialBajoStock {
  materialId: number;
  codigo: string;
  nombre: string;
  unidad: UnidadMedida;
  stockMinimo: number;
  stockTotal: number;
  faltante: number;
}

/** `GET /api/existencias` — cuánto material hay en una ubicación. */
export interface Existencia {
  materialId: number;
  codigo: string;
  material: string;
  unidad: UnidadMedida;
  ubicacionId: number;
  ubicacion: string;
  cantidad: number;
}

/** `GET /api/equipos` — equipo serializado con su ubicación o contrato resueltos. */
export interface Equipo {
  id: number;
  tipo: TipoEquipo;
  marca: string;
  modelo: string;
  numeroSerie: string;
  macAddress: string | null;
  estado: EstadoEquipo;
  ubicacionId: number | null;
  ubicacion: string | null;
  contratoId: number | null;
  observacion: string | null;
}

/** `GET /api/movimientos/equipo/{id}` — un asiento del libro de inventario. */
export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  equipoId: number | null;
  equipoSerie: string | null;
  materialId: number | null;
  material: string | null;
  cantidad: number;
  origen: string | null;
  destino: string | null;
  contratoId: number | null;
  ordenTrabajoId: number | null;
  usuarioId: number | null;
  motivo: string | null;
  referencia: string | null;
  fecha: string;
}

export const UNIDAD_ETIQUETA: Record<UnidadMedida, string> = {
  UNIDAD: 'unidad(es)',
  METRO: 'metro(s)',
  ROLLO: 'rollo(s)',
  CAJA: 'caja(s)',
};

export const TIPO_EQUIPO_ETIQUETA: Record<TipoEquipo, string> = {
  ROUTER: 'Router',
  ONT: 'ONT',
  ONU: 'ONU',
  SWITCH: 'Switch',
  ANTENA: 'Antena',
  SPLITTER: 'Splitter',
  OTRO: 'Otro',
};

export const ESTADO_EQUIPO_ETIQUETA: Record<EstadoEquipo, string> = {
  DISPONIBLE: 'Disponible',
  ASIGNADO: 'Asignado',
  AVERIADO: 'Averiado',
  BAJA: 'Dado de baja',
};

export const ESTADO_EQUIPO_TONO: Record<EstadoEquipo, string> = {
  DISPONIBLE: 'ok',
  ASIGNADO: 'info',
  AVERIADO: 'warn',
  BAJA: 'neutral',
};

export const TIPO_UBICACION_ETIQUETA: Record<TipoUbicacion, string> = {
  BODEGA: 'Bodega',
  TECNICO: 'Técnico',
};
