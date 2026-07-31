/**
 * MS-FINANZAS Y COBRANZAS · esquema `finanzas`
 * Tipos derivados de V1__init_finanzas.sql.
 */

export type FormaPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'DEPOSITO'
  | 'TARJETA'
  | 'CHEQUE'
  | 'PASARELA';

export type EstadoPago = 'REGISTRADO' | 'CONFIRMADO' | 'ANULADO';
export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export interface Caja {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion?: string;
  activa: boolean;
}

export interface SesionCaja {
  id: number;
  cajaId: number;
  usuarioId: number;
  fechaApertura: string;
  montoInicial: number;
  fechaCierre?: string;
  /** Calculado por el sistema al cerrar */
  montoFinalSistema?: number;
  /** Lo que el cajero declara tras contar */
  montoFinalDeclarado?: number;
  /** Derivado en la BD: declarado - sistema */
  diferencia?: number;
  estado: EstadoCaja;
  observacion?: string;
}

export interface PagoAplicacion {
  id: number;
  pagoId: number;
  facturaId: number;
  facturaNumero?: string;
  montoAplicado: number;
}

export interface Pago {
  id: number;
  numeroRecibo: string;
  clienteId: number;
  contratoId?: number;
  fecha: string;
  monto: number;
  formaPago: FormaPago;
  referencia?: string;
  banco?: string;
  sesionCajaId?: number;
  usuarioId?: number;
  estado: EstadoPago;
  motivoAnulacion?: string;
  observacion?: string;
  aplicaciones?: PagoAplicacion[];
}

export interface MovimientoCaja {
  id: number;
  sesionCajaId: number;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  pagoId?: number;
  usuarioId?: number;
  fecha: string;
}

/** Vista `v_recaudacion_diaria` para el dashboard financiero. */
export interface RecaudacionDiaria {
  fecha: string;
  formaPago: FormaPago;
  cantidadPagos: number;
  totalRecaudado: number;
}

/** Fila de la grilla de pagos con el cliente ya resuelto. */
export interface PagoVista extends Pago {
  clienteNombre: string;
  cajaNombre?: string;
  cajeroNombre?: string;
}

export const FORMA_PAGO_ETIQUETA: Record<FormaPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
  TARJETA: 'Tarjeta',
  CHEQUE: 'Cheque',
  PASARELA: 'Pasarela',
};

export const ESTADO_PAGO_FIN_ETIQUETA: Record<EstadoPago, string> = {
  REGISTRADO: 'Registrado',
  CONFIRMADO: 'Confirmado',
  ANULADO: 'Anulado',
};

export const ESTADO_PAGO_FIN_TONO: Record<EstadoPago, string> = {
  REGISTRADO: 'info',
  CONFIRMADO: 'ok',
  ANULADO: 'neutral',
};
