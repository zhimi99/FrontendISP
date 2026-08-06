/**
 * MS-FACTURACIÓN ELECTRÓNICA · esquema `facturacion`
 * Tipos derivados de V1__init_facturacion.sql (SRI Ecuador).
 */

export type TipoComprobante = 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
export type AmbienteSri = 'PRUEBAS' | 'PRODUCCION';

/** Ciclo de vida del comprobante frente al SRI */
export type EstadoSri =
  | 'GENERADA'
  | 'FIRMADA'
  | 'ENVIADA'
  | 'RECIBIDA'
  | 'AUTORIZADA'
  | 'NO_AUTORIZADA'
  | 'DEVUELTA'
  | 'ANULADA';

/** Estado de cobro; lo actualiza MS-FINANZAS con el evento pago.aplicado */
export type EstadoPagoFactura = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'ANULADA';

/**
 * `GET /api/emisor` — los datos del ISP ante el SRI.
 *
 * `certificadoAlias` es solo la referencia al certificado de firma: ni el .p12 ni su
 * contraseña pasan nunca por esta API.
 */
export interface Emisor {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccionMatriz: string;
  ambiente: AmbienteSri;
  contribuyenteEspecial: string | null;
  obligadoContabilidad: boolean;
  certificadoAlias: string | null;
  activo: boolean;
  /** Cuántos comprobantes se han emitido ya: es lo que bloquea el RUC. */
  facturasEmitidas: number;
  rucEditable: boolean;
}

/** Cuerpo de `PUT /api/emisor` (solo ADMIN). */
export interface EditarEmisorRequest {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccionMatriz: string;
  ambiente: AmbienteSri;
  contribuyenteEspecial: string | null;
  obligadoContabilidad: boolean;
  certificadoAlias: string | null;
}

export interface FacturaDetalle {
  id: number;
  facturaId: number;
  linea: number;
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  tarifaIva: number;
  valorIva: number;
  total: number;
}

export interface Factura {
  id: number;
  tipoComprobante: TipoComprobante;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  /** Derivado en la BD: 001-001-000000123 */
  numeroDocumento: string;
  claveAcceso?: string;
  ambiente: AmbienteSri;

  /** Referencias lógicas a otros microservicios (sin FK entre esquemas) */
  contratoId?: number;
  clienteId?: number;

  /** Snapshot legal del cliente al momento de emitir */
  clienteIdentificacion: string;
  clienteRazonSocial: string;
  clienteDireccion?: string;
  clienteEmail?: string;

  periodo?: string;
  fechaEmision: string;
  fechaVencimiento: string;

  subtotalSinImpuestos: number;
  descuento: number;
  baseImponibleIva: number;
  baseImponibleIva0: number;
  valorIva: number;
  total: number;
  saldoPendiente: number;

  estadoPago: EstadoPagoFactura;
  estadoSri: EstadoSri;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;

  xmlFirmadoUrl?: string;
  ridePdfUrl?: string;
  motivoAnulacion?: string;

  detalle?: FacturaDetalle[];
}

/**
 * Fila de la grilla de facturación: lo que devuelve `GET /api/facturas`
 * (subconjunto de la factura, ya resuelto para la lista).
 */
export interface FacturaVista {
  id: number;
  numeroDocumento: string;
  claveAcceso: string | null;
  ambiente: AmbienteSri;
  estadoSri: EstadoSri;
  estadoPago: EstadoPagoFactura;
  numeroAutorizacion: string | null;
  fechaAutorizacion: string | null;
  contratoId: number | null;
  clienteId: number | null;
  clienteRazonSocial: string;
  fechaEmision: string;
  fechaVencimiento: string;
  subtotalSinImpuestos: number;
  valorIva: number;
  total: number;
  saldoPendiente: number;
  xmlFirmadoUrl: string | null;
  ridePdfUrl: string | null;
}

/** Vista `v_mora_contrato`: lo que consume el job de cortes de MS-CONTRATOS. */
export interface MoraContrato {
  contratoId: number;
  facturasVencidas: number;
  diasVencidoMax: number;
  vencimientoMasAntiguo: string;
  saldoTotal: number;
}

export const ESTADO_SRI_ETIQUETA: Record<EstadoSri, string> = {
  GENERADA: 'Generada',
  FIRMADA: 'Firmada',
  ENVIADA: 'Enviada',
  RECIBIDA: 'Recibida',
  AUTORIZADA: 'Autorizada',
  NO_AUTORIZADA: 'No autorizada',
  DEVUELTA: 'Devuelta',
  ANULADA: 'Anulada',
};

export const ESTADO_SRI_TONO: Record<EstadoSri, string> = {
  GENERADA: 'neutral',
  FIRMADA: 'info',
  ENVIADA: 'info',
  RECIBIDA: 'info',
  AUTORIZADA: 'ok',
  NO_AUTORIZADA: 'danger',
  DEVUELTA: 'danger',
  ANULADA: 'neutral',
};

export const ESTADO_PAGO_ETIQUETA: Record<EstadoPagoFactura, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

export const ESTADO_PAGO_TONO: Record<EstadoPagoFactura, string> = {
  PENDIENTE: 'warn',
  PARCIAL: 'info',
  PAGADA: 'ok',
  ANULADA: 'neutral',
};
