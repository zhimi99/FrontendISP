import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Compra,
  ConsultaCompras,
  FiltroCompras,
  GuardarProveedorRequest,
  PreviaCompra,
  Proveedor,
  ProveedorArticulo,
  RegistrarCompraRequest,
} from '../models/compras.model';

/** Compras a proveedores, y los proveedores mismos (MS-INVENTARIO). */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /* ================= Compras ================= */

  /** El historial con sus totales. Sin filtros devuelve todo, lo más reciente primero. */
  listar(filtro: FiltroCompras = {}): Observable<ConsultaCompras> {
    let params = new HttpParams();
    if (filtro.proveedorId != null) params = params.set('proveedorId', filtro.proveedorId);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.q?.trim()) params = params.set('q', filtro.q.trim());
    return this.http.get<ConsultaCompras>(`${this.base}/api/compras`, { params });
  }

  detalle(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.base}/api/compras/${id}`);
  }

  /**
   * Lee el XML y devuelve lo que trae, sin guardar nada. Es seguro subir el
   * archivo equivocado: no toca el inventario hasta que se confirma.
   */
  previsualizarFactura(archivo: File): Observable<PreviaCompra> {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo, archivo.name);
    return this.http.post<PreviaCompra>(`${this.base}/api/compras/previa`, cuerpo);
  }

  /** Ahora sí ingresa al inventario, con lo que el operador confirmó. */
  registrar(request: RegistrarCompraRequest): Observable<Compra> {
    return this.http.post<Compra>(`${this.base}/api/compras`, request);
  }

  /**
   * Deshace el ingreso. Solo funciona si la mercadería sigue estando; si ya se
   * consumió o se instaló, el backend responde qué falta en vez de descuadrar.
   */
  anular(id: number, motivo: string): Observable<Compra> {
    return this.http.post<Compra>(`${this.base}/api/compras/${id}/anular`, { motivo });
  }

  /* ================= Proveedores ================= */

  proveedores(soloActivos = false): Observable<Proveedor[]> {
    const params = new HttpParams().set('soloActivos', soloActivos);
    return this.http.get<Proveedor[]>(`${this.base}/api/proveedores`, { params });
  }

  /** Todo el catálogo junto, para comparar a quién comprarle lo mismo. */
  catalogoCompleto(): Observable<ProveedorArticulo[]> {
    return this.http.get<ProveedorArticulo[]>(`${this.base}/api/proveedores/articulos`);
  }

  crearProveedor(request: GuardarProveedorRequest): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.base}/api/proveedores`, request);
  }

  editarProveedor(id: number, request: GuardarProveedorRequest): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.base}/api/proveedores/${id}`, request);
  }

  cambiarActivo(id: number, activo: boolean): Observable<Proveedor> {
    const accion = activo ? 'activar' : 'desactivar';
    return this.http.post<Proveedor>(`${this.base}/api/proveedores/${id}/${accion}`, {});
  }
}
