import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import Keycloak from 'keycloak-js';

import { App } from './app';

/**
 * Doble mínimo de Keycloak: en la app real la instancia llega ya inicializada
 * (login-required en el arranque), así que en el test basta con simular un token ya
 * parseado. Evita que AuthService tenga que hablar con un Keycloak real.
 */
const keycloakDoble = {
  authenticated: true,
  token: 'token-de-prueba',
  tokenParsed: {
    sub: '11111111-1111-4111-8111-111111111111',
    preferred_username: 'admin.demo',
    name: 'Ana Administradora',
    email: 'admin.demo@smartuz.net',
    usuario_id: 1,
    realm_access: { roles: ['ADMIN'] },
  },
  logout: () => {},
  updateToken: () => Promise.resolve(true),
} as unknown as Keycloak;

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: Keycloak, useValue: keycloakDoble }],
    }).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la identidad de la sesión en la topbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-name')?.textContent).toContain('Ana');
  });
});
