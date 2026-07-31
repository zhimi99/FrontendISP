import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UsuarioFicha } from '../models/auth.model';

/**
 * Consultas al registro de empleados (MS-USUARIOS), siempre a través del gateway.
 *
 * El token viaja solo: lo pone el interceptor. Por eso aquí no hay ni una cabecera
 * de autenticación a la vista.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  /** GET /api/usuarios/yo — la ficha del empleado que hay detrás del token. */
  yo(): Observable<UsuarioFicha> {
    return this.http.get<UsuarioFicha>(`${environment.apiBase}/api/usuarios/yo`);
  }
}
