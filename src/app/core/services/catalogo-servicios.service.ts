import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CrearOfertaServicioRequest,
  EditarOfertaServicioRequest,
  OfertaServicioCatalogo,
  TipoServicioCatalogo,
} from '../models/contratos.model';

/**
 * Mantenimiento del catálogo de servicios: lo que la empresa puede vender.
 *
 * <p>Separado de `ContratosService` a propósito. Ese resuelve la venta —pide solo
 * las ofertas activas para el formulario de alta— y este administra el catálogo,
 * que necesita ver también las retiradas y es exclusivo de ADMIN.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoServiciosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/api/catalogo-servicios`;

  /** `todos: true` incluye las ofertas retiradas, para poder reactivarlas. */
  listarOfertas(todos = false): Observable<OfertaServicioCatalogo[]> {
    const params = todos ? new HttpParams().set('todos', 'true') : undefined;
    return this.http.get<OfertaServicioCatalogo[]>(this.base, { params });
  }

  listarTipos(): Observable<TipoServicioCatalogo[]> {
    return this.http.get<TipoServicioCatalogo[]>(`${this.base}/tipos`);
  }

  crearOferta(request: CrearOfertaServicioRequest): Observable<OfertaServicioCatalogo> {
    return this.http.post<OfertaServicioCatalogo>(`${this.base}/ofertas`, request);
  }

  editarOferta(
    id: number,
    request: EditarOfertaServicioRequest,
  ): Observable<OfertaServicioCatalogo> {
    return this.http.put<OfertaServicioCatalogo>(`${this.base}/ofertas/${id}`, request);
  }

  desactivarOferta(id: number): Observable<OfertaServicioCatalogo> {
    return this.http.post<OfertaServicioCatalogo>(`${this.base}/ofertas/${id}/desactivar`, {});
  }

  activarOferta(id: number): Observable<OfertaServicioCatalogo> {
    return this.http.post<OfertaServicioCatalogo>(`${this.base}/ofertas/${id}/activar`, {});
  }
}
