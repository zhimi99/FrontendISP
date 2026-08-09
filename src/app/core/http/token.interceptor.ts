import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Adjunta el token de acceso a cada llamada al backend, y cierra la sesión sola si
 * el servidor la rechaza.
 *
 * SOLO a las llamadas del backend: a cualquier otro host no se le manda el Bearer —
 * mandarlo de más es filtrar la credencial.
 *
 * No hay refresco silencioso (no existe un refresh token en este diseño): el token
 * se manda tal cual hasta que caduca. Un 401 de cualquier endpoint que NO sea el de
 * autenticación significa que la sesión ya no vale —caducó, o se invalidó en el
 * servidor— y lo correcto es cerrarla aquí mismo, no dejar que cada pantalla
 * reinvente su propio manejo de sesión perdida. Los 401 de `/api/auth/**` se dejan
 * pasar tal cual: ahí un 401 es "contraseña incorrecta", un error de formulario que
 * cada pantalla ya muestra por su cuenta — cerrar la sesión ahí sería, en el mejor
 * caso, un no-op, y en el de cambiar contraseña, expulsar a alguien que solo se
 * equivocó tecleando la actual.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const esRutaDeAutenticacion = req.url.includes('/api/auth/');

  const token = auth.token();
  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !esRutaDeAutenticacion) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
