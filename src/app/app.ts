import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Raíz de verdad de la aplicación: solo el punto donde el enrutador dibuja lo que
 * corresponda. El armazón con menú y topbar es de {@link Shell}, y solo envuelve
 * las rutas protegidas — no `/login` ni `/cambiar-password`, que van a pantalla
 * completa. Ver app.routes.ts.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
