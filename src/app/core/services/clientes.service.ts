import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AltaClienteRequest,
  AltaClienteResponse,
  ClienteDetalle,
  ClienteListado,
  EditarClienteRequest,
} from '../models/contratos.model';

/**
 * Acceso a clientes y contratos (MS-CONTRATOS), siempre por el gateway.
 *
 * Es el único origen de la lista de clientes: en el frontend no queda ninguna copia
 * en memoria. El token lo adjunta el interceptor, así que aquí no se ve ninguna
 * cabecera de autenticación.
 */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);

  /** GET /api/clientes — lista con el contrato principal de cada cliente resuelto. */
  listar(): Observable<ClienteListado[]> {
    return this.http.get<ClienteListado[]>(`${environment.apiBase}/api/clientes`);
  }

  /** GET /api/clientes/{codigo} — ficha completa del cliente (404 si no existe). */
  detalle(codigo: string): Observable<ClienteDetalle> {
    return this.http.get<ClienteDetalle>(`${environment.apiBase}/api/clientes/${codigo}`);
  }

  /** POST /api/clientes — alta de cliente y su primer contrato (queda PENDIENTE). */
  crear(request: AltaClienteRequest): Observable<AltaClienteResponse> {
    return this.http.post<AltaClienteResponse>(`${environment.apiBase}/api/clientes`, request);
  }

  /**
   * Carga o reemplaza el documento privado. HttpClient añade el boundary multipart.
   */
  subirIdentificacion(codigo: string, archivo: File): Observable<void> {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo, archivo.name);
    return this.http.put<void>(`${environment.apiBase}/api/clientes/${codigo}/identificacion`, cuerpo);
  }

  /** Descarga autenticada; la vista lo presenta desde un Blob URL privado. */
  obtenerIdentificacion(codigo: string): Observable<Blob> {
    return this.http.get(`${environment.apiBase}/api/clientes/${codigo}/identificacion`, {
      responseType: 'blob',
    });
  }

  /**
   * PUT /api/clientes/{codigo} — edita nombre y contacto del cliente. Devuelve la
   * ficha ya actualizada. 404 si no existe, 400 si falta el nombre según el tipo.
   */
  editar(codigo: string, request: EditarClienteRequest): Observable<ClienteDetalle> {
    return this.http.put<ClienteDetalle>(`${environment.apiBase}/api/clientes/${codigo}`, request);
  }
}
