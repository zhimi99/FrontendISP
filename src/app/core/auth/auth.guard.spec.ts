import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

/** Un doble mínimo: el guard solo lee `autenticado()` y `debeCambiarPassword()`. */
function authDoble(autenticado: boolean, debeCambiarPassword: boolean) {
  return {
    autenticado: () => autenticado,
    debeCambiarPassword: () => debeCambiarPassword,
  } as unknown as AuthService;
}

function estadoHacia(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  function ejecutar(auth: AuthService, url: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, estadoHacia(url)),
    );
  }

  it('sin sesión, redirige a /login con el destino original', () => {
    const resultado = ejecutar(authDoble(false, false), '/cobranzas');

    expect(resultado).toBeInstanceOf(UrlTree);
    const arbol = resultado as UrlTree;
    expect(arbol.toString()).toContain('/login');
    expect(arbol.queryParams['redirect']).toBe('/cobranzas');
  });

  it('con sesión y contraseña pendiente, redirige a /cambiar-password', () => {
    const resultado = ejecutar(authDoble(true, true), '/cobranzas');

    expect(resultado).toBeInstanceOf(UrlTree);
    expect((resultado as UrlTree).toString()).toContain('/cambiar-password');
  });

  it('con sesión, contraseña pendiente, pero YA yendo a /cambiar-password, deja pasar', () => {
    const resultado = ejecutar(authDoble(true, true), '/cambiar-password');

    expect(resultado).toBe(true);
  });

  it('con sesión completa, deja pasar', () => {
    const resultado = ejecutar(authDoble(true, false), '/cobranzas');

    expect(resultado).toBe(true);
  });
});
