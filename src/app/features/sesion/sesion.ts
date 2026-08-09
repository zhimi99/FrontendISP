import { Component, inject, signal } from '@angular/core';

import { IconComponent } from '../../shared/icon';
import { UsuarioFicha } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';

/**
 * Prueba de extremo a extremo de la autenticación.
 *
 * Muestra, lado a lado, dos cosas: lo que dice el TOKEN (leído en el navegador, sin
 * tocar el backend) y lo que responde el BACKEND real a `GET /api/usuarios/yo`. Si
 * la ficha aparece, la cadena entera funciona: login → token → interceptor →
 * MS-USUARIOS.
 */
@Component({
  selector: 'app-sesion',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './sesion.html',
  styleUrl: './sesion.scss',
})
export class SesionComponent {
  private readonly perfilService = inject(PerfilService);
  protected readonly auth = inject(AuthService);

  protected readonly ficha = signal<UsuarioFicha | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(true);

  constructor() {
    this.consultar();
  }

  protected consultar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.perfilService.yo().subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  private mensajeDeError(e: { status?: number; statusText?: string }): string {
    if (e.status === 0) {
      return 'No se pudo contactar el gateway (¿está arriba en :8089? ¿CORS?).';
    }
    if (e.status === 401) {
      return 'El gateway rechazó el token (401). La sesión pudo expirar.';
    }
    if (e.status === 404) {
      return 'El token es válido, pero no hay un empleado con esta identidad en MS-USUARIOS (404).';
    }
    if (e.status) {
      return `El gateway respondió ${e.status} ${e.statusText ?? ''}.`;
    }
    return 'Error inesperado consultando /api/usuarios/yo.';
  }
}
