import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { AuthService } from '../../core/services/auth.service';
import { InventarioService } from '../../core/services/inventario.service';
import { ComprasService } from '../../core/services/compras.service';
import {
  CategoriaMaterial,
  Material,
  TipoEquipo,
  Ubicacion,
  UnidadMedida,
} from '../../core/models/inventario.model';
import {
  Compra,
  ConsultaCompras,
  DestinoCompra,
  EstadoCompra,
  OrigenCompra,
  PreviaCompra,
  Proveedor,
  ProveedorArticulo,
  RegistrarCompraLinea,
  SerieEquipo,
  TIPOS_PROVEEDOR,
  TIPO_PROVEEDOR_AYUDA,
  TIPO_PROVEEDOR_ETIQUETA,
  TipoProveedor,
} from '../../core/models/compras.model';

/**
 * Una línea de la compra mientras el operador la revisa: ya no es lo que dijo el
 * XML —ni lo que hay en el papel—, todavía no es lo que se guardará. Cada campo
 * editable de la pantalla vive aquí.
 */
interface LineaEditable {
  // --- Lo que trajo la factura. Inmutable al importar un XML, porque es la
  //     prueba de qué se compró; editable al teclear, porque ahí lo escribe una
  //     persona mirando el papel.
  codigoProveedor: string | null;
  descripcionOriginal: string;
  cantidad: number;
  costoUnitario: number;

  // --- Lo que decide el operador ---
  incluir: boolean;
  destino: DestinoCompra;
  nombre: string;
  precioVenta: number;
  materialId: number | null;
  unidad: UnidadMedida;
  categoria: CategoriaMaterial;
  tipoEquipo: TipoEquipo;
  marca: string;
  modelo: string;
  series: SerieEquipo[];
  compradoAntes: boolean;
}

/** Cómo se está registrando una compra, o `null` si solo se está mirando el historial. */
type ModoRegistro = 'xml' | 'manual';

/**
 * Dónde acabará cada línea dentro de Inventario. Son exactamente sus tres
 * pestañas de existencias, y no una clasificación paralela: quien recibe la
 * mercadería piensa en «esto va a equipos» o «esto va a productos», no en un
 * destino y una categoría por separado.
 *
 * Por debajo siguen siendo dos campos, porque es lo que el backend distingue —
 * un equipo se rastrea unidad por unidad y un material por cantidad—, pero esa
 * es una diferencia de implementación que no tiene por qué asomar a la pantalla.
 */
type Clasificacion = 'EQUIPO' | 'MATERIAL' | 'PRODUCTO';

const CLASIFICACIONES: {
  valor: Clasificacion;
  etiqueta: string;
  pestana: string;
  ayuda: string;
}[] = [
  {
    valor: 'EQUIPO',
    etiqueta: 'Equipo',
    pestana: 'Equipos',
    ayuda: 'Se rastrea unidad por unidad: routers, ONT, antenas. Cada una con su serie.',
  },
  {
    valor: 'MATERIAL',
    etiqueta: 'Material de instalación',
    pestana: 'Stock de materiales',
    ayuda: 'Se mide por cantidad y se consume en instalaciones: cable, conectores, amarras.',
  },
  {
    valor: 'PRODUCTO',
    etiqueta: 'Producto de venta',
    pestana: 'Productos',
    ayuda: 'Se vende en mostrador: cámaras, accesorios, tinta. Necesita precio para poder venderse.',
  },
];

const TIPOS_EQUIPO: TipoEquipo[] = [
  'ROUTER', 'ONT', 'ONU', 'SWITCH', 'ANTENA', 'SPLITTER', 'OTRO',
];
const UNIDADES: UnidadMedida[] = ['UNIDAD', 'METRO', 'ROLLO', 'CAJA'];

/**
 * Compras: qué se le compró a cada proveedor, cuándo y a qué precio.
 *
 * El registro de una compra es el corazón del módulo y tiene dos caminos que
 * terminan en el mismo sitio. Con XML, el sistema lee la factura y propone; a
 * mano, lo escribe una persona mirando una nota de venta. En ambos casos el
 * operador corrige nombres, decide qué es equipo y qué material, y fija el
 * precio de venta. Solo al confirmar se toca el inventario.
 *
 * Los proveedores viven aquí, en pestañas propias, porque son el soporte de la
 * compra y no al revés: interesan por lo que venden y a cómo lo venden.
 */
@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './compras.html',
  styleUrls: ['../clientes/clientes.scss', './compras.scss'],
})
export class ComprasComponent {
  private readonly api = inject(ComprasService);
  private readonly inventario = inject(InventarioService);
  private readonly auth = inject(AuthService);

  readonly tiposEquipo = TIPOS_EQUIPO;
  readonly unidades = UNIDADES;
  readonly tiposProveedor = TIPOS_PROVEEDOR;
  readonly tipoProveedorEtq = TIPO_PROVEEDOR_ETIQUETA;
  readonly tipoProveedorAyuda = TIPO_PROVEEDOR_AYUDA;

  /** Solo ADMIN registra y anula compras (ver la matriz del monolito). */
  readonly puedeEditar = computed(() => this.auth.tieneRol('ADMINISTRADOR'));

  readonly tabActiva = signal<0 | 1 | 2>(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly consulta = signal<ConsultaCompras | null>(null);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly catalogo = signal<ProveedorArticulo[]>([]);
  readonly materiales = signal<Material[]>([]);
  readonly ubicaciones = signal<Ubicacion[]>([]);

  /** Buscador de las pestañas de proveedores y catálogo (el historial tiene el suyo). */
  readonly q = signal('');

  constructor() {
    this.cargarCompras();
    this.cargarProveedores();
  }

  setTab(i: 0 | 1 | 2) {
    this.tabActiva.set(i);
    this.q.set('');
    if (i === 2 && this.catalogo().length === 0) this.cargarCatalogo();
  }

  /* ================= Historial de compras ================= */

  readonly fDesde = signal('');
  readonly fHasta = signal('');
  readonly fProveedor = signal<number | null>(null);
  readonly fEstado = signal<EstadoCompra | null>(null);
  readonly fTexto = signal('');

  cargarCompras() {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar({
        proveedorId: this.fProveedor(),
        desde: this.fDesde() || null,
        hasta: this.fHasta() || null,
        estado: this.fEstado(),
        q: this.fTexto(),
      })
      .subscribe({
        next: (c) => {
          this.consulta.set(c);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(this.mensaje(e));
          this.cargando.set(false);
        },
      });
  }

  limpiarFiltros() {
    this.fDesde.set('');
    this.fHasta.set('');
    this.fProveedor.set(null);
    this.fEstado.set(null);
    this.fTexto.set('');
    this.cargarCompras();
  }

  readonly compras = computed(() => this.consulta()?.compras ?? []);

  private cargarProveedores() {
    this.api.proveedores().subscribe({
      next: (p) => this.proveedores.set(p),
      error: (e) => this.error.set(this.mensaje(e)),
    });
  }

  private cargarCatalogo() {
    this.api.catalogoCompleto().subscribe({
      next: (a) => this.catalogo.set(a),
      error: (e) => this.error.set(this.mensaje(e)),
    });
  }

  /** Los catálogos que necesita cualquiera de los dos caminos de registro. */
  private cargarCatalogosDeInventario() {
    this.inventario.listarMateriales().subscribe({
      next: (m) => {
        this.materiales.set(m);
        this.sincronizarConCatalogo();
      },
      error: () => this.materiales.set([]),
    });
    this.inventario.listarUbicaciones().subscribe({
      next: (u) => {
        this.ubicaciones.set(u);
        const bodega = u.find((x) => x.tipo === 'BODEGA' && x.activa);
        if (bodega && this.ubicacionSel() == null) this.ubicacionSel.set(bodega.id);
      },
      error: () => this.ubicaciones.set([]),
    });
  }

  /* ================= Detalle de una compra ================= */

  readonly compraAbierta = signal<Compra | null>(null);
  readonly cargandoDetalle = signal(false);

  abrirDetalle(c: Compra) {
    this.cargandoDetalle.set(true);
    this.compraAbierta.set(c); // se muestra la cabecera ya conocida mientras llegan las líneas
    this.api.detalle(c.id).subscribe({
      next: (completa) => {
        this.compraAbierta.set(completa);
        this.cargandoDetalle.set(false);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  cerrarDetalle() {
    this.compraAbierta.set(null);
    this.errorAnulacion.set(null);
    this.motivoAnulacion.set('');
    this.pidiendoAnular.set(false);
  }

  /* ================= Anulación ================= */

  readonly pidiendoAnular = signal(false);
  readonly motivoAnulacion = signal('');
  readonly anulando = signal(false);
  readonly errorAnulacion = signal<string | null>(null);

  pedirAnular() {
    this.motivoAnulacion.set('');
    this.errorAnulacion.set(null);
    this.pidiendoAnular.set(true);
  }

  confirmarAnular() {
    const compra = this.compraAbierta();
    if (!compra) return;
    if (!this.motivoAnulacion().trim()) {
      this.errorAnulacion.set('Escribe por qué se anula: es lo único que lo explicará dentro de un mes.');
      return;
    }

    this.anulando.set(true);
    this.errorAnulacion.set(null);
    this.api.anular(compra.id, this.motivoAnulacion().trim()).subscribe({
      next: (anulada) => {
        this.anulando.set(false);
        this.pidiendoAnular.set(false);
        this.compraAbierta.set(anulada);
        this.aviso.set(`Compra ${anulada.numeroDocumento} anulada: su mercadería salió del inventario.`);
        this.cargarCompras();
      },
      error: (e) => {
        this.anulando.set(false);
        this.errorAnulacion.set(this.mensaje(e));
      },
    });
  }

  /* ================= Registro: los dos caminos ================= */

  readonly modo = signal<ModoRegistro | null>(null);
  readonly previa = signal<PreviaCompra | null>(null);
  readonly lineas = signal<LineaEditable[]>([]);
  readonly leyendo = signal(false);
  readonly registrando = signal(false);
  readonly errorFactura = signal<string | null>(null);
  readonly ubicacionSel = signal<number | null>(null);
  /** Margen que se aplica de golpe a todas las líneas; cada una se puede retocar. */
  readonly margen = signal(30);

  // Cabecera cuando se teclea (con XML viene toda de la previa).
  readonly mProveedorId = signal<number | null>(null);
  readonly mNumero = signal('');
  readonly mFecha = signal(new Date().toISOString().slice(0, 10));
  readonly mIva = signal(0);
  readonly mObservacion = signal('');

  empezarXml() {
    this.modo.set('xml');
    this.previa.set(null);
    this.lineas.set([]);
    this.errorFactura.set(null);
    this.cargarCatalogosDeInventario();
  }

  empezarManual() {
    this.modo.set('manual');
    this.previa.set(null);
    this.errorFactura.set(null);
    this.mProveedorId.set(null);
    this.mNumero.set('');
    this.mFecha.set(new Date().toISOString().slice(0, 10));
    this.mIva.set(0);
    this.mObservacion.set('');
    this.lineas.set([this.lineaEnBlanco()]);
    this.cargarCatalogosDeInventario();
  }

  cancelarRegistro() {
    this.modo.set(null);
    this.previa.set(null);
    this.lineas.set([]);
    this.errorFactura.set(null);
  }

  onArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.leyendo.set(true);
    this.errorFactura.set(null);
    this.previa.set(null);
    this.lineas.set([]);

    this.api.previsualizarFactura(archivo).subscribe({
      next: (p) => {
        this.previa.set(p);
        this.lineas.set(p.lineas.map((l) => this.aEditable(l)));
        this.sincronizarConCatalogo();
        this.leyendo.set(false);
        input.value = ''; // permite volver a subir el mismo archivo tras corregir
      },
      error: (e) => {
        this.errorFactura.set(this.mensaje(e));
        this.leyendo.set(false);
        input.value = '';
      },
    });
  }

  /**
   * Propone: el nombre del proveedor como punto de partida, material por
   * defecto (lo más común), y el precio con el margen aplicado sobre el costo
   * real de la factura.
   */
  private aEditable(l: PreviaCompra['lineas'][number]): LineaEditable {
    return {
      codigoProveedor: l.codigoProveedor,
      descripcionOriginal: l.descripcion,
      cantidad: l.cantidad,
      costoUnitario: l.costoUnitario,
      incluir: true,
      destino: 'MATERIAL',
      nombre: l.materialSugeridoNombre ?? this.aTitulo(l.descripcion),
      precioVenta: this.conMargen(l.costoUnitario, this.margen()),
      materialId: l.materialSugeridoId,
      unidad: 'UNIDAD',
      categoria: 'INSTALACION',
      tipoEquipo: 'ROUTER',
      marca: '',
      modelo: '',
      series: [],
      compradoAntes: l.compradoAntes,
    };
  }

  private lineaEnBlanco(): LineaEditable {
    return {
      codigoProveedor: null,
      descripcionOriginal: '',
      cantidad: 1,
      costoUnitario: 0,
      incluir: true,
      destino: 'MATERIAL',
      nombre: '',
      precioVenta: 0,
      materialId: null,
      unidad: 'UNIDAD',
      categoria: 'INSTALACION',
      tipoEquipo: 'ROUTER',
      marca: '',
      modelo: '',
      series: [],
      compradoAntes: false,
    };
  }

  agregarLinea() {
    this.lineas.update((ls) => [...ls, this.lineaEnBlanco()]);
  }

  quitarLinea(i: number) {
    this.lineas.update((ls) => ls.filter((_, idx) => idx !== i));
  }

  /** Las facturas vienen EN MAYÚSCULAS; así el catálogo no queda a gritos. */
  private aTitulo(texto: string): string {
    return texto
      .toLowerCase()
      .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
      .trim();
  }

  private conMargen(costo: number, porcentaje: number): number {
    return Math.round(costo * (1 + porcentaje / 100) * 100) / 100;
  }

  /** Reaplica el margen a todas las líneas: el uso normal es un margen común. */
  aplicarMargen() {
    const m = this.margen();
    this.lineas.update((ls) =>
      ls.map((l) => ({ ...l, precioVenta: this.conMargen(l.costoUnitario, m) })),
    );
  }

  actualizar(i: number, cambios: Partial<LineaEditable>) {
    this.lineas.update((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));
  }

  /* ---------- Clasificación: a qué pestaña de Inventario va cada línea ---------- */

  readonly clasificaciones = CLASIFICACIONES;

  clasificacionDe(l: LineaEditable): Clasificacion {
    if (l.destino === 'EQUIPO') return 'EQUIPO';
    return l.categoria === 'VENTA' ? 'PRODUCTO' : 'MATERIAL';
  }

  /** El nombre de la pestaña donde aparecerá, para decirlo sin que haya que deducirlo. */
  pestanaDe(l: LineaEditable): string {
    const c = this.clasificacionDe(l);
    return CLASIFICACIONES.find((x) => x.valor === c)!.pestana;
  }

  ayudaDe(l: LineaEditable): string {
    const c = this.clasificacionDe(l);
    return CLASIFICACIONES.find((x) => x.valor === c)!.ayuda;
  }

  /**
   * Al pasar a equipo se preparan tantas filas de serie como unidades haya, y se
   * suelta el artículo elegido: un equipo no se suma a una fila del catálogo,
   * crea unidades propias.
   *
   * Al cambiar entre material y producto se suelta también el artículo si el que
   * estaba elegido pertenece a la otra pestaña — si no, el desplegable mostraría
   * seleccionado algo que su propio filtro ya no incluye.
   */
  cambiarClasificacion(i: number, clasificacion: Clasificacion) {
    const linea = this.lineas()[i];
    const destino: DestinoCompra = clasificacion === 'EQUIPO' ? 'EQUIPO' : 'MATERIAL';
    const categoria: CategoriaMaterial = clasificacion === 'PRODUCTO' ? 'VENTA' : 'INSTALACION';

    const elegido = this.materiales().find((m) => m.id === linea.materialId);
    const sigueValiendo =
      clasificacion !== 'EQUIPO' && elegido != null && elegido.categoria === categoria;

    this.actualizar(i, {
      destino,
      categoria,
      materialId: sigueValiendo ? linea.materialId : null,
      series: this.seriesPara(linea, destino),
    });
  }

  /** Los artículos que caben en esta línea: solo los de la pestaña que se eligió. */
  materialesPara(l: LineaEditable): Material[] {
    const categoria: CategoriaMaterial = this.clasificacionDe(l) === 'PRODUCTO' ? 'VENTA' : 'INSTALACION';
    return this.materiales().filter((m) => m.categoria === categoria && m.activo);
  }

  /**
   * Elegir un artículo existente adopta su unidad de medida. Su categoría no se
   * toca —la línea ya está clasificada en la pestaña de ese artículo, porque el
   * desplegable solo ofrece los de ahí—, y una compra no debería mover un
   * artículo de pestaña por un descuido: eso se hace en Inventario, a conciencia.
   */
  elegirMaterial(i: number, materialId: number | null) {
    const material = this.materiales().find((m) => m.id === materialId);
    this.actualizar(i, {
      materialId,
      unidad: material ? material.unidad : this.lineas()[i].unidad,
    });
  }

  /**
   * Reconcilia lo propuesto por el backend con el catálogo real. El XML sugiere
   * un artículo por el historial del proveedor, pero no dice en qué pestaña vive;
   * si es un producto de venta, la línea tiene que nacer clasificada como tal en
   * vez de caer en material de instalación por omisión.
   *
   * Se llama tanto al leer la factura como al llegar el catálogo, porque las dos
   * peticiones van en paralelo y cualquiera de las dos puede terminar antes.
   */
  private sincronizarConCatalogo() {
    if (this.materiales().length === 0) return;
    this.lineas.update((ls) =>
      ls.map((l) => {
        if (l.destino !== 'MATERIAL' || l.materialId == null) return l;
        const material = this.materiales().find((m) => m.id === l.materialId);
        if (!material) return { ...l, materialId: null }; // se dio de baja entre medias
        return { ...l, categoria: material.categoria, unidad: material.unidad };
      }),
    );
  }

  /** Cuántas líneas irán a cada pestaña, para verlo antes de confirmar. */
  readonly reparto = computed(() => {
    const incluidas = this.lineas().filter((l) => l.incluir);
    return CLASIFICACIONES.map((c) => ({
      etiqueta: c.pestana,
      cuantas: incluidas.filter((l) => this.clasificacionDe(l) === c.valor).length,
    })).filter((r) => r.cuantas > 0);
  });

  cambiarCantidad(i: number, cantidad: number) {
    const linea = { ...this.lineas()[i], cantidad };
    this.actualizar(i, { cantidad, series: this.seriesPara(linea, linea.destino) });
  }

  private seriesPara(linea: LineaEditable, destino: DestinoCompra): SerieEquipo[] {
    if (destino !== 'EQUIPO') return linea.series;
    const unidades = Math.max(0, Math.trunc(linea.cantidad));
    if (linea.series.length === unidades) return linea.series;
    // Se conservan las series ya escritas y solo se ajusta el número de filas:
    // cambiar la cantidad no debe borrar lo que alguien acaba de teclear.
    return Array.from({ length: unidades }, (_, i) =>
      linea.series[i] ?? { numeroSerie: '', macAddress: null },
    );
  }

  actualizarSerie(i: number, s: number, campo: 'numeroSerie' | 'macAddress', valor: string) {
    this.lineas.update((ls) =>
      ls.map((l, idx) => {
        if (idx !== i) return l;
        const series = l.series.map((serie, sIdx) =>
          sIdx === s ? { ...serie, [campo]: campo === 'macAddress' ? valor || null : valor } : serie,
        );
        return { ...l, series };
      }),
    );
  }

  /** Margen real de una línea, para ver si el precio puesto tiene sentido. */
  margenDe(l: LineaEditable): number {
    if (!l.costoUnitario) return 0;
    return Math.round(((l.precioVenta - l.costoUnitario) / l.costoUnitario) * 100);
  }

  readonly subtotalIncluido = computed(() =>
    this.lineas()
      .filter((l) => l.incluir)
      .reduce((s, l) => s + l.cantidad * l.costoUnitario, 0),
  );

  /**
   * Lo que se acabará registrando como total, para que no haya sorpresas al
   * guardar.
   *
   * No hay campo de descuento global a propósito. El costo unitario de cada
   * línea es lo que de verdad se pagó por esa unidad —ya rebajado— y de ahí sale
   * el costo del artículo en el catálogo y su margen. Un descuento aparte
   * obligaría a repartirlo entre las líneas para que esos costos siguieran
   * siendo ciertos, y si no se repartiera dejaría el catálogo creyendo que todo
   * costó más de lo que costó. Es la misma convención con la que ya se leen los
   * XML, donde cada línea llega neta de su descuento.
   */
  readonly totalManual = computed(() => this.subtotalIncluido() + Number(this.mIva() || 0));

  readonly seriesFaltantes = computed(() =>
    this.lineas()
      .filter((l) => l.incluir && l.destino === 'EQUIPO')
      .reduce(
        (s, l) =>
          s + Math.max(0, Math.trunc(l.cantidad) - l.series.filter((x) => x.numeroSerie.trim()).length),
        0,
      ),
  );

  registrarCompra() {
    const incluidas = this.lineas().filter((l) => l.incluir);
    const problema = this.validar(incluidas);
    if (problema) {
      this.errorFactura.set(problema);
      return;
    }

    const p = this.previa();
    const manual = this.modo() === 'manual';
    const proveedor = manual
      ? this.proveedores().find((x) => x.id === this.mProveedorId())!
      : null;

    const origen: OrigenCompra = manual ? 'MANUAL' : 'XML';
    const request = {
      proveedorId: manual ? proveedor!.id : p!.proveedorId,
      ruc: manual ? proveedor!.ruc : p!.ruc,
      razonSocial: manual ? proveedor!.razonSocial : p!.razonSocial,
      nombreComercial: manual ? proveedor!.nombreComercial : p!.nombreComercial,
      origen,
      numeroDocumento: manual ? this.mNumero().trim() : p!.numeroDocumento,
      claveAcceso: manual ? null : p!.claveAcceso,
      fechaEmision: manual ? this.mFecha() : p!.fechaEmision,
      subtotal: manual ? this.redondear(this.subtotalIncluido()) : p!.subtotal,
      descuento: manual ? 0 : p!.descuento,
      valorIva: manual ? Number(this.mIva() || 0) : p!.valorIva,
      total: manual ? this.redondear(this.totalManual()) : p!.total,
      ubicacionId: this.ubicacionSel()!,
      observacion: manual ? this.mObservacion().trim() || null : null,
      lineas: incluidas.map((l): RegistrarCompraLinea => ({
        destino: l.destino,
        codigoProveedor: l.codigoProveedor,
        descripcion: l.descripcionOriginal.trim(),
        cantidad: l.cantidad,
        costoUnitario: l.costoUnitario,
        precioVenta: l.precioVenta,
        materialId: l.destino === 'MATERIAL' ? l.materialId : null,
        nombre: l.destino === 'MATERIAL' ? l.nombre.trim() : null,
        unidad: l.destino === 'MATERIAL' ? l.unidad : null,
        categoria: l.destino === 'MATERIAL' ? l.categoria : null,
        tipoEquipo: l.destino === 'EQUIPO' ? l.tipoEquipo : null,
        marca: l.destino === 'EQUIPO' ? l.marca.trim() : null,
        modelo: l.destino === 'EQUIPO' ? l.modelo.trim() : null,
        series:
          l.destino === 'EQUIPO'
            ? l.series.map((s) => ({
                numeroSerie: s.numeroSerie.trim(),
                macAddress: s.macAddress?.trim() || null,
              }))
            : null,
      })),
    };

    this.registrando.set(true);
    this.errorFactura.set(null);
    this.api.registrar(request).subscribe({
      next: (c) => {
        this.registrando.set(false);
        this.cancelarRegistro();
        this.aviso.set(
          `Compra ${c.numeroDocumento} registrada: ${c.lineas.length} artículo(s) ingresados al inventario.`,
        );
        this.catalogo.set([]); // se recargará al abrir su pestaña, ya con esta compra
        this.cargarCompras();
        this.cargarProveedores();
      },
      error: (e) => {
        this.registrando.set(false);
        this.errorFactura.set(this.mensaje(e));
      },
    });
  }

  private redondear(v: number): number {
    return Math.round(v * 100) / 100;
  }

  private validar(lineas: LineaEditable[]): string | null {
    if (this.modo() === 'xml') {
      if (this.previa()?.yaRegistrada) return this.previa()!.yaRegistrada;
    } else {
      if (this.mProveedorId() == null) return 'Elige a quién se le compró.';
      if (!this.mNumero().trim()) return 'Escribe el número del documento (factura o nota de venta).';
      if (!this.mFecha()) return 'Indica la fecha del documento.';
    }
    if (lineas.length === 0) return 'Marca al menos un artículo para ingresar.';
    if (this.ubicacionSel() == null) return 'Elige a qué bodega entra la mercadería.';

    for (const l of lineas) {
      if (!l.descripcionOriginal.trim()) return 'Hay una línea sin descripción.';
      if (!(l.cantidad > 0)) return `«${l.descripcionOriginal}»: la cantidad tiene que ser mayor que cero.`;

      if (l.destino === 'MATERIAL') {
        if (l.materialId == null && !l.nombre.trim()) {
          return `«${l.descripcionOriginal}»: ponle un nombre o elige un artículo existente.`;
        }
        continue;
      }
      if (!l.marca.trim() || !l.modelo.trim()) {
        return `«${l.descripcionOriginal}»: un equipo necesita marca y modelo.`;
      }
      const puestas = l.series.filter((s) => s.numeroSerie.trim()).length;
      if (puestas !== Math.trunc(l.cantidad)) {
        return `«${l.descripcionOriginal}»: faltan series (${puestas} de ${Math.trunc(l.cantidad)}).`;
      }
    }
    return null;
  }

  /* ================= Proveedores ================= */

  readonly proveedoresFiltrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.proveedores();
    return this.proveedores().filter((p) =>
      `${p.razonSocial} ${p.ruc} ${p.nombreComercial ?? ''} ${this.tipoProveedorEtq[p.tipo]}`
        .toLowerCase()
        .includes(term),
    );
  });

  readonly catalogoFiltrado = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.catalogo();
    return this.catalogo().filter((a) =>
      `${a.descripcion} ${a.codigoProveedor} ${a.proveedorRazonSocial}`.toLowerCase().includes(term),
    );
  });

  readonly modalProveedor = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly fRuc = signal('');
  readonly fRazon = signal('');
  readonly fComercial = signal('');
  readonly fTipo = signal<TipoProveedor>('DISTRIBUIDOR');
  readonly fDireccion = signal('');
  readonly fTelefono = signal('');
  readonly fEmail = signal('');
  readonly fContacto = signal('');
  readonly fObservacion = signal('');

  abrirNuevo() {
    this.editandoId.set(null);
    this.fRuc.set('');
    this.fRazon.set('');
    this.fComercial.set('');
    this.fTipo.set('DISTRIBUIDOR');
    this.fDireccion.set('');
    this.fTelefono.set('');
    this.fEmail.set('');
    this.fContacto.set('');
    this.fObservacion.set('');
    this.error.set(null);
    this.modalProveedor.set(true);
  }

  abrirEditar(p: Proveedor) {
    this.editandoId.set(p.id);
    this.fRuc.set(p.ruc);
    this.fRazon.set(p.razonSocial);
    this.fComercial.set(p.nombreComercial ?? '');
    this.fTipo.set(p.tipo);
    this.fDireccion.set(p.direccion ?? '');
    this.fTelefono.set(p.telefono ?? '');
    this.fEmail.set(p.email ?? '');
    this.fContacto.set(p.contacto ?? '');
    this.fObservacion.set(p.observacion ?? '');
    this.error.set(null);
    this.modalProveedor.set(true);
  }

  cerrarProveedor() {
    if (this.guardando()) return;
    this.modalProveedor.set(false);
  }

  guardarProveedor() {
    if (!/^\d{10,13}$/.test(this.fRuc().trim())) {
      this.error.set('El RUC debe tener entre 10 y 13 dígitos.');
      return;
    }
    if (!this.fRazon().trim()) {
      this.error.set('La razón social es obligatoria.');
      return;
    }
    const req = {
      ruc: this.fRuc().trim(),
      razonSocial: this.fRazon().trim(),
      nombreComercial: this.fComercial().trim() || null,
      tipo: this.fTipo(),
      direccion: this.fDireccion().trim() || null,
      telefono: this.fTelefono().trim() || null,
      email: this.fEmail().trim() || null,
      contacto: this.fContacto().trim() || null,
      observacion: this.fObservacion().trim() || null,
    };
    this.guardando.set(true);
    this.error.set(null);

    const id = this.editandoId();
    const peticion = id != null ? this.api.editarProveedor(id, req) : this.api.crearProveedor(req);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalProveedor.set(false);
        this.aviso.set(id != null ? 'Proveedor actualizado.' : 'Proveedor creado.');
        this.cargarProveedores();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  alternarActivo(p: Proveedor) {
    this.api.cambiarActivo(p.id, !p.activo).subscribe({
      next: () => this.cargarProveedores(),
      error: (e) => this.error.set(this.mensaje(e)),
    });
  }

  /** Filtra el historial por este proveedor y lleva a la pestaña de compras. */
  verComprasDe(p: Proveedor) {
    this.fProveedor.set(p.id);
    this.tabActiva.set(0);
    this.cargarCompras();
  }

  /* ================= Utilidades ================= */

  moneda(v: number | null | undefined): string {
    return `$${Number(v ?? 0).toFixed(2)}`;
  }

  fecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC');
  }

  private mensaje(e: {
    status?: number;
    error?: { mensaje?: string; message?: string; detail?: string };
  }): string {
    const detalle = e.error?.mensaje ?? e.error?.message ?? e.error?.detail;
    if (e.status === 0) return 'No se pudo contactar el backend.';
    if (e.status === 403) return 'Tu rol no tiene permiso para gestionar compras y proveedores.';
    if (e.status === 400 || e.status === 422) return detalle ?? 'Revisa los datos enviados.';
    if (e.status === 404) return detalle ?? 'No se encontró el recurso.';
    return detalle ?? 'No se pudo completar la operación.';
  }
}
