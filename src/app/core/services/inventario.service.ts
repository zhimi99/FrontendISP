import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AltaEquipoRequest,
  Equipo,
  EstadoEquipo,
  Existencia,
  Material,
  MaterialBajoStock,
  Ubicacion,
} from '../models/inventario.model';

/** Consultas de inventario (MS-INVENTARIO), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /** GET /api/materiales — catálogo de materiales activos. */
  listarMateriales(): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.base}/api/materiales`);
  }

  /** GET /api/ubicaciones — bodegas y furgonetas de técnicos. */
  listarUbicaciones(): Observable<Ubicacion[]> {
    return this.http.get<Ubicacion[]>(`${this.base}/api/ubicaciones`);
  }

  /** GET /api/materiales/bajo-stock — lo que hay que reponer. */
  bajoStock(): Observable<MaterialBajoStock[]> {
    return this.http.get<MaterialBajoStock[]>(`${this.base}/api/materiales/bajo-stock`);
  }

  /** GET /api/existencias — saldos; sin filtro devuelve todas las ubicaciones. */
  listarExistencias(filtro?: { ubicacionId?: number; materialId?: number }): Observable<Existencia[]> {
    let params = new HttpParams();
    if (filtro?.ubicacionId != null) params = params.set('ubicacionId', filtro.ubicacionId);
    if (filtro?.materialId != null) params = params.set('materialId', filtro.materialId);
    return this.http.get<Existencia[]>(`${this.base}/api/existencias`, { params });
  }

  /**
   * GET /api/equipos — listado serializado. El backend exige un criterio: sin filtros
   * devuelve solo los DISPONIBLE (no vuelca el inventario entero).
   */
  listarEquipos(filtro?: {
    estado?: EstadoEquipo;
    contratoId?: number;
    ubicacionId?: number;
  }): Observable<Equipo[]> {
    let params = new HttpParams();
    if (filtro?.estado) params = params.set('estado', filtro.estado);
    if (filtro?.contratoId != null) params = params.set('contratoId', filtro.contratoId);
    if (filtro?.ubicacionId != null) params = params.set('ubicacionId', filtro.ubicacionId);
    return this.http.get<Equipo[]>(`${this.base}/api/equipos`, { params });
  }

  /** POST /api/equipos — alta de una unidad serializada (queda DISPONIBLE). */
  crearEquipo(req: AltaEquipoRequest): Observable<Equipo> {
    return this.http.post<Equipo>(`${this.base}/api/equipos`, req);
  }
}
