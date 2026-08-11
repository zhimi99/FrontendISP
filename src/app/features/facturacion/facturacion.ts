import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  esPreFactura,
  esPreFacturaCobrable,
  estadoDocumento,
  Factura,
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
  private readonly router = inject(Router);

  readonly sriEtq = ESTADO_SRI_ETIQUETA;
  readonly sriTono = ESTADO_SRI_TONO;
  readonly pagoEtq = ESTADO_PAGO_ETIQUETA;
  readonly pagoTono = ESTADO_PAGO_TONO;
  readonly estadoDoc = estadoDocumento;
  readonly esPreFacturaFila = esPreFactura;

  private readonly datos = signal<FacturaVista[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly q = signal('');
  readonly estadoPago = signal<'' | EstadoPagoFactura>('');
  readonly estadoSri = signal<'' | EstadoSri>('');
  /** Chip rápido: solo pre-facturas pendientes de decisión. */
  readonly soloPendientes = signal(false);

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  constructor() {
    this.cargar();
  }

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

  readonly aviso = signal<{ texto: string; error: boolean } | null>(null);

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
  /** Pre-facturas generadas (por decidir o ya en camino a factura) que aún no se cierran. */
  get preFacturasPendientes() {
    return this.datos().filter((f) => esPreFacturaCobrable(f)).length;
  }

  pct(n: number): string {
    return this.total ? ((n / this.total) * 100).toFixed(1) + '% del total' : '—';
  }

  alternarSoloPendientes() {
    this.soloPendientes.update((v) => !v);
    this.pagina.set(1);
  }

  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const ep = this.estadoPago();
    const es = this.estadoSri();
    const soloPend = this.soloPendientes();

    return this.datos().filter((f) => {
      if (soloPend && !esPreFacturaCobrable(f)) return false;
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
    this.soloPendientes.set(false);
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

  /* ---------- Ver detalle (conceptos, valores, totales) ---------- */
  readonly facturaVer = signal<FacturaVista | null>(null);
  readonly detalleVer = signal<Factura | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);

  abrirVer(f: FacturaVista) {
    this.facturaVer.set(f);
    this.detalleVer.set(null);
    this.errorDetalle.set(null);
    this.cargandoDetalle.set(true);
    this.facturacionService.ver(f.id).subscribe({
      next: (d) => {
        this.detalleVer.set(d);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.errorDetalle.set('No se pudo cargar el detalle de este comprobante.');
        this.cargandoDetalle.set(false);
      },
    });
  }

  cerrarVer() {
    this.facturaVer.set(null);
  }

  /* ---------- Descargar comprobante (PDF interno, sin validez fiscal) ---------- */
  readonly descargandoComprobante = signal<number | null>(null);

  descargarComprobante(f: FacturaVista) {
    if (this.descargandoComprobante() != null) return;
    this.descargandoComprobante.set(f.id);
    this.facturacionService.descargarComprobante(f.id).subscribe({
      next: (archivo) => {
        this.descargandoComprobante.set(null);
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${f.numeroDocumento}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.descargandoComprobante.set(null);
        this.aviso.set({ texto: 'No se pudo descargar el comprobante.', error: true });
      },
    });
  }

  /* ---------- Cobrar una pre-factura pendiente ---------- */
  /** Cobrar es registrar un pago: mismo perfil que en Cobranzas. */
  readonly puedeCobrar = computed(() => this.auth.tieneRol('COBRANZAS', 'ADMINISTRADOR'));

  /**
   * Cualquier documento con saldo pendiente se puede cobrar desde aquí, no solo
   * los comprobantes sin decidir (GENERADA): una factura ya AUTORIZADA por el
   * SRI que sigue debiéndose (p. ej. pago parcial) también necesita cobrarse.
   * Coincide a propósito con el filtro que ya usa Cobranzas para listar las
   * facturas por cobrar de un cliente, así una fila que ofrece "Cobrar" aquí
   * siempre aparece también en el selector de Cobranzas.
   * Se cobra desde aquí solo si hay a quién asociar el recibo (referencia lógica al cliente).
   */
  sePuedeCobrar(f: FacturaVista): boolean {
    return (
      (f.estadoPago === 'PENDIENTE' || f.estadoPago === 'PARCIAL') &&
      (f.saldoPendiente ?? 0) > 0 &&
      f.clienteId != null
    );
  }

  /**
   * El cobro en sí se registra en Cobranzas, no aquí: es el módulo que ya muestra
   * TODOS los comprobantes pendientes de un cliente juntos, para poder elegir cuál
   * (o cuáles) de varios meses pagar. Este botón es solo un atajo con el cliente y
   * el comprobante ya elegidos.
   */
  cobrar(f: FacturaVista) {
    this.router.navigate(['/cobranzas'], { queryParams: { clienteId: f.clienteId, facturaId: f.id } });
  }
}
