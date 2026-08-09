import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Protege todo lo que cuelga de él: sin sesión, a `/login`; con sesión pero con la
 * contraseña temporal pendiente, a `/cambiar-password`. Los dos redirigen guardando
 * `redirect` en la URL, así el login (o el cambio de contraseña) puede devolver a la
 * persona exactamente a donde iba.
 *
 * Sirve tanto de `canActivate` (la propia ruta `/cambiar-password`) como de
 * `canActivateChild` (todo lo demás, aplicado una sola vez sobre el nodo que
 * envuelve las rutas protegidas) — la firma de ambos guards es idéntica.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.autenticado()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }

  if (auth.debeCambiarPassword() && !state.url.startsWith('/cambiar-password')) {
    return router.createUrlTree(['/cambiar-password'], { queryParams: { redirect: state.url } });
  }

  return true;
};
