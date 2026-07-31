import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PlanCatalogo } from '../models/contratos.model';

/** Catálogo de planes (MS-CONTRATOS), para el selector del alta de cliente. */
@Injectable({ providedIn: 'root' })
export class PlanesService {
  private readonly http = inject(HttpClient);

  /** GET /api/planes — planes activos, del más barato al más caro. */
  listar(): Observable<PlanCatalogo[]> {
    return this.http.get<PlanCatalogo[]>(`${environment.apiBase}/api/planes`);
  }
}
