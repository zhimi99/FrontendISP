import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { CatalogosService, OpcionCatalogo } from '../../core/services/catalogos.service';
import { InventarioService } from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AltaEquipoRequest,
  Equipo,
  EstadoEquipo,
  Existencia,
  Material,
  MaterialBajoStock,
  Movimiento,
  TipoEquipo,
  TipoMovimiento,
  Ubicacion,
  ESTADO_EQUIPO_ETIQUETA,
  ESTADO_EQUIPO_TONO,
  TIPO_MOVIMIENTO_ETIQUETA,
  TIPO_MOVIMIENTO_TONO,
  TIPO_UBICACION_ETIQUETA,
  UNIDAD_ETIQUETA,
} from '../../core/models/inventario.model';

/** Las cuatro operaciones de stock, cada una con su propio POST en el backend. */
type TipoMovimientoUi = 'ingreso' | 'consumo' | 'traslado' | 'ajuste';

/**
 * Inventario sobre datos reales (MS-INVENTARIO). Dos vistas: stock de material
 * (existencias por ubicación) y equipos serializados por estado. La alerta de
 * reposición sale de la vista v_material_bajo_stock del backend.
 */
@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, IconComponent],
  templateUrl: './inventario.html',
  styleUrls: ['../clientes/clientes.scss', './inventario.scss'],
})
export class InventarioComponent {
  private readonly inventario = inject(InventarioService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);

  /** Tipos de equipo del selector: los que admite el backend, no una copia. */
  readonly tiposEquipo = signal<OpcionCatalogo[]>([]);

  /**
   * Nombre de un tipo de equipo para pintarlo en la tabla. Si el catálogo aún no ha
   * llegado, o el equipo trae un tipo recién añadido al dominio, se muestra el código
   * en vez de dejar la celda vacía.
   */
  etiquetaTipoEquipo(codigo: TipoEquipo | string): string {
    return this.tiposEquipo().find((t) => t.codigo === codigo)?.nombre ?? codigo;
  }
  /** Solo TECNICO/ADMIN pueden dar de alta equipos (POST /api/equipos). */
  readonly puedeAltaEquipo = computed(() => this.auth.tieneRol('TECNICO', 'ADMINISTRADOR'));
  /** Mover stock (ingresos, consumos y traslados) es trabajo de campo: TECNICO/ADMIN. */
  readonly puedeMoverStock = computed(() => this.auth.tieneRol('TECNICO', 'ADMINISTRADOR'));
  /**
   * El ajuste hace desaparecer (o aparecer) material sin que salga por una
   * instalación: el backend lo restringe a ADMIN y aquí se refleja igual.
   */
  readonly puedeAjustar = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  /** Aviso del resultado del último movimiento de stock. */
  readonly avisoStock = signal<{ texto: string; error: boolean } | null>(null);

  readonly estadoEquipoEtq = ESTADO_EQUIPO_ETIQUETA;
  readonly estadoEquipoTono = ESTADO_EQUIPO_TONO;
  readonly tipoUbicEtq = TIPO_UBICACION_ETIQUETA;
  readonly unidadEtq = UNIDAD_ETIQUETA;

  readonly materiales = signal<Material[]>([]);
  readonly ubicaciones = signal<Ubicacion[]>([]);
  readonly bajoStock = signal<MaterialBajoStock[]>([]);
  private readonly existencias = signal<Existencia[]>([]);
  readonly equipos = signal<Equipo[]>([]);
  readonly disponiblesTotal = signal(0);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly equiposCargando = signal(false);

  readonly tabActiva = signal<0 | 1 | 2 | 3>(0);

  // Filtros de la pestaña de stock
  readonly qStock = signal('');
  readonly ubicacionFiltro = signal<'' | number>('');

  // Filtros de la pestaña de equipos
  readonly qEquipo = signal('');
  readonly estadoFiltro = signal<EstadoEquipo>('DISPONIBLE');

  // Filtro de la pestaña de productos (el catálogo de materiales, con su precio)
  readonly qProducto = signal('');

  /** materialId de los materiales bajo mínimo, para marcarlos en la tabla de stock. */
  private readonly bajoStockIds = computed(() => new Set(this.bajoStock().map((b) => b.materialId)));

  constructor() {
    this.cargar();
    this.catalogos.tiposEquipo().subscribe((opciones) => this.tiposEquipo.set(opciones));
  }

  /** Carga inicial y refresco tras un movimiento de stock. */
  private cargar() {
    this.cargando.set(true);
    forkJoin({
      materiales: this.inventario.listarMateriales(),
      ubicaciones: this.inventario.listarUbicaciones(),
      bajoStock: this.inventario.bajoStock(),
      existencias: this.inventario.listarExistencias(),
      equipos: this.inventario.listarEquipos({ estado: this.estadoFiltro() }),
    }).subscribe({
      next: (r) => {
        this.materiales.set(r.materiales);
        this.ubicaciones.set(r.ubicaciones);
        this.bajoStock.set(r.bajoStock);
        this.existencias.set(r.existencias);
        this.equipos.set(r.equipos);
        // El KPI cuenta disponibles; si la pestaña mira otro estado, no lo pisa.
        if (this.estadoFiltro() === 'DISPONIBLE') this.disponiblesTotal.set(r.equipos.length);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  setTab(i: 0 | 1 | 2 | 3) {
    this.tabActiva.set(i);
    // El libro solo se pide cuando se mira: es la consulta más pesada de la pantalla.
    if (i === 2 && this.movimientos().length === 0) this.cargarMovimientos();
  }

  /** categoría de cada material, para separar Stock (instalación) de Productos (venta). */
  private readonly categoriaPorMaterial = computed(
    () => new Map(this.materiales().map((m) => [m.id, m.categoria])),
  );

  /* ---------- Stock de material (solo lo que se usa en instalaciones) ---------- */
  readonly existenciasFiltradas = computed(() => {
    const term = this.qStock().trim().toLowerCase();
    const ub = this.ubicacionFiltro();
    const categorias = this.categoriaPorMaterial();
    return this.existencias().filter((e) => {
      if (categorias.get(e.materialId) === 'VENTA') return false;
      if (ub !== '' && e.ubicacionId !== ub) return false;
      if (term) {
        const heno = `${e.codigo} ${e.material}`.toLowerCase();
        if (!heno.includes(term)) return false;
      }
      return true;
    });
  });

  esBajo(materialId: number): boolean {
    return this.bajoStockIds().has(materialId);
  }

  /* ---------- Equipos ---------- */
  readonly equiposFiltrados = computed(() => {
    const term = this.qEquipo().trim().toLowerCase();
    if (!term) return this.equipos();
    return this.equipos().filter((eq) =>
      `${eq.numeroSerie} ${eq.marca} ${eq.modelo}`.toLowerCase().includes(term),
    );
  });

  cambiarEstado(estado: EstadoEquipo) {
    this.estadoFiltro.set(estado);
    this.qEquipo.set('');
    this.equiposCargando.set(true);
    this.inventario.listarEquipos({ estado }).subscribe({
      next: (lista) => {
        this.equipos.set(lista);
        this.equiposCargando.set(false);
      },
      error: (e) => {
        this.equipos.set([]);
        this.error.set(this.mensajeDeError(e));
        this.equiposCargando.set(false);
      },
    });
  }

  ubicacionDe(e: Equipo): string {
    if (e.estado === 'ASIGNADO') return e.contratoId ? `Contrato #${e.contratoId}` : 'Instalado';
    return e.ubicacion ?? '—';
  }

  readonly mensajeStock = computed(() => {
    if (this.cargando()) return 'Cargando existencias…';
    if (this.error()) return this.error()!;
    return 'No se encontraron materiales con los filtros aplicados.';
  });

  /**
   * ---------- Productos de venta ----------
   *
   * Materiales de categoría VENTA: aparte del material de instalación (cable,
   * conectores), pensados para vender a cualquiera —cliente o no— desde el
   * mostrador de Cobranzas. Es el mismo catálogo de materiales, solo separado
   * por la categoría en vez de mezclarse con lo que se usa en instalaciones.
   */
  readonly productosFiltrados = computed(() => {
    const term = this.qProducto().trim().toLowerCase();
    const base = this.materiales()
      .filter((m) => m.categoria === 'VENTA')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (!term) return base;
    return base.filter((m) => `${m.codigo} ${m.nombre}`.toLowerCase().includes(term));
  });

  readonly mensajeProductos = 'No se encontraron productos con ese filtro.';

  /** Cuánto queda de un material sumando todas las ubicaciones. */
  stockTotalDe(materialId: number): number {
    return this.existencias()
      .filter((e) => e.materialId === materialId)
      .reduce((s, e) => s + e.cantidad, 0);
  }

  moneda(n: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n ?? 0);
  }

  /* ---------- Alta rápida de producto (categoría VENTA fija) ---------- */
  readonly puedeGestionarMateriales = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  readonly modalProducto = signal(false);
  readonly guardandoProducto = signal(false);
  readonly errorProducto = signal<string | null>(null);

  readonly formProducto = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    precioVenta: [0, [Validators.required, Validators.min(0.01)]],
  });

  abrirNuevoProducto() {
    this.errorProducto.set(null);
    this.formProducto.reset({ codigo: '', nombre: '', precioVenta: 0 });
    this.modalProducto.set(true);
  }

  cerrarProducto() {
    if (this.guardandoProducto()) return;
    this.modalProducto.set(false);
  }

  guardarProducto() {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }
    const v = this.formProducto.getRawValue();
    this.guardandoProducto.set(true);
    this.errorProducto.set(null);
    // Unidad y stock mínimo no aplican a un producto de mostrador: unidad fija y
    // sin alerta de reposición (0 = no se vigila). Lo distintivo aquí es el precio.
    this.inventario
      .crearMaterial({
        codigo: v.codigo.trim().toUpperCase(),
        nombre: v.nombre.trim(),
        unidad: 'UNIDAD',
        stockMinimo: 0,
        precioVenta: v.precioVenta,
        categoria: 'VENTA',
      })
      .subscribe({
        next: () => {
          this.guardandoProducto.set(false);
          this.modalProducto.set(false);
          this.cargar();
        },
        error: (e) => {
          this.guardandoProducto.set(false);
          this.errorProducto.set(this.mensajeProducto(e));
        },
      });
  }

  private mensajeProducto(e: { status?: number }): string {
    if (e.status === 409 || e.status === 422) return 'Ya existe un producto con ese código.';
    if (e.status === 400) return 'Revisa los datos: algún campo es inválido.';
    if (e.status === 403) return 'Tu rol no tiene permiso para agregar productos.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo guardar el producto.';
  }

  readonly mensajeEquipos = computed(() => {
    if (this.cargando() || this.equiposCargando()) return 'Cargando equipos…';
    if (this.error()) return this.error()!;
    return `No hay equipos en estado ${this.estadoEquipoEtq[this.estadoFiltro()]}.`;
  });

  cantidad(n: number): string {
    return Number(n ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 2 });
  }

  /* ---------- Alta de equipo (modal) ---------- */
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly errorAlta = signal<string | null>(null);

  readonly formAlta = this.fb.nonNullable.group({
    tipo: ['ONT' as TipoEquipo, Validators.required],
    marca: ['', [Validators.required, Validators.maxLength(60)]],
    modelo: ['', [Validators.required, Validators.maxLength(60)]],
    numeroSerie: ['', [Validators.required, Validators.maxLength(80)]],
    macAddress: ['', Validators.pattern(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/)],
    ubicacionId: [null as number | null, Validators.required],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
  });

  abrirAlta() {
    this.errorAlta.set(null);
    this.formAlta.reset();
    // Preselecciona una bodega para que el caso común sea un clic menos.
    const bodega = this.ubicaciones().find((u) => u.tipo === 'BODEGA') ?? this.ubicaciones()[0];
    if (bodega) this.formAlta.patchValue({ ubicacionId: bodega.id });
    this.modalAbierto.set(true);
  }

  cerrarAlta() {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  guardarEquipo() {
    if (this.formAlta.invalid) {
      this.formAlta.markAllAsTouched();
      return;
    }
    const v = this.formAlta.getRawValue();
    const req: AltaEquipoRequest = {
      tipo: v.tipo,
      marca: v.marca.trim(),
      modelo: v.modelo.trim(),
      numeroSerie: v.numeroSerie.trim(),
      macAddress: v.macAddress.trim() ? v.macAddress.trim() : null,
      ubicacionId: v.ubicacionId!,
      precioVenta: v.precioVenta,
    };
    this.guardando.set(true);
    this.errorAlta.set(null);
    this.inventario.crearEquipo(req).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        // Lo recién creado queda DISPONIBLE: salta a esa vista para verlo.
        this.tabActiva.set(1);
        this.cambiarEstado('DISPONIBLE');
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorAlta.set(this.mensajeAlta(e));
      },
    });
  }

  private mensajeAlta(e: { status?: number }): string {
    // El backend devuelve 422 (regla de negocio) para serie/MAC duplicada; 409 por si acaso.
    if (e.status === 409 || e.status === 422) return 'Ya existe un equipo con ese número de serie o esa MAC.';
    if (e.status === 400) return 'Revisa los datos: algún campo es inválido (¿el formato de la MAC?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para dar de alta equipos.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo dar de alta el equipo.';
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver el inventario.';
    if (e.status) return `El gateway respondió ${e.status} al cargar el inventario.`;
    return 'Error inesperado cargando el inventario.';
  }


  /* ---------- Historial: el libro de inventario ---------- */
  readonly movimientos = signal<Movimiento[]>([]);
  readonly movimientosCargando = signal(false);
  readonly movTipoFiltro = signal<'' | TipoMovimiento>('');
  readonly movMaterialFiltro = signal<'' | number>('');
  readonly movUbicacionFiltro = signal<'' | number>('');

  readonly tiposMovimiento: TipoMovimiento[] = ['INGRESO', 'EGRESO', 'TRASLADO', 'AJUSTE'];
  readonly tipoMovEtq = TIPO_MOVIMIENTO_ETIQUETA;
  readonly tipoMovTono = TIPO_MOVIMIENTO_TONO;

  cargarMovimientos() {
    this.movimientosCargando.set(true);
    const tipo = this.movTipoFiltro();
    const mat = this.movMaterialFiltro();
    const ubi = this.movUbicacionFiltro();
    this.inventario
      .listarMovimientos({
        tipo: tipo === '' ? undefined : tipo,
        materialId: mat === '' ? undefined : mat,
        ubicacionId: ubi === '' ? undefined : ubi,
        limite: 200,
      })
      .subscribe({
        next: (lista) => {
          this.movimientos.set(lista);
          this.movimientosCargando.set(false);
        },
        error: (e) => {
          this.movimientos.set([]);
          this.error.set(this.mensajeDeError(e));
          this.movimientosCargando.set(false);
        },
      });
  }

  /** Qué se movió: el material o la unidad serializada. */
  queSeMovio(m: Movimiento): string {
    if (m.material) return m.material;
    if (m.equipoSerie) return `Equipo ${m.equipoSerie}`;
    return '—';
  }

  /** De dónde a dónde, en una sola celda legible. */
  rutaDe(m: Movimiento): string {
    if (m.origen && m.destino) return `${m.origen} → ${m.destino}`;
    if (m.destino) return `→ ${m.destino}`;
    if (m.origen) return `${m.origen} →`;
    return '—';
  }

  readonly mensajeMovimientos = computed(() => {
    if (this.movimientosCargando()) return 'Cargando movimientos…';
    if (this.error()) return this.error()!;
    return 'No hay movimientos con los filtros aplicados.';
  });

  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    const d2 = (n: number) => String(n).padStart(2, '0');
    return `${d2(f.getDate())}/${d2(f.getMonth() + 1)}/${f.getFullYear()} ${d2(f.getHours())}:${d2(f.getMinutes())}`;
  }

  /* ---------- Movimientos de stock: ingreso, consumo, traslado y ajuste ---------- */
  readonly modalStock = signal<TipoMovimientoUi | null>(null);
  readonly guardandoStock = signal(false);
  readonly errorStock = signal<string | null>(null);

  readonly materialSel = signal<number | null>(null);
  readonly ubicacionSel = signal<number | null>(null);
  readonly cantidadMov = signal<number | null>(null);
  readonly referenciaMov = signal('');
  readonly ordenMov = signal<number | null>(null);
  /** Solo traslado: a dónde va. */
  readonly ubicacionDestinoSel = signal<number | null>(null);
  /** Solo ajuste: true si el conteo encontró MÁS de lo que decía el sistema. */
  readonly ajusteSobra = signal(false);
  readonly motivoAjuste = signal('');

  /** Título y verbo del modal según la operación. */
  readonly tituloMovimiento = computed(() => {
    switch (this.modalStock()) {
      case 'ingreso':
        return 'Ingreso de material';
      case 'consumo':
        return 'Consumo de material';
      case 'traslado':
        return 'Traslado entre ubicaciones';
      case 'ajuste':
        return 'Ajuste por conteo físico';
      default:
        return '';
    }
  });

  /** Saldo del material en la ubicación de destino de un traslado. */
  readonly saldoDestino = computed(() => {
    const m = this.materialSel();
    const u = this.ubicacionDestinoSel();
    if (m == null || u == null) return null;
    return this.existencias().find((e) => e.materialId === m && e.ubicacionId === u)?.cantidad ?? 0;
  });

  /** Materiales ordenados por nombre para el selector. */
  readonly materialesOrdenados = computed(() =>
    [...this.materiales()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  readonly materialActual = computed(
    () => this.materiales().find((m) => m.id === this.materialSel()) ?? null,
  );

  /**
   * Saldo del material elegido en la ubicación elegida. En un consumo es el techo:
   * sacar más de lo que hay lo rechaza el backend con 422, y aquí se avisa antes.
   */
  readonly saldoSeleccionado = computed(() => {
    const m = this.materialSel();
    const u = this.ubicacionSel();
    if (m == null || u == null) return null;
    return this.existencias().find((e) => e.materialId === m && e.ubicacionId === u)?.cantidad ?? 0;
  });

  abrirMovimiento(tipo: TipoMovimientoUi) {
    this.avisoStock.set(null);
    this.errorStock.set(null);
    this.materialSel.set(null);
    this.cantidadMov.set(null);
    this.referenciaMov.set('');
    this.ordenMov.set(null);
    this.ajusteSobra.set(false);
    this.motivoAjuste.set('');
    // Preselecciona una bodega: es el origen/destino habitual.
    const bodega = this.ubicaciones().find((u) => u.tipo === 'BODEGA') ?? this.ubicaciones()[0];
    this.ubicacionSel.set(bodega?.id ?? null);
    // En un traslado el destino típico es la furgoneta del técnico.
    const furgoneta = this.ubicaciones().find((u) => u.tipo === 'TECNICO' && u.id !== bodega?.id);
    this.ubicacionDestinoSel.set(furgoneta?.id ?? null);
    this.modalStock.set(tipo);
  }

  cerrarMovimiento() {
    if (this.guardandoStock()) return;
    this.modalStock.set(null);
  }

  guardarMovimiento() {
    const err = this.validarMovimiento();
    if (err) {
      this.errorStock.set(err);
      return;
    }
    const tipo = this.modalStock()!;
    const material = this.materialActual()!;
    const cant = this.cantidadMov()!;
    const ubic = this.ubicacionSel()!;
    const unidad = this.unidadEtq[material.unidad];

    this.guardandoStock.set(true);
    this.errorStock.set(null);

    let peticion;
    let resumen: string;
    switch (tipo) {
      case 'ingreso':
        peticion = this.inventario.ingresarMaterial({
          materialId: material.id,
          cantidad: cant,
          ubicacionDestinoId: ubic,
          referencia: this.referenciaMov().trim() || null,
        });
        resumen = `Ingresaron ${this.cantidad(cant)} ${unidad} de ${material.nombre}.`;
        break;
      case 'consumo':
        peticion = this.inventario.consumirMaterial({
          materialId: material.id,
          cantidad: cant,
          ubicacionOrigenId: ubic,
          ordenTrabajoId: this.ordenMov(),
          contratoId: null,
        });
        resumen = `Se consumieron ${this.cantidad(cant)} ${unidad} de ${material.nombre}.`;
        break;
      case 'traslado': {
        const destinoId = this.ubicacionDestinoSel()!;
        peticion = this.inventario.trasladarMaterial({
          materialId: material.id,
          cantidad: cant,
          ubicacionOrigenId: ubic,
          ubicacionDestinoId: destinoId,
        });
        const destino = this.ubicaciones().find((u) => u.id === destinoId)?.nombre ?? 'destino';
        resumen = `Se trasladaron ${this.cantidad(cant)} ${unidad} de ${material.nombre} a ${destino}.`;
        break;
      }
      default: {
        const sobra = this.ajusteSobra();
        peticion = this.inventario.ajustarMaterial({
          materialId: material.id,
          cantidad: cant,
          ubicacionId: ubic,
          sobra,
          motivo: this.motivoAjuste().trim(),
        });
        resumen = `Ajuste registrado: ${sobra ? 'sobraban' : 'faltaban'} ${this.cantidad(cant)} ${unidad} de ${material.nombre}.`;
      }
    }

    peticion.subscribe({
      next: () => {
        this.guardandoStock.set(false);
        this.modalStock.set(null);
        this.avisoStock.set({ texto: resumen, error: false });
        this.cargar(); // refresca existencias, bajo stock y KPIs
        // Si el libro ya se había abierto, que muestre el asiento recién creado.
        if (this.movimientos().length) this.cargarMovimientos();
      },
      error: (e) => {
        this.guardandoStock.set(false);
        this.errorStock.set(this.mensajeMovimiento(e));
      },
    });
  }

  private validarMovimiento(): string | null {
    const tipo = this.modalStock();
    if (this.materialSel() == null) return 'Elige un material.';
    if (this.ubicacionSel() == null) return 'Elige una ubicación.';
    const c = this.cantidadMov();
    if (c == null || c <= 0) return 'La cantidad debe ser mayor que cero.';

    // Todo lo que saca material de una ubicación tiene el saldo como techo.
    const saleDeLaUbicacion = tipo === 'consumo' || tipo === 'traslado' || (tipo === 'ajuste' && !this.ajusteSobra());
    if (saleDeLaUbicacion) {
      const saldo = this.saldoSeleccionado() ?? 0;
      if (c > saldo) return `No hay bastante: disponible ${this.cantidad(saldo)}.`;
    }

    if (tipo === 'traslado') {
      const destino = this.ubicacionDestinoSel();
      if (destino == null) return 'Elige la ubicación de destino.';
      if (destino === this.ubicacionSel()) return 'El origen y el destino no pueden ser la misma ubicación.';
    }
    if (tipo === 'ajuste' && !this.motivoAjuste().trim()) {
      return 'El ajuste necesita un motivo: es lo que permite auditarlo después.';
    }
    return null;
  }

  private mensajeMovimiento(e: { status?: number }): string {
    // 422 lo usa el backend tanto para stock insuficiente como para reglas de inventario.
    if (e.status === 422) return 'No hay bastante stock en esa ubicación (o la cantidad no es válida).';
    if (e.status === 400) return 'Revisa los datos del movimiento: hay algún campo inválido.';
    if (e.status === 403) return 'Tu rol no tiene permiso para mover stock.';
    if (e.status === 404) return 'El material o la ubicación ya no existen; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo registrar el movimiento.';
  }
}
