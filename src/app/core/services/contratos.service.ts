import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ContratoListado,
  CrearContratoServicioRequest,
  CrearContratoServicioResponse,
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
}
