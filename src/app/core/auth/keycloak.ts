import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import Keycloak from 'keycloak-js';

import { environment } from '../../../environments/environment';

/**
 * Instancia única de Keycloak, registrada como servicio para poder inyectarla donde
 * haga falta (AuthService, interceptor) sin recurrir a variables globales.
 */
export function crearKeycloak(): Keycloak {
  return new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId,
  });
}

/**
 * Arranca la sesión ANTES de que la aplicación se dibuje.
 *
 * Con `onLoad: 'login-required'`, quien llega sin sesión es redirigido a Keycloak;
 * vuelve ya autenticado y solo entonces Angular termina de arrancar. Es lo correcto
 * para un panel interno: aquí no hay ninguna pantalla pública.
 *
 * `pkceMethod: 'S256'` — el código de autorización no sirve sin su verificador, así
 * que interceptarlo en el navegador no basta para robar la sesión (por eso el cliente
 * puede ser público). `checkLoginIframe: false` evita el iframe de comprobación de
 * sesión, que en localhost choca con las cookies de terceros y no aporta nada aquí.
 */
export function provideKeycloak(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Keycloak, useFactory: crearKeycloak },
    provideAppInitializer(() => {
      const keycloak = inject(Keycloak);
      return keycloak.init({
        onLoad: 'login-required',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      });
    }),
  ]);
}
