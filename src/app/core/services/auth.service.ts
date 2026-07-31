import { Injectable, computed, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

import { PerfilSesion, Rol } from '../models/auth.model';

/**
 * Identidad de la sesión, leída del token de Keycloak.
 *
 * Cuando este servicio se construye, Keycloak ya autenticó al usuario: la app arranca
 * con `login-required` (ver provideKeycloak), así que sin sesión no se llega hasta
 * aquí. Su trabajo es solo LEER el token — quién es, qué roles trae y su `usuario_id`.
 *
 * La ficha completa del empleado (cargo, cédula, teléfono) NO está en el token: la da
 * MS-USUARIOS en `GET /api/usuarios/yo`. Ver PerfilService.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = inject(Keycloak);
  private readonly _perfil = signal<PerfilSesion | null>(this.leerToken());

  readonly perfil = this._perfil.asReadonly();
  readonly autenticado = computed(() => this._perfil() !== null);
  readonly roles = computed<Rol[]>(() => this._perfil()?.roles ?? []);
  /** Rol principal para pintar la UI (el primero conocido del token). */
  readonly rol = computed<Rol | null>(() => this.roles()[0] ?? null);

  /** ¿La sesión tiene ALGUNO de estos roles? Base para guards y para ocultar acciones. */
  tieneRol(...roles: Rol[]): boolean {
    const mios = this.roles();
    return roles.some((r) => mios.includes(r));
  }

  /** Cierra la sesión en Keycloak y devuelve al usuario al inicio de la app. */
  logout(): void {
    this.keycloak.logout({ redirectUri: window.location.origin });
  }

  /** El token de acceso en crudo, por si alguna llamada fuera del interceptor lo necesita. */
  token(): string | undefined {
    return this.keycloak.token;
  }

  private leerToken(): PerfilSesion | null {
    const t = this.keycloak.tokenParsed as Record<string, unknown> | undefined;
    if (!t) return null;

    const nombre = (t['name'] as string) ?? (t['preferred_username'] as string) ?? '';
    const realmAccess = t['realm_access'] as { roles?: string[] } | undefined;
    const usuarioIdCrudo = t['usuario_id'];

    return {
      sub: (t['sub'] as string) ?? '',
      usuarioId: usuarioIdCrudo != null ? Number(usuarioIdCrudo) : null,
      usuario: (t['preferred_username'] as string) ?? '',
      nombre,
      email: (t['email'] as string) ?? '',
      roles: this.mapearRoles(realmAccess?.roles ?? []),
      iniciales: this.iniciales(nombre),
    };
  }

  /** Traduce los roles del realm a los del frontend. Los que no reconoce, los ignora. */
  private mapearRoles(realmRoles: string[]): Rol[] {
    const conocidos: Record<string, Rol> = {
      ADMIN: 'ADMINISTRADOR',
      FINANZAS: 'FINANZAS',
      COBRANZAS: 'COBRANZAS',
      TECNICO: 'TECNICO',
      SOPORTE: 'SOPORTE',
    };
    return realmRoles.map((r) => conocidos[r]).filter((r): r is Rol => !!r);
  }

  private iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
  }
}
