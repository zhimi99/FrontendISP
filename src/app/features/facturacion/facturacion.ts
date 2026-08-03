import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { FacturacionService } from '../../core/services/facturacion.service';
import { AuthService } from '../../core/services/auth.service';
import {
  EstadoPagoFactura,
  EstadoSri,
  ESTADO_PAGO_ETIQUETA,
  ESTADO_PAGO_TONO,
  ESTADO_SRI_ETIQUETA,
  ESTADO_SRI_TONO,
  FacturaVista,
} from '../../core/models/facturacion.model';

/**
 * Grilla de facturación sobre datos reales (GET /api/facturas). Reutiliza la hoja
 * de estilos de la lista de clientes para mantener el aspecto consistente.
 */
@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './facturacion.html',
  styleUrls: ['../clientes/clientes.scss', './facturacion.scss'],
})
export class FacturacionComponent {
  private readonly facturacionService = inject(FacturacionService);
  private readonly auth = inject(AuthService);

  readonly sriEtq = ESTADO_SRI_ETIQUETA;
  readonly sriTono = ESTADO_SRI_TONO;
  readonly pagoEtq = ESTADO_PAGO_ETIQUETA;
  readonly pagoTono = ESTADO_PAGO_TONO;

  private readonly datos = signal<FacturaVista[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly q = signal('');
  readonly estadoPago = signal<'' | EstadoPagoFactura>('');
  readonly estadoSri = signal<'' | EstadoSri>('');

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  constructor() {
    this.cargar();
  }

  /** Carga inicial y refresco tras anular un comprobante. */
  private cargar() {
    this.cargando.set(true);
    this.facturacionService.listar().subscribe({
      next: (lista) => {
        this.datos.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /* ---------- Anular factura ---------- */
  /** Emitir y anular son el mismo acto contable: FINANZAS/ADMIN. */
  readonly puedeAnular = computed(() => this.auth.tieneRol('FINANZAS', 'ADMINISTRADOR'));
  readonly facturaAnular = signal<FacturaVista | null>(null);
  readonly anulando = signal(false);
  readonly errorAnular = signal<string | null>(null);
  readonly motivoAnular = signal('');
  readonly aviso = signal<{ texto: string; error: boolean } | null>(null);

  /**
   * Una AUTORIZADA no se anula: se compensa con nota de crédito. El botón no aparece
   * para no ofrecer algo que el backend va a rechazar (y con razón).
   */
  sePuedeAnular(f: FacturaVista): boolean {
    return f.estadoSri !== 'AUTORIZADA' && f.estadoPago !== 'ANULADA';
  }

  abrirAnular(f: FacturaVista) {
    this.aviso.set(null);
    this.errorAnular.set(null);
    this.motivoAnular.set('');
    this.facturaAnular.set(f);
  }

  cerrarAnular() {
    if (this.anulando()) return;
    this.facturaAnular.set(null);
  }

  confirmarAnular() {
    const f = this.facturaAnular();
    const motivo = this.motivoAnular().trim();
    if (!f) return;
    if (!motivo) {
      this.errorAnular.set('Indica el motivo de la anulación.');
      return;
    }
    this.anulando.set(true);
    this.errorAnular.set(null);
    this.facturacionService.anular(f.id, motivo).subscribe({
      next: () => {
        this.anulando.set(false);
        this.facturaAnular.set(null);
        this.aviso.set({ texto: `Factura ${f.numeroDocumento} anulada.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.anulando.set(false);
        this.errorAnular.set(this.mensajeAnular(e));
      },
    });
  }

  private mensajeAnular(e: { status?: number; error?: { message?: string } }): string {
    // El backend explica el porqué en el 422, pero Spring no incluye el mensaje en el
    // cuerpo por defecto (server.error.include-message=never), así que el texto de
    // reserva enumera las tres causas posibles en vez de quedarse en un "no se pudo".
    if (e.status === 422) {
      return (
        e.error?.message ||
        'No se puede anular: la factura ya está anulada, tiene cobros aplicados ' +
          '(anula primero esos pagos) o está autorizada por el SRI, en cuyo caso ' +
          'se compensa con una nota de crédito.'
      );
    }
    if (e.status === 400) return 'El motivo de la anulación es obligatorio.';
    if (e.status === 403) return 'Tu rol no tiene permiso para anular comprobantes.';
    if (e.status === 404) return 'La factura ya no existe; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo anular la factura.';
  }

  get total() {
    return this.datos().length;
  }
  get autorizadas() {
    return this.datos().filter((f) => f.estadoSri === 'AUTORIZADA').length;
  }
  get porCobrar() {
    return this.datos().filter((f) => f.estadoPago === 'PENDIENTE' || f.estadoPago === 'PARCIAL').length;
  }
  get saldoTotal() {
    return this.datos().reduce((s, f) => s + (f.saldoPendiente ?? 0), 0);
  }

  pct(n: number): string {
    return this.total ? ((n / this.total) * 100).toFixed(1) + '% del total' : '—';
  }

  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const ep = this.estadoPago();
    const es = this.estadoSri();

    return this.datos().filter((f) => {
      if (ep && f.estadoPago !== ep) return false;
      if (es && f.estadoSri !== es) return false;
      if (term) {
        const heno = `${f.numeroDocumento} ${f.clienteRazonSocial}`.toLowerCase();
        if (!heno.includes(term)) return false;
      }
      return true;
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / this.filasPorPagina())),
  );
  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  readonly pagados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.filasPorPagina();
    return this.filtrados().slice(inicio, inicio + this.filasPorPagina());
  });
  readonly rangoDesde = computed(() =>
    this.filtrados().length === 0 ? 0 : (this.paginaActual() - 1) * this.filasPorPagina() + 1,
  );
  readonly rangoHasta = computed(() =>
    Math.min(this.paginaActual() * this.filasPorPagina(), this.filtrados().length),
  );
  readonly numerosPagina = computed<number[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const nums: number[] = [];
    const inicio = Math.max(1, actual - 1);
    const fin = Math.min(total, inicio + 2);
    for (let i = inicio; i <= fin; i++) nums.push(i);
    return nums;
  });

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando facturas…';
    if (this.error()) return this.error()!;
    return 'No se encontraron facturas con los filtros aplicados.';
  });

  irA(p: number) {
    this.pagina.set(Math.min(Math.max(1, p), this.totalPaginas()));
  }
  cambiarFilas(valor: string) {
    this.filasPorPagina.set(Number(valor));
    this.pagina.set(1);
  }
  onFiltroCambio() {
    this.pagina.set(1);
  }
  limpiar() {
    this.q.set('');
    this.estadoPago.set('');
    this.estadoSri.set('');
    this.pagina.set(1);
  }

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }

  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver la facturación.';
    if (e.status) return `El gateway respondió ${e.status} al listar facturas.`;
    return 'Error inesperado cargando las facturas.';
  }
}
