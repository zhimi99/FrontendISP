import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CrearOrdenRequest, EstadoOrden, Orden } from '../models/operativo.model';

/** Consulta de órdenes de trabajo (MS-OPERATIVO), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class OperativoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

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
    return this.http.get<Orden[]>(`${this.base}/api/ordenes`, { params });
  }

  /** POST /api/ordenes — genera un ticket nuevo (queda PENDIENTE, listo para asignar). */
  crear(req: CrearOrdenRequest): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/api/ordenes`, req);
  }

  /** POST /api/ordenes/{id}/asignar — asigna la orden a un técnico (PENDIENTE → ASIGNADA). */
  asignar(id: number, tecnicoUsuarioId: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/api/ordenes/${id}/asignar`, {
      tecnicoUsuarioId,
    });
  }

  /** POST /api/ordenes/{id}/iniciar — el técnico empieza el trabajo (ASIGNADA → EN_PROCESO). */
  iniciar(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/api/ordenes/${id}/iniciar`, {});
  }

  /**
   * POST /api/ordenes/{id}/aceptar — un técnico toma una orden PENDIENTE por su
   * cuenta (PENDIENTE → ASIGNADA), sin esperar a que despacho se la asigne. El
   * técnico sale del token en el backend, no viaja nada en el cuerpo.
   */
  aceptar(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/api/ordenes/${id}/aceptar`, {});
  }

  /** GET /api/ordenes/{id} — el estado real de una orden, para reconciliar tras un conflicto. */
  porId(id: number): Observable<Orden> {
    return this.http.get<Orden>(`${this.base}/api/ordenes/${id}`);
  }

  /** POST /api/ordenes/{id}/cerrar — cierra con resultado (EN_PROCESO → CERRADA). */
  cerrar(id: number, resultado: string): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/api/ordenes/${id}/cerrar`, { resultado });
  }

  /**
   * POST /api/ordenes/{id}/foto — foto opcional del trabajo terminado. Solo procede
   * sobre una orden ya CERRADA; subirla de nuevo reemplaza la anterior.
   */
  subirFoto(id: number, archivo: File): Observable<void> {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo, archivo.name);
    return this.http.post<void>(`${this.base}/api/ordenes/${id}/foto`, cuerpo);
  }

  /**
   * POST /api/ordenes/{id}/cancelar — anula la orden con motivo obligatorio (cualquier
   * estado no terminal → CANCELADA). Cancelar una ya cerrada/cancelada devuelve 409.
   */
  cancelar(id: number, motivo: string): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/api/ordenes/${id}/cancelar`, { motivo });
  }
}
