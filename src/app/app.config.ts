import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { tokenInterceptor } from './core/http/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // El interceptor adjunta el Bearer a las llamadas al backend y cierra la
    // sesión sola si un 401 dice que ya no vale (ver token.interceptor.ts).
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
};
