/**
 * MS-OPERATIVO Y TÉCNICOS
 *
 * ATENCIÓN: este microservicio TODAVÍA NO EXISTE en el backend. Estos tipos son
 * una propuesta derivada del diagrama de arquitectura (órdenes de trabajo,
 * asignación a técnicos, control de estados, cierre con uso de materiales) y
 * deben revalidarse cuando se defina el esquema real.
 */

export type TipoOrden = 'INSTALACION' | 'SOPORTE' | 'RETIRO' | 'MANTENIMIENTO' | 'TRASLADO';

export type EstadoOrden = 'PENDIENTE' | 'ASIGNADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

export type PrioridadOrden = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface Tecnico {
  id: number;
  codigo: string;
  nombre: string;
  telefono?: string;
  zona?: string;
  activo: boolean;
}

/** Material consumido al cerrar la orden (descuenta del MS-INVENTARIO). */
export interface MaterialUsado {
  id: number;
  ordenId: number;
  descripcion: string;
  cantidad: number;
  unidad: string;
}

export interface OrdenTrabajo {
  id: number;
  codigo: string;
  tipo: TipoOrden;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  /** Referencias lógicas a contratos.contrato / contratos.cliente */
  contratoId?: number;
  clienteId?: number;
  descripcion: string;
  direccionTexto?: string;
  latitud?: number;
  longitud?: number;
  tecnicoId?: number;
  fechaCreacion: string;
  fechaProgramada?: string;
  fechaCierre?: string;
  observacionCierre?: string;
  materiales?: MaterialUsado[];
}

export interface OrdenVista extends OrdenTrabajo {
  clienteNombre: string;
  contratoCodigo?: string;
  tecnicoNombre?: string;
}

export const TIPO_ORDEN_ETIQUETA: Record<TipoOrden, string> = {
  INSTALACION: 'Instalación',
  SOPORTE: 'Soporte',
  RETIRO: 'Retiro',
  MANTENIMIENTO: 'Mantenimiento',
  TRASLADO: 'Traslado',
};

export const ESTADO_ORDEN_ETIQUETA: Record<EstadoOrden, string> = {
  PENDIENTE: 'Pendiente',
  ASIGNADA: 'Asignada',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

export const ESTADO_ORDEN_TONO: Record<EstadoOrden, string> = {
  PENDIENTE: 'warn',
  ASIGNADA: 'info',
  EN_PROCESO: 'info',
  COMPLETADA: 'ok',
  CANCELADA: 'neutral',
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
