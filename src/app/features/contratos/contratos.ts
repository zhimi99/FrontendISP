import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { VisorContratoComponent } from '../../shared/visor-contrato';
import { AuthService } from '../../core/services/auth.service';
import { ClientesService } from '../../core/services/clientes.service';
import { ContratosService } from '../../core/services/contratos.service';
import { PlanesService } from '../../core/services/planes.service';
import {
  ClienteListado,
  ContratoListado,
  DireccionDetalle,
  OfertaServicioCatalogo,
  PlanCatalogo,
} from '../../core/models/contratos.model';
import { EstadoCliente, ESTADOS } from '../clientes/clientes.model';

/**
 * Gestión de contratos sobre datos reales.
 *
 * Reutiliza la hoja de estilos de la lista de clientes por consistencia visual y
 * corrige encima los anchos de columna, que allí están calculados para otra tabla.
 *
 * El alta empieza por el abonado —un contrato siempre pertenece a un cliente, y uno
 * puede tener varios servicios— y muestra la vista previa de lo que quedará impreso.
 * No hay borrado: un contrato se da de baja y conserva su historial.
 */
@Component({
  selector: 'app-contratos',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, VisorContratoComponent],
  templateUrl: './contratos.html',
  styleUrls: ['../clientes/clientes.scss', './contratos.scss'],
})
export class ContratosComponent implements OnDestroy {
  private readonly contratosService = inject(ContratosService);
  private readonly clientesService = inject(ClientesService);
  private readonly planesService = inject(PlanesService);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly estadosMap = ESTADOS;

  /** Crear, renegociar y dar de baja: los mismos roles que el backend autoriza. */
  readonly puedeGestionar = computed(() => this.auth.tieneRol('ADMINISTRADOR', 'SOPORTE'));

  private readonly datos = signal<ContratoListado[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly q = signal('');
  readonly estado = signal<'' | EstadoCliente>('');
  readonly plan = signal('');

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  // ---- Visor del contrato -------------------------------------------------------
  readonly contratoEnVisor = signal<string | null>(null);
  readonly nombreEnVisor = signal<string | null>(null);

  // ---- Catálogos del formulario -------------------------------------------------
  readonly ofertas = signal<OfertaServicioCatalogo[]>([]);
  readonly planes = signal<PlanCatalogo[]>([]);
  private readonly clientes = signal<ClienteListado[]>([]);

  // ---- Alta de contrato ---------------------------------------------------------
  readonly modalNuevo = signal(false);
  readonly busquedaCliente = signal('');
  readonly clienteSeleccionado = signal<ClienteListado | null>(null);
  readonly direccionesCliente = signal<DireccionDetalle[]>([]);
  readonly ofertaCodigo = signal('');
  readonly planCodigo = signal('');
  readonly direccionId = signal<number | null>(null);
  readonly precioAcordado = signal<number | null>(null);
  readonly diaCorte = signal<number>(1);
  readonly observaciones = signal('');

  // ---- Edición y baja -----------------------------------------------------------
  readonly contratoEnEdicion = signal<ContratoListado | null>(null);
  readonly edicionPrecio = signal<number | null>(null);
  readonly edicionDiaCorte = signal<number | null>(null);
  readonly edicionPlan = signal('');
  readonly edicionObservaciones = signal('');

  readonly contratoEnBaja = signal<ContratoListado | null>(null);
  readonly motivoBaja = signal('');
  readonly fechaBaja = signal('');

  readonly guardando = signal(false);
  readonly errorFormulario = signal<string | null>(null);

  private suscripciones: Subscription[] = [];

  constructor() {
    this.cargarContratos();

    // Llegada desde la lista de clientes: "crear contrato" trae el abonado en la URL
    // y aquí se abre el alta con él ya elegido. El formulario vive solo en este
    // módulo; clientes no lo duplica, lo invoca.
    const abonado = this.ruta.snapshot.queryParamMap.get('nuevoPara');
    if (abonado && this.puedeGestionar()) this.abrirNuevoContratoPara(abonado);
  }

  private cargarContratos() {
    this.cargando.set(true);
    this.suscripciones.push(
      this.contratosService.listar().subscribe({
        next: (lista) => {
          this.datos.set(lista);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(this.mensajeDeError(e));
          this.cargando.set(false);
        },
      }),
    );
  }

  readonly planesFiltro = computed(() => [...new Set(this.datos().map((c) => c.plan))].sort());

  get total() {
    return this.datos().length;
  }
  get activos() {
    return this.datos().filter((c) => c.estadoServicio === 'ACTIVO').length;
  }
  get suspendidos() {
    return this.datos().filter((c) => c.estadoServicio === 'SUSPENDIDO').length;
  }
  get cortados() {
    return this.datos().filter((c) => c.estadoServicio === 'CORTADO').length;
  }

  pct(n: number): string {
    return this.total ? ((n / this.total) * 100).toFixed(1) + '% del total' : '—';
  }

  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const est = this.estado();
    const pl = this.plan();

    return this.datos().filter((c) => {
      if (est && c.estadoServicio !== est) return false;
      if (pl && c.plan !== pl) return false;
      if (term) {
        const heno =
          `${c.codigo} ${c.clienteNombre} ${c.clienteIdentificacion} ${c.pppoeUsuario ?? ''} ${c.direccionTexto ?? ''}`.toLowerCase();
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
    if (this.cargando()) return 'Cargando contratos…';
    if (this.error()) return this.error()!;
    return 'No se encontraron contratos con los filtros aplicados.';
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
    this.estado.set('');
    this.plan.set('');
    this.pagina.set(1);
  }

  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }

  /* ---------- Ver el contrato ---------- */

  verContrato(c: ContratoListado) {
    this.nombreEnVisor.set(c.clienteNombre);
    this.contratoEnVisor.set(c.codigo);
  }

  /* ---------- Alta ---------- */

  abrirNuevoContrato() {
    this.limpiarFormulario();
    this.modalNuevo.set(true);
    this.cargarCatalogos();
  }

  /**
   * Alta con el abonado ya decidido, viniendo de su fila en la lista de clientes.
   * El catálogo llega por red, así que la preselección espera a tenerlo.
   */
  private abrirNuevoContratoPara(codigoCliente: string) {
    this.limpiarFormulario();
    this.modalNuevo.set(true);
    this.cargarCatalogos(() => {
      const cliente = this.clientes().find((c) => c.codigo === codigoCliente);
      if (cliente) this.elegirCliente(cliente);
      else this.errorFormulario.set(`No se encontró el cliente ${codigoCliente}.`);
    });

    // Se consume el parámetro: si no, recargar la página volvería a abrir el alta
    // de un contrato que quizá ya se creó. replaceUrl evita ensuciar el historial.
    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: {},
      replaceUrl: true,
    });
  }

  /**
   * Clientes, ofertas y planes: lo que el formulario necesita para autocompletarse.
   * `alTerminar` corre también cuando ya estaban en memoria, para que quien dependa
   * del catálogo no se quede esperando un evento que no va a llegar.
   */
  private cargarCatalogos(alTerminar?: () => void) {
    if (this.clientes().length && this.ofertas().length && this.planes().length) {
      alTerminar?.();
      return;
    }

    this.suscripciones.push(
      forkJoin({
        clientes: this.clientesService.listar(),
        ofertas: this.contratosService.listarOfertasServicio(),
        planes: this.planesService.listar(),
      }).subscribe({
        next: ({ clientes, ofertas, planes }) => {
          this.clientes.set(clientes);
          this.ofertas.set(ofertas);
          this.planes.set(planes);
          alTerminar?.();
        },
        error: () => this.errorFormulario.set('No se pudieron cargar los catálogos.'),
      }),
    );
  }

  cambiarBusquedaCliente(valor: string) {
    this.busquedaCliente.set(valor);
    this.clienteSeleccionado.set(null);
    this.direccionesCliente.set([]);
  }

  readonly clientesSugeridos = computed(() => {
    const term = this.busquedaCliente().trim().toLowerCase();
    if (term.length < 2) return [];
    return this.clientes()
      .filter((c) =>
        `${c.nombre} ${c.codigo} ${c.identificacion}`.toLowerCase().includes(term),
      )
      .slice(0, 8);
  });

  /** Al elegir al abonado se traen sus direcciones: el contrato se instala en una suya. */
  elegirCliente(cliente: ClienteListado) {
    this.clienteSeleccionado.set(cliente);
    this.busquedaCliente.set(`${cliente.nombre} · ${cliente.codigo}`);
    this.direccionId.set(null);

    this.suscripciones.push(
      this.clientesService.detalle(cliente.codigo).subscribe({
        next: (detalle) => {
          this.direccionesCliente.set(detalle.direcciones);
          const principal = detalle.direcciones.find((d) => d.esPrincipal) ?? detalle.direcciones[0];
          this.direccionId.set(principal?.id ?? null);
        },
        error: () => this.errorFormulario.set('No se pudieron cargar las direcciones del cliente.'),
      }),
    );
  }

  readonly ofertaElegida = computed(
    () => this.ofertas().find((o) => o.codigo === this.ofertaCodigo()) ?? null,
  );

  /** El precio se propone desde el catálogo; el operador puede pactar otro. */
  cambiarOferta(codigo: string) {
    this.ofertaCodigo.set(codigo);
    this.planCodigo.set('');

    const oferta = this.ofertas().find((o) => o.codigo === codigo) ?? null;
    this.precioAcordado.set(oferta ? oferta.precioReferencial : null);
  }

  cambiarPlan(codigo: string) {
    this.planCodigo.set(codigo);
    const plan = this.planes().find((p) => p.codigo === codigo);
    if (plan) this.precioAcordado.set(plan.precioMensual);
  }

  readonly resumenPlan = computed(() => {
    const plan = this.planes().find((p) => p.codigo === this.planCodigo());
    if (!plan) return this.ofertaElegida()?.requierePlanInternet ? 'Sin seleccionar' : 'No aplica';
    return `${plan.nombre} — ${plan.velocidad}`;
  });

  readonly resumenDireccion = computed(() => {
    const id = this.direccionId();
    if (!this.ofertaElegida()?.requiereDireccion) return 'No aplica';
    return this.direccionesCliente().find((d) => d.id === id)?.direccionTexto ?? 'Sin seleccionar';
  });

  readonly precioMostrado = computed(() => (this.precioAcordado() ?? 0).toFixed(2));

  readonly puedeCrear = computed(() => {
    const oferta = this.ofertaElegida();
    if (!this.clienteSeleccionado() || !oferta) return false;
    if (oferta.requierePlanInternet && !this.planCodigo()) return false;
    if (oferta.requiereDireccion && this.direccionId() === null) return false;
    return true;
  });

  crearContrato() {
    const cliente = this.clienteSeleccionado();
    const oferta = this.ofertaElegida();
    if (!cliente || !oferta || !this.puedeCrear()) return;

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.suscripciones.push(
      this.contratosService
        .agregarServicio(cliente.codigo, {
          ofertaCodigo: oferta.codigo,
          direccionId: oferta.requiereDireccion ? this.direccionId() : null,
          nuevaDireccion: null,
          planCodigo: oferta.requierePlanInternet ? this.planCodigo() : null,
          precioAcordado: this.precioAcordado(),
          diaCorte: oferta.sujetoMora ? this.diaCorte() : null,
          observaciones: this.observaciones().trim() || null,
        })
        .subscribe({
          next: (res) => {
            this.guardando.set(false);
            this.cerrarNuevo();
            this.cargarContratos();
            // El documento ya quedó registrado en el alta: se abre para imprimirlo.
            this.nombreEnVisor.set(cliente.nombre);
            this.contratoEnVisor.set(res.contratoCodigo);
          },
          error: (e) => {
            this.guardando.set(false);
            this.errorFormulario.set(this.mensajeDeGuardado(e));
          },
        }),
    );
  }

  cerrarNuevo() {
    this.modalNuevo.set(false);
    this.limpiarFormulario();
  }

  private limpiarFormulario() {
    this.busquedaCliente.set('');
    this.clienteSeleccionado.set(null);
    this.direccionesCliente.set([]);
    this.ofertaCodigo.set('');
    this.planCodigo.set('');
    this.direccionId.set(null);
    this.precioAcordado.set(null);
    this.diaCorte.set(1);
    this.observaciones.set('');
    this.errorFormulario.set(null);
  }

  /* ---------- Edición ---------- */

  abrirEditar(c: ContratoListado) {
    this.errorFormulario.set(null);
    this.edicionPrecio.set(c.planPrecio ?? null);
    this.edicionDiaCorte.set(c.diaCorte ?? null);
    this.edicionPlan.set('');
    this.edicionObservaciones.set('');
    this.contratoEnEdicion.set(c);
    this.cargarCatalogos();

    // El precio real pactado vive en la ficha, no en la fila de la grilla.
    this.suscripciones.push(
      this.contratosService.detalle(c.codigo).subscribe({
        next: (detalle) => {
          this.edicionPrecio.set(detalle.precioAcordado);
          this.edicionDiaCorte.set(detalle.diaCorte);
          this.edicionObservaciones.set(detalle.observaciones ?? '');
        },
        error: () => this.errorFormulario.set('No se pudo cargar la ficha del contrato.'),
      }),
    );
  }

  guardarEdicion() {
    const contrato = this.contratoEnEdicion();
    if (!contrato) return;

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.suscripciones.push(
      this.contratosService
        .editar(contrato.codigo, {
          planCodigo: this.edicionPlan() || null,
          precioAcordado: this.edicionPrecio(),
          diaCorte: this.edicionDiaCorte(),
          direccionId: null,
          observaciones: this.edicionObservaciones().trim(),
        })
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.cerrarEditar();
            this.cargarContratos();
          },
          error: (e) => {
            this.guardando.set(false);
            this.errorFormulario.set(this.mensajeDeGuardado(e));
          },
        }),
    );
  }

  cerrarEditar() {
    this.contratoEnEdicion.set(null);
    this.errorFormulario.set(null);
  }

  /* ---------- Baja ---------- */

  abrirBaja(c: ContratoListado) {
    this.errorFormulario.set(null);
    this.motivoBaja.set('');
    this.fechaBaja.set(new Date().toISOString().slice(0, 10));
    this.contratoEnBaja.set(c);
  }

  confirmarBaja() {
    const contrato = this.contratoEnBaja();
    if (!contrato || this.motivoBaja().trim().length < 3) return;

    this.guardando.set(true);
    this.errorFormulario.set(null);

    this.suscripciones.push(
      this.contratosService
        .darDeBaja(contrato.codigo, {
          motivo: this.motivoBaja().trim(),
          fechaBaja: this.fechaBaja() || null,
        })
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.cerrarBaja();
            this.cargarContratos();
          },
          error: (e) => {
            this.guardando.set(false);
            this.errorFormulario.set(this.mensajeDeGuardado(e));
          },
        }),
    );
  }

  cerrarBaja() {
    this.contratoEnBaja.set(null);
    this.errorFormulario.set(null);
  }

  /* ---------- Errores ---------- */

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el backend (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver los contratos.';
    if (e.status) return `El backend respondió ${e.status} al listar contratos.`;
    return 'Error inesperado cargando los contratos.';
  }

  /** El backend explica en el cuerpo por qué rechaza; se muestra tal cual. */
  private mensajeDeGuardado(e: { status?: number; error?: { message?: string } }): string {
    const detalle = e.error?.message;
    if (detalle) return detalle;
    if (e.status === 403) return 'Tu rol no permite esta operación.';
    if (e.status === 404) return 'El contrato ya no existe.';
    if (e.status === 422) return 'La operación no es válida para este contrato.';
    return 'No se pudo completar la operación.';
  }

  ngOnDestroy() {
    this.suscripciones.forEach((s) => s.unsubscribe());
  }
}
