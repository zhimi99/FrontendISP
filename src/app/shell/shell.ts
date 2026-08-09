import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconComponent } from '../shared/icon';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

/**
 * La barra lateral, la topbar y el hueco donde se dibuja la ruta activa.
 *
 * Vive separada de {@link App} —que es solo un `<router-outlet>`— porque no toda
 * ruta debe llevar este armazón puesto: `/login` y `/cambiar-password` se
 * renderizan a pantalla completa, sin menú de navegación que una persona sin
 * sesión (o con la sesión a medio autenticar) no tiene por qué ver.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly collapsed = signal(false);

  protected readonly navMain: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Clientes', icon: 'users', path: '/clientes' },
    { label: 'Contratos', icon: 'contract', path: '/contratos' },
    { label: 'Facturación', icon: 'invoice', path: '/facturacion' },
    { label: 'Cobranzas', icon: 'cash', path: '/cobranzas' },
    { label: 'Soporte', icon: 'support', path: '/soporte' },
    { label: 'Red', icon: 'network', path: '/red' },
    { label: 'Inventario', icon: 'box', path: '/inventario' },
    { label: 'Reportes', icon: 'chart', path: '/reportes/cierres-caja' },
  ];

  protected readonly navFoot: NavItem[] = [
    { label: 'Configuración', icon: 'gear', path: '/configuracion' },
  ];

  protected toggle() {
    this.collapsed.update((v) => !v);
  }

  protected cerrarSesion() {
    this.auth.logout();
  }
}
