import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/**
 * Cambio de contraseña obligatorio tras entrar con una temporal.
 *
 * `AuthGuard` desvía aquí a cualquiera cuya credencial venga marcada
 * `debeCambiarPassword`, y no deja salir a ninguna otra ruta hasta que se resuelva
 * (ver auth.guard.ts). Al terminar, retoma `redirect` igual que el login.
 */
@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.scss',
})
export class CambiarPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly passwordActual = signal('');
  readonly passwordNueva = signal('');
  readonly passwordConfirmar = signal('');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  guardar(): void {
    const problema = this.validar();
    if (problema) {
      this.error.set(problema);
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.auth.cambiarPassword(this.passwordActual(), this.passwordNueva()).subscribe({
      next: () => {
        this.enviando.set(false);
        const destino = this.ruta.snapshot.queryParamMap.get('redirect');
        this.router.navigateByUrl(
          destino && destino !== '/cambiar-password' ? destino : '/dashboard',
        );
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDeError(e));
      },
    });
  }

  private validar(): string | null {
    if (!this.passwordActual()) return 'Indica tu contraseña actual.';
    if (this.passwordNueva().length < 8) {
      return 'La contraseña nueva debe tener al menos 8 caracteres.';
    }
    if (this.passwordNueva() !== this.passwordConfirmar()) {
      return 'Las dos contraseñas nuevas no coinciden.';
    }
    if (this.passwordNueva() === this.passwordActual()) {
      return 'La contraseña nueva debe ser distinta de la actual.';
    }
    return null;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 401) return 'La contraseña actual no es correcta.';
    if (e.status === 400) return 'Revisa los datos: la contraseña nueva no cumple el mínimo exigido.';
    if (e.status === 0) return 'No se pudo contactar el backend.';
    return 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
  }
}
