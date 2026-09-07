import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ArticuloVendible, RegistrarVentaRequest, Venta, VentasReporte } from '../models/ventas.model';

/** Venta de productos en mostrador (MS-FINANZAS · /api/ventas). */
@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /**
   * GET /api/ventas/articulos?codigo= — coincidencia EXACTA por código o número de
   * serie. Es la vía del escáner: lee la etiqueta y devuelve como mucho un artículo.
   */
  porCodigo(codigo: string): Observable<ArticuloVendible[]> {
    const params = new HttpParams().set('codigo', codigo);
    return this.http.get<ArticuloVendible[]>(`${this.base}/api/ventas/articulos`, {
      params,
    });
  }

  /** GET /api/ventas/articulos?q= — búsqueda por texto para elegir a mano. */
  buscarArticulos(q: string): Observable<ArticuloVendible[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<ArticuloVendible[]>(`${this.base}/api/ventas/articulos`, {
      params,
    });
  }

  /**
   * POST /api/ventas — cobra la venta, descarga el inventario y, si se pidió con
   * factura, emite el comprobante. Devuelve la venta ENTERA con sus líneas: es lo
   * que se imprime, sin un segundo viaje.
   */
  registrar(req: RegistrarVentaRequest): Observable<Venta> {
    return this.http.post<Venta>(`${this.base}/api/ventas`, req);
  }

  /**
   * GET /api/ventas/reporte?desde=&hasta= — ventas del período (ambos inclusive),
   * con su resumen: total recaudado y desglose consumidor final vs. cliente
   * identificado. Para Reportes, no para Cobranzas.
   */
  reporte(desde: string, hasta: string): Observable<VentasReporte> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<VentasReporte>(`${this.base}/api/ventas/reporte`, { params });
  }
}
