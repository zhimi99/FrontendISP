import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UsuarioResumen } from '../models/auth.model';

/** Resolución de nombres de empleados por id (MS-USUARIOS), a través del gateway. */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/usuarios/{id} — resumen (nombre, cargo) para poner nombre a un usuario_id.
   * Disponible a SOPORTE/TECNICO/ADMIN/FINANZAS; la lista completa es solo de ADMIN.
   */
  resumen(id: number): Observable<UsuarioResumen> {
    return this.http.get<UsuarioResumen>(`${environment.apiBase}/api/usuarios/${id}`);
  }
}
