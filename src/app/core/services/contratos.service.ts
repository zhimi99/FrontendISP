import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BajaContratoRequest,
  ContratoDetalle,
  ContratoListado,
  CrearContratoServicioRequest,
  CrearContratoServicioResponse,
  EditarContratoRequest,
  HistorialEstado,
  OfertaServicioCatalogo,
} from '../models/contratos.model';

/** Consulta de contratos (MS-CONTRATOS), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class ContratosService {
  private readonly http = inject(HttpClient);

  /** GET /api/contratos — contratos con cliente, plan, dirección y PPPoE resueltos. */
  listar(): Observable<ContratoListado[]> {
    return this.http.get<ContratoListado[]>(`${environment.apiBase}/api/contratos`);
  }

  /** Ofertas activas del catálogo extensible (Internet, TV, cámaras, soporte, etc.). */
  listarOfertasServicio(): Observable<OfertaServicioCatalogo[]> {
    return this.http.get<OfertaServicioCatalogo[]>(`${environment.apiBase}/api/catalogo-servicios`);
  }

  /** Registra otro contrato/servicio para un cliente ya existente. */
  agregarServicio(
    clienteCodigo: string,
    request: CrearContratoServicioRequest,
  ): Observable<CrearContratoServicioResponse> {
    return this.http.post<CrearContratoServicioResponse>(
      `${environment.apiBase}/api/clientes/${clienteCodigo}/contratos`,
      request,
    );
  }

  /** GET /api/contratos/{codigo} — ficha del contrato. 404 si no existe. */
  detalle(codigo: string): Observable<ContratoDetalle> {
    return this.http.get<ContratoDetalle>(`${environment.apiBase}/api/contratos/${codigo}`);
  }

  /** GET /api/contratos/{codigo}/historial — transiciones de estado, más reciente primero. */
  historial(codigo: string): Observable<HistorialEstado[]> {
    return this.http.get<HistorialEstado[]>(`${environment.apiBase}/api/contratos/${codigo}/historial`);
  }

  /**
   * El contrato en PDF, con las condiciones congeladas el día de su registro.
   *
   * Se descarga autenticado y la vista lo presenta desde un Blob URL privado: la
   * ruta nunca se expone como enlace público porque exige el token.
   */
  obtenerDocumento(codigo: string, descargar = false): Observable<Blob> {
    return this.http.get(`${environment.apiBase}/api/contratos/${codigo}/documento`, {
      params: { descargar },
      responseType: 'blob',
    });
  }

  /** PUT /api/contratos/{codigo} — renegocia condiciones. Devuelve la ficha actualizada. */
  editar(codigo: string, request: EditarContratoRequest): Observable<ContratoDetalle> {
    return this.http.put<ContratoDetalle>(
      `${environment.apiBase}/api/contratos/${codigo}`,
      request,
    );
  }

  /** POST /api/contratos/{codigo}/baja — deja el contrato RETIRADO. No borra nada. */
  darDeBaja(codigo: string, request: BajaContratoRequest): Observable<ContratoDetalle> {
    return this.http.post<ContratoDetalle>(
      `${environment.apiBase}/api/contratos/${codigo}/baja`,
      request,
    );
  }
}
