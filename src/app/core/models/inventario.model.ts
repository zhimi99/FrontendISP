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

/**
 * Mantenimiento del catálogo (solo ADMIN).
 *
 * El código no aparece en las peticiones de edición: es la referencia que quedó
 * escrita en cada movimiento del histórico y en los papeles de bodega. Tampoco el
 * tipo de una ubicación, que es lo que da sentido a los movimientos ya registrados.
 */
export interface CrearMaterialRequest {
  codigo: string;
  nombre: string;
  unidad: UnidadMedida;
  stockMinimo: number;
}

export interface EditarMaterialRequest {
  nombre: string;
  unidad: UnidadMedida;
  stockMinimo: number;
}

export interface CrearUbicacionRequest {
  codigo: string;
  nombre: string;
  tipo: TipoUbicacion;
  usuarioId: number | null;
}

export interface EditarUbicacionRequest {
  nombre: string;
  usuarioId: number | null;
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

/** Cuerpo del ingreso de material comprado (`POST /api/ingresos`). */
export interface IngresoStockRequest {
  materialId: number;
  cantidad: number;
  ubicacionDestinoId: number;
  /** Factura/guía de la compra, para poder rastrear de dónde vino. */
  referencia: string | null;
}

/** Cuerpo del consumo de material en una instalación (`POST /api/consumos`). */
export interface ConsumoStockRequest {
  materialId: number;
  cantidad: number;
  ubicacionOrigenId: number;
  ordenTrabajoId: number | null;
  contratoId: number | null;
}

/** Cuerpo del traslado entre ubicaciones (`POST /api/traslados`). */
export interface TrasladoStockRequest {
  materialId: number;
  cantidad: number;
  ubicacionOrigenId: number;
  ubicacionDestinoId: number;
}

/** Cuerpo del ajuste por conteo físico (`POST /api/ajustes`). */
export interface AjusteStockRequest {
  materialId: number;
  cantidad: number;
  ubicacionId: number;
  /** true si había MÁS de lo que decía el sistema. */
  sobra: boolean;
  /** Obligatorio: un ajuste sin explicación es un descuadre encubierto. */
  motivo: string;
}

/** Cuerpo del alta de equipo (`POST /api/equipos`). */
export interface AltaEquipoRequest {
  tipo: TipoEquipo;
  marca: string;
  modelo: string;
  numeroSerie: string;
  macAddress: string | null;
  ubicacionId: number;
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

export const TIPO_MOVIMIENTO_ETIQUETA: Record<TipoMovimiento, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  TRASLADO: 'Traslado',
  AJUSTE: 'Ajuste',
};

export const TIPO_MOVIMIENTO_TONO: Record<TipoMovimiento, string> = {
  INGRESO: 'ok',
  EGRESO: 'danger',
  TRASLADO: 'info',
  AJUSTE: 'warn',
};

export const TIPO_UBICACION_ETIQUETA: Record<TipoUbicacion, string> = {
  BODEGA: 'Bodega',
  TECNICO: 'Técnico',
};
