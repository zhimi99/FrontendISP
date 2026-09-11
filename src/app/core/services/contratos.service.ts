import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BajaContratoRequest,
  CambiarDireccionContratoRequest,
  ContratoDetalle,
  ContratoListado,
  CrearContratoServicioRequest,
  CrearContratoServicioResponse,
  GuardarRegistroGponRequest,
  HistorialEstado,
  OfertaServicioCatalogo,
  RegistroGpon,
} from '../models/contratos.model';

/** Consulta de contratos (MS-CONTRATOS), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class ContratosService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /** GET /api/contratos — contratos con cliente, plan, dirección y PPPoE resueltos. */
  listar(): Observable<ContratoListado[]> {
    return this.http.get<ContratoListado[]>(`${this.base}/api/contratos`);
  }

  /** Ofertas activas del catálogo extensible (Internet, TV, cámaras, soporte, etc.). */
  listarOfertasServicio(): Observable<OfertaServicioCatalogo[]> {
    return this.http.get<OfertaServicioCatalogo[]>(`${this.base}/api/catalogo-servicios`);
  }

  /** Registra otro contrato/servicio para un cliente ya existente. */
  agregarServicio(
    clienteCodigo: string,
    request: CrearContratoServicioRequest,
  ): Observable<CrearContratoServicioResponse> {
    return this.http.post<CrearContratoServicioResponse>(
      `${this.base}/api/clientes/${clienteCodigo}/contratos`,
      request,
    );
  }

  /** GET /api/contratos/{codigo} — ficha del contrato. 404 si no existe. */
  detalle(codigo: string): Observable<ContratoDetalle> {
    return this.http.get<ContratoDetalle>(`${this.base}/api/contratos/${codigo}`);
  }

  /** GET /api/contratos/{codigo}/historial — transiciones de estado, más reciente primero. */
  historial(codigo: string): Observable<HistorialEstado[]> {
    return this.http.get<HistorialEstado[]>(`${this.base}/api/contratos/${codigo}/historial`);
  }

  /** GET /api/contratos/{codigo}/registro-gpon — ficha técnica GPON. null si aún no existe (204). */
  registroGpon(codigo: string): Observable<RegistroGpon | null> {
    return this.http.get<RegistroGpon | null>(
      `${this.base}/api/contratos/${codigo}/registro-gpon`,
    );
  }

  /** PUT /api/contratos/{codigo}/registro-gpon — crea o actualiza la ficha técnica GPON. */
  guardarRegistroGpon(codigo: string, request: GuardarRegistroGponRequest): Observable<RegistroGpon> {
    return this.http.put<RegistroGpon>(
      `${this.base}/api/contratos/${codigo}/registro-gpon`,
      request,
    );
  }

  /**
   * El contrato en PDF, con las condiciones congeladas el día de su registro.
   *
   * Se descarga autenticado y la vista lo presenta desde un Blob URL privado: la
   * ruta nunca se expone como enlace público porque exige el token.
   */
  obtenerDocumento(codigo: string, descargar = false): Observable<Blob> {
    return this.http.get(`${this.base}/api/contratos/${codigo}/documento`, {
      params: { descargar },
      responseType: 'blob',
    });
  }

  /** POST /api/contratos/{codigo}/baja — deja el contrato RETIRADO. No borra nada. */
  darDeBaja(codigo: string, request: BajaContratoRequest): Observable<ContratoDetalle> {
    return this.http.post<ContratoDetalle>(
      `${this.base}/api/contratos/${codigo}/baja`,
      request,
    );
  }

  /**
   * PUT /api/contratos/{codigo}/direccion — corrige dónde se presta el servicio.
   *
   * Es lo único que admite un contrato ya generado: las condiciones comerciales no se
   * renegocian (el backend responde 422). El motivo es obligatorio porque el contrato
   * firmado sigue nombrando la dirección anterior.
   */
  cambiarDireccion(
    codigo: string,
    request: CambiarDireccionContratoRequest,
  ): Observable<ContratoDetalle> {
    return this.http.put<ContratoDetalle>(
      `${this.base}/api/contratos/${codigo}/direccion`,
      request,
    );
  }
}
