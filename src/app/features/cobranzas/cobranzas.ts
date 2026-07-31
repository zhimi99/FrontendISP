import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ClientesService } from '../../core/services/clientes.service';
import {
  CajaEstado,
  EstadoPago,
  FormaPago,
  FORMA_PAGO_ETIQUETA,
  ESTADO_PAGO_FIN_ETIQUETA,
  ESTADO_PAGO_FIN_TONO,
  PagoCobranzaVista,
} from '../../core/models/finanzas.model';

/**
 * Cobranzas / Caja sobre datos reales (GET /api/pagos + /api/cajas). El nombre del
 * cliente no lo tiene MS-FINANZAS (solo el clienteId, referencia lógica): se resuelve
 * cruzando con /api/clientes. Reutiliza la hoja de estilos de la lista de clientes.
 */
@Component({
  selector: 'app-cobranzas',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './cobranzas.html',
  styleUrls: ['../clientes/clientes.scss', './cobranzas.scss'],
})
export class CobranzasComponent {
  private readonly finanzas = inject(FinanzasService);
  private readonly clientesService = inject(ClientesService);

  readonly formaEtq = FORMA_PAGO_ETIQUETA;
  readonly estadoEtq = ESTADO_PAGO_FIN_ETIQUETA;
  readonly estadoTono = ESTADO_PAGO_FIN_TONO;

  private readonly pagos = signal<PagoCobranzaVista[]>([]);
  readonly cajas = signal<CajaEstado[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly q = signal('');
  readonly formaPago = signal<'' | FormaPago>('');
  readonly estado = signal<'' | EstadoPago>('');

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  constructor() {
    forkJoin({
      pagos: this.finanzas.listarPagos(),
      cajas: this.finanzas.listarCajas(),
      // La lista de clientes solo resuelve el nombre; si falla, se degrada a "Cliente #id"
      // en vez de tumbar toda la pantalla.
      clientes: this.clientesService.listar().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ pagos, cajas, clientes }) => {
        const nombre = new Map(clientes.map((c) => [c.id, c.nombre]));
        this.pagos.set(
          pagos.map((p) => ({
            ...p,
            clienteNombre: nombre.get(p.clienteId) ?? `Cliente #${p.clienteId}`,
          })),
        );
        this.cajas.set(cajas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /* ---------- Tarjetas de resumen ---------- */
  get totalRecaudado() {
    return this.pagos()
      .filter((p) => p.estado === 'CONFIRMADO')
      .reduce((s, p) => s + (p.monto ?? 0), 0);
  }
  get numeroPagos() {
    return this.pagos().length;
  }
  get cajasAbiertas() {
    return this.cajas().filter((c) => c.sesionAbierta).length;
  }
  get efectivoEnCajas() {
    return this.cajas().reduce((s, c) => s + (c.sesionAbierta?.efectivoEnCaja ?? 0), 0);
  }

  /* ---------- Filtro + paginación ---------- */
  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const fp = this.formaPago();
    const es = this.estado();

    return this.pagos().filter((p) => {
      if (fp && p.formaPago !== fp) return false;
      if (es && p.estado !== es) return false;
      if (term) {
        const heno = `${p.numeroRecibo} ${p.clienteNombre}`.toLowerCase();
        if (!heno.includes(term)) return false;
      }
      return true;
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / this.filasPorPagina())),
  );
  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  readonly pagina_ = computed(() => {
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
    if (this.cargando()) return 'Cargando recaudaciones…';
    if (this.error()) return this.error()!;
    return 'No se encontraron pagos con los filtros aplicados.';
  });

  /** Resumen legible de las facturas que cubrió un pago. */
  facturasDe(p: PagoCobranzaVista): string {
    const nums = p.aplicaciones.map((a) => a.facturaNumero).filter((n): n is string => !!n);
    if (nums.length === 0) return '—';
    if (nums.length === 1) return nums[0];
    return `${nums[0]} +${nums.length - 1}`;
  }

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
    this.formaPago.set('');
    this.estado.set('');
    this.pagina.set(1);
  }

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }
  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    const d = `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
    const h = `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
    return `${d} ${h}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver cobranzas.';
    if (e.status) return `El gateway respondió ${e.status} al cargar cobranzas.`;
    return 'Error inesperado cargando las cobranzas.';
  }
}
