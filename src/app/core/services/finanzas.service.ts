import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CajaEstado,
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
}
