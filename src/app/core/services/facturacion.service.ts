import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FacturaVista, MoraContrato } from '../models/facturacion.model';

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
}
