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
 * Reemplaza al mock `clientes.data.ts` como origen de la lista. El token lo adjunta
 * el interceptor, así que aquí no se ve ninguna cabecera de autenticación.
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
   * PUT /api/clientes/{codigo} — edita nombre y contacto del cliente. Devuelve la
   * ficha ya actualizada. 404 si no existe, 400 si falta el nombre según el tipo.
   */
  editar(codigo: string, request: EditarClienteRequest): Observable<ClienteDetalle> {
    return this.http.put<ClienteDetalle>(`${environment.apiBase}/api/clientes/${codigo}`, request);
  }
}
