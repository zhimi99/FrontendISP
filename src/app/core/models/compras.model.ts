/**
 * Compras y proveedores · esquema `inventario`.
 *
 * Viven en el módulo de inventario y no en uno propio porque registrar una
 * compra ES dar de alta existencias: crea los artículos, sube el saldo y deja
 * el movimiento que lo explica, todo en un mismo acto.
 */

import { CategoriaMaterial, TipoEquipo, UnidadMedida } from './inventario.model';

/**
 * Qué clase de casa comercial es. No es un adorno: de esto depende qué se le
 * puede exigir y a qué precio vende, y explica por qué el mismo artículo cuesta
 * distinto en el catálogo de dos proveedores.
 */
export type TipoProveedor =
  | 'DISTRIBUIDOR'
  | 'MAYORISTA'
  | 'IMPORTADOR'
  | 'MINORISTA'
  | 'FABRICANTE'
  | 'SERVICIOS'
  | 'OTRO';

export const TIPO_PROVEEDOR_ETIQUETA: Record<TipoProveedor, string> = {
  DISTRIBUIDOR: 'Distribuidor',
  MAYORISTA: 'Mayorista',
  IMPORTADOR: 'Importador',
  MINORISTA: 'Minorista',
  FABRICANTE: 'Fabricante',
  SERVICIOS: 'Servicios',
  OTRO: 'Sin clasificar',
};

/** Qué se espera de cada clase; se muestra al elegir para no tener que adivinar. */
export const TIPO_PROVEEDOR_AYUDA: Record<TipoProveedor, string> = {
  DISTRIBUIDOR: 'Representa a la marca. Garantía de fábrica, precio de lista.',
  MAYORISTA: 'Vende por volumen. Mejor precio, sin representación.',
  IMPORTADOR: 'Trae de afuera. Plazos largos, compra planificada.',
  MINORISTA: 'Local de barrio. Se le compra la urgencia, sale caro.',
  FABRICANTE: 'Produce lo que vende: herrajes, cajas, obra metálica.',
  SERVICIOS: 'No vende bienes: fletes, obra civil, mantenimiento.',
  OTRO: 'Todavía sin clasificar.',
};

export const TIPOS_PROVEEDOR: TipoProveedor[] = [
  'DISTRIBUIDOR',
  'MAYORISTA',
  'IMPORTADOR',
  'MINORISTA',
  'FABRICANTE',
  'SERVICIOS',
  'OTRO',
];

export interface Proveedor {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  tipo: TipoProveedor;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  observacion: string | null;
  activo: boolean;
}

export interface GuardarProveedorRequest {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  tipo: TipoProveedor;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  observacion: string | null;
}

/** Una línea del catálogo: qué vende el proveedor y a qué precio nos lo dio. */
export interface ProveedorArticulo {
  id: number;
  proveedorId: number;
  proveedorRazonSocial: string;
  codigoProveedor: string;
  descripcion: string;
  ultimoCosto: number;
  ultimaCompra: string;
  vecesComprado: number;
  materialId: number | null;
  materialNombre: string | null;
  materialPrecioVenta: number | null;
}

/** En qué se convierte una línea de la factura al ingresarla. */
export type DestinoCompra = 'EQUIPO' | 'MATERIAL';

/** Cómo llegó la compra: leída de un comprobante electrónico o tecleada. */
export type OrigenCompra = 'XML' | 'MANUAL';

/** ANULADA revierte el ingreso, pero la compra se conserva como constancia. */
export type EstadoCompra = 'REGISTRADA' | 'ANULADA';

/** Lo que devuelve `POST /api/compras/previa`: leído del XML, todavía sin guardar. */
export interface PreviaCompra {
  proveedorId: number | null;
  proveedorNuevo: boolean;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  numeroDocumento: string;
  claveAcceso: string | null;
  fechaEmision: string;
  subtotal: number;
  descuento: number;
  valorIva: number;
  total: number;
  /** Con valor cuando la factura YA se ingresó: volver a cargarla duplicaría el stock. */
  yaRegistrada: string | null;
  lineas: PreviaCompraLinea[];
}

export interface PreviaCompraLinea {
  codigoProveedor: string | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  /** Artículo que parece el mismo, deducido de compras anteriores al proveedor. */
  materialSugeridoId: number | null;
  materialSugeridoNombre: string | null;
  compradoAntes: boolean;
}

/** Una unidad física concreta; la MAC es opcional porque no todo equipo la publica. */
export interface SerieEquipo {
  numeroSerie: string;
  macAddress: string | null;
}

export interface RegistrarCompraRequest {
  proveedorId: number | null;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  origen: OrigenCompra;
  numeroDocumento: string;
  claveAcceso: string | null;
  fechaEmision: string;
  subtotal: number;
  descuento: number;
  valorIva: number;
  total: number;
  ubicacionId: number;
  observacion: string | null;
  lineas: RegistrarCompraLinea[];
}

export interface RegistrarCompraLinea {
  destino: DestinoCompra;
  codigoProveedor: string | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  precioVenta: number;
  // Si entra como MATERIAL
  materialId: number | null;
  nombre: string | null;
  unidad: UnidadMedida | null;
  categoria: CategoriaMaterial | null;
  // Si entra como EQUIPO
  tipoEquipo: TipoEquipo | null;
  marca: string | null;
  modelo: string | null;
  series: SerieEquipo[] | null;
}

export interface Compra {
  id: number;
  proveedorId: number;
  proveedorRazonSocial: string;
  proveedorRuc: string;
  proveedorTipo: TipoProveedor;
  numeroDocumento: string;
  claveAcceso: string | null;
  fechaEmision: string;
  subtotal: number;
  descuento: number;
  valorIva: number;
  total: number;
  ubicacionId: number;
  ubicacionNombre: string;
  usuarioId: number;
  observacion: string | null;
  origen: OrigenCompra;
  estado: EstadoCompra;
  anuladaEn: string | null;
  anuladaPor: number | null;
  motivoAnulacion: string | null;
  createdAt: string;
  lineas: CompraLinea[];
}

export interface CompraLinea {
  id: number;
  linea: number;
  destino: DestinoCompra;
  codigoProveedor: string | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  precioVenta: number;
  materialId: number | null;
  materialNombre: string | null;
}

/**
 * El historial y lo que suma. El total llega calculado del backend y no se hace
 * aquí porque tiene que decir lo mismo aunque un día la lista se pagine.
 */
export interface ConsultaCompras {
  cantidad: number;
  anuladas: number;
  /** Sin IVA y solo de lo vigente: una compra anulada no costó nada. */
  invertido: number;
  iva: number;
  compras: Compra[];
}

/** Filtros del historial; todos opcionales. */
export interface FiltroCompras {
  proveedorId?: number | null;
  desde?: string | null;
  hasta?: string | null;
  estado?: EstadoCompra | null;
  q?: string | null;
}
