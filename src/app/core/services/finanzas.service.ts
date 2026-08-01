import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AbrirCajaRequest,
  CajaEstado,
  CerrarCajaRequest,
  CierreCaja,
  CierresReporte,
  EstadoPago,
  PagoCobranza,
  PagoRegistrado,
  RegistrarPagoRequest,
} from '../models/finanzas.model';

/** Consultas de cobranzas y cajas (MS-FINANZAS), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private readonly http = inject(HttpClient);

  /** GET /api/pagos — recaudaciones, más recientes primero, con filtros opcionales. */
  listarPagos(filtro?: {
    clienteId?: number;
    contratoId?: number;
    estado?: EstadoPago;
  }): Observable<PagoCobranza[]> {
    let params = new HttpParams();
    if (filtro?.clienteId != null) params = params.set('clienteId', filtro.clienteId);
    if (filtro?.contratoId != null) params = params.set('contratoId', filtro.contratoId);
    if (filtro?.estado) params = params.set('estado', filtro.estado);
    return this.http.get<PagoCobranza[]>(`${environment.apiBase}/api/pagos`, { params });
  }

  /** GET /api/pagos/{id} — un pago con su reparto a facturas (404 si no existe). */
  detallePago(id: number): Observable<PagoCobranza> {
    return this.http.get<PagoCobranza>(`${environment.apiBase}/api/pagos/${id}`);
  }

  /** GET /api/cajas — cajas con el estado de su jornada abierta. */
  listarCajas(): Observable<CajaEstado[]> {
    return this.http.get<CajaEstado[]>(`${environment.apiBase}/api/cajas`);
  }

  /** POST /api/pagos — registra una recaudación y la aplica a facturas. */
  registrarPago(req: RegistrarPagoRequest): Observable<PagoRegistrado> {
    return this.http.post<PagoRegistrado>(`${environment.apiBase}/api/pagos`, req);
  }

  /** POST /api/cajas/{cajaId}/abrir — abre la jornada; devuelve la caja con su sesión. */
  abrirCaja(cajaId: number, req: AbrirCajaRequest): Observable<CajaEstado> {
    return this.http.post<CajaEstado>(`${environment.apiBase}/api/cajas/${cajaId}/abrir`, req);
  }

  /** POST /api/cajas/{cajaId}/cerrar — cierra la jornada; devuelve el arqueo (diferencia). */
  cerrarCaja(cajaId: number, req: CerrarCajaRequest): Observable<CierreCaja> {
    return this.http.post<CierreCaja>(`${environment.apiBase}/api/cajas/${cajaId}/cerrar`, req);
  }

  /** GET /api/cajas/cierres — reporte de cierres entre dos fechas (yyyy-MM-dd, inclusive). */
  reporteCierres(desde: string, hasta: string): Observable<CierresReporte> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<CierresReporte>(`${environment.apiBase}/api/cajas/cierres`, { params });
  }
}
