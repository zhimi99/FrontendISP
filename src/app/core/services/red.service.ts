import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AbonadoRed, AbonadoRedResumen } from '../models/red.model';

/** Estado de red de los contratos (MS-RED), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class RedService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  /**
   * GET /api/red/abonados — el parque. Con `sincronizado=false` solo los que la red
   * no refleja como debería.
   */
  listarAbonados(sincronizado?: boolean): Observable<AbonadoRedResumen[]> {
    let params = new HttpParams();
    if (sincronizado != null) params = params.set('sincronizado', sincronizado);
    return this.http.get<AbonadoRedResumen[]>(`${this.base}/api/red/abonados`, { params });
  }

  /** GET /api/red/abonados/{contratoId} — estado y bitácora de un contrato. */
  detalle(contratoId: number): Observable<AbonadoRed> {
    return this.http.get<AbonadoRed>(`${this.base}/api/red/abonados/${contratoId}`);
  }

  /** POST .../resincronizar — reaplica en la red el perfil deseado. SOPORTE/ADMIN. */
  resincronizar(contratoId: number): Observable<AbonadoRed> {
    return this.http.post<AbonadoRed>(
      `${this.base}/api/red/abonados/${contratoId}/resincronizar`,
      {},
    );
  }
}
