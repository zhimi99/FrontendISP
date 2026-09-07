import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconComponent } from '../shared/icon';
import { AuthService } from '../core/services/auth.service';

/** Por debajo de este ancho, el menú deja de empujar contenido y pasa a ser un cajón. */
const UMBRAL_MOVIL = '(max-width: 1024px)';

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

  /** Escritorio: reduce el menú a solo íconos, pero sigue empujando el contenido. */
  protected readonly collapsed = signal(false);
  /** Tablet/móvil: el menú es un cajón superpuesto, cerrado salvo que se pida. */
  protected readonly mobileOpen = signal(false);

  protected readonly navMain: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Clientes', icon: 'users', path: '/clientes' },
    { label: 'Contratos', icon: 'contract', path: '/contratos' },
    { label: 'Facturación', icon: 'invoice', path: '/facturacion' },
    { label: 'Cobranzas', icon: 'cash', path: '/cobranzas' },
    { label: 'Soporte', icon: 'support', path: '/soporte' },
    { label: 'Red', icon: 'network', path: '/red' },
    { label: 'Inventario', icon: 'box', path: '/inventario' },
    { label: 'Compras', icon: 'truck', path: '/compras' },
    { label: 'Reportes', icon: 'chart', path: '/reportes/cierres-caja' },
  ];

  protected readonly navFoot: NavItem[] = [
    { label: 'Configuración', icon: 'gear', path: '/configuracion' },
  ];

  constructor() {
    // Si el componente se destruyera con el cajón abierto (recarga en caliente,
    // etc.), que no quede el scroll del fondo bloqueado para siempre.
    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = '';
    });
  }

  /** Un solo botón, dos comportamientos: en escritorio reduce a íconos, en
   *  tablet/móvil abre el cajón. Cada pantalla solo usa uno de los dos estados. */
  protected toggle() {
    if (this.esMovil()) {
      this.mobileOpen.update((v) => !v);
      this.sincronizarScroll();
    } else {
      this.collapsed.update((v) => !v);
    }
  }

  /** Cierra el cajón: al tocar fuera, al elegir una sección, o con Escape. */
  protected cerrarMovil() {
    this.mobileOpen.set(false);
    this.sincronizarScroll();
  }

  /** Con el cajón abierto, el fondo no debe desplazarse detrás: es lo que hace
   *  que un overlay se sienta sólido en vez de un elemento más de la página. */
  private sincronizarScroll() {
    document.body.style.overflow = this.mobileOpen() ? 'hidden' : '';
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (this.mobileOpen()) this.cerrarMovil();
  }

  /** Si la ventana crece hasta escritorio con el cajón abierto, se cierra solo:
   *  ese estado no significa nada ahí y no debería reaparecer al volver a achicar. */
  @HostListener('window:resize')
  protected onResize() {
    if (!this.esMovil() && this.mobileOpen()) this.cerrarMovil();
  }

  private esMovil(): boolean {
    return window.matchMedia(UMBRAL_MOVIL).matches;
  }

  protected cerrarSesion() {
    this.auth.logout();
  }
}
