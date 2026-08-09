import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CambiarPasswordRequest, LoginRequest, LoginResponse } from '../models/login.model';
import { PerfilSesion, Rol } from '../models/auth.model';

/** Lo que se guarda entre recargas de página. Una sola clave, un solo objeto. */
interface SesionAlmacenada {
  token: string;
  debeCambiarPassword: boolean;
}

const CLAVE_ALMACENAMIENTO = 'isp.sesion';

/**
 * Identidad de la sesión: login local contra MS-USUARIOS (`/api/auth/login`).
 *
 * <h2>Por qué el token vive en localStorage</h2>
 *
 * No hay refresh token en este diseño — el token dura 24 h y punto; pedirlo de
 * nuevo es volver a entrar. Guardarlo solo en memoria echaría a la persona de la
 * sesión cada vez que recargara la página (F5), que es justo lo que Keycloak evitaba
 * con su comprobación silenciosa. localStorage persiste entre recargas a cambio de
 * quedar expuesto a un XSS que consiga ejecutar JavaScript en la página; para un
 * panel interno de uso en LAN es la opción estándar y razonable. Si este panel
 * quedara expuesto a Internet sin más controles, ahí sí valdría la pena moverlo a una
 * cookie httpOnly que el backend gestione — eso es un cambio de API, no de aquí.
 *
 * <h2>De dónde sale la caducidad</h2>
 *
 * No se calcula `ahora + expiraEnSegundos()`: eso dependería del reloj de ESTE
 * navegador. Se lee el claim `exp` del propio token, que es la misma fecha que el
 * backend usa para rechazarlo — así el frontend nunca cree tener sesión cuando el
 * servidor ya la habría cerrado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _perfil = signal<PerfilSesion | null>(null);
  private readonly _debeCambiarPassword = signal(false);
  private _token: string | null = null;

  readonly perfil = this._perfil.asReadonly();
  readonly autenticado = computed(() => this._perfil() !== null);
  readonly debeCambiarPassword = this._debeCambiarPassword.asReadonly();
  readonly roles = computed<Rol[]>(() => this._perfil()?.roles ?? []);
  /** Rol principal para pintar la UI (el primero conocido del token). */
  readonly rol = computed<Rol | null>(() => this.roles()[0] ?? null);

  constructor() {
    this.hidratarDesdeAlmacenamiento();
  }

  /** ¿La sesión tiene ALGUNO de estos roles? Base para guards y para ocultar acciones. */
  tieneRol(...roles: Rol[]): boolean {
    const mios = this.roles();
    return roles.some((r) => mios.includes(r));
  }

  /** El token de acceso en crudo, por si alguna llamada fuera del interceptor lo necesita. */
  token(): string | undefined {
    return this._token ?? undefined;
  }

  login(usuario: string, password: string): Observable<LoginResponse> {
    const cuerpo: LoginRequest = { usuario, password };
    return this.http.post<LoginResponse>(`${environment.apiBase}/api/auth/login`, cuerpo).pipe(
      tap((respuesta) => this.guardarSesion(respuesta.token, respuesta.debeCambiarPassword)),
    );
  }

  /**
   * @param passwordActual se exige aunque ya haya sesión: sin esto, un token robado
   *                        o una sesión dejada abierta bastaría para expulsar al
   *                        dueño real cambiándole la contraseña sin saberla
   */
  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<void> {
    const cuerpo: CambiarPasswordRequest = { passwordActual, passwordNueva };
    return this.http
      .post<void>(`${environment.apiBase}/api/auth/cambiar-password`, cuerpo)
      .pipe(tap(() => this.marcarPasswordCambiada()));
  }

  logout(): void {
    localStorage.removeItem(CLAVE_ALMACENAMIENTO);
    this._token = null;
    this._perfil.set(null);
    this._debeCambiarPassword.set(false);
    this.router.navigateByUrl('/login');
  }

  private guardarSesion(token: string, debeCambiarPassword: boolean): void {
    const perfil = this.decodificarToken(token);
    if (!perfil) {
      // El backend acaba de emitirlo: si no se puede leer, es un error de este
      // código (el formato del claim cambió) y no algo que deba fingirse resuelto.
      throw new Error('El token recibido del backend no se pudo interpretar');
    }
    this._token = token;
    this._perfil.set(perfil);
    this._debeCambiarPassword.set(debeCambiarPassword);
    localStorage.setItem(
      CLAVE_ALMACENAMIENTO,
      JSON.stringify({ token, debeCambiarPassword } satisfies SesionAlmacenada),
    );
  }

  private marcarPasswordCambiada(): void {
    this._debeCambiarPassword.set(false);
    if (this._token) {
      localStorage.setItem(
        CLAVE_ALMACENAMIENTO,
        JSON.stringify({ token: this._token, debeCambiarPassword: false } satisfies SesionAlmacenada),
      );
    }
  }

  private hidratarDesdeAlmacenamiento(): void {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) return;

    let almacenada: SesionAlmacenada;
    try {
      almacenada = JSON.parse(crudo);
    } catch {
      localStorage.removeItem(CLAVE_ALMACENAMIENTO);
      return;
    }

    const perfil = this.decodificarToken(almacenada.token);
    if (!perfil) {
      // Token caducado, corrupto, o de un formato anterior: no hay sesión que
      // rescatar. Se limpia para no repetir este intento en cada recarga.
      localStorage.removeItem(CLAVE_ALMACENAMIENTO);
      return;
    }
    this._token = almacenada.token;
    this._perfil.set(perfil);
    this._debeCambiarPassword.set(almacenada.debeCambiarPassword);
  }

  /** @returns null si el token está mal formado o ya caducó. */
  private decodificarToken(token: string): PerfilSesion | null {
    const claims = this.payloadDe(token);
    if (!claims) return null;

    const exp = claims['exp'];
    if (typeof exp === 'number' && Date.now() >= exp * 1000) {
      return null;
    }

    const nombre = (claims['name'] as string) ?? (claims['preferred_username'] as string) ?? '';
    const realmAccess = claims['realm_access'] as { roles?: string[] } | undefined;
    const usuarioIdCrudo = claims['usuario_id'];

    return {
      sub: (claims['sub'] as string) ?? '',
      usuarioId: usuarioIdCrudo != null ? Number(usuarioIdCrudo) : null,
      usuario: (claims['preferred_username'] as string) ?? '',
      nombre,
      email: (claims['email'] as string) ?? '',
      roles: this.mapearRoles(realmAccess?.roles ?? []),
      iniciales: this.iniciales(nombre),
    };
  }

  /**
   * Decodifica el segundo segmento del JWT (base64url) a JSON. Sin verificar la
   * firma: eso lo hace el backend en cada petición, y es el único sitio donde de
   * verdad importa. Aquí el token solo se lee para pintar la sesión en pantalla.
   */
  private payloadDe(token: string): Record<string, unknown> | null {
    const segmentos = token.split('.');
    if (segmentos.length !== 3) return null;
    try {
      const base64 = segmentos[1].replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(relleno));
    } catch {
      return null;
    }
  }

  /** Traduce los roles del backend a los del frontend. Los que no reconoce, los ignora. */
  private mapearRoles(rolesBackend: string[]): Rol[] {
    const conocidos: Record<string, Rol> = {
      ADMIN: 'ADMINISTRADOR',
      FINANZAS: 'FINANZAS',
      COBRANZAS: 'COBRANZAS',
      TECNICO: 'TECNICO',
      SOPORTE: 'SOPORTE',
    };
    return rolesBackend.map((r) => conocidos[r]).filter((r): r is Rol => !!r);
  }

  private iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
  }
}
