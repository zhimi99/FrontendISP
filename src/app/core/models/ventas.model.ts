/**
 * Venta de productos en mostrador · esquema `finanzas`
 * Tipos derivados de V7__venta_en_mostrador.sql y de /api/ventas.
 */

import { FormaPago } from './finanzas.model';

/** Qué papel se lleva el comprador. */
export type ComprobanteVenta = 'FACTURA' | 'RECIBO';

export type EstadoVenta = 'EMITIDA' | 'ANULADA';

/** Las dos naturalezas del inventario: por cantidad o con número de serie. */
export type OrigenArticulo = 'MATERIAL' | 'EQUIPO';

/**
 * Un artículo que se puede vender ahora mismo (`GET /api/ventas/articulos`).
 *
 * `ubicacionId` viaja desde la búsqueda hasta el cobro: es de donde se descontará.
 */
export interface ArticuloVendible {
  origen: OrigenArticulo;
  articuloId: number;
  /** Código del material (CAB-DROP) o número de serie del equipo. */
  codigo: string;
  descripcion: string;
  /** UNIDAD / METRO / … en material; null en un equipo, que va de uno en uno. */
  unidad: string | null;
  precioUnitario: number;
  disponible: number;
  /**
   * IVA en porcentaje. Viene del backend a propósito: la pantalla necesita
   * anticipar el total, y llevar la tarifa escrita aquí la dejaría desfasada el día
   * que cambie. El importe definitivo lo devuelve el backend al cobrar.
   */
  tarifaIva: number;
  ubicacionId: number | null;
  ubicacion: string | null;
}

/** Una línea de la venta ya cobrada. */
export interface VentaLinea {
  linea: number;
  origen: OrigenArticulo;
  materialId: number | null;
  equipoId: number | null;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  tarifaIva: number;
  valorIva: number;
  total: number;
}

/** Una venta tal y como la devuelve el backend, con su detalle para imprimir. */
export interface Venta {
  id: number;
  numero: string;
  fecha: string;
  comprobante: ComprobanteVenta;
  clienteId: number | null;
  consumidorFinal: boolean;
  compradorIdentificacion: string;
  compradorNombre: string;
  compradorDireccion: string | null;
  compradorEmail: string | null;
  subtotal: number;
  descuento: number;
  valorIva: number;
  total: number;
  formaPago: FormaPago;
  sesionCajaId: number | null;
  facturaId: number | null;
  facturaNumero: string | null;
  usuarioId: number | null;
  estado: EstadoVenta;
  observacion: string | null;
  lineas: VentaLinea[];
}

/** Una línea del carrito antes de cobrar. Solo viaja qué y cuánto. */
export interface LineaVentaRequest {
  origen: OrigenArticulo;
  articuloId: number;
  cantidad: number;
}

/**
 * Cuerpo del cobro (`POST /api/ventas`).
 *
 * No lleva precios: los pone el backend leyendo el inventario. Rebajar se rebaja
 * con `totalFinal`, y el backend reparte el descuento entre las líneas.
 */
export interface RegistrarVentaRequest {
  comprobante: ComprobanteVenta;
  consumidorFinal: boolean;
  clienteId: number | null;
  compradorIdentificacion: string | null;
  compradorNombre: string | null;
  compradorDireccion: string | null;
  compradorEmail: string | null;
  formaPago: FormaPago;
  sesionCajaId: number | null;
  /** El total que se decidió cobrar, si se editó a la baja. Null = precio de lista. */
  totalFinal: number | null;
  observacion: string | null;
  lineas: LineaVentaRequest[];
}

/** Una línea del carrito en pantalla: el artículo elegido y cuánto se lleva. */
export interface LineaCarrito {
  articulo: ArticuloVendible;
  cantidad: number;
}

export const COMPROBANTE_ETIQUETA: Record<ComprobanteVenta, string> = {
  FACTURA: 'Con factura',
  RECIBO: 'Sin factura (solo recibo)',
};
