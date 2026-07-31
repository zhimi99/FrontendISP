import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, Observable, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { ClientesService } from '../../core/services/clientes.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { FinanzasService } from '../../core/services/finanzas.service';
import { InventarioService } from '../../core/services/inventario.service';
import { OperativoService } from '../../core/services/operativo.service';
import {
  ClienteListado,
  EstadoServicio,
  ESTADO_SERVICIO_ETIQUETA,
  ESTADO_SERVICIO_TONO,
} from '../../core/models/contratos.model';
import { FacturaVista, MoraContrato } from '../../core/models/facturacion.model';
import { CajaEstado, PagoCobranza } from '../../core/models/finanzas.model';
import { Equipo, MaterialBajoStock } from '../../core/models/inventario.model';
import {
  Orden,
  ESTADO_ORDEN_ETIQUETA,
  TIPO_ORDEN_ETIQUETA,
  PRIORIDAD_ETIQUETA,
  PRIORIDAD_TONO,
} from '../../core/models/operativo.model';

/** Estados de servicio que se desglosan en el panel de clientes. */
const ESTADOS_SERVICIO: EstadoServicio[] = ['ACTIVO', 'SUSPENDIDO', 'CORTADO', 'PENDIENTE', 'RETIRADO'];

/**
 * Portada: una vista ejecutiva que compone lo que exponen todos los microservicios
 * (clientes, facturación/mora, cobranzas/caja, inventario y órdenes). Cada fuente se
 * carga de forma resiliente: si un servicio falla, su panel queda en cero y se avisa,
 * sin tumbar el resto del tablero.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IconComponent, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['../clientes/clientes.scss', './dashboard.scss'],
})
export class DashboardComponent {
  private readonly clientesService = inject(ClientesService);
  private readonly facturacion = inject(FacturacionService);
  private readonly finanzas = inject(FinanzasService);
  private readonly inventario = inject(InventarioService);
  private readonly operativo = inject(OperativoService);

  readonly estadoServEtq = ESTADO_SERVICIO_ETIQUETA;
  readonly estadoServTono = ESTADO_SERVICIO_TONO;
  readonly tipoOrdenEtq = TIPO_ORDEN_ETIQUETA;
  readonly estadoOrdenEtq = ESTADO_ORDEN_ETIQUETA;
  readonly prioridadEtq = PRIORIDAD_ETIQUETA;
  readonly prioridadTono = PRIORIDAD_TONO;
  readonly estados = ESTADOS_SERVICIO;

  private readonly clientes = signal<ClienteListado[]>([]);
  private readonly facturas = signal<FacturaVista[]>([]);
  private readonly moraLista = signal<MoraContrato[]>([]);
  private readonly pagos = signal<PagoCobranza[]>([]);
  readonly cajas = signal<CajaEstado[]>([]);
  readonly bajoStock = signal<MaterialBajoStock[]>([]);
  private readonly equipos = signal<Equipo[]>([]);
  readonly ordenes = signal<Orden[]>([]);

  readonly cargando = signal(true);
  readonly fallos = signal<string[]>([]);

  constructor() {
    const g = <T>(o: Observable<T>, def: T, nombre: string): Observable<T> =>
      o.pipe(
        catchError(() => {
          this.fallos.update((f) => [...f, nombre]);
          return of(def);
        }),
      );

    forkJoin({
      clientes: g(this.clientesService.listar(), [] as ClienteListado[], 'clientes'),
      facturas: g(this.facturacion.listar(), [] as FacturaVista[], 'facturación'),
      mora: g(this.facturacion.mora(), [] as MoraContrato[], 'mora'),
      pagos: g(this.finanzas.listarPagos(), [] as PagoCobranza[], 'cobranzas'),
      cajas: g(this.finanzas.listarCajas(), [] as CajaEstado[], 'cajas'),
      bajoStock: g(this.inventario.bajoStock(), [] as MaterialBajoStock[], 'inventario'),
      equipos: g(this.inventario.listarEquipos({ estado: 'DISPONIBLE' }), [] as Equipo[], 'equipos'),
      ordenes: g(this.operativo.listarOrdenes({ estado: 'PENDIENTE' }), [] as Orden[], 'órdenes'),
    }).subscribe((r) => {
      this.clientes.set(r.clientes);
      this.facturas.set(r.facturas);
      this.moraLista.set(r.mora);
      this.pagos.set(r.pagos);
      this.cajas.set(r.cajas);
      this.bajoStock.set(r.bajoStock);
      this.equipos.set(r.equipos);
      this.ordenes.set(r.ordenes);
      this.cargando.set(false);
    });
  }

  /* ---------- Clientes ---------- */
  get clientesTotal() {
    return this.clientes().length;
  }
  get clientesActivos() {
    return this.clientes().filter((c) => c.estadoServicio === 'ACTIVO').length;
  }
  readonly clientesPorEstado = computed<Record<EstadoServicio, number>>(() => {
    const acc = { ACTIVO: 0, SUSPENDIDO: 0, CORTADO: 0, PENDIENTE: 0, RETIRADO: 0 } as Record<EstadoServicio, number>;
    for (const c of this.clientes()) if (c.estadoServicio) acc[c.estadoServicio]++;
    return acc;
  });
  pctClientes(n: number): number {
    return this.clientesTotal ? Math.round((n / this.clientesTotal) * 100) : 0;
  }

  /* ---------- Cartera (facturación + mora) ---------- */
  get facturasPorCobrar() {
    return this.facturas().filter((f) => f.estadoPago === 'PENDIENTE' || f.estadoPago === 'PARCIAL').length;
  }
  get saldoPorCobrar() {
    return this.facturas().reduce((s, f) => s + (f.saldoPendiente ?? 0), 0);
  }
  get moraContratos() {
    return this.moraLista().length;
  }
  get moraSaldo() {
    return this.moraLista().reduce((s, m) => s + (m.saldoTotal ?? 0), 0);
  }

  /* ---------- Cobranzas / caja ---------- */
  get recaudado() {
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

  /* ---------- Inventario ---------- */
  get equiposDisponibles() {
    return this.equipos().length;
  }

  /* ---------- Órdenes ---------- */
  get ordenesPendientes() {
    return this.ordenes().length;
  }
  readonly ordenesTop = computed(() => this.ordenes().slice(0, 5));

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }
  cantidad(n: number): string {
    return Number(n ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 2 });
  }
}
