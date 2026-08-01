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

/* =====================================================================
 *  DTOs de la capa REST (lo que devuelven /api/pagos y /api/cajas)
 * ===================================================================== */

/** Reparto de un pago a una factura (denormalizado en MS-FINANZAS). */
export interface AplicacionPago {
  facturaId: number;
  facturaNumero: string | null;
  montoAplicado: number;
}

/** Fila de `GET /api/pagos`: la recaudación con su caja y reparto resueltos. */
export interface PagoCobranza {
  id: number;
  numeroRecibo: string;
  clienteId: number;
  contratoId: number | null;
  fecha: string;
  monto: number;
  formaPago: FormaPago;
  estado: EstadoPago;
  referencia: string | null;
  banco: string | null;
  sesionCajaId: number | null;
  cajaCodigo: string | null;
  cajaNombre: string | null;
  usuarioId: number | null;
  observacion: string | null;
  aplicaciones: AplicacionPago[];
}

/** Pago con el nombre del cliente ya resuelto (cruzado con /api/clientes en el front). */
export interface PagoCobranzaVista extends PagoCobranza {
  clienteNombre: string;
}

/** Resumen de la sesión abierta de una caja (de `GET /api/cajas`). */
export interface SesionAbierta {
  id: number;
  usuarioId: number;
  fechaApertura: string;
  montoInicial: number;
  totalRecaudado: number;
  cantidadPagos: number;
  efectivoEnCaja: number;
}

/** Una línea del reparto en el alta de pago. */
export interface AplicacionPagoReq {
  facturaId: number;
  facturaNumero: string | null;
  montoAplicado: number;
}

/** Cuerpo del alta de recaudación (`POST /api/pagos`). */
export interface RegistrarPagoRequest {
  clienteId: number;
  contratoId: number | null;
  monto: number;
  formaPago: FormaPago;
  referencia: string | null;
  banco: string | null;
  sesionCajaId: number | null;
  observacion: string | null;
  aplicaciones: AplicacionPagoReq[];
}

/** Respuesta del alta: el recibo recién emitido. */
export interface PagoRegistrado {
  id: number;
  numeroRecibo: string;
  monto: number;
  estado: EstadoPago;
  fecha: string;
}

/** Fila de `GET /api/cajas`: la caja con el estado de su jornada. */
export interface CajaEstado {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  activa: boolean;
  sesionAbierta: SesionAbierta | null;
}

/** Cuerpo de la apertura de caja (`POST /api/cajas/{id}/abrir`). */
export interface AbrirCajaRequest {
  montoInicial: number;
  observacion: string | null;
}

/** Cuerpo del cierre de caja (`POST /api/cajas/{id}/cerrar`). */
export interface CerrarCajaRequest {
  montoFinalDeclarado: number;
  observacion: string | null;
}

/** Arqueo de una sesión de caja: lo esperado vs. lo declarado y su diferencia. */
export interface CierreCaja {
  sesionId: number;
  cajaId: number;
  cajaCodigo: string;
  cajaNombre: string;
  usuarioId: number;
  fechaApertura: string;
  fechaCierre: string;
  montoInicial: number;
  montoFinalSistema: number;
  montoFinalDeclarado: number;
  /** declarado − sistema: negativo = faltante, positivo = sobrante. */
  diferencia: number;
}

/** Reporte de cierres de caja en un período, con su resumen agregado. */
export interface CierresReporte {
  desde: string;
  hasta: string;
  cierres: CierreCaja[];
  resumen: {
    cantidad: number;
    sumaInicial: number;
    sumaSistema: number;
    sumaDeclarado: number;
    sumaDiferencia: number;
  };
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
