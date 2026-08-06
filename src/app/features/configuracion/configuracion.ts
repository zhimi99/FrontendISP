import { Component, computed, inject, signal } from '@angular/core';

import { IconComponent } from '../../shared/icon';
import { AuthService } from '../../core/services/auth.service';
import { CatalogosComponent } from './catalogos';
import { EmisorComponent } from './emisor';
import { EmpleadosComponent } from './empleados';
import { PlanesComponent } from './planes';

export type Pestana = 'empleados' | 'catalogos' | 'planes' | 'emisor';

/**
 * Configuración: los maestros del sistema.
 *
 * Aquí vive lo que se define una vez y condiciona todo lo demás — quién trabaja en la
 * empresa, qué materiales y bodegas existen, qué planes se venden y con qué datos se
 * factura. Hasta ahora todo esto se creaba con migraciones SQL, o sea, con un
 * despliegue por cada conector nuevo.
 *
 * <p><b>Quién ve qué.</b> Casi todo es de ADMIN, y no por celo: cada una de estas
 * pantallas define el vocabulario con el que después se escribe el histórico. La
 * excepción es el emisor, que FINANZAS puede <i>consultar</i> porque sale impreso en
 * cada comprobante que emite; cambiarlo sigue siendo de ADMIN, y el backend lo exige
 * igual aunque aquí se ocultara el botón.
 */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [IconComponent, EmpleadosComponent, CatalogosComponent, PlanesComponent, EmisorComponent],
  templateUrl: './configuracion.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class ConfiguracionComponent {
  private readonly auth = inject(AuthService);

  readonly esAdmin = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  readonly esFinanzas = computed(() => this.auth.tieneRol('FINANZAS'));

  /** Pestañas que esta persona puede abrir; el backend manda igual. */
  readonly pestanas = computed<{ id: Pestana; texto: string; icono: string }[]>(() => {
    if (this.esAdmin()) {
      return [
        { id: 'empleados', texto: 'Empleados', icono: 'users' },
        { id: 'catalogos', texto: 'Materiales y bodegas', icono: 'box' },
        { id: 'planes', texto: 'Planes', icono: 'network' },
        { id: 'emisor', texto: 'Emisor SRI', icono: 'invoice' },
      ];
    }
    // Facturación consulta el emisor porque sale impreso en cada RIDE.
    if (this.esFinanzas()) {
      return [{ id: 'emisor', texto: 'Emisor SRI', icono: 'invoice' }];
    }
    return [];
  });

  readonly activa = signal<Pestana>('empleados');

  constructor() {
    // Quien no es ADMIN entra directo a lo único que puede ver.
    const primera = this.pestanas()[0];
    if (primera) this.activa.set(primera.id);
  }
}
