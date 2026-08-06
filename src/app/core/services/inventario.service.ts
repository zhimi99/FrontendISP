import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AjusteStockRequest,
  AltaEquipoRequest,
  ConsumoStockRequest,
  CrearMaterialRequest,
  CrearUbicacionRequest,
  EditarMaterialRequest,
  EditarUbicacionRequest,
  Equipo,
  EstadoEquipo,
  Existencia,
  IngresoStockRequest,
  Material,
  MaterialBajoStock,
  Movimiento,
  TipoMovimiento,
  TrasladoStockRequest,
  Ubicacion,
} from '../models/inventario.model';

/** Consultas de inventario (MS-INVENTARIO), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /**
   * GET /api/materiales — catálogo de materiales activos.
   *
   * `todos` solo lo usa la pantalla de mantenimiento: en un ingreso o un traslado,
   * ofrecer material retirado sería invitar a usarlo.
   */
  listarMateriales(todos = false): Observable<Material[]> {
    const params = todos ? new HttpParams().set('todos', true) : undefined;
    return this.http.get<Material[]>(`${this.base}/api/materiales`, { params });
  }

  /** GET /api/ubicaciones — bodegas y furgonetas de técnicos. */
  listarUbicaciones(todos = false): Observable<Ubicacion[]> {
    const params = todos ? new HttpParams().set('todos', true) : undefined;
    return this.http.get<Ubicacion[]>(`${this.base}/api/ubicaciones`, { params });
  }

  /** GET /api/materiales/bajo-stock — lo que hay que reponer. */
  bajoStock(): Observable<MaterialBajoStock[]> {
    return this.http.get<MaterialBajoStock[]>(`${this.base}/api/materiales/bajo-stock`);
  }

  /**
   * GET /api/movimientos — el libro de inventario, lo más reciente primero. Viene
   * acotado por el backend (100 por defecto, 500 de tope).
   */
  listarMovimientos(filtro?: {
    materialId?: number;
    ubicacionId?: number;
    tipo?: TipoMovimiento;
    limite?: number;
  }): Observable<Movimiento[]> {
    let params = new HttpParams();
    if (filtro?.materialId != null) params = params.set('materialId', filtro.materialId);
    if (filtro?.ubicacionId != null) params = params.set('ubicacionId', filtro.ubicacionId);
    if (filtro?.tipo) params = params.set('tipo', filtro.tipo);
    if (filtro?.limite != null) params = params.set('limite', filtro.limite);
    return this.http.get<Movimiento[]>(`${this.base}/api/movimientos`, { params });
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

  /** POST /api/ingresos — entra material comprado a una ubicación. */
  ingresarMaterial(req: IngresoStockRequest): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.base}/api/ingresos`, req);
  }

  /**
   * POST /api/consumos — sale material gastado en una instalación. Responde 422 si
   * no hay bastante stock en la ubicación de origen.
   */
  consumirMaterial(req: ConsumoStockRequest): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.base}/api/consumos`, req);
  }

  /**
   * POST /api/traslados — mueve material entre ubicaciones (cargar la furgoneta del
   * técnico o devolver a bodega lo que sobró). No cambia el inventario total.
   */
  trasladarMaterial(req: TrasladoStockRequest): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.base}/api/traslados`, req);
  }

  /**
   * POST /api/ajustes — cuadra el sistema con lo que se contó físicamente. Solo ADMIN:
   * es la operación por la que se podría tapar un faltante, y exige motivo.
   */
  ajustarMaterial(req: AjusteStockRequest): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.base}/api/ajustes`, req);
  }

  /* ============ Mantenimiento de los maestros (solo ADMIN) ============ */

  /** POST /api/materiales — el código se normaliza a mayúsculas en el servidor. */
  crearMaterial(req: CrearMaterialRequest): Observable<Material> {
    return this.http.post<Material>(`${this.base}/api/materiales`, req);
  }

  /**
   * PUT /api/materiales/{id} — nombre, unidad y stock mínimo. Responde 422 si se
   * intenta cambiar la unidad de un material que ya tiene movimientos.
   */
  editarMaterial(id: number, req: EditarMaterialRequest): Observable<Material> {
    return this.http.put<Material>(`${this.base}/api/materiales/${id}`, req);
  }

  /** POST .../desactivar — 422 si todavía queda existencia en alguna ubicación. */
  desactivarMaterial(id: number): Observable<Material> {
    return this.http.post<Material>(`${this.base}/api/materiales/${id}/desactivar`, {});
  }

  activarMaterial(id: number): Observable<Material> {
    return this.http.post<Material>(`${this.base}/api/materiales/${id}/activar`, {});
  }

  crearUbicacion(req: CrearUbicacionRequest): Observable<Ubicacion> {
    return this.http.post<Ubicacion>(`${this.base}/api/ubicaciones`, req);
  }

  editarUbicacion(id: number, req: EditarUbicacionRequest): Observable<Ubicacion> {
    return this.http.put<Ubicacion>(`${this.base}/api/ubicaciones/${id}`, req);
  }

  /** POST .../desactivar — 422 si la ubicación aún guarda material o equipos. */
  desactivarUbicacion(id: number): Observable<Ubicacion> {
    return this.http.post<Ubicacion>(`${this.base}/api/ubicaciones/${id}/desactivar`, {});
  }

  activarUbicacion(id: number): Observable<Ubicacion> {
    return this.http.post<Ubicacion>(`${this.base}/api/ubicaciones/${id}/activar`, {});
  }
}
