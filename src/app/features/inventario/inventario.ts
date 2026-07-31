import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { InventarioService } from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AltaEquipoRequest,
  Equipo,
  EstadoEquipo,
  Existencia,
  Material,
  MaterialBajoStock,
  TipoEquipo,
  Ubicacion,
  ESTADO_EQUIPO_ETIQUETA,
  ESTADO_EQUIPO_TONO,
  TIPO_EQUIPO_ETIQUETA,
  TIPO_UBICACION_ETIQUETA,
  UNIDAD_ETIQUETA,
} from '../../core/models/inventario.model';

/** Tipos de equipo disponibles en el selector del alta. */
const TIPOS_EQUIPO: TipoEquipo[] = ['ROUTER', 'ONT', 'ONU', 'SWITCH', 'ANTENA', 'SPLITTER', 'OTRO'];

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

  readonly tiposEquipo = TIPOS_EQUIPO;
  /** Solo TECNICO/ADMIN pueden dar de alta equipos (POST /api/equipos). */
  readonly puedeAltaEquipo = computed(() => this.auth.tieneRol('TECNICO', 'ADMINISTRADOR'));

  readonly tipoEquipoEtq = TIPO_EQUIPO_ETIQUETA;
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

  readonly tabActiva = signal<0 | 1>(0);

  // Filtros de la pestaña de stock
  readonly qStock = signal('');
  readonly ubicacionFiltro = signal<'' | number>('');

  // Filtros de la pestaña de equipos
  readonly qEquipo = signal('');
  readonly estadoFiltro = signal<EstadoEquipo>('DISPONIBLE');

  /** materialId de los materiales bajo mínimo, para marcarlos en la tabla de stock. */
  private readonly bajoStockIds = computed(() => new Set(this.bajoStock().map((b) => b.materialId)));

  constructor() {
    forkJoin({
      materiales: this.inventario.listarMateriales(),
      ubicaciones: this.inventario.listarUbicaciones(),
      bajoStock: this.inventario.bajoStock(),
      existencias: this.inventario.listarExistencias(),
      equipos: this.inventario.listarEquipos({ estado: 'DISPONIBLE' }),
    }).subscribe({
      next: (r) => {
        this.materiales.set(r.materiales);
        this.ubicaciones.set(r.ubicaciones);
        this.bajoStock.set(r.bajoStock);
        this.existencias.set(r.existencias);
        this.equipos.set(r.equipos);
        this.disponiblesTotal.set(r.equipos.length);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  setTab(i: 0 | 1) {
    this.tabActiva.set(i);
  }

  /* ---------- Stock de material ---------- */
  readonly existenciasFiltradas = computed(() => {
    const term = this.qStock().trim().toLowerCase();
    const ub = this.ubicacionFiltro();
    return this.existencias().filter((e) => {
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
}
