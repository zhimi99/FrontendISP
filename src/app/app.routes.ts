import { Routes } from '@angular/router';

import { ClienteDetalleComponent } from './features/clientes/cliente-detalle';
import { ClienteNuevoComponent } from './features/clientes/cliente-nuevo';
import { ClientesComponent } from './features/clientes/clientes';
import { CobranzasComponent } from './features/cobranzas/cobranzas';
import { DashboardComponent } from './features/dashboard/dashboard';
import { ContratosComponent } from './features/contratos/contratos';
import { FacturacionComponent } from './features/facturacion/facturacion';
import { InventarioComponent } from './features/inventario/inventario';
import { CierresCajaComponent } from './features/reportes/cierres-caja';
import { ConfiguracionComponent } from './features/configuracion/configuracion';
import { RedComponent } from './features/red/red';
import { SesionComponent } from './features/sesion/sesion';
import { SoporteComponent } from './features/soporte/soporte';

export const routes: Routes = [
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
  { path: 'configuracion', component: ConfiguracionComponent },

  { path: '**', redirectTo: 'dashboard' },
];
