import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UsuarioResumen } from '../models/auth.model';

/** Resolución de nombres de empleados (MS-USUARIOS), a través del gateway. */
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

  /**
   * GET /api/usuarios/resumen — plantilla en bloque (nombre + cargo) para selectores,
   * como el de "asignar orden a un técnico". Sin datos personales.
   */
  resumenes(soloActivos = true): Observable<UsuarioResumen[]> {
    let params = new HttpParams();
    if (soloActivos) params = params.set('activo', true);
    return this.http.get<UsuarioResumen[]>(`${environment.apiBase}/api/usuarios/resumen`, { params });
  }
}
