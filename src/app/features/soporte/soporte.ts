import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { OperativoService } from '../../core/services/operativo.service';
import { ClientesService } from '../../core/services/clientes.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioResumen } from '../../core/models/auth.model';
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
  private readonly auth = inject(AuthService);

  readonly tipoEtq = TIPO_ORDEN_ETIQUETA;
  readonly estadoEtq = ESTADO_ORDEN_ETIQUETA;
  readonly estadoTono = ESTADO_ORDEN_TONO;
  readonly prioridadEtq = PRIORIDAD_ETIQUETA;
  readonly prioridadTono = PRIORIDAD_TONO;

  /** Despacho (asigna/cancela); técnico (inicia/cierra). ADMIN puede todo. */
  readonly puedeAsignar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly puedeCancelar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly puedeOperar = computed(() => this.auth.tieneRol('TECNICO', 'ADMINISTRADOR'));

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
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
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
        // Si había un filtro de cerradas/canceladas abierto, refréscalo también.
        const f = this.estadoFiltro();
        if (f === 'CERRADA' || f === 'CANCELADA') this.cargarBajoDemanda(f);
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
    if (v === 'CERRADA' || v === 'CANCELADA') this.cargarBajoDemanda(v);
    else this.bajoDemanda.set([]);
  }

  private cargarBajoDemanda(v: EstadoOrden) {
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

  /* ---------- Acciones: asignar / iniciar / cerrar / cancelar ---------- */
  readonly accion = signal<'asignar' | 'cerrar' | 'cancelar' | null>(null);
  readonly ordenAccion = signal<Orden | null>(null);
  readonly guardando = signal(false);
  readonly errorAccion = signal<string | null>(null);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);
  readonly procesandoId = signal<number | null>(null);

  // Asignar
  readonly tecnicos = signal<UsuarioResumen[]>([]);
  readonly tecnicosCargando = signal(false);
  readonly tecnicoSel = signal<number | null>(null);
  // Cerrar
  readonly resultado = signal('');
  // Cancelar
  readonly motivo = signal('');

  abrirAsignar(o: Orden) {
    this.banner.set(null);
    this.ordenAccion.set(o);
    this.tecnicoSel.set(null);
    this.errorAccion.set(null);
    this.accion.set('asignar');
    if (this.tecnicos().length === 0) this.cargarTecnicos();
  }

  abrirCerrar(o: Orden) {
    this.banner.set(null);
    this.ordenAccion.set(o);
    this.resultado.set('');
    this.errorAccion.set(null);
    this.accion.set('cerrar');
  }

  abrirCancelar(o: Orden) {
    this.banner.set(null);
    this.ordenAccion.set(o);
    this.motivo.set('');
    this.errorAccion.set(null);
    this.accion.set('cancelar');
  }

  cerrarModal() {
    if (this.guardando()) return;
    this.accion.set(null);
    this.ordenAccion.set(null);
  }

  private cargarTecnicos() {
    this.tecnicosCargando.set(true);
    this.usuarios.resumenes(true).subscribe({
      next: (l) => {
        this.tecnicos.set(l);
        this.tecnicosCargando.set(false);
      },
      error: () => {
        this.tecnicos.set([]);
        this.tecnicosCargando.set(false);
      },
    });
  }

  confirmarAsignar() {
    const o = this.ordenAccion();
    const tec = this.tecnicoSel();
    if (!o) return;
    if (tec == null) {
      this.errorAccion.set('Elige un técnico.');
      return;
    }
    this.guardando.set(true);
    this.errorAccion.set(null);
    this.operativo.asignar(o.id, tec).subscribe({
      next: () => {
        this.guardando.set(false);
        this.accion.set(null);
        this.banner.set({ texto: `Orden ${o.numero} asignada.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorAccion.set(this.mensajeAccion(e));
      },
    });
  }

  confirmarCerrar() {
    const o = this.ordenAccion();
    const res = this.resultado().trim();
    if (!o) return;
    if (!res) {
      this.errorAccion.set('Describe el resultado del trabajo.');
      return;
    }
    this.guardando.set(true);
    this.errorAccion.set(null);
    this.operativo.cerrar(o.id, res).subscribe({
      next: () => {
        this.guardando.set(false);
        this.accion.set(null);
        this.banner.set({ texto: `Orden ${o.numero} cerrada.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorAccion.set(this.mensajeAccion(e));
      },
    });
  }

  confirmarCancelar() {
    const o = this.ordenAccion();
    const m = this.motivo().trim();
    if (!o) return;
    if (!m) {
      this.errorAccion.set('Indica el motivo de la cancelación.');
      return;
    }
    this.guardando.set(true);
    this.errorAccion.set(null);
    this.operativo.cancelar(o.id, m).subscribe({
      next: () => {
        this.guardando.set(false);
        this.accion.set(null);
        this.banner.set({ texto: `Orden ${o.numero} cancelada.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorAccion.set(this.mensajeAccion(e));
      },
    });
  }

  iniciarOrden(o: Orden) {
    if (this.procesandoId() != null) return;
    this.banner.set(null);
    this.procesandoId.set(o.id);
    this.operativo.iniciar(o.id).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.banner.set({ texto: `Orden ${o.numero} en proceso.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.procesandoId.set(null);
        this.banner.set({ texto: this.mensajeAccion(e), error: true });
      },
    });
  }

  private mensajeAccion(e: { status?: number }): string {
    if (e.status === 409 || e.status === 422) {
      return 'La orden ya cambió de estado; recarga e inténtalo de nuevo.';
    }
    if (e.status === 400) return 'Datos inválidos para la operación.';
    if (e.status === 403) return 'Tu rol no tiene permiso para esta acción.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo completar la operación.';
  }
}
