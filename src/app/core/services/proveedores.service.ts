import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Compra,
  GuardarProveedorRequest,
  PreviaCompra,
  Proveedor,
  ProveedorArticulo,
  RegistrarCompraRequest,
} from '../models/proveedores.model';

/** Proveedores, su catálogo y las compras que se les hacen (MS-INVENTARIO). */
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/api/proveedores`;
  private readonly baseCompras = `${environment.apiBase}/api/compras`;

  listar(soloActivos = false): Observable<Proveedor[]> {
    const params = new HttpParams().set('soloActivos', soloActivos);
    return this.http.get<Proveedor[]>(this.base, { params });
  }

  porId(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.base}/${id}`);
  }

  /** Qué vende este proveedor y a qué precio; el backend lo mantiene solo. */
  catalogo(id: number): Observable<ProveedorArticulo[]> {
    return this.http.get<ProveedorArticulo[]>(`${this.base}/${id}/articulos`);
  }

  /** Todo el catálogo junto, para comparar a quién comprarle lo mismo. */
  catalogoCompleto(): Observable<ProveedorArticulo[]> {
    return this.http.get<ProveedorArticulo[]>(`${this.base}/articulos`);
  }

  crear(request: GuardarProveedorRequest): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.base, request);
  }

  editar(id: number, request: GuardarProveedorRequest): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.base}/${id}`, request);
  }

  cambiarActivo(id: number, activo: boolean): Observable<Proveedor> {
    const accion = activo ? 'activar' : 'desactivar';
    return this.http.post<Proveedor>(`${this.base}/${id}/${accion}`, {});
  }

  /**
   * Lee el XML y devuelve lo que trae, sin guardar nada. Es seguro subir el
   * archivo equivocado: no toca el inventario hasta que se confirma.
   */
  previsualizarFactura(archivo: File): Observable<PreviaCompra> {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo, archivo.name);
    return this.http.post<PreviaCompra>(`${this.baseCompras}/previa`, cuerpo);
  }

  /** Ahora sí ingresa al inventario, con lo que el operador confirmó. */
  registrarCompra(request: RegistrarCompraRequest): Observable<Compra> {
    return this.http.post<Compra>(this.baseCompras, request);
  }

  compras(proveedorId?: number): Observable<Compra[]> {
    let params = new HttpParams();
    if (proveedorId != null) params = params.set('proveedorId', proveedorId);
    return this.http.get<Compra[]>(this.baseCompras, { params });
  }

  compra(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.baseCompras}/${id}`);
  }
}
