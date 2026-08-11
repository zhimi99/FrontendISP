import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EditarEmisorRequest,
  Emisor,
  Factura,
  FacturaVista,
  MoraContrato,
} from '../models/facturacion.model';

/** Consulta de facturas y mora (MS-FACTURACION), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class FacturacionService {
  private readonly http = inject(HttpClient);

  /** GET /api/facturas — todas, o filtradas por contrato / cliente. */
  listar(filtro?: { contratoId?: number; clienteId?: number }): Observable<FacturaVista[]> {
    let params = new HttpParams();
    if (filtro?.contratoId != null) params = params.set('contratoId', filtro.contratoId);
    if (filtro?.clienteId != null) params = params.set('clienteId', filtro.clienteId);
    return this.http.get<FacturaVista[]>(`${environment.apiBase}/api/facturas`, { params });
  }

  /** GET /api/mora — contratos con facturas vencidas (regla de cortes). */
  mora(): Observable<MoraContrato[]> {
    return this.http.get<MoraContrato[]>(`${environment.apiBase}/api/mora`);
  }

  /** GET /api/facturas/{id} — el detalle de una factura o comprobante, con sus líneas. */
  ver(id: number): Observable<Factura> {
    return this.http.get<Factura>(`${environment.apiBase}/api/facturas/${id}`);
  }

  /**
   * GET /api/facturas/{id}/comprobante — el PDF del Comprobante de Cuenta por
   * Cobrar. Documento interno sin validez fiscal, distinto del RIDE: funciona para
   * cualquier factura o comprobante, autorizado por el SRI o no.
   */
  descargarComprobante(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiBase}/api/facturas/${id}/comprobante`, {
      responseType: 'blob',
    });
  }

  /**
   * POST /api/facturas/{id}/anular — deja el comprobante sin efecto. Solo procede si
   * todavía NO está AUTORIZADA por el SRI: una autorizada se compensa con una nota de
   * crédito, y el backend responde 422 explicándolo.
   */
  anular(id: number, motivo: string): Observable<FacturaVista> {
    return this.http.post<FacturaVista>(`${environment.apiBase}/api/facturas/${id}/anular`, {
      motivo,
    });
  }

  /** GET /api/emisor — datos del ISP ante el SRI (FINANZAS/ADMIN). */
  emisor(): Observable<Emisor> {
    return this.http.get<Emisor>(`${environment.apiBase}/api/emisor`);
  }

  /**
   * PUT /api/emisor — solo ADMIN. Responde 422 si se intenta cambiar el RUC con
   * comprobantes ya emitidos, pasar a PRODUCCIÓN sin certificado de firma, o volver a
   * PRUEBAS teniendo facturas autorizadas.
   */
  guardarEmisor(req: EditarEmisorRequest): Observable<Emisor> {
    return this.http.put<Emisor>(`${environment.apiBase}/api/emisor`, req);
  }
}
