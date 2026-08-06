import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CrearEmpleadoRequest,
  EditarEmpleadoRequest,
  EmpleadoFicha,
  UsuarioResumen,
} from '../models/auth.model';

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

  /** GET /api/usuarios — la plantilla con ficha completa. Solo ADMIN. */
  listar(activo?: boolean): Observable<EmpleadoFicha[]> {
    let params = new HttpParams();
    if (activo != null) params = params.set('activo', activo);
    return this.http.get<EmpleadoFicha[]>(`${environment.apiBase}/api/usuarios`, { params });
  }

  /**
   * POST /api/usuarios — alta de un empleado: crea su cuenta en Keycloak y su ficha
   * en la misma operación. Solo ADMIN.
   *
   * Respuestas que la pantalla debe saber distinguir: 409 si el usuario o la cédula
   * ya existen, y 502 si Keycloak no responde (en ese caso no se creó nada a medias).
   */
  crear(req: CrearEmpleadoRequest): Observable<EmpleadoFicha> {
    return this.http.post<EmpleadoFicha>(`${environment.apiBase}/api/usuarios`, req);
  }

  /**
   * PUT /api/usuarios/{id} — actualiza nombre, contacto y cargo. La identidad
   * (usuario, cédula y el enlace con Keycloak) no se toca desde aquí.
   */
  editar(id: number, req: EditarEmpleadoRequest): Observable<EmpleadoFicha> {
    return this.http.put<EmpleadoFicha>(`${environment.apiBase}/api/usuarios/${id}`, req);
  }

  /** POST .../desactivar — da de baja sin borrar (sus operaciones lo referencian). */
  desactivar(id: number): Observable<EmpleadoFicha> {
    return this.http.post<EmpleadoFicha>(`${environment.apiBase}/api/usuarios/${id}/desactivar`, {});
  }

  /** POST .../activar — reincorpora a un empleado dado de baja. */
  activar(id: number): Observable<EmpleadoFicha> {
    return this.http.post<EmpleadoFicha>(`${environment.apiBase}/api/usuarios/${id}/activar`, {});
  }
}
