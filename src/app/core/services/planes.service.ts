import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CrearPlanRequest, EditarPlanRequest, PlanCatalogo } from '../models/contratos.model';

/** Catálogo de planes (MS-CONTRATOS): selector del alta y mantenimiento. */
@Injectable({ providedIn: 'root' })
export class PlanesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /**
   * GET /api/planes — planes activos, del más barato al más caro.
   *
   * `todos` solo lo pide la pantalla de mantenimiento: el selector del alta no debe
   * ofrecer un plan que la empresa dejó de vender.
   */
  listar(todos = false): Observable<PlanCatalogo[]> {
    const params = todos ? new HttpParams().set('todos', true) : undefined;
    return this.http.get<PlanCatalogo[]>(`${this.base}/api/planes`, { params });
  }

  crear(req: CrearPlanRequest): Observable<PlanCatalogo> {
    return this.http.post<PlanCatalogo>(`${this.base}/api/planes`, req);
  }

  /**
   * PUT /api/planes/{id} — el precio nuevo rige desde la SIGUIENTE facturación: las
   * facturas ya emitidas conservan su total y no se recalculan.
   */
  editar(id: number, req: EditarPlanRequest): Observable<PlanCatalogo> {
    return this.http.put<PlanCatalogo>(`${this.base}/api/planes/${id}`, req);
  }

  /** POST .../desactivar — 422 si todavía hay contratos con este plan. */
  desactivar(id: number): Observable<PlanCatalogo> {
    return this.http.post<PlanCatalogo>(`${this.base}/api/planes/${id}/desactivar`, {});
  }

  activar(id: number): Observable<PlanCatalogo> {
    return this.http.post<PlanCatalogo>(`${this.base}/api/planes/${id}/activar`, {});
  }
}
