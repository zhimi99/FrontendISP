import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, forkJoin, of, switchMap, tap, throwError } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { OperativoService } from '../../core/services/operativo.service';
import { ClientesService } from '../../core/services/clientes.service';
import { ContratosService } from '../../core/services/contratos.service';
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

/** Los pasos en que se descompone cerrar una orden, en orden de ejecución. */
type PasoCierre = 'material' | 'equipo' | 'gpon' | 'cerrar';

/** Lo mínimo que se lee de un error HTTP; `status: -1` marca un fallo propio del cliente. */
interface RespuestaError {
  status?: number;
  error?: unknown;
}

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
  private readonly contratosService = inject(ContratosService);
  private readonly usuarios = inject(UsuariosService);
  private readonly inventario = inject(InventarioService);
  private readonly auth = inject(AuthService);

  readonly tipoEtq = TIPO_ORDEN_ETIQUETA;
  readonly estadoEtq = ESTADO_ORDEN_ETIQUETA;
  readonly estadoTono = ESTADO_ORDEN_TONO;
  readonly prioridadEtq = PRIORIDAD_ETIQUETA;
  readonly prioridadTono = PRIORIDAD_TONO;
  readonly unidadEtq = UNIDAD_ETIQUETA;

  /** Despacho (genera/asigna/cancela); técnico (inicia/cierra/acepta). ADMIN puede todo. */
  readonly puedeCrear = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly puedeAsignar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly puedeCancelar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  /**
   * Cualquier técnico ve el tablero completo (igual que despacho) y puede tomar una
   * PENDIENTE sin esperar a que se la asignen — "Aceptar" es la misma transición
   * que "Asignar", solo que la dispara el propio técnico sobre sí mismo.
   */
  readonly puedeAceptar = computed(() => this.auth.tieneRol('TECNICO', 'ADMINISTRADOR'));

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
    // Tablero único: cualquiera con acceso a Soporte ve TODO lo abierto, técnico
    // incluido. Lo que sí se restringe por técnico es qué puede OPERAR (ver
    // puedeOperarOrden) y qué PENDIENTE puede tomar por su cuenta (ver puedeAceptar).
    forkJoin({
      clientes: this.clientesService.listar().pipe(catchError(() => of([]))),
      pendientes: this.operativo.listarOrdenes({ estado: 'PENDIENTE' }),
      asignadas: this.operativo.listarOrdenes({ estado: 'ASIGNADA' }),
      enProceso: this.operativo.listarOrdenes({ estado: 'EN_PROCESO' }),
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
  /** Foto opcional del trabajo terminado: se sube después de cerrar, sin bloquearlo. */
  readonly foto = signal<File | null>(null);
  readonly errorFoto = signal<string | null>(null);
  readonly subiendoFoto = signal(false);
  /** true desde que POST /cerrar tuvo éxito: de ahí en más el modal solo resuelve la foto. */
  readonly ordenYaCerrada = signal(false);
  // Cancelar
  readonly motivo = signal('');

  /* ---------- Cerrar: ficha GPON (solo en una INSTALACION) ----------
   * Son los mismos campos de la pestaña «Registro GPON» de la ficha del cliente y
   * viajan al mismo endpoint, así que lo que el técnico anota al cerrar es
   * exactamente lo que se ve allá: una sola ficha técnica, no dos que se
   * contradicen. Se precarga porque despacho suele dejar puerto/tarjeta ya
   * asignados en la OLT, y mandar el formulario en blanco los borraría.
   */
  readonly gponContratoCodigo = signal<string | null>(null);
  readonly gponCargando = signal(false);
  readonly gponIp = signal('');
  readonly gponRouter = signal('');
  readonly gponMetraje = signal('');
  readonly gponPuerto = signal('');
  readonly gponTarjeta = signal('');
  readonly gponOnt = signal('');
  readonly gponPuertoServicio = signal('');
  readonly gponAms = signal('');
  /** La ficha GPON documenta el alta del servicio; una visita de soporte no la toca. */
  readonly pideGpon = computed(() => this.ordenAccion()?.tipo === 'INSTALACION');

  /**
   * Pasos del cierre ya completados en este intento. Cerrar son varias llamadas
   * encadenadas y no hay transacción que las envuelva: si el material se descuenta
   * y luego falla el cierre, al reintentar hay que saltarse el consumo o saldría
   * dos veces del inventario. Se vacía al abrir el modal.
   */
  private pasosHechos = new Set<PasoCierre>();

  /* ---------- Cerrar: material usado y equipo entregado ---------- */
  readonly recursosInvCargando = signal(false);
  /** Solo lo que hay EN LA FURGONETA: no tiene sentido ofrecer descontar de una
   * bodega a la que el técnico no tiene acceso físico ahora mismo. */
  private readonly existenciasFurgoneta = signal<Existencia[]>([]);
  private readonly ubicacionesInv = signal<Ubicacion[]>([]);
  private readonly equiposDisponibles = signal<Equipo[]>([]);
  readonly materialesUsados = signal<LineaMaterialUsado[]>([]);
  /**
   * Varios equipos, no uno: una instalación puede dejar router + repetidor, o
   * cualquier otra combinación, no necesariamente "un router más".
   */
  readonly equiposEntregados = signal<{ equipoId: number | null }[]>([]);
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

  agregarLineaEquipo() {
    this.equiposEntregados.update((arr) => [...arr, { equipoId: null }]);
  }
  quitarLineaEquipo(i: number) {
    this.equiposEntregados.update((arr) => arr.filter((_, idx) => idx !== i));
  }
  elegirEquipo(i: number, equipoId: number | null) {
    this.equiposEntregados.update((arr) => arr.map((l, idx) => (idx === i ? { equipoId } : l)));
  }
  /** Las opciones de esta línea, sin los equipos que ya se eligieron en otra: no se
   * puede entregar el mismo equipo dos veces. */
  opcionesEquipoPara(i: number): Equipo[] {
    const elegidosEnOtras = new Set(
      this.equiposEntregados()
        .filter((_, idx) => idx !== i)
        .map((l) => l.equipoId)
        .filter((id): id is number => id != null),
    );
    return this.equiposEntregables().filter((e) => !elegidosEnOtras.has(e.id));
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
    this.equiposEntregados.set([]);
    this.foto.set(null);
    this.errorFoto.set(null);
    this.ordenYaCerrada.set(false);
    this.errorAccion.set(null);
    this.pasosHechos.clear();
    this.limpiarGpon();
    this.accion.set('cerrar');
    this.cargarRecursosInventario();
    if (o.tipo === 'INSTALACION') this.cargarGpon(o);
  }

  private limpiarGpon() {
    this.gponContratoCodigo.set(null);
    this.gponCargando.set(false);
    this.gponIp.set('');
    this.gponRouter.set('');
    this.gponMetraje.set('');
    this.gponPuerto.set('');
    this.gponTarjeta.set('');
    this.gponOnt.set('');
    this.gponPuertoServicio.set('');
    this.gponAms.set('');
  }

  /**
   * La orden solo trae `contratoId` (referencia lógica a otro módulo) y el endpoint
   * GPON trabaja por código de contrato, así que hay que resolverlo: cliente → su
   * ficha → el contrato con ese id. Si falla, el formulario queda visible pero sin
   * dónde guardar y se avisa al confirmar; nunca impide cerrar la orden.
   */
  private cargarGpon(o: Orden) {
    const cliente = this.clientes().find((c) => c.id === o.clienteId);
    if (!cliente || o.contratoId == null) return;

    this.gponCargando.set(true);
    this.clientesService
      .detalle(cliente.codigo)
      .pipe(
        switchMap((d) => {
          const contrato = d.contratos.find((c: ContratoResumen) => c.id === o.contratoId);
          if (!contrato) return of(null);
          this.gponContratoCodigo.set(contrato.codigo);
          // 204 (sin ficha todavía) llega como null: es lo normal en una instalación nueva.
          return this.contratosService.registroGpon(contrato.codigo).pipe(catchError(() => of(null)));
        }),
        catchError(() => of(null)),
      )
      .subscribe((gpon) => {
        this.gponCargando.set(false);
        if (!gpon) return;
        this.gponIp.set(gpon.ip ?? '');
        this.gponRouter.set(gpon.router ?? '');
        this.gponMetraje.set(gpon.metrajeCable != null ? String(gpon.metrajeCable) : '');
        this.gponPuerto.set(gpon.puerto != null ? String(gpon.puerto) : '');
        this.gponTarjeta.set(gpon.tarjeta ?? '');
        this.gponOnt.set(gpon.ont != null ? String(gpon.ont) : '');
        this.gponPuertoServicio.set(
          gpon.puertoServicio != null ? String(gpon.puertoServicio) : '',
        );
        this.gponAms.set(gpon.ams ?? '');
      });
  }

  abrirCancelar(o: Orden) {
    this.banner.set(null);
    this.ordenAccion.set(o);
    this.motivo.set('');
    this.errorAccion.set(null);
    this.accion.set('cancelar');
  }

  cerrarModal() {
    if (this.guardando() || this.subiendoFoto()) return;
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
    const equiposIds = this.equiposEntregados()
      .map((l) => l.equipoId)
      .filter((id): id is number => id != null);
    if (equiposIds.length && o.contratoId == null) {
      this.errorAccion.set('Esta orden no tiene un contrato asociado; no se pueden entregar equipos.');
      return;
    }
    const ubicacion = this.ubicacionTecnico();
    if ((lineas.length || equiposIds.length) && !ubicacion) {
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
    const asignaciones = equiposIds.map((id) =>
      this.inventario.asignarEquipo(id, { contratoId: o.contratoId! }),
    );

    of(null)
      .pipe(
        // Cada paso se etiqueta con su nombre. Sin esto, un 422 de inventario
        // («no hay bastante cable») se atribuía al cierre y salía como «la orden ya
        // cambió de estado»: el técnico leía que el problema era la orden y no que
        // le faltaba material, que es lo único que podía arreglar.
        switchMap(() =>
          consumos.length && !this.pasosHechos.has('material')
            ? this.paso('material', forkJoin(consumos))
            : of(null),
        ),
        switchMap(() =>
          asignaciones.length && !this.pasosHechos.has('equipo')
            ? this.paso('equipo', forkJoin(asignaciones))
            : of(null),
        ),
        // La ficha GPON va ANTES del cierre a propósito: es un upsert idempotente, así
        // que si algo falla aquí la orden sigue abierta y el técnico reintenta sin
        // haber perdido nada. Al revés —cerrar y luego guardar— dejaría instalaciones
        // cerradas sin su ficha técnica y nadie se enteraría.
        switchMap(() => this.paso('gpon', this.guardarGponSiCorresponde())),
        switchMap(() => this.paso('cerrar', this.operativo.cerrar(o.id, res))),
      )
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cargar();
          this.finalizarCierre(o);
        },
        error: (fallo: { paso: PasoCierre; causa: RespuestaError }) => {
          const e = fallo.causa;
          // Solo el cierre puede haber fallado por «la orden ya cambió»: un backend
          // lento puede hacer que un segundo clic llegue después de que el primero
          // ya cerró, y ese 409 no es un error real sino la orden ya resuelta.
          if (fallo.paso === 'cerrar' && (e.status === 409 || e.status === 422)) {
            this.operativo.porId(o.id).subscribe({
              next: (actual) => {
                this.guardando.set(false);
                if (actual.estado === 'CERRADA') {
                  this.finalizarCierre(o, 'ya estaba cerrada');
                } else {
                  this.errorAccion.set(this.mensajeAccion(e));
                }
                this.cargar();
              },
              error: () => {
                this.guardando.set(false);
                this.errorAccion.set(this.mensajeAccion(e));
              },
            });
            return;
          }
          this.guardando.set(false);
          this.errorAccion.set(this.mensajePaso(fallo.paso, e));
        },
      });
  }

  /**
   * Etiqueta el paso y recuerda que salió bien. Lo segundo importa al reintentar:
   * el material ya descontado NO se vuelve a descontar, porque si el cierre falla
   * después del consumo, darle otra vez a «Cerrar orden» sacaría dos veces el
   * mismo cable del inventario.
   */
  private paso<T>(nombre: PasoCierre, origen: Observable<T>): Observable<T> {
    return origen.pipe(
      tap(() => this.pasosHechos.add(nombre)),
      catchError((causa) => throwError(() => ({ paso: nombre, causa }))),
    );
  }

  /** Mensaje del paso que falló de verdad, con el motivo que da el backend. */
  private mensajePaso(paso: PasoCierre, e: RespuestaError): string {
    const detalle = this.detalleError(e.error);
    if (paso === 'material') {
      return detalle
        ? `No se pudo descontar el material: ${detalle}`
        : 'No se pudo descontar el material de la furgoneta. Revisa las cantidades.';
    }
    if (paso === 'equipo') {
      return detalle
        ? `No se pudo entregar el equipo: ${detalle}`
        : 'No se pudo entregar el equipo al cliente. Revisa que siga disponible.';
    }
    if (paso === 'gpon') {
      if (e.status === -1) {
        return 'No se pudo identificar el contrato de esta orden para guardar la ficha GPON. Recarga el tablero e inténtalo de nuevo.';
      }
      return detalle
        ? `No se pudo guardar el registro GPON: ${detalle}`
        : 'No se pudo guardar el registro GPON. La orden sigue abierta; inténtalo de nuevo.';
    }
    return this.mensajeAccion(e);
  }

  /**
   * Guarda la ficha GPON si es una instalación y el técnico anotó algo. Si dejó
   * el formulario entero en blanco no se manda nada: un PUT vacío borraría lo que
   * despacho hubiera dejado asignado en la OLT.
   */
  private guardarGponSiCorresponde() {
    if (!this.pideGpon()) return of(null);

    const codigo = this.gponContratoCodigo();
    const req = {
      ip: this.gponIp().trim() || null,
      router: this.gponRouter().trim() || null,
      metrajeCable: this.decimalGpon(this.gponMetraje()),
      puerto: this.enteroGpon(this.gponPuerto()),
      tarjeta: this.gponTarjeta().trim() || null,
      ont: this.enteroGpon(this.gponOnt()),
      puertoServicio: this.enteroGpon(this.gponPuertoServicio()),
      ams: this.gponAms().trim() || null,
    };
    if (Object.values(req).every((v) => v == null)) return of(null);
    if (!codigo) {
      // Se pidió guardar pero no se pudo resolver el contrato: mejor detenerse que
      // cerrar la instalación perdiendo la ficha que el técnico acaba de escribir.
      return throwError(() => ({ status: -1 }));
    }
    return this.contratosService.guardarRegistroGpon(codigo, req);
  }

  /** Acepta coma o punto decimal: el técnico teclea "121,5" tan a menudo como "121.5". */
  private decimalGpon(valor: string): number | null {
    const texto = valor.trim().replace(',', '.');
    if (!texto) return null;
    const n = Number(texto);
    return Number.isFinite(n) ? n : null;
  }

  private enteroGpon(valor: string): number | null {
    const n = this.decimalGpon(valor);
    return n != null ? Math.trunc(n) : null;
  }

  /**
   * La orden ya quedó CERRADA (justo ahora o por un intento anterior). Si eligieron
   * foto, la sube sin bloquear ni deshacer el cierre: es opcional, un fallo aquí no
   * es un fallo de cerrar la orden.
   */
  private finalizarCierre(o: Orden, comoQuedo: 'cerrada' | 'ya estaba cerrada' = 'cerrada') {
    this.ordenYaCerrada.set(true);
    const archivo = this.foto();
    if (!archivo) {
      this.accion.set(null);
      this.ordenAccion.set(null);
      this.banner.set({ texto: `Orden ${o.numero} ${comoQuedo}.`, error: false });
      return;
    }
    this.subirFoto(o, archivo);
  }

  private subirFoto(o: Orden, archivo: File) {
    this.subiendoFoto.set(true);
    this.errorFoto.set(null);
    this.operativo.subirFoto(o.id, archivo).subscribe({
      next: () => {
        this.subiendoFoto.set(false);
        this.accion.set(null);
        this.ordenAccion.set(null);
        this.banner.set({ texto: `Orden ${o.numero} cerrada, con foto adjunta.`, error: false });
      },
      error: (e) => {
        this.subiendoFoto.set(false);
        this.errorFoto.set(this.mensajeErrorFoto(e));
      },
    });
  }

  /** La orden ya está cerrada pase lo que pase aquí: solo reintenta subir la foto. */
  reintentarFoto() {
    const o = this.ordenAccion();
    const archivo = this.foto();
    if (!o || !archivo) return;
    this.subirFoto(o, archivo);
  }

  onFotoSeleccionada(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorFoto.set(null);
    if (!archivo) {
      this.foto.set(null);
      return;
    }
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type) && !/\.(jpe?g|png|webp)$/i.test(archivo.name)) {
      this.foto.set(null);
      this.errorFoto.set('Usa una imagen JPG, PNG o WebP.');
      input.value = '';
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      this.foto.set(null);
      this.errorFoto.set('La foto no puede superar 8 MB.');
      input.value = '';
      return;
    }
    this.foto.set(archivo);
  }

  quitarFoto(input: HTMLInputElement) {
    input.value = '';
    this.foto.set(null);
    this.errorFoto.set(null);
  }

  private mensajeErrorFoto(e: { status?: number }): string {
    if (e.status === 400) return 'La orden quedó cerrada, pero la foto no tiene un formato válido.';
    if (e.status === 413) return 'La orden quedó cerrada, pero la foto supera el tamaño máximo de 8 MB.';
    if (e.status === 0) return 'La orden quedó cerrada, pero no se pudo contactar el gateway para subir la foto.';
    return 'La orden quedó cerrada, pero no se pudo subir la foto. Puedes reintentarlo.';
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

  /** El técnico toma una PENDIENTE por su cuenta, sin pasar por el despacho. */
  aceptarOrden(o: Orden) {
    if (this.procesandoId() != null) return;
    this.banner.set(null);
    this.procesandoId.set(o.id);
    this.operativo.aceptar(o.id).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.banner.set({ texto: `Orden ${o.numero} aceptada.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.procesandoId.set(null);
        // Otro técnico pudo habérsela adelantado: el 409 aquí es justamente eso.
        this.banner.set({ texto: this.mensajeAccion(e), error: true });
      },
    });
  }

  private mensajeAccion(e: RespuestaError): string {
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
