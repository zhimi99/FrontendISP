import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AprovisionamientoGpon,
  AprovisionamientoResumen,
  AprovisionarGponRequest,
  CorregirRecursosGponRequest,
  FiltroGpon,
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
  private readonly base = environment.apiBase;

  /**
   * Reserva los recursos del contrato y devuelve sus comandos.
   *
   * Es idempotente en el backend: repetir la llamada sobre un contrato ya
   * aprovisionado devuelve lo mismo en vez de consumir otro número de ONT, así
   * que reintentar tras un fallo de red es seguro.
   */
  aprovisionar(peticion: AprovisionarGponRequest): Observable<AprovisionamientoGpon> {
    return this.http.post<AprovisionamientoGpon>(`${this.base}/api/red/gpon/aprovisionar`, peticion);
  }

  /**
   * Aprovisionamiento de un contrato. El backend responde 204 sin cuerpo cuando
   * todavía no lo tiene, que llega aquí como `null`: es lo normal antes del alta.
   */
  porContrato(contratoCodigo: string): Observable<AprovisionamientoGpon | null> {
    return this.http.get<AprovisionamientoGpon | null>(
      `${this.base}/api/red/gpon/contratos/${encodeURIComponent(contratoCodigo)}`,
    );
  }

  /** Deja constancia de que los comandos ya se ejecutaron en la OLT. */
  confirmarAplicado(contratoId: number): Observable<AprovisionamientoGpon> {
    return this.http.post<AprovisionamientoGpon>(
      `${this.base}/api/red/gpon/contratos/${contratoId}/aplicado`,
      {},
    );
  }

  /**
   * Corrige a mano el puerto/ONT y los service-port ya reservados, y devuelve
   * los 7 comandos regenerados con esos valores.
   *
   * Para cuando la ficha técnica del contrato (carga manual) se corrige
   * después del alta automática: el backend rechaza el cambio si alguno de
   * los números ya lo tiene otro contrato.
   */
  corregirRecursos(
    contratoId: number,
    peticion: CorregirRecursosGponRequest,
  ): Observable<AprovisionamientoGpon> {
    return this.http.put<AprovisionamientoGpon>(
      `${this.base}/api/red/gpon/contratos/${contratoId}/recursos`,
      peticion,
    );
  }

  /** OLT activas, para elegir cuando hay más de una. */
  olts(): Observable<OltResumen[]> {
    return this.http.get<OltResumen[]>(`${this.base}/api/red/gpon/olts`);
  }

  /** Puertos PON de una OLT, del más libre al más lleno. */
  puertos(oltId: number, soloConHueco = true): Observable<PuertoPonResumen[]> {
    return this.http.get<PuertoPonResumen[]>(
      `${this.base}/api/red/gpon/olts/${oltId}/puertos?soloConHueco=${soloConHueco}`,
    );
  }

  /**
   * El registro completo, en el orden físico de la red (tarjeta, puerto, ONT).
   * Sin comandos por fila: se piden aparte con {@link porContrato} cuando el
   * operador abre una fila en concreto.
   */
  listar(filtro: FiltroGpon = {}): Observable<AprovisionamientoResumen[]> {
    let params = new HttpParams();
    if (filtro.tarjeta) params = params.set('tarjeta', filtro.tarjeta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.q?.trim()) params = params.set('q', filtro.q.trim());
    return this.http.get<AprovisionamientoResumen[]>(`${this.base}/api/red/gpon`, { params });
  }
}
