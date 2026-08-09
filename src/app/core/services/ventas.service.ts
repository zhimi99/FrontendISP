import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ArticuloVendible, RegistrarVentaRequest, Venta } from '../models/ventas.model';

/** Venta de productos en mostrador (MS-FINANZAS · /api/ventas). */
@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/ventas/articulos?codigo= — coincidencia EXACTA por código o número de
   * serie. Es la vía del escáner: lee la etiqueta y devuelve como mucho un artículo.
   */
  porCodigo(codigo: string): Observable<ArticuloVendible[]> {
    const params = new HttpParams().set('codigo', codigo);
    return this.http.get<ArticuloVendible[]>(`${environment.apiBase}/api/ventas/articulos`, {
      params,
    });
  }

  /** GET /api/ventas/articulos?q= — búsqueda por texto para elegir a mano. */
  buscarArticulos(q: string): Observable<ArticuloVendible[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<ArticuloVendible[]>(`${environment.apiBase}/api/ventas/articulos`, {
      params,
    });
  }

  /**
   * POST /api/ventas — cobra la venta, descarga el inventario y, si se pidió con
   * factura, emite el comprobante. Devuelve la venta ENTERA con sus líneas: es lo
   * que se imprime, sin un segundo viaje.
   */
  registrar(req: RegistrarVentaRequest): Observable<Venta> {
    return this.http.post<Venta>(`${environment.apiBase}/api/ventas`, req);
  }

  /** GET /api/ventas — ventas más recientes primero. */
  listar(clienteId?: number): Observable<Venta[]> {
    let params = new HttpParams();
    if (clienteId != null) params = params.set('clienteId', clienteId);
    return this.http.get<Venta[]>(`${environment.apiBase}/api/ventas`, { params });
  }

  /** GET /api/ventas/{id} — una venta concreta, para reimprimir su recibo. */
  detalle(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${environment.apiBase}/api/ventas/${id}`);
  }
}
