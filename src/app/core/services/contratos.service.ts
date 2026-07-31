import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ContratoListado } from '../models/contratos.model';

/** Consulta de contratos (MS-CONTRATOS), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class ContratosService {
  private readonly http = inject(HttpClient);

  /** GET /api/contratos — contratos con cliente, plan, dirección y PPPoE resueltos. */
  listar(): Observable<ContratoListado[]> {
    return this.http.get<ContratoListado[]>(`${environment.apiBase}/api/contratos`);
  }
}
