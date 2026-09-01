import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { AuthService } from '../../core/services/auth.service';
import { InventarioService } from '../../core/services/inventario.service';
import { ProveedoresService } from '../../core/services/proveedores.service';
import {
  CATEGORIA_MATERIAL_ETIQUETA,
  CategoriaMaterial,
  Material,
  TipoEquipo,
  Ubicacion,
  UnidadMedida,
} from '../../core/models/inventario.model';
import {
  Compra,
  DestinoCompra,
  PreviaCompra,
  Proveedor,
  ProveedorArticulo,
  RegistrarCompraLinea,
  SerieEquipo,
} from '../../core/models/proveedores.model';

/**
 * Una línea de la factura mientras el operador la revisa: ya no es lo que dijo
 * el XML, todavía no es lo que se guardará. Cada campo editable de la pantalla
 * vive aquí.
 */
interface LineaEditable {
  // --- Lo que trajo el XML, inmutable: es la prueba de qué se compró ---
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

const TIPOS_EQUIPO: TipoEquipo[] = [
  'ROUTER', 'ONT', 'ONU', 'SWITCH', 'ANTENA', 'SPLITTER', 'OTRO',
];
const UNIDADES: UnidadMedida[] = ['UNIDAD', 'METRO', 'ROLLO', 'CAJA'];

/**
 * Proveedores: a quién le compramos, qué nos vende y a qué precio, y la carga
 * de sus facturas al inventario.
 *
 * La pestaña de facturas es el corazón del módulo: se sube el XML, el sistema
 * lo lee y propone, y el operador corrige nombres, decide qué es equipo y qué
 * material, y fija el precio de venta (a mano o aplicando un margen sobre el
 * costo real). Solo al confirmar se toca el inventario.
 */
@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './proveedores.html',
  styleUrls: ['../clientes/clientes.scss', './proveedores.scss'],
})
export class ProveedoresComponent {
  private readonly api = inject(ProveedoresService);
  private readonly inventario = inject(InventarioService);
  private readonly auth = inject(AuthService);

  readonly tiposEquipo = TIPOS_EQUIPO;
  readonly unidades = UNIDADES;
  readonly categoriaEtq = CATEGORIA_MATERIAL_ETIQUETA;

  /** Solo ADMIN registra compras y da de alta proveedores (ver la matriz del monolito). */
  readonly puedeEditar = computed(() => this.auth.tieneRol('ADMINISTRADOR'));

  readonly tabActiva = signal<0 | 1 | 2>(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly proveedores = signal<Proveedor[]>([]);
  readonly catalogo = signal<ProveedorArticulo[]>([]);
  readonly compras = signal<Compra[]>([]);
  readonly materiales = signal<Material[]>([]);
  readonly ubicaciones = signal<Ubicacion[]>([]);

  readonly q = signal('');

  constructor() {
    this.cargar();
  }

  setTab(i: 0 | 1 | 2) {
    this.tabActiva.set(i);
    if (i === 1 && this.catalogo().length === 0) this.cargarCatalogo();
    if (i === 2 && this.compras().length === 0) this.cargarCompras();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar().subscribe({
      next: (p) => {
        this.proveedores.set(p);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensaje(e));
        this.cargando.set(false);
      },
    });
  }

  private cargarCatalogo() {
    this.api.catalogoCompleto().subscribe({
      next: (a) => this.catalogo.set(a),
      error: (e) => this.error.set(this.mensaje(e)),
    });
  }

  private cargarCompras() {
    this.api.compras().subscribe({
      next: (c) => this.compras.set(c),
      error: (e) => this.error.set(this.mensaje(e)),
    });
  }

  readonly proveedoresFiltrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.proveedores();
    return this.proveedores().filter((p) =>
      `${p.razonSocial} ${p.ruc} ${p.nombreComercial ?? ''}`.toLowerCase().includes(term),
    );
  });

  readonly catalogoFiltrado = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.catalogo();
    return this.catalogo().filter((a) =>
      `${a.descripcion} ${a.codigoProveedor} ${a.proveedorRazonSocial}`.toLowerCase().includes(term),
    );
  });

  /* ================= Alta / edición de proveedor ================= */
  readonly modalProveedor = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly guardando = signal(false);
  readonly fRuc = signal('');
  readonly fRazon = signal('');
  readonly fComercial = signal('');
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
      direccion: this.fDireccion().trim() || null,
      telefono: this.fTelefono().trim() || null,
      email: this.fEmail().trim() || null,
      contacto: this.fContacto().trim() || null,
      observacion: this.fObservacion().trim() || null,
    };
    this.guardando.set(true);
    this.error.set(null);

    const id = this.editandoId();
    const peticion = id != null ? this.api.editar(id, req) : this.api.crear(req);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalProveedor.set(false);
        this.aviso.set(id != null ? 'Proveedor actualizado.' : 'Proveedor creado.');
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  alternarActivo(p: Proveedor) {
    this.api.cambiarActivo(p.id, !p.activo).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(this.mensaje(e)),
    });
  }

  /* ================= Importar factura XML ================= */
  readonly previa = signal<PreviaCompra | null>(null);
  readonly lineas = signal<LineaEditable[]>([]);
  readonly leyendo = signal(false);
  readonly registrando = signal(false);
  readonly errorFactura = signal<string | null>(null);
  readonly ubicacionSel = signal<number | null>(null);
  /** Margen que se aplica de golpe a todas las líneas; cada una se puede retocar. */
  readonly margen = signal(30);

  onArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.leyendo.set(true);
    this.errorFactura.set(null);
    this.previa.set(null);
    this.lineas.set([]);

    // Se cargan en paralelo los catálogos que la revisión necesita: sin ellos no
    // se puede elegir a qué material sumar ni a qué bodega entra.
    this.inventario.listarMateriales().subscribe({
      next: (m) => this.materiales.set(m),
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

    this.api.previsualizarFactura(archivo).subscribe({
      next: (p) => {
        this.previa.set(p);
        this.lineas.set(p.lineas.map((l) => this.aEditable(l)));
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

  /** Al pasar a equipo se preparan tantas filas de serie como unidades haya. */
  cambiarDestino(i: number, destino: DestinoCompra) {
    const linea = this.lineas()[i];
    const series =
      destino === 'EQUIPO' && linea.series.length !== Math.trunc(linea.cantidad)
        ? Array.from({ length: Math.trunc(linea.cantidad) }, () => ({
            numeroSerie: '',
            macAddress: null,
          }))
        : linea.series;
    this.actualizar(i, { destino, series });
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

  readonly totalIncluido = computed(() =>
    this.lineas()
      .filter((l) => l.incluir)
      .reduce((s, l) => s + l.cantidad * l.costoUnitario, 0),
  );

  readonly seriesFaltantes = computed(() =>
    this.lineas()
      .filter((l) => l.incluir && l.destino === 'EQUIPO')
      .reduce(
        (s, l) => s + Math.max(0, Math.trunc(l.cantidad) - l.series.filter((x) => x.numeroSerie.trim()).length),
        0,
      ),
  );

  cancelarImportacion() {
    this.previa.set(null);
    this.lineas.set([]);
    this.errorFactura.set(null);
  }

  registrarCompra() {
    const p = this.previa();
    if (!p) return;

    const incluidas = this.lineas().filter((l) => l.incluir);
    const problema = this.validar(incluidas);
    if (problema) {
      this.errorFactura.set(problema);
      return;
    }

    const req = {
      proveedorId: p.proveedorId,
      ruc: p.ruc,
      razonSocial: p.razonSocial,
      nombreComercial: p.nombreComercial,
      numeroDocumento: p.numeroDocumento,
      claveAcceso: p.claveAcceso,
      fechaEmision: p.fechaEmision,
      subtotal: p.subtotal,
      descuento: p.descuento,
      valorIva: p.valorIva,
      total: p.total,
      ubicacionId: this.ubicacionSel()!,
      observacion: null,
      lineas: incluidas.map((l): RegistrarCompraLinea => ({
        destino: l.destino,
        codigoProveedor: l.codigoProveedor,
        descripcion: l.descripcionOriginal,
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
    this.api.registrarCompra(req).subscribe({
      next: (c) => {
        this.registrando.set(false);
        this.previa.set(null);
        this.lineas.set([]);
        this.aviso.set(
          `Compra ${c.numeroDocumento} registrada: ${c.lineas.length} artículo(s) ingresados al inventario.`,
        );
        this.compras.set([]);
        this.cargar();
      },
      error: (e) => {
        this.registrando.set(false);
        this.errorFactura.set(this.mensaje(e));
      },
    });
  }

  private validar(lineas: LineaEditable[]): string | null {
    if (this.previa()?.yaRegistrada) return this.previa()!.yaRegistrada;
    if (lineas.length === 0) return 'Marca al menos un artículo para ingresar.';
    if (this.ubicacionSel() == null) return 'Elige a qué bodega entra la mercadería.';

    for (const l of lineas) {
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

  /* ================= Utilidades ================= */
  moneda(v: number | null | undefined): string {
    return `$${Number(v ?? 0).toFixed(2)}`;
  }

  fecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC');
  }

  private mensaje(e: { status?: number; error?: { mensaje?: string; message?: string; detail?: string } }): string {
    const detalle = e.error?.mensaje ?? e.error?.message ?? e.error?.detail;
    if (e.status === 0) return 'No se pudo contactar el backend.';
    if (e.status === 403) return 'Tu rol no tiene permiso para gestionar proveedores y compras.';
    if (e.status === 400 || e.status === 422) return detalle ?? 'Revisa los datos enviados.';
    if (e.status === 404) return detalle ?? 'No se encontró el recurso.';
    return detalle ?? 'No se pudo completar la operación.';
  }
}
