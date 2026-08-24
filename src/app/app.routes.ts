import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { CambiarPasswordComponent } from './features/auth/cambiar-password';
import { LoginComponent } from './features/auth/login';
import { ClienteDetalleComponent } from './features/clientes/cliente-detalle';
import { ClienteNuevoComponent } from './features/clientes/cliente-nuevo';
import { ClientesComponent } from './features/clientes/clientes';
import { CobranzasComponent } from './features/cobranzas/cobranzas';
import { DashboardComponent } from './features/dashboard/dashboard';
import { ContratosComponent } from './features/contratos/contratos';
import { FacturacionComponent } from './features/facturacion/facturacion';
import { InventarioComponent } from './features/inventario/inventario';
import { CierresCajaComponent } from './features/reportes/cierres-caja';
import { VentasReporteComponent } from './features/reportes/ventas-reporte';
import { ConfiguracionComponent } from './features/configuracion/configuracion';
import { RedComponent } from './features/red/red';
import { SesionComponent } from './features/sesion/sesion';
import { SoporteComponent } from './features/soporte/soporte';
import { Shell } from './shell/shell';

export const routes: Routes = [
  // Únicas rutas públicas: la puerta de entrada y el cambio de contraseña
  // obligatorio. Ninguna de las dos lleva el armazón de Shell (sin menú, sin
  // sesión que mostrar en la topbar).
  { path: 'login', component: LoginComponent },
  { path: 'cambiar-password', component: CambiarPasswordComponent, canActivate: [authGuard] },

  {
    path: '',
    component: Shell,
    // Un solo guard para todo lo que cuelga de aquí: sin sesión, a /login; con la
    // contraseña temporal pendiente, a /cambiar-password. Ver auth.guard.ts.
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'clientes', component: ClientesComponent },
      { path: 'clientes/nuevo', component: ClienteNuevoComponent },
      { path: 'clientes/:id', component: ClienteDetalleComponent },

      // Identidad de la sesión y prueba de la cadena de autenticación real
      { path: 'sesion', component: SesionComponent },

      // Módulos aún por diseñar → pantalla temporal
      { path: 'dashboard', component: DashboardComponent },
      { path: 'contratos', component: ContratosComponent },
      { path: 'facturacion', component: FacturacionComponent },
      { path: 'cobranzas', component: CobranzasComponent },
      { path: 'soporte', component: SoporteComponent },
      { path: 'red', component: RedComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'reportes', pathMatch: 'full', redirectTo: 'reportes/cierres-caja' },
      { path: 'reportes/cierres-caja', component: CierresCajaComponent },
      { path: 'reportes/ventas', component: VentasReporteComponent },
      { path: 'configuracion', component: ConfiguracionComponent },

      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
