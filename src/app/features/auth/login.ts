import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/**
 * Puerta de entrada del sistema: usuario y contraseña contra
 * `POST /api/auth/login`.
 *
 * Sin `AuthGuard`: es la única ruta pública. Tras entrar, respeta `redirect` si
 * venía de un guard que rebotó una visita sin sesión; si no, va al panel.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly usuario = signal('');
  readonly password = signal('');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  entrar(): void {
    const usuario = this.usuario().trim();
    const password = this.password();
    if (!usuario || !password) {
      this.error.set('Indica tu usuario y tu contraseña.');
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.auth.login(usuario, password).subscribe({
      next: () => {
        this.enviando.set(false);
        const destino = this.ruta.snapshot.queryParamMap.get('redirect');
        // AuthGuard ya se encarga de desviar a /cambiar-password si toca; aquí
        // basta con volver a donde la persona iba.
        this.router.navigateByUrl(destino && destino !== '/login' ? destino : '/dashboard');
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDeError(e));
      },
    });
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 401) return 'Usuario o contraseña incorrectos.';
    if (e.status === 0) return 'No se pudo contactar el backend.';
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}
