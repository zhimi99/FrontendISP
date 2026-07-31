import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideKeycloak } from './core/auth/keycloak';
import { tokenInterceptor } from './core/http/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Inicia la sesión (Keycloak, code+PKCE) antes de dibujar la app.
    provideKeycloak(),
    provideRouter(routes),
    // El interceptor adjunta el Bearer a las llamadas al gateway.
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
};
