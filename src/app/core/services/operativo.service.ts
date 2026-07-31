import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EstadoOrden, Orden } from '../models/operativo.model';

/** Consulta de órdenes de trabajo (MS-OPERATIVO), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class OperativoService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/ordenes — listado por criterio. El backend exige uno: sin filtros
   * devuelve las PENDIENTE (no vuelca el histórico entero).
   */
  listarOrdenes(filtro?: {
    estado?: EstadoOrden;
    contratoId?: number;
    tecnicoUsuarioId?: number;
  }): Observable<Orden[]> {
    let params = new HttpParams();
    if (filtro?.estado) params = params.set('estado', filtro.estado);
    if (filtro?.contratoId != null) params = params.set('contratoId', filtro.contratoId);
    if (filtro?.tecnicoUsuarioId != null) {
      params = params.set('tecnicoUsuarioId', filtro.tecnicoUsuarioId);
    }
    return this.http.get<Orden[]>(`${environment.apiBase}/api/ordenes`, { params });
  }
}
