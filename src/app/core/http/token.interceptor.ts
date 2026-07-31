import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Adjunta el token de acceso a cada llamada al API Gateway.
 *
 * SOLO a las del gateway: al propio Keycloak, o a cualquier otro host, no se les
 * manda el Bearer — mandarlo de más es filtrar la credencial. Antes de adjuntarlo se
 * pide a Keycloak que refresque el token si le quedan menos de 30 s de vida, para no
 * salir a la red con uno recién caducado (updateToken no hace nada si aún es válido).
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase)) {
    return next(req);
  }

  const keycloak = inject(Keycloak);

  return from(keycloak.updateToken(30)).pipe(
    switchMap(() => {
      const autorizada = req.clone({
        setHeaders: { Authorization: `Bearer ${keycloak.token}` },
      });
      return next(autorizada);
    }),
  );
};
