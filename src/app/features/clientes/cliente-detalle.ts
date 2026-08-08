import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, combineLatest, forkJoin, map, Observable, of, startWith, Subscription, switchMap } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { VisorContratoComponent } from '../../shared/visor-contrato';
import { ClientesService } from '../../core/services/clientes.service';
import { ContratosService } from '../../core/services/contratos.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { PlanesService } from '../../core/services/planes.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ClienteDetalle,
  CrearContratoServicioRequest,
  DireccionDetalle,
  EditarClienteRequest,
  NuevaDireccionContratoRequest,
  OfertaServicioCatalogo,
  PlanCatalogo,
} from '../../core/models/contratos.model';
import {
  ESTADO_PAGO_ETIQUETA,
  ESTADO_PAGO_TONO,
  ESTADO_SRI_ETIQUETA,
  ESTADO_SRI_TONO,
  FacturaVista,
} from '../../core/models/facturacion.model';
import { EstadoCliente, ESTADOS } from './clientes.data';

/** Estado de la carga perezosa de facturas para la pestaña de Facturación. */
type EstadoFacturas = { estado: 'cargando' | 'ok' | 'error'; lista: FacturaVista[] };
type ModoDireccionServicio = 'EXISTENTE' | 'NUEVA';

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [IconComponent, RouterLink, FormsModule, VisorContratoComponent],
  templateUrl: './cliente-detalle.html',
  styleUrl: './cliente-detalle.scss',
})
export class ClienteDetalleComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly clientesService = inject(ClientesService);
  private readonly contratosService = inject(ContratosService);
  private readonly facturacionService = inject(FacturacionService);
  private readonly planesService = inject(PlanesService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly estadosMap = ESTADOS;

  /** Solo soporte/ventas y administración editan al cliente (PUT /api/clientes). */
  readonly puedeEditar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));

  // Mapas de etiqueta/tono para las insignias de la pestaña de Facturación.
  readonly pagoEtq = ESTADO_PAGO_ETIQUETA;
  readonly pagoTono = ESTADO_PAGO_TONO;
  readonly sriEtq = ESTADO_SRI_ETIQUETA;
  readonly sriTono = ESTADO_SRI_TONO;

  readonly tabs = [
    'Resumen',
    'Servicios',
    'Facturación',
    'Soporte',
    'Documentos',
    'Historial',
    'Red / Equipos',
    'Ubicación',
  ];
  readonly tabActiva = signal(0);
  readonly modalIdentificacion = signal(false);

  /** Contrato que se está visualizando en el visor PDF; null = cerrado. */
  readonly contratoEnVisor = signal<string | null>(null);
  readonly cargandoIdentificacion = signal(false);
  readonly errorIdentificacion = signal<string | null>(null);
  readonly urlIdentificacion = signal<string | null>(null);
  readonly tipoArchivoIdentificacion = signal<string | null>(null);
  readonly esPdfIdentificacion = computed(() => this.tipoArchivoIdentificacion() === 'application/pdf');
  readonly recursoIdentificacion = computed<SafeResourceUrl | null>(() => {
    const url = this.urlIdentificacion();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  private cargaIdentificacion?: Subscription;

  /** Se incrementa para forzar una recarga de la ficha (p. ej. tras editar). */
  private readonly recargar = signal(0);

  /**
   * Ficha real desde MS-CONTRATOS. `undefined` = cargando, `null` = no encontrado
   * o error, objeto = cargada. Se recarga sola si cambia el código de la URL, y a
   * demanda cuando se bumpea `recargar` (tras guardar una edición).
   */
  // Sin initialValue: toSignal arranca en `undefined` (= cargando) hasta la 1ª emisión.
  private readonly detalle = toSignal(
    combineLatest([this.route.paramMap, toObservable(this.recargar)]).pipe(
      map(([p]) => p.get('id') ?? ''),
      switchMap((codigo) =>
        codigo
          ? this.clientesService.detalle(codigo).pipe(catchError(() => of(null)))
          : of(null),
      ),
    ),
  );

  readonly cargando = computed(() => this.detalle() === undefined);

  /** Modelo de vista derivado de la ficha real. Null mientras no haya datos. */
  readonly d = computed(() => {
    const det = this.detalle();
    return det ? this.armarVista(det) : null;
  });
  /** Direcciones propias del cliente que se pueden reutilizar al vender otro servicio. */
  readonly direccionesCliente = computed(() => this.detalle()?.direcciones ?? []);

  /**
   * Facturas del cliente (MS-FACTURACION) para la pestaña de Facturación. Se cargan
   * en cuanto la ficha resuelve su id numérico —la referencia lógica que enlaza con
   * factura.cliente_id— y se recargan solas si se navega a otro cliente.
   */
  private readonly facturasResp = toSignal(
    toObservable(this.detalle).pipe(
      switchMap((det): Observable<EstadoFacturas> =>
        det && det.id != null
          ? this.facturacionService.listar({ clienteId: det.id }).pipe(
              map((lista) => ({ estado: 'ok' as const, lista })),
              startWith({ estado: 'cargando' as const, lista: [] as FacturaVista[] }),
              catchError(() => of({ estado: 'error' as const, lista: [] as FacturaVista[] })),
            )
          : of({ estado: 'ok' as const, lista: [] as FacturaVista[] }),
      ),
    ),
    { initialValue: { estado: 'cargando', lista: [] } as EstadoFacturas },
  );

  readonly facturas = computed(() => this.facturasResp().lista);
  readonly facturasCargando = computed(() => this.facturasResp().estado === 'cargando');
  readonly facturasError = computed(() => this.facturasResp().estado === 'error');
  readonly facturasSaldo = computed(() =>
    this.facturas().reduce((s, f) => s + (f.saldoPendiente ?? 0), 0),
  );
  readonly facturasTotal = computed(() =>
    this.facturas().reduce((s, f) => s + (f.total ?? 0), 0),
  );

  setTab(i: number) {
    this.tabActiva.set(i);
  }

  /* ---------- Agregar contrato / servicio ---------- */
  readonly modalServicio = signal(false);
  readonly cargandoCatalogosServicio = signal(false);
  readonly errorCatalogosServicio = signal<string | null>(null);
  readonly guardandoServicio = signal(false);
  readonly errorServicio = signal<string | null>(null);
  readonly avisoServicio = signal<{ texto: string; error: boolean } | null>(null);
  readonly ofertasServicio = signal<OfertaServicioCatalogo[]>([]);
  readonly planesServicio = signal<PlanCatalogo[]>([]);

  readonly ofertaServicioCodigo = signal('');
  readonly modoDireccionServicio = signal<ModoDireccionServicio>('EXISTENTE');
  readonly direccionServicioId = signal<number | null>(null);
  readonly nuevaDireccionEtiqueta = signal('');
  readonly nuevaDireccionTexto = signal('');
  readonly nuevaDireccionReferencia = signal('');
  readonly nuevaDireccionLatitud = signal('');
  readonly nuevaDireccionLongitud = signal('');
  readonly planServicioCodigo = signal('');
  readonly precioAcordadoServicio = signal('');
  readonly diaCorteServicio = signal(1);
  readonly observacionesServicio = signal('');

  readonly ofertaServicioSeleccionada = computed(
    () => this.ofertasServicio().find((oferta) => oferta.codigo === this.ofertaServicioCodigo()) ?? null,
  );
  readonly servicioRequiereDireccion = computed(
    () => this.ofertaServicioSeleccionada()?.requiereDireccion ?? false,
  );
  readonly servicioRequierePlanInternet = computed(
    () => this.ofertaServicioSeleccionada()?.requierePlanInternet ?? false,
  );
  readonly servicioSujetoMora = computed(
    () => this.ofertaServicioSeleccionada()?.sujetoMora ?? false,
  );
  readonly diasCorte = Array.from({ length: 28 }, (_, i) => i + 1);
  private cargaCatalogosServicio?: Subscription;
  private altaServicio?: Subscription;

  abrirAgregarServicio() {
    if (!this.puedeEditar()) return;

    const primeraDireccion = this.direccionesCliente()[0] ?? null;
    this.ofertaServicioCodigo.set('');
    this.modoDireccionServicio.set(primeraDireccion ? 'EXISTENTE' : 'NUEVA');
    this.direccionServicioId.set(primeraDireccion?.id ?? null);
    this.nuevaDireccionEtiqueta.set('');
    this.nuevaDireccionTexto.set('');
    this.nuevaDireccionReferencia.set('');
    this.nuevaDireccionLatitud.set('');
    this.nuevaDireccionLongitud.set('');
    this.planServicioCodigo.set('');
    this.precioAcordadoServicio.set('');
    this.diaCorteServicio.set(1);
    this.observacionesServicio.set('');
    this.errorServicio.set(null);
    this.errorCatalogosServicio.set(null);
    this.modalServicio.set(true);
    this.cargarCatalogosServicio();
  }

  cerrarAgregarServicio() {
    if (this.guardandoServicio()) return;
    this.modalServicio.set(false);
    this.errorServicio.set(null);
  }

  onOfertaServicioChange(codigo: string) {
    this.ofertaServicioCodigo.set(codigo);
    const oferta = this.ofertasServicio().find((item) => item.codigo === codigo) ?? null;
    // Vacío conserva la regla comercial del backend: precio del plan para Internet
    // o precio referencial de la oferta para los demás servicios.
    this.precioAcordadoServicio.set('');
    if (!oferta?.requierePlanInternet) this.planServicioCodigo.set('');
    if (!oferta?.sujetoMora) this.diaCorteServicio.set(1);
  }

  cambiarModoDireccionServicio(modo: ModoDireccionServicio) {
    this.modoDireccionServicio.set(modo);
    if (modo === 'EXISTENTE' && !this.direccionServicioId()) {
      this.direccionServicioId.set(this.direccionesCliente()[0]?.id ?? null);
    }
  }

  onDireccionServicioChange(valor: string | number | null) {
    const direccionId = Number(valor);
    this.direccionServicioId.set(Number.isInteger(direccionId) && direccionId > 0 ? direccionId : null);
  }

  onDiaCorteServicioChange(valor: string | number | null) {
    const dia = Number(valor);
    this.diaCorteServicio.set(Number.isInteger(dia) && dia >= 1 && dia <= 28 ? dia : 1);
  }

  guardarServicio() {
    const cliente = this.detalle();
    const oferta = this.ofertaServicioSeleccionada();
    if (!cliente || !oferta) {
      this.errorServicio.set('Selecciona una oferta de servicio para continuar.');
      return;
    }

    let direccionId: number | null = null;
    let nuevaDireccion: NuevaDireccionContratoRequest | null = null;
    if (oferta.requiereDireccion) {
      if (this.modoDireccionServicio() === 'EXISTENTE') {
        direccionId = this.direccionServicioId();
        if (!direccionId) {
          this.errorServicio.set('Selecciona una dirección existente o registra una nueva.');
          return;
        }
      } else {
        nuevaDireccion = this.construirNuevaDireccion();
        if (!nuevaDireccion) return;
      }
    }

    const planCodigo = this.planServicioCodigo().trim();
    if (oferta.requierePlanInternet && !planCodigo) {
      this.errorServicio.set('Selecciona un plan de Internet para este servicio.');
      return;
    }

    const precioTexto = this.precioAcordadoServicio().trim();
    const precioAcordado = precioTexto ? this.numeroFormulario(precioTexto) : null;
    if (precioTexto && (!this.esMontoValido(precioTexto) || precioAcordado == null || precioAcordado < 0)) {
      this.errorServicio.set('El precio acordado debe ser un valor numérico igual o mayor que cero.');
      return;
    }

    const solicitud: CrearContratoServicioRequest = {
      ofertaCodigo: oferta.codigo,
      direccionId,
      nuevaDireccion,
      planCodigo: oferta.requierePlanInternet ? planCodigo : null,
      precioAcordado,
      diaCorte: oferta.sujetoMora ? this.diaCorteServicio() : null,
      observaciones: this.observacionesServicio().trim() || null,
    };

    this.guardandoServicio.set(true);
    this.errorServicio.set(null);
    this.altaServicio?.unsubscribe();
    this.altaServicio = this.contratosService.agregarServicio(cliente.codigo, solicitud).subscribe({
      next: (respuesta) => {
        this.guardandoServicio.set(false);
        this.altaServicio = undefined;
        this.modalServicio.set(false);
        this.tabActiva.set(1);
        this.avisoServicio.set({
          texto: `Servicio ${respuesta.contratoCodigo} registrado con estado ${respuesta.estadoServicio.toLowerCase()}${
            respuesta.requiereInstalacion ? '; requiere coordinación de instalación.' : '.'
          }`,
          error: false,
        });
        this.recargar.update((n) => n + 1);
      },
      error: (e) => {
        this.guardandoServicio.set(false);
        this.altaServicio = undefined;
        this.errorServicio.set(this.mensajeErrorServicio(e));
      },
    });
  }

  direccionEtiqueta(direccion: DireccionDetalle): string {
    return `${direccion.etiqueta?.trim() || 'Dirección'} — ${direccion.direccionTexto}`;
  }

  modalidadEtiqueta(modalidad: string): string {
    return modalidad === 'UNICO' ? 'Cobro único' : 'Recurrente';
  }

  private cargarCatalogosServicio() {
    this.cargaCatalogosServicio?.unsubscribe();
    this.cargandoCatalogosServicio.set(true);
    this.errorCatalogosServicio.set(null);
    this.cargaCatalogosServicio = forkJoin({
      ofertas: this.contratosService.listarOfertasServicio(),
      planes: this.planesService.listar(),
    }).subscribe({
      next: ({ ofertas, planes }) => {
        this.ofertasServicio.set(ofertas);
        this.planesServicio.set(planes);
        this.cargandoCatalogosServicio.set(false);
        this.cargaCatalogosServicio = undefined;
      },
      error: (e) => {
        this.cargandoCatalogosServicio.set(false);
        this.errorCatalogosServicio.set(this.mensajeErrorCatalogosServicio(e));
        this.cargaCatalogosServicio = undefined;
      },
    });
  }

  private construirNuevaDireccion(): NuevaDireccionContratoRequest | null {
    const direccionTexto = this.nuevaDireccionTexto().trim();
    if (!direccionTexto) {
      this.errorServicio.set('La dirección nueva es obligatoria para este servicio.');
      return null;
    }

    const latitudTexto = this.nuevaDireccionLatitud().trim();
    const longitudTexto = this.nuevaDireccionLongitud().trim();
    const latitud = latitudTexto ? this.numeroFormulario(latitudTexto) : null;
    const longitud = longitudTexto ? this.numeroFormulario(longitudTexto) : null;
    if (latitudTexto && (latitud == null || latitud < -90 || latitud > 90)) {
      this.errorServicio.set('La latitud debe estar entre -90 y 90.');
      return null;
    }
    if (longitudTexto && (longitud == null || longitud < -180 || longitud > 180)) {
      this.errorServicio.set('La longitud debe estar entre -180 y 180.');
      return null;
    }

    return {
      etiqueta: this.nuevaDireccionEtiqueta().trim() || null,
      direccionTexto,
      referencia: this.nuevaDireccionReferencia().trim() || null,
      latitud,
      longitud,
    };
  }

  private numeroFormulario(valor: string): number | null {
    const numero = Number(valor.trim().replace(',', '.'));
    return Number.isFinite(numero) ? numero : null;
  }

  private esMontoValido(valor: string): boolean {
    return /^\d+(?:[.,]\d{1,2})?$/.test(valor.trim());
  }

  private mensajeErrorCatalogosServicio(e: { status?: number }): string {
    if (e.status === 403) return 'Tu rol no tiene permiso para consultar las ofertas de servicio.';
    if (e.status === 0) return 'No se pudo contactar el gateway para cargar las ofertas.';
    return 'No se pudieron cargar las ofertas y planes disponibles. Inténtalo nuevamente.';
  }

  private mensajeErrorServicio(e: {
    status?: number;
    error?: { detail?: string; detalle?: string; mensaje?: string };
  }): string {
    if (e.status === 400 || e.status === 422) {
      return e.error?.detail ?? e.error?.detalle ?? e.error?.mensaje ?? 'Revisa los datos del servicio.';
    }
    if (e.status === 403) return 'Tu rol no tiene permiso para agregar servicios.';
    if (e.status === 404) return 'El cliente, la oferta o el plan ya no existen. Recarga la ficha.';
    if (e.status === 0) return 'No se pudo contactar el gateway para registrar el servicio.';
    return 'No se pudo registrar el servicio. Inténtalo nuevamente.';
  }

  abrirIdentificacion() {
    const det = this.detalle();
    if (!det?.tieneIdentificacion || this.cargandoIdentificacion()) return;

    this.cargaIdentificacion?.unsubscribe();
    this.liberarVistaIdentificacion();
    this.modalIdentificacion.set(true);
    this.cargandoIdentificacion.set(true);
    this.errorIdentificacion.set(null);

    this.cargaIdentificacion = this.clientesService.obtenerIdentificacion(det.codigo).subscribe({
      next: (archivo) => {
        this.urlIdentificacion.set(URL.createObjectURL(archivo));
        this.tipoArchivoIdentificacion.set(archivo.type || 'application/octet-stream');
        this.cargandoIdentificacion.set(false);
        this.cargaIdentificacion = undefined;
      },
      error: (e) => {
        this.errorIdentificacion.set(this.mensajeErrorIdentificacion(e));
        this.cargandoIdentificacion.set(false);
        this.cargaIdentificacion = undefined;
      },
    });
  }

  cerrarIdentificacion() {
    this.cargaIdentificacion?.unsubscribe();
    this.cargaIdentificacion = undefined;
    this.cargandoIdentificacion.set(false);
    this.modalIdentificacion.set(false);
    this.errorIdentificacion.set(null);
    this.liberarVistaIdentificacion();
  }

  ngOnDestroy() {
    this.cargaIdentificacion?.unsubscribe();
    this.cargaCatalogosServicio?.unsubscribe();
    this.altaServicio?.unsubscribe();
    this.liberarVistaIdentificacion();
  }

  private liberarVistaIdentificacion() {
    const url = this.urlIdentificacion();
    if (url) URL.revokeObjectURL(url);
    this.urlIdentificacion.set(null);
    this.tipoArchivoIdentificacion.set(null);
  }

  private mensajeErrorIdentificacion(e: { status?: number }): string {
    if (e.status === 404) return 'Este cliente aún no tiene una identificación adjunta.';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver la identificación.';
    if (e.status === 0) return 'No se pudo contactar el gateway para recuperar la identificación.';
    return 'No se pudo cargar la identificación. Inténtalo de nuevo.';
  }

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }

  /** dd/mm/aaaa a partir de un ISO; reutiliza el formateador interno. */
  fecha(iso: string | null): string {
    return this.fmt(iso);
  }

  iniciales(nombre: string): string {
    const p = nombre.replace(/(Cía\.|Ltda\.|S\.A\.)/g, '').trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
  }

  /* ---------- Derivación de la vista desde datos reales ---------- */
  private armarVista(det: ClienteDetalle) {
    // Los contratos llegan ordenados por fecha de alta desc: el primero es el vigente.
    const principal =
      det.contratos.find((contrato) => contrato.usaRed && contrato.estadoServicio !== 'RETIRADO') ??
      det.contratos.find((contrato) => contrato.estadoServicio !== 'RETIRADO') ??
      det.contratos.find((contrato) => contrato.usaRed) ??
      det.contratos[0] ??
      null;
    const estado = (principal?.estadoServicio ?? 'PENDIENTE') as EstadoCliente;
    const red = principal?.red ?? null;

    const servicios = det.contratos.map((c) => ({
      id: c.codigo,
      servicio: c.ofertaNombre,
      tipo: c.tipoServicioNombre,
      plan: c.plan,
      velocidad: c.velocidad,
      modalidad: c.modalidadCobro,
      direccion: c.direccion?.direccionTexto ?? 'Sin dirección asociada',
      requiereInstalacion: c.requiereInstalacion,
      estado: c.estadoServicio as EstadoCliente,
      fechaInicio: this.fmt(c.fechaAlta),
      precio: c.precioAcordado,
    }));

    const valorTotal = det.contratos
      .filter((c) => c.estadoServicio !== 'RETIRADO' && c.modalidadCobro === 'RECURRENTE')
      .reduce((s, c) => s + (c.precioAcordado ?? 0), 0);

    return {
      base: {
        nombre: det.nombre,
        esEmpresa: det.tipoCliente === 'EMPRESA',
        codigo: det.codigo,
        tipoId: det.tipoIdentificacion === 'RUC' ? 'RUC' : 'CÉDULA',
        identificacion: det.identificacion,
        telefono: det.telefono ?? '—',
        direccion: det.direccionPrincipal?.direccionTexto ?? '—',
        fechaRegistro: this.fmt(det.fechaRegistro),
        tieneIdentificacion: det.tieneIdentificacion,
        servicio: principal?.ofertaNombre ?? '—',
        plan: principal?.plan ?? null,
        velocidad: principal?.velocidad ?? '',
        estado,
        // Habilita «Ver contrato»; nulo si el cliente aún no tiene ninguno.
        contratoCodigo: principal?.codigo ?? null,
      },
      email: det.email ?? '—',
      grupo: det.tipoCliente === 'EMPRESA' ? 'Corporativo' : 'Residencial',
      // Datos de red reales (identidad_red); lo que no tenemos queda en "—".
      tecnologia: red ? red.tipoConexion : '—',
      ipUsuario: red?.ipAsignada ?? red?.pppoeUsuario ?? '—',
      perfilRed: red?.perfilRadiusActual ?? '—',
      sincronizado: red?.sincronizadoRed ?? false,
      olt: '—',
      puertoOnu: '—',
      uptime: '—',
      conectado: estado === 'ACTIVO',
      estadoConexion: this.estadoConexion(estado),
      // Facturación: no vive en MS-CONTRATOS. Solo mostramos la mensualidad (suma de planes).
      valorTotal,
      servicios,
    };
  }

  private estadoConexion(estado: EstadoCliente): { texto: string; tono: string } {
    switch (estado) {
      case 'ACTIVO':
        return { texto: 'CONECTADO', tono: 'ok' };
      case 'SUSPENDIDO':
        return { texto: 'SUSPENDIDO', tono: 'warn' };
      case 'CORTADO':
        return { texto: 'DESCONECTADO', tono: 'danger' };
      case 'RETIRADO':
        return { texto: 'RETIRADO', tono: 'neutral' };
      default:
        return { texto: 'POR INSTALAR', tono: 'info' };
    }
  }

  /** ISO (instante o fecha) a dd/mm/aaaa. */
  private fmt(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }

  /* ---------- Editar cliente (modal) ---------- */
  readonly modalEditar = signal(false);
  readonly guardandoEditar = signal(false);
  readonly errorEditar = signal<string | null>(null);
  /** El tipo no se edita aquí: decide qué campos de nombre se piden. */
  readonly editEsEmpresa = computed(() => this.detalle()?.tipoCliente === 'EMPRESA');

  readonly edNombres = signal('');
  readonly edApellidos = signal('');
  readonly edRazonSocial = signal('');
  readonly edEmail = signal('');
  readonly edTelefono = signal('');
  readonly edWhatsapp = signal('');

  abrirEditar() {
    const det = this.detalle();
    if (!det) return;
    this.errorEditar.set(null);
    this.edNombres.set(det.nombres ?? '');
    this.edApellidos.set(det.apellidos ?? '');
    this.edRazonSocial.set(det.razonSocial ?? '');
    this.edEmail.set(det.email ?? '');
    this.edTelefono.set(det.telefono ?? '');
    this.edWhatsapp.set(det.whatsapp ?? '');
    this.modalEditar.set(true);
  }

  cerrarEditar() {
    if (this.guardandoEditar()) return;
    this.modalEditar.set(false);
  }

  guardarEditar() {
    const det = this.detalle();
    if (!det) return;

    if (this.editEsEmpresa()) {
      if (!this.edRazonSocial().trim()) {
        this.errorEditar.set('La razón social es obligatoria para una empresa.');
        return;
      }
    } else if (!this.edNombres().trim()) {
      this.errorEditar.set('Los nombres son obligatorios para una persona.');
      return;
    }

    const req: EditarClienteRequest = {
      nombres: this.editEsEmpresa() ? null : this.edNombres().trim() || null,
      apellidos: this.editEsEmpresa() ? null : this.edApellidos().trim() || null,
      razonSocial: this.editEsEmpresa() ? this.edRazonSocial().trim() || null : null,
      email: this.edEmail().trim() || null,
      telefono: this.edTelefono().trim() || null,
      whatsapp: this.edWhatsapp().trim() || null,
    };

    this.guardandoEditar.set(true);
    this.errorEditar.set(null);
    this.clientesService.editar(det.codigo, req).subscribe({
      next: () => {
        this.guardandoEditar.set(false);
        this.modalEditar.set(false);
        this.recargar.update((n) => n + 1); // refresca la ficha con los datos nuevos
      },
      error: (e) => {
        this.guardandoEditar.set(false);
        this.errorEditar.set(this.mensajeEditar(e));
      },
    });
  }

  private mensajeEditar(e: { status?: number; error?: { mensaje?: string } }): string {
    if (e.status === 400) return e.error?.mensaje ?? 'Revisa los datos: hay algún campo inválido.';
    if (e.status === 404) return 'El cliente ya no existe; recarga la página.';
    if (e.status === 403) return 'Tu rol no tiene permiso para editar clientes.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo guardar la edición. Inténtalo de nuevo.';
  }
}
