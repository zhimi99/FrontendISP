/**
 * MS-INVENTARIO E INFRAESTRUCTURA
 *
 * ATENCIÓN: este microservicio TODAVÍA NO EXISTE en el backend. Estos tipos son
 * una propuesta derivada del diagrama de arquitectura (control de stock, números
 * de serie, direcciones MAC, asignación de equipos a contratos) y deben
 * revalidarse cuando se defina el esquema real.
 */

export type TipoEquipo = 'ROUTER' | 'ONT' | 'SPLITTER' | 'SWITCH' | 'ANTENA' | 'CABLE' | 'CONECTOR';

export type EstadoEquipo = 'DISPONIBLE' | 'ASIGNADO' | 'EN_REPARACION' | 'DANIADO' | 'BAJA';

export interface Bodega {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion?: string;
}

export interface Equipo {
  id: number;
  codigo: string;
  tipo: TipoEquipo;
  marca: string;
  modelo: string;
  numeroSerie?: string;
  macAddress?: string;
  estado: EstadoEquipo;
  bodegaId?: number;
  /** Referencia lógica a contratos.contrato */
  contratoId?: number;
  costoUnitario: number;
  fechaIngreso: string;
}

/** Insumos que se consumen por metro/unidad y no llevan número de serie. */
export interface ItemStock {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: TipoEquipo;
  unidad: string;
  cantidadDisponible: number;
  stockMinimo: number;
  costoUnitario: number;
  bodegaId: number;
}

export interface EquipoVista extends Equipo {
  bodegaNombre?: string;
  contratoCodigo?: string;
  clienteNombre?: string;
}

export const TIPO_EQUIPO_ETIQUETA: Record<TipoEquipo, string> = {
  ROUTER: 'Router',
  ONT: 'ONT',
  SPLITTER: 'Splitter',
  SWITCH: 'Switch',
  ANTENA: 'Antena',
  CABLE: 'Cable',
  CONECTOR: 'Conector',
};

export const ESTADO_EQUIPO_ETIQUETA: Record<EstadoEquipo, string> = {
  DISPONIBLE: 'Disponible',
  ASIGNADO: 'Asignado',
  EN_REPARACION: 'En reparación',
  DANIADO: 'Dañado',
  BAJA: 'Dado de baja',
};

export const ESTADO_EQUIPO_TONO: Record<EstadoEquipo, string> = {
  DISPONIBLE: 'ok',
  ASIGNADO: 'info',
  EN_REPARACION: 'warn',
  DANIADO: 'danger',
  BAJA: 'neutral',
};
