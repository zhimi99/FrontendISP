/**
 * Proveedores y compras · esquema `inventario`.
 *
 * Viven en el módulo de inventario y no en uno propio porque registrar una
 * compra ES dar de alta existencias: crea los artículos, sube el saldo y deja
 * el movimiento que lo explica, todo en un mismo acto.
 */

import { CategoriaMaterial, TipoEquipo, UnidadMedida } from './inventario.model';

export interface Proveedor {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
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
