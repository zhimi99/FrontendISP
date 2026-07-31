import { Routes } from '@angular/router';

import { ClienteDetalleComponent } from './features/clientes/cliente-detalle';
import { ClienteNuevoComponent } from './features/clientes/cliente-nuevo';
import { ClientesComponent } from './features/clientes/clientes';
import { CobranzasComponent } from './features/cobranzas/cobranzas';
import { ContratosComponent } from './features/contratos/contratos';
import { FacturacionComponent } from './features/facturacion/facturacion';
import { PlaceholderComponent } from './features/placeholder/placeholder';
import { SesionComponent } from './features/sesion/sesion';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'clientes' },
  { path: 'clientes', component: ClientesComponent },
  { path: 'clientes/nuevo', component: ClienteNuevoComponent },
  { path: 'clientes/:id', component: ClienteDetalleComponent },

  // Identidad de la sesión y prueba de la cadena de autenticación real
  { path: 'sesion', component: SesionComponent },

  // Módulos aún por diseñar → pantalla temporal
  { path: 'dashboard', component: PlaceholderComponent, data: { titulo: 'Dashboard', icono: 'dashboard' } },
  { path: 'contratos', component: ContratosComponent },
  { path: 'facturacion', component: FacturacionComponent },
  { path: 'cobranzas', component: CobranzasComponent },
  { path: 'soporte', component: PlaceholderComponent, data: { titulo: 'Soporte', icono: 'support' } },
  { path: 'red', component: PlaceholderComponent, data: { titulo: 'Red', icono: 'network' } },
  { path: 'inventario', component: PlaceholderComponent, data: { titulo: 'Inventario', icono: 'box' } },
  { path: 'reportes', component: PlaceholderComponent, data: { titulo: 'Reportes', icono: 'chart' } },
  { path: 'configuracion', component: PlaceholderComponent, data: { titulo: 'Configuración', icono: 'gear' } },

  { path: '**', redirectTo: 'clientes' },
];
