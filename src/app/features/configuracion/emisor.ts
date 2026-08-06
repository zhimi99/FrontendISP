import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { AuthService } from '../../core/services/auth.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { AmbienteSri, Emisor } from '../../core/models/facturacion.model';

/**
 * Los datos con los que el ISP se presenta ante el SRI.
 *
 * <p>Es una sola ficha y cambia una vez cada mucho, pero de ella cuelga la validez
 * fiscal de todo lo que se emite. La pantalla enseña las dos fronteras en vez de dejar
 * que se descubran con un error:
 *
 * <ul>
 *   <li>El <b>RUC se bloquea</b> en cuanto hay un comprobante emitido: ese número está
 *       dentro de la clave de acceso de cada factura ya enviada al SRI.</li>
 *   <li>Pasar a <b>PRODUCCIÓN</b> es el punto sin retorno: desde ahí los comprobantes
 *       tienen efectos fiscales, y volver a PRUEBAS con facturas autorizadas dejaría un
 *       salto en la numeración que habría que justificar.</li>
 * </ul>
 *
 * <p>Facturación puede consultarla —sale impresa en cada RIDE— pero no cambiarla.
 */
@Component({
  selector: 'app-config-emisor',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './emisor.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class EmisorComponent {
  private readonly facturacion = inject(FacturacionService);
  private readonly auth = inject(AuthService);

  readonly puedeEditar = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  readonly ambientes: AmbienteSri[] = ['PRUEBAS', 'PRODUCCION'];

  readonly emisor = signal<Emisor | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);

  readonly ruc = signal('');
  readonly razonSocial = signal('');
  readonly nombreComercial = signal('');
  readonly direccionMatriz = signal('');
  readonly ambiente = signal<AmbienteSri>('PRUEBAS');
  readonly contribuyenteEspecial = signal('');
  readonly obligadoContabilidad = signal(false);
  readonly certificadoAlias = signal('');

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.facturacion.emisor().subscribe({
      next: (e) => {
        this.emisor.set(e);
        this.ruc.set(e.ruc);
        this.razonSocial.set(e.razonSocial);
        this.nombreComercial.set(e.nombreComercial ?? '');
        this.direccionMatriz.set(e.direccionMatriz);
        this.ambiente.set(e.ambiente);
        this.contribuyenteEspecial.set(e.contribuyenteEspecial ?? '');
        this.obligadoContabilidad.set(e.obligadoContabilidad);
        this.certificadoAlias.set(e.certificadoAlias ?? '');
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.emisor.set(null);
        this.cargando.set(false);
      },
    });
  }

  /** Avisa antes de guardar, no después: pasar a producción no se deshace fácil. */
  readonly avisoProduccion = computed(() =>
    this.emisor()?.ambiente === 'PRUEBAS' && this.ambiente() === 'PRODUCCION');

  guardar() {
    if (!this.puedeEditar()) return;
    if (!this.razonSocial().trim() || !this.direccionMatriz().trim()) {
      this.banner.set({ texto: 'La razón social y la dirección de la matriz son obligatorias.', error: true });
      return;
    }
    if (!/^[0-9]{13}$/.test(this.ruc().trim())) {
      this.banner.set({ texto: 'El RUC son 13 dígitos.', error: true });
      return;
    }

    this.guardando.set(true);
    this.banner.set(null);
    this.facturacion
      .guardarEmisor({
        ruc: this.ruc().trim(),
        razonSocial: this.razonSocial().trim(),
        nombreComercial: this.nombreComercial().trim() || null,
        direccionMatriz: this.direccionMatriz().trim(),
        ambiente: this.ambiente(),
        contribuyenteEspecial: this.contribuyenteEspecial().trim() || null,
        obligadoContabilidad: this.obligadoContabilidad(),
        certificadoAlias: this.certificadoAlias().trim() || null,
      })
      .subscribe({
        next: (e) => {
          this.guardando.set(false);
          this.emisor.set(e);
          this.banner.set({
            texto: e.ambiente === 'PRODUCCION'
              ? 'Datos guardados. El emisor está en PRODUCCIÓN: lo que se emita tiene validez fiscal.'
              : 'Datos del emisor guardados.',
            error: false,
          });
        },
        error: (err) => {
          this.guardando.set(false);
          this.banner.set({ texto: this.mensajeAccion(err), error: true });
          // Se recarga para que el formulario no quede mostrando algo que no se guardó.
          this.cargar();
        },
      });
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'No tienes permiso para ver los datos del emisor.';
    if (e.status === 404) return 'No hay ningún emisor configurado: sin él no se puede facturar.';
    return `No se pudieron cargar los datos del emisor (${e.status ?? 'error'}).`;
  }

  private mensajeAccion(e: { status?: number }): string {
    if (e.status === 422) {
      return 'No se pudo guardar: o intentas cambiar el RUC teniendo comprobantes emitidos, '
        + 'o pasar a PRODUCCIÓN sin certificado de firma, o volver a PRUEBAS con facturas '
        + 'ya autorizadas por el SRI.';
    }
    if (e.status === 400) return 'Revisa los datos: el RUC son 13 dígitos y la razón social y la dirección son obligatorias.';
    if (e.status === 403) return 'Solo un administrador puede cambiar los datos del emisor.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudieron guardar los datos del emisor.';
  }
}
