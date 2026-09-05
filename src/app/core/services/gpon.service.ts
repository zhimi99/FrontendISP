import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AprovisionamientoGpon,
  AprovisionarGponRequest,
  OltResumen,
  PuertoPonResumen,
} from '../models/gpon.model';

/**
 * Aprovisionamiento GPON contra MS-RED.
 *
 * Todo el trabajo ocurre en el servidor: reparte los recursos de la OLT y
 * devuelve los comandos ya escritos. Este servicio no calcula nada.
 */
@Injectable({ providedIn: 'root' })
export class GponService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/api/red/gpon`;

  /**
   * Reserva los recursos del contrato y devuelve sus comandos.
   *
   * Es idempotente en el backend: repetir la llamada sobre un contrato ya
   * aprovisionado devuelve lo mismo en vez de consumir otro número de ONT, así
   * que reintentar tras un fallo de red es seguro.
   */
  aprovisionar(peticion: AprovisionarGponRequest): Observable<AprovisionamientoGpon> {
    return this.http.post<AprovisionamientoGpon>(`${this.base}/aprovisionar`, peticion);
  }

  /**
   * Aprovisionamiento de un contrato. El backend responde 204 sin cuerpo cuando
   * todavía no lo tiene, que llega aquí como `null`: es lo normal antes del alta.
   */
  porContrato(contratoCodigo: string): Observable<AprovisionamientoGpon | null> {
    return this.http.get<AprovisionamientoGpon | null>(
      `${this.base}/contratos/${encodeURIComponent(contratoCodigo)}`,
    );
  }

  /** Deja constancia de que los comandos ya se ejecutaron en la OLT. */
  confirmarAplicado(contratoId: number): Observable<AprovisionamientoGpon> {
    return this.http.post<AprovisionamientoGpon>(
      `${this.base}/contratos/${contratoId}/aplicado`,
      {},
    );
  }

  /** OLT activas, para elegir cuando hay más de una. */
  olts(): Observable<OltResumen[]> {
    return this.http.get<OltResumen[]>(`${this.base}/olts`);
  }

  /** Puertos PON de una OLT, del más libre al más lleno. */
  puertos(oltId: number, soloConHueco = true): Observable<PuertoPonResumen[]> {
    return this.http.get<PuertoPonResumen[]>(
      `${this.base}/olts/${oltId}/puertos?soloConHueco=${soloConHueco}`,
    );
  }
}
