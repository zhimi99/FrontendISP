import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { OperativoService } from '../../core/services/operativo.service';
import { ClientesService } from '../../core/services/clientes.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { InventarioService } from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioResumen } from '../../core/models/auth.model';
import { ClienteListado, ContratoResumen } from '../../core/models/contratos.model';
import { Equipo, Existencia, Ubicacion, UNIDAD_ETIQUETA } from '../../core/models/inventario.model';
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

/** Una línea del material que el técnico gastó, antes de confirmarla. */
interface LineaMaterialUsado {
  materialId: number | null;
  cantidad: number | null;
  /** Lo que se lleva tecleado en el buscador mientras no hay material elegido. */
  busqueda: string;
}

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
  private readonly inventario = inject(InventarioService);
  private readonly auth = inject(AuthService);

  readonly tipoEtq = TIPO_ORDEN_ETIQUETA;
  readonly estadoEtq = ESTADO_ORDEN_ETIQUETA;
  readonly estadoTono = ESTADO_ORDEN_TONO;
  readonly prioridadEtq = PRIORIDAD_ETIQUETA;
  readonly prioridadTono = PRIORIDAD_TONO;
  readonly unidadEtq = UNIDAD_ETIQUETA;

  /** Despacho (genera/asigna/cancela); técnico (inicia/cierra). ADMIN puede todo. */
  readonly puedeCrear = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly puedeAsignar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly puedeCancelar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  /**
   * Un técnico sin rol de despacho solo ve —y solo puede operar— lo que le asignaron
   * a él. SOPORTE/ADMIN despachan pero no ejecutan trabajo de campo.
   */
  readonly esSoloTecnico = computed(
    () => this.auth.tieneRol('TECNICO') && !this.auth.tieneRol('ADMINISTRADOR', 'SOPORTE'),
  );

  private readonly abiertas = signal<Orden[]>([]);
  private readonly bajoDemanda = signal<Orden[]>([]);
  /** Lista completa de clientes: además de resolver nombres, alimenta el buscador de "Generar Soporte". */
  private readonly clientes = signal<ClienteListado[]>([]);
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
    // Un técnico sin rol de despacho no ve lo PENDIENTE (aún no es suyo) y solo
    // recibe lo ASIGNADA/EN_PROCESO que el backend le filtra a él.
    const miId = this.auth.perfil()?.usuarioId ?? undefined;
    const soloTecnico = this.esSoloTecnico();
    forkJoin({
      clientes: this.clientesService.listar().pipe(catchError(() => of([]))),
      pendientes: soloTecnico ? of([]) : this.operativo.listarOrdenes({ estado: 'PENDIENTE' }),
      asignadas: this.operativo.listarOrdenes({
        estado: 'ASIGNADA',
        tecnicoUsuarioId: soloTecnico ? miId : undefined,
      }),
      enProceso: this.operativo.listarOrdenes({
        estado: 'EN_PROCESO',
        tecnicoUsuarioId: soloTecnico ? miId : undefined,
      }),
    }).subscribe({
      next: (r) => {
        this.clientes.set(r.clientes);
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
    const miId = this.auth.perfil()?.usuarioId ?? undefined;
    this.operativo.listarOrdenes({ estado: v, tecnicoUsuarioId: this.esSoloTecnico() ? miId : undefined }).subscribe({
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
  /** Iniciar/cerrar: ADMIN opera cualquier orden; un técnico solo la suya. */
  puedeOperarOrden(o: Orden): boolean {
    if (this.auth.tieneRol('ADMINISTRADOR')) return true;
    if (!this.auth.tieneRol('TECNICO')) return false;
    return o.tecnicoUsuarioId != null && o.tecnicoUsuarioId === this.auth.perfil()?.usuarioId;
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

  /* ---------- Cerrar: material usado y equipo entregado ---------- */
  readonly recursosInvCargando = signal(false);
  /** Solo lo que hay EN LA FURGONETA: no tiene sentido ofrecer descontar de una
   * bodega a la que el técnico no tiene acceso físico ahora mismo. */
  private readonly existenciasFurgoneta = signal<Existencia[]>([]);
  private readonly ubicacionesInv = signal<Ubicacion[]>([]);
  private readonly equiposDisponibles = signal<Equipo[]>([]);
  readonly materialesUsados = signal<LineaMaterialUsado[]>([]);
  readonly equipoEntregadoId = signal<number | null>(null);
  readonly materialesOrdenados = computed(() =>
    [...this.existenciasFurgoneta()].sort((a, b) => a.material.localeCompare(b.material)),
  );

  /**
   * La furgoneta desde la que se descuenta al cerrar. Por ahora la empresa tiene una
   * sola furgoneta, compartida por todo el equipo de soporte (técnicos, secretaria,
   * administrador), así que cualquiera que cierre un ticket descuenta de esa misma:
   * si solo hay una ubicación TECNICO activa, es esa, sin importar quién tenga la
   * sesión abierta. Si en el futuro cada técnico tiene la suya, se prioriza la que
   * está a su nombre (Ubicacion.usuarioId).
   */
  private ubicacionTecnico(): Ubicacion | null {
    const furgonetas = this.ubicacionesInv().filter((u) => u.tipo === 'TECNICO' && u.activa);
    if (furgonetas.length === 1) return furgonetas[0];
    const miId = this.auth.perfil()?.usuarioId;
    return furgonetas.find((u) => u.usuarioId === miId) ?? null;
  }

  /** Solo lo que ya está en la furgoneta: si no lo tiene encima, primero toca un traslado. */
  readonly equiposEntregables = computed(() => {
    const ub = this.ubicacionTecnico();
    if (!ub) return [];
    return this.equiposDisponibles().filter((e) => e.ubicacionId === ub.id);
  });

  private cargarRecursosInventario() {
    if (this.ubicacionesInv().length || this.recursosInvCargando()) return;
    this.recursosInvCargando.set(true);
    forkJoin({
      ubicaciones: this.inventario.listarUbicaciones(),
      equipos: this.inventario.listarEquipos({ estado: 'DISPONIBLE' }),
    })
      .pipe(
        switchMap((r) => {
          this.ubicacionesInv.set(r.ubicaciones);
          this.equiposDisponibles.set(r.equipos);
          const furgoneta = this.ubicacionTecnico();
          // Sin furgoneta todavía no hay nada que ofrecer; confirmarCerrar ya avisa
          // con claridad si el técnico intenta descontar material de todas formas.
          return furgoneta
            ? this.inventario.listarExistencias({ ubicacionId: furgoneta.id })
            : of<Existencia[]>([]);
        }),
        catchError(() => of<Existencia[]>([])),
      )
      .subscribe({
        next: (existencias) => {
          this.existenciasFurgoneta.set(existencias.filter((e) => e.cantidad > 0));
          this.recursosInvCargando.set(false);
        },
        error: () => this.recursosInvCargando.set(false),
      });
  }

  agregarLineaMaterial() {
    this.materialesUsados.update((arr) => [...arr, { materialId: null, cantidad: null, busqueda: '' }]);
  }
  quitarLineaMaterial(i: number) {
    this.materialesUsados.update((arr) => arr.filter((_, idx) => idx !== i));
  }
  actualizarLineaMaterial(i: number, campo: 'cantidad', valor: number | null) {
    this.materialesUsados.update((arr) => arr.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  /** El material ya elegido en esa línea, para pintar el chip en vez del buscador. */
  materialSeleccionado(id: number | null): Existencia | null {
    if (id == null) return null;
    return this.existenciasFurgoneta().find((e) => e.materialId === id) ?? null;
  }

  actualizarBusquedaMaterial(i: number, texto: string) {
    this.materialesUsados.update((arr) => arr.map((l, idx) => (idx === i ? { ...l, busqueda: texto } : l)));
  }

  elegirMaterial(i: number, m: Existencia) {
    this.materialesUsados.update((arr) =>
      arr.map((l, idx) => (idx === i ? { ...l, materialId: m.materialId, busqueda: '' } : l)),
    );
  }

  /** Deshace la elección para poder buscar otro, sin perder la cantidad ya tecleada. */
  cambiarMaterial(i: number) {
    this.materialesUsados.update((arr) =>
      arr.map((l, idx) => (idx === i ? { ...l, materialId: null, busqueda: '' } : l)),
    );
  }

  /** Vacío = lo que hay en la furgoneta (modo lista); si no, filtra por nombre o código. */
  materialesFiltrados(texto: string): Existencia[] {
    const q = this.normalizarTexto(texto.trim());
    if (!q) return this.materialesOrdenados();
    return this.materialesOrdenados().filter(
      (m) => this.normalizarTexto(m.codigo).includes(q) || this.normalizarTexto(m.material).includes(q),
    );
  }

  private normalizarTexto(t: string): string {
    const sinAcentos = t.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
    return sinAcentos.toLowerCase();
  }

  equipoLabel(e: Equipo): string {
    return `${e.marca} ${e.modelo} · S/N ${e.numeroSerie}${e.macAddress ? ' · MAC ' + e.macAddress : ''}`;
  }

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
    this.materialesUsados.set([]);
    this.equipoEntregadoId.set(null);
    this.errorAccion.set(null);
    this.accion.set('cerrar');
    this.cargarRecursosInventario();
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

    // Líneas tocadas de verdad (se ignora una fila que se agregó y se dejó vacía).
    const lineas = this.materialesUsados().filter((l) => l.materialId != null || l.cantidad != null);
    for (const l of lineas) {
      if (l.materialId == null || l.cantidad == null || l.cantidad <= 0) {
        this.errorAccion.set('Revisa el material usado: falta elegir el material o la cantidad.');
        return;
      }
    }
    const equipoId = this.equipoEntregadoId();
    if (equipoId != null && o.contratoId == null) {
      this.errorAccion.set('Esta orden no tiene un contrato asociado; no se puede entregar el equipo.');
      return;
    }
    const ubicacion = this.ubicacionTecnico();
    if ((lineas.length || equipoId != null) && !ubicacion) {
      this.errorAccion.set('No se encontró la furgoneta en el catálogo de ubicaciones: no se puede descontar del inventario.');
      return;
    }

    this.guardando.set(true);
    this.errorAccion.set(null);

    const consumos = lineas.map((l) =>
      this.inventario.consumirMaterial({
        materialId: l.materialId!,
        cantidad: l.cantidad!,
        ubicacionOrigenId: ubicacion!.id,
        ordenTrabajoId: o.id,
        contratoId: o.contratoId,
      }),
    );

    of(null)
      .pipe(
        switchMap(() => (consumos.length ? forkJoin(consumos) : of(null))),
        switchMap(() =>
          equipoId != null ? this.inventario.asignarEquipo(equipoId, { contratoId: o.contratoId! }) : of(null),
        ),
        switchMap(() => this.operativo.cerrar(o.id, res)),
      )
      .subscribe({
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

  private mensajeAccion(e: { status?: number; error?: unknown }): string {
    if (e.status === 409 || e.status === 422) {
      return 'La orden ya cambió de estado; recarga e inténtalo de nuevo.';
    }
    if (e.status === 400) {
      // eslint-disable-next-line no-console
      console.error('Cuerpo del error 400 de /api/ordenes (o similar):', e.error);
      const detalle = this.detalleError(e.error);
      return detalle ? `Datos inválidos: ${detalle}` : 'Datos inválidos para la operación.';
    }
    if (e.status === 403) return 'Tu rol no tiene permiso para esta acción.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo completar la operación.';
  }

  /** Extrae el mensaje que manda el backend en el cuerpo del error (formato Spring típico). */
  private detalleError(body: unknown): string | null {
    if (!body) return null;
    if (typeof body === 'string') return body;
    if (typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    if (typeof b['message'] === 'string') return b['message'];
    if (typeof b['mensaje'] === 'string') return b['mensaje'];
    if (Array.isArray(b['errors'])) {
      return b['errors']
        .map((x) => (typeof x === 'string' ? x : (x as Record<string, unknown>)?.['defaultMessage'] ?? JSON.stringify(x)))
        .join('; ');
    }
    return null;
  }

  /* ---------- Generar soporte (solo SOPORTE/ADMIN) ---------- */
  readonly modalNuevo = signal(false);
  readonly guardandoNuevo = signal(false);
  readonly errorNuevo = signal<string | null>(null);
  readonly busquedaClienteNuevo = signal('');
  readonly clienteNuevoSel = signal<ClienteListado | null>(null);
  readonly descripcionNueva = signal('');
  readonly prioridadNueva = signal<PrioridadOrden>('NORMAL');
  /** El ticket es sobre un contrato/servicio concreto del cliente, no sobre el cliente en general. */
  readonly contratosClienteNuevo = signal<ContratoResumen[]>([]);
  readonly contratoNuevoSel = signal<number | null>(null);
  readonly cargandoContratosNuevo = signal(false);

  readonly clientesSugeridosNuevo = computed(() => {
    const term = this.busquedaClienteNuevo().trim().toLowerCase();
    if (term.length < 2) return [];
    return this.clientes()
      .filter((c) => `${c.nombre} ${c.identificacion} ${c.codigo}`.toLowerCase().includes(term))
      .slice(0, 8);
  });

  abrirNuevo() {
    this.errorNuevo.set(null);
    this.busquedaClienteNuevo.set('');
    this.clienteNuevoSel.set(null);
    this.contratosClienteNuevo.set([]);
    this.contratoNuevoSel.set(null);
    this.descripcionNueva.set('');
    this.prioridadNueva.set('NORMAL');
    this.modalNuevo.set(true);
  }

  cerrarNuevo() {
    if (this.guardandoNuevo()) return;
    this.modalNuevo.set(false);
  }

  /** Al elegir el cliente, se trae su ficha para saber a qué contrato(s) puede ir el ticket. */
  elegirClienteNuevo(c: ClienteListado) {
    this.clienteNuevoSel.set(c);
    this.busquedaClienteNuevo.set('');
    this.contratosClienteNuevo.set([]);
    this.contratoNuevoSel.set(null);
    this.cargandoContratosNuevo.set(true);
    this.clientesService.detalle(c.codigo).subscribe({
      next: (d) => {
        this.contratosClienteNuevo.set(d.contratos);
        // Un solo servicio: no hace falta que elija, es obvio a cuál se refiere.
        if (d.contratos.length === 1) this.contratoNuevoSel.set(d.contratos[0].id);
        this.cargandoContratosNuevo.set(false);
      },
      error: () => {
        this.contratosClienteNuevo.set([]);
        this.cargandoContratosNuevo.set(false);
      },
    });
  }

  contratoLabel(c: ContratoResumen): string {
    return `${c.codigo} · ${c.tipoServicioNombre}${c.plan ? ' · ' + c.plan : ''}`;
  }

  guardarNuevo() {
    const cliente = this.clienteNuevoSel();
    const contratoId = this.contratoNuevoSel();
    const descripcion = this.descripcionNueva().trim();
    if (!cliente) {
      this.errorNuevo.set('Elige el cliente que reporta el problema.');
      return;
    }
    if (contratoId == null) {
      this.errorNuevo.set('Elige a qué contrato del cliente corresponde el soporte.');
      return;
    }
    if (!descripcion) {
      this.errorNuevo.set('Describe el motivo del soporte.');
      return;
    }
    this.guardandoNuevo.set(true);
    this.errorNuevo.set(null);
    this.operativo
      .crear({
        tipo: 'SOPORTE',
        prioridad: this.prioridadNueva(),
        contratoId,
        clienteId: cliente.id,
        descripcion,
        fechaProgramada: null,
        tecnicoUsuarioId: null,
      })
      .subscribe({
        next: (o) => {
          this.guardandoNuevo.set(false);
          this.modalNuevo.set(false);
          this.banner.set({ texto: `Ticket ${o.numero} generado: ya aparece pendiente de asignar.`, error: false });
          this.cargar();
        },
        error: (e) => {
          this.guardandoNuevo.set(false);
          this.errorNuevo.set(this.mensajeAccion(e));
        },
      });
  }
}
