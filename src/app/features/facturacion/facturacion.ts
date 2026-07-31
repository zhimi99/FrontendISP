import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { FacturacionService } from '../../core/services/facturacion.service';
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
  styleUrl: '../clientes/clientes.scss',
})
export class FacturacionComponent {
  private readonly facturacionService = inject(FacturacionService);

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
