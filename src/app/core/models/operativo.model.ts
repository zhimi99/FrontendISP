/**
 * MS-OPERATIVO Y TÉCNICOS · esquema `operativo`
 * Tipos derivados de OrdenDto (órdenes de trabajo). Es quien emite
 * `orden.completada`, el evento que activa el alta del contrato.
 */

export type EstadoOrden = 'PENDIENTE' | 'ASIGNADA' | 'EN_PROCESO' | 'CERRADA' | 'CANCELADA';
export type TipoOrden = 'INSTALACION' | 'SOPORTE' | 'RETIRO';
export type PrioridadOrden = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

/** `GET /api/ordenes` — una orden de trabajo tal y como se consulta. */
export interface Orden {
  id: number;
  numero: string;
  tipo: TipoOrden;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  contratoId: number | null;
  clienteId: number | null;
  tecnicoUsuarioId: number | null;
  creadaPor: number | null;
  descripcion: string | null;
  resultado: string | null;
  motivoCancelacion: string | null;
  fechaProgramada: string | null;
  fechaAsignacion: string | null;
  fechaInicio: string | null;
  fechaCierre: string | null;
}

export const ESTADO_ORDEN_ETIQUETA: Record<EstadoOrden, string> = {
  PENDIENTE: 'Pendiente',
  ASIGNADA: 'Asignada',
  EN_PROCESO: 'En proceso',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export const ESTADO_ORDEN_TONO: Record<EstadoOrden, string> = {
  PENDIENTE: 'warn',
  ASIGNADA: 'info',
  EN_PROCESO: 'info',
  CERRADA: 'ok',
  CANCELADA: 'neutral',
};

export const TIPO_ORDEN_ETIQUETA: Record<TipoOrden, string> = {
  INSTALACION: 'Instalación',
  SOPORTE: 'Soporte',
  RETIRO: 'Retiro',
};

export const PRIORIDAD_ETIQUETA: Record<PrioridadOrden, string> = {
  BAJA: 'Baja',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const PRIORIDAD_TONO: Record<PrioridadOrden, string> = {
  BAJA: 'neutral',
  NORMAL: 'info',
  ALTA: 'warn',
  URGENTE: 'danger',
};
