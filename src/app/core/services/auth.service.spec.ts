import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { LoginResponse } from '../models/login.model';
import { AuthService } from './auth.service';

const CLAVE = 'isp.sesion';

function jwtDePrueba(payload: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.firma-no-verificada`;
}

function payloadAdmin(exp = Math.floor(Date.now() / 1000) + 3600) {
  return {
    sub: '11111111-1111-4111-8111-111111111111',
    preferred_username: 'admin.demo',
    name: 'Ana Administradora',
    email: 'admin.demo@smartuz.net',
    usuario_id: 1,
    realm_access: { roles: ['ADMIN'] },
    exp,
  };
}

describe('AuthService', () => {
  let http: HttpTestingController;

  function crearServicio(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    localStorage.clear();
    http?.verify();
  });

  describe('al construirse (hidratación desde localStorage)', () => {
    it('sin nada guardado, no hay sesión', () => {
      const auth = crearServicio();
      expect(auth.autenticado()).toBe(false);
      expect(auth.perfil()).toBeNull();
    });

    it('con un token válido guardado, recupera la sesión completa', () => {
      const token = jwtDePrueba(payloadAdmin());
      localStorage.setItem(CLAVE, JSON.stringify({ token, debeCambiarPassword: true }));

      const auth = crearServicio();

      expect(auth.autenticado()).toBe(true);
      expect(auth.perfil()?.usuario).toBe('admin.demo');
      expect(auth.perfil()?.usuarioId).toBe(1);
      // El rol del backend (ADMIN) se traduce al del frontend (ADMINISTRADOR).
      expect(auth.roles()).toEqual(['ADMINISTRADOR']);
      expect(auth.debeCambiarPassword()).toBe(true);
      expect(auth.token()).toBe(token);
    });

    it('con un token caducado, no hay sesión y se limpia el almacenamiento', () => {
      const vencidoHaceUnaHora = Math.floor(Date.now() / 1000) - 3600;
      const token = jwtDePrueba(payloadAdmin(vencidoHaceUnaHora));
      localStorage.setItem(CLAVE, JSON.stringify({ token, debeCambiarPassword: false }));

      const auth = crearServicio();

      expect(auth.autenticado()).toBe(false);
      // Sin esto, cada recarga repetiría el mismo intento fallido de rescatar la sesión.
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });

    it('con un JSON corrupto, no revienta: simplemente no hay sesión', () => {
      localStorage.setItem(CLAVE, '{esto no es json');

      const auth = crearServicio();

      expect(auth.autenticado()).toBe(false);
    });
  });

  describe('login()', () => {
    it('con éxito, guarda el token y deja la sesión lista', () => {
      const auth = crearServicio();
      const token = jwtDePrueba(payloadAdmin());
      const respuesta: LoginResponse = {
        token,
        tokenType: 'Bearer',
        expiraEnSegundos: 86400,
        debeCambiarPassword: false,
      };

      let resultado: LoginResponse | undefined;
      auth.login('admin.demo', 'demo').subscribe((r) => (resultado = r));

      const peticion = http.expectOne(`${environment.apiBase}/api/auth/login`);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ usuario: 'admin.demo', password: 'demo' });
      peticion.flush(respuesta);

      expect(resultado).toEqual(respuesta);
      expect(auth.autenticado()).toBe(true);
      expect(JSON.parse(localStorage.getItem(CLAVE)!).token).toBe(token);
    });

    it('con credenciales inválidas, no deja sesión a medias', () => {
      const auth = crearServicio();

      let fallo: unknown;
      auth.login('admin.demo', 'mala').subscribe({ error: (e) => (fallo = e) });

      http.expectOne(`${environment.apiBase}/api/auth/login`)
        .flush({ message: 'Usuario o contraseña incorrectos' }, { status: 401, statusText: 'Unauthorized' });

      expect(fallo).toBeTruthy();
      expect(auth.autenticado()).toBe(false);
    });
  });

  describe('cambiarPassword()', () => {
    it('al terminar, limpia la marca de "debe cambiarla" y la persiste', () => {
      const token = jwtDePrueba(payloadAdmin());
      localStorage.setItem(CLAVE, JSON.stringify({ token, debeCambiarPassword: true }));
      const auth = crearServicio();
      expect(auth.debeCambiarPassword()).toBe(true);

      auth.cambiarPassword('demo', 'unaNueva123').subscribe();
      http.expectOne(`${environment.apiBase}/api/auth/cambiar-password`).flush(null);

      expect(auth.debeCambiarPassword()).toBe(false);
      expect(JSON.parse(localStorage.getItem(CLAVE)!).debeCambiarPassword).toBe(false);
    });
  });

  describe('logout()', () => {
    it('limpia la sesión, el almacenamiento, y manda a /login', () => {
      const token = jwtDePrueba(payloadAdmin());
      localStorage.setItem(CLAVE, JSON.stringify({ token, debeCambiarPassword: false }));
      const auth = crearServicio();
      const router = TestBed.inject(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      auth.logout();

      expect(auth.autenticado()).toBe(false);
      expect(auth.perfil()).toBeNull();
      expect(localStorage.getItem(CLAVE)).toBeNull();
      expect(navegar).toHaveBeenCalledWith('/login');
    });
  });

  describe('tieneRol()', () => {
    it('reconoce cualquiera de los roles pedidos', () => {
      const token = jwtDePrueba(payloadAdmin());
      localStorage.setItem(CLAVE, JSON.stringify({ token, debeCambiarPassword: false }));
      const auth = crearServicio();

      expect(auth.tieneRol('ADMINISTRADOR', 'FINANZAS')).toBe(true);
      expect(auth.tieneRol('COBRANZAS', 'SOPORTE')).toBe(false);
    });
  });
});
