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

/**
 * Cuerpo para generar un ticket (`POST /api/ordenes`), confirmado contra
 * OrdenController/CrearOrdenRequest de MS-OPERATIVO.
 *
 * `contratoId` es obligatorio: la orden es sobre un servicio concreto del cliente
 * (uno puede tener varios contratos), no sobre el cliente en general. `clienteId` es
 * redundante con el contrato pero el backend lo acepta aparte, así que se manda
 * igual. `tecnicoUsuarioId` existe para cuando despacho asigna al crear (no se usa
 * desde "Generar Soporte": ahí la orden nace PENDIENTE y se asigna después).
 */
export interface CrearOrdenRequest {
  tipo: TipoOrden;
  prioridad: PrioridadOrden;
  contratoId: number;
  clienteId: number | null;
  descripcion: string;
  fechaProgramada: string | null;
  tecnicoUsuarioId: number | null;
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
