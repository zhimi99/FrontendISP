import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { OperativoService } from '../../core/services/operativo.service';
import { ClientesService } from '../../core/services/clientes.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import {
  EstadoOrden,
  Orden,
  PrioridadOrden,
  ESTADO_ORDEN_ETIQUETA,
  ESTADO_ORDEN_TONO,
  PRIORIDAD_ETIQUETA,
  PRIORIDAD_TONO,
  TIPO_ORDEN_ETIQUETA,
} from '../../core/models/operativo.model';

/** Rango de prioridad para ordenar el tablero (lo urgente arriba). */
const RANGO_PRIORIDAD: Record<PrioridadOrden, number> = { URGENTE: 0, ALTA: 1, NORMAL: 2, BAJA: 3 };

/**
 * Soporte / Operativo: tablero de órdenes de trabajo. Por defecto muestra las
 * ABIERTAS (pendiente + asignada + en proceso) —lo que necesita atención—, y permite
 * consultar bajo demanda las cerradas/canceladas, sin volcar todo el histórico.
 *
 * cliente y técnico son referencias lógicas (clienteId / tecnicoUsuarioId); sus
 * nombres se resuelven cruzando con /api/clientes y /api/usuarios/{id}, de forma
 * resiliente (si falla, se cae a "#id").
 */
@Component({
  selector: 'app-soporte',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './soporte.html',
  styleUrls: ['../clientes/clientes.scss', './soporte.scss'],
})
export class SoporteComponent {
  private readonly operativo = inject(OperativoService);
  private readonly clientesService = inject(ClientesService);
  private readonly usuarios = inject(UsuariosService);

  readonly tipoEtq = TIPO_ORDEN_ETIQUETA;
  readonly estadoEtq = ESTADO_ORDEN_ETIQUETA;
  readonly estadoTono = ESTADO_ORDEN_TONO;
  readonly prioridadEtq = PRIORIDAD_ETIQUETA;
  readonly prioridadTono = PRIORIDAD_TONO;

  private readonly abiertas = signal<Orden[]>([]);
  private readonly bajoDemanda = signal<Orden[]>([]);
  private readonly clienteNombres = signal<Map<number, string>>(new Map());
  private readonly tecnicoNombres = signal<Map<number, string>>(new Map());

  readonly cargando = signal(true);
  readonly otrasCargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly estadoFiltro = signal<'' | EstadoOrden>('');
  readonly q = signal('');

  constructor() {
    forkJoin({
      clientes: this.clientesService.listar().pipe(catchError(() => of([]))),
      pendientes: this.operativo.listarOrdenes({ estado: 'PENDIENTE' }),
      asignadas: this.operativo.listarOrdenes({ estado: 'ASIGNADA' }),
      enProceso: this.operativo.listarOrdenes({ estado: 'EN_PROCESO' }),
    }).subscribe({
      next: (r) => {
        this.clienteNombres.set(new Map(r.clientes.map((c) => [c.id, c.nombre])));
        const todas = [...r.pendientes, ...r.asignadas, ...r.enProceso].sort(
          (a, b) => RANGO_PRIORIDAD[a.prioridad] - RANGO_PRIORIDAD[b.prioridad],
        );
        this.abiertas.set(todas);
        this.cargando.set(false);
        this.resolverTecnicos(todas);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /* ---------- Stats (sobre las abiertas) ---------- */
  get totalAbiertas() {
    return this.abiertas().length;
  }
  get pendientes() {
    return this.abiertas().filter((o) => o.estado === 'PENDIENTE').length;
  }
  get asignadas() {
    return this.abiertas().filter((o) => o.estado === 'ASIGNADA').length;
  }
  get enProceso() {
    return this.abiertas().filter((o) => o.estado === 'EN_PROCESO').length;
  }
  get urgentes() {
    return this.abiertas().filter((o) => o.prioridad === 'URGENTE' || o.prioridad === 'ALTA').length;
  }

  /* ---------- Lista mostrada ---------- */
  readonly ordenesFiltradas = computed(() => {
    const f = this.estadoFiltro();
    let base: Orden[];
    if (f === 'CERRADA' || f === 'CANCELADA') base = this.bajoDemanda();
    else if (f === '') base = this.abiertas();
    else base = this.abiertas().filter((o) => o.estado === f);

    const term = this.q().trim().toLowerCase();
    if (!term) return base;
    return base.filter((o) =>
      `${o.numero} ${this.clienteNombre(o)} ${o.descripcion ?? ''}`.toLowerCase().includes(term),
    );
  });

  cambiarEstado(v: '' | EstadoOrden) {
    this.estadoFiltro.set(v);
    this.q.set('');
    if (v === 'CERRADA' || v === 'CANCELADA') {
      this.otrasCargando.set(true);
      this.operativo.listarOrdenes({ estado: v }).subscribe({
        next: (lista) => {
          this.bajoDemanda.set(lista);
          this.otrasCargando.set(false);
          this.resolverTecnicos(lista);
        },
        error: () => {
          this.bajoDemanda.set([]);
          this.otrasCargando.set(false);
        },
      });
    } else {
      this.bajoDemanda.set([]);
    }
  }

  /** Resuelve los nombres de los técnicos que aún no estén en el mapa. */
  private resolverTecnicos(ordenes: Orden[]) {
    const ya = this.tecnicoNombres();
    const faltan = [
      ...new Set(
        ordenes
          .map((o) => o.tecnicoUsuarioId)
          .filter((x): x is number => x != null && !ya.has(x)),
      ),
    ];
    if (!faltan.length) return;
    forkJoin(faltan.map((id) => this.usuarios.resumen(id).pipe(catchError(() => of(null))))).subscribe(
      (res) => {
        const m = new Map(this.tecnicoNombres());
        res.forEach((u, i) => {
          if (u) m.set(faltan[i], u.nombreCompleto);
        });
        this.tecnicoNombres.set(m);
      },
    );
  }

  clienteNombre(o: Orden): string {
    if (o.clienteId == null) return '—';
    return this.clienteNombres().get(o.clienteId) ?? `Cliente #${o.clienteId}`;
  }
  tecnicoNombre(o: Orden): string {
    if (o.tecnicoUsuarioId == null) return 'Sin asignar';
    return this.tecnicoNombres().get(o.tecnicoUsuarioId) ?? `Téc. #${o.tecnicoUsuarioId}`;
  }

  readonly mensajeTabla = computed(() => {
    if (this.cargando() || this.otrasCargando()) return 'Cargando órdenes…';
    if (this.error()) return this.error()!;
    return 'No hay órdenes con los filtros aplicados.';
  });

  fecha(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver las órdenes.';
    if (e.status) return `El gateway respondió ${e.status} al cargar las órdenes.`;
    return 'Error inesperado cargando las órdenes.';
  }
}
