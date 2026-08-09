import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Shell } from './shell';

/**
 * Construye un JWT con el payload dado, sin firma real: `AuthService` nunca
 * verifica la firma en el navegador (eso lo hace el backend en cada petición), así
 * que para leer la sesión en pantalla basta con que las partes tengan la forma
 * correcta.
 */
function jwtDePrueba(payload: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.firma-no-verificada`;
}

describe('Shell', () => {
  beforeEach(() => {
    const token = jwtDePrueba({
      sub: '11111111-1111-4111-8111-111111111111',
      preferred_username: 'admin.demo',
      name: 'Ana Administradora',
      email: 'admin.demo@smartuz.net',
      usuario_id: 1,
      realm_access: { roles: ['ADMIN'] },
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    localStorage.setItem('isp.sesion', JSON.stringify({ token, debeCambiarPassword: false }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('muestra la identidad de la sesión en la topbar', async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-name')?.textContent).toContain('Ana');
  });
});
