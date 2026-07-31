import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconComponent } from './shared/icon';
import { AuthService } from './core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
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
    { label: 'Reportes', icon: 'chart', path: '/reportes' },
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
