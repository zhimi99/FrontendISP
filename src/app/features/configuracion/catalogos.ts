import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { InventarioService } from '../../core/services/inventario.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { UsuarioResumen } from '../../core/models/auth.model';
import {
  CATEGORIA_MATERIAL_ETIQUETA,
  CategoriaMaterial,
  Material,
  TIPO_UBICACION_ETIQUETA,
  TipoUbicacion,
  Ubicacion,
  UnidadMedida,
} from '../../core/models/inventario.model';

type Seccion = 'materiales' | 'ubicaciones';

/**
 * Los maestros del inventario: qué materiales existen y dónde puede estar el stock.
 *
 * <p>Tres cosas que el backend impide y que esta pantalla anticipa en vez de esconder,
 * porque son las que explican por qué a veces "guardar" no funciona:
 *
 * <ul>
 *   <li>Los <b>códigos no se editan</b>: quedaron escritos en cada movimiento del
 *       histórico. Por eso el campo aparece bloqueado al editar.</li>
 *   <li>La <b>unidad de medida</b> no cambia si el material ya tiene movimientos: 500
 *       metros de cable no se convierten en 500 unidades de cable.</li>
 *   <li><b>No se retira nada con material encima.</b> Desactivar una bodega con 200
 *       conectores no los saca del almacén, solo los esconde del sistema.</li>
 * </ul>
 */
@Component({
  selector: 'app-config-catalogos',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './catalogos.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class CatalogosComponent {
  private readonly inventario = inject(InventarioService);
  private readonly usuarios = inject(UsuariosService);

  readonly tipoEtiqueta = TIPO_UBICACION_ETIQUETA;
  readonly unidades: UnidadMedida[] = ['UNIDAD', 'METRO', 'ROLLO', 'CAJA'];
  readonly tipos: TipoUbicacion[] = ['BODEGA', 'TECNICO'];
  readonly categorias: CategoriaMaterial[] = ['INSTALACION', 'VENTA'];
  readonly categoriaEtiqueta = CATEGORIA_MATERIAL_ETIQUETA;

  readonly seccion = signal<Seccion>('materiales');
  readonly materiales = signal<Material[]>([]);
  readonly ubicaciones = signal<Ubicacion[]>([]);
  readonly tecnicos = signal<UsuarioResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);
  readonly procesando = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    forkJoin({
      // ?todos=true: aquí sí hay que ver los retirados, es donde se reactivan.
      materiales: this.inventario.listarMateriales(true),
      ubicaciones: this.inventario.listarUbicaciones(true),
      tecnicos: this.usuarios.resumenes(true),
    }).subscribe({
      next: ({ materiales, ubicaciones, tecnicos }) => {
        this.materiales.set(materiales);
        this.ubicaciones.set(ubicaciones);
        this.tecnicos.set(tecnicos);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  nombreTecnico(id: number | null): string {
    if (id == null) return '—';
    return this.tecnicos().find((t) => t.id === id)?.nombreCompleto ?? `Empleado ${id}`;
  }

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando el catálogo…';
    if (this.error()) return this.error()!;
    return 'Todavía no hay nada aquí.';
  });

  /* ================== Material ================== */
  readonly editandoMaterial = signal<Material | null>(null);
  readonly creandoMaterial = signal(false);
  readonly guardandoMaterial = signal(false);
  readonly errorMaterial = signal<string | null>(null);
  readonly mCodigo = signal('');
  readonly mNombre = signal('');
  readonly mUnidad = signal<UnidadMedida>('UNIDAD');
  readonly mMinimo = signal(0);
  readonly mPrecio = signal(0);
  readonly mCategoria = signal<CategoriaMaterial>('INSTALACION');

  abrirMaterial(m: Material | null) {
    this.banner.set(null);
    this.errorMaterial.set(null);
    this.mCodigo.set(m?.codigo ?? '');
    this.mNombre.set(m?.nombre ?? '');
    this.mUnidad.set(m?.unidad ?? 'UNIDAD');
    this.mMinimo.set(m?.stockMinimo ?? 0);
    this.mPrecio.set(m?.precioVenta ?? 0);
    this.mCategoria.set(m?.categoria ?? 'INSTALACION');
    this.editandoMaterial.set(m);
    this.creandoMaterial.set(m === null);
  }

  cerrarMaterial() {
    if (this.guardandoMaterial()) return;
    this.editandoMaterial.set(null);
    this.creandoMaterial.set(false);
  }

  guardarMaterial() {
    if (!this.mNombre().trim() || (this.creandoMaterial() && !this.mCodigo().trim())) {
      this.errorMaterial.set('El código y el nombre son obligatorios.');
      return;
    }
    if (this.mMinimo() < 0) {
      this.errorMaterial.set('El stock mínimo no puede ser negativo.');
      return;
    }
    if (this.mPrecio() < 0) {
      this.errorMaterial.set('El precio de venta no puede ser negativo.');
      return;
    }

    this.guardandoMaterial.set(true);
    this.errorMaterial.set(null);
    const editado = this.editandoMaterial();
    const peticion = editado
      ? this.inventario.editarMaterial(editado.id, {
          nombre: this.mNombre().trim(),
          unidad: this.mUnidad(),
          stockMinimo: Number(this.mMinimo()),
          precioVenta: Number(this.mPrecio()),
          categoria: this.mCategoria(),
        })
      : this.inventario.crearMaterial({
          codigo: this.mCodigo().trim(),
          nombre: this.mNombre().trim(),
          unidad: this.mUnidad(),
          stockMinimo: Number(this.mMinimo()),
          precioVenta: Number(this.mPrecio()),
          categoria: this.mCategoria(),
        });

    peticion.subscribe({
      next: (m) => {
        this.guardandoMaterial.set(false);
        this.cerrarMaterial();
        this.banner.set({ texto: `Material ${m.codigo} guardado.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.guardandoMaterial.set(false);
        this.errorMaterial.set(this.mensajeMaterial(e));
      },
    });
  }

  cambiarEstadoMaterial(m: Material) {
    this.banner.set(null);
    this.procesando.set('mat-' + m.id);
    const peticion = m.activo
      ? this.inventario.desactivarMaterial(m.id)
      : this.inventario.activarMaterial(m.id);
    peticion.subscribe({
      next: () => {
        this.procesando.set(null);
        this.banner.set({
          texto: m.activo
            ? `${m.codigo} retirado del catálogo. Deja de aparecer en ingresos y traslados.`
            : `${m.codigo} vuelve al catálogo.`,
          error: false,
        });
        this.cargar();
      },
      error: (e) => {
        this.procesando.set(null);
        this.banner.set({ texto: this.mensajeMaterial(e), error: true });
      },
    });
  }

  /* ================== Ubicación ================== */
  readonly editandoUbicacion = signal<Ubicacion | null>(null);
  readonly creandoUbicacion = signal(false);
  readonly guardandoUbicacion = signal(false);
  readonly errorUbicacion = signal<string | null>(null);
  readonly uCodigo = signal('');
  readonly uNombre = signal('');
  readonly uTipo = signal<TipoUbicacion>('BODEGA');
  readonly uUsuarioId = signal<number | null>(null);

  abrirUbicacion(u: Ubicacion | null) {
    this.banner.set(null);
    this.errorUbicacion.set(null);
    this.uCodigo.set(u?.codigo ?? '');
    this.uNombre.set(u?.nombre ?? '');
    this.uTipo.set(u?.tipo ?? 'BODEGA');
    this.uUsuarioId.set(u?.usuarioId ?? null);
    this.editandoUbicacion.set(u);
    this.creandoUbicacion.set(u === null);
  }

  cerrarUbicacion() {
    if (this.guardandoUbicacion()) return;
    this.editandoUbicacion.set(null);
    this.creandoUbicacion.set(false);
  }

  /** Una bodega no es de nadie; al cambiar el tipo se limpia el técnico. */
  alCambiarTipo(tipo: TipoUbicacion) {
    this.uTipo.set(tipo);
    if (tipo === 'BODEGA') this.uUsuarioId.set(null);
  }

  guardarUbicacion() {
    if (!this.uNombre().trim() || (this.creandoUbicacion() && !this.uCodigo().trim())) {
      this.errorUbicacion.set('El código y el nombre son obligatorios.');
      return;
    }
    if (this.uTipo() === 'TECNICO' && this.uUsuarioId() == null) {
      this.errorUbicacion.set('Una furgoneta necesita el técnico al que pertenece.');
      return;
    }

    this.guardandoUbicacion.set(true);
    this.errorUbicacion.set(null);
    const editada = this.editandoUbicacion();
    const peticion = editada
      ? this.inventario.editarUbicacion(editada.id, {
          nombre: this.uNombre().trim(),
          usuarioId: this.uUsuarioId(),
        })
      : this.inventario.crearUbicacion({
          codigo: this.uCodigo().trim(),
          nombre: this.uNombre().trim(),
          tipo: this.uTipo(),
          usuarioId: this.uUsuarioId(),
        });

    peticion.subscribe({
      next: (u) => {
        this.guardandoUbicacion.set(false);
        this.cerrarUbicacion();
        this.banner.set({ texto: `Ubicación ${u.codigo} guardada.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.guardandoUbicacion.set(false);
        this.errorUbicacion.set(this.mensajeUbicacion(e));
      },
    });
  }

  cambiarEstadoUbicacion(u: Ubicacion) {
    this.banner.set(null);
    this.procesando.set('ubi-' + u.id);
    const peticion = u.activa
      ? this.inventario.desactivarUbicacion(u.id)
      : this.inventario.activarUbicacion(u.id);
    peticion.subscribe({
      next: () => {
        this.procesando.set(null);
        this.banner.set({
          texto: u.activa ? `${u.codigo} dada de baja.` : `${u.codigo} vuelve a estar operativa.`,
          error: false,
        });
        this.cargar();
      },
      error: (e) => {
        this.procesando.set(null);
        this.banner.set({ texto: this.mensajeUbicacion(e), error: true });
      },
    });
  }

  /* ================== Errores ================== */

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Solo un administrador puede mantener el catálogo.';
    return `No se pudo cargar el catálogo (${e.status ?? 'error'}).`;
  }

  /**
   * El backend no publica el texto del 422 (Spring Boot lo omite por defecto), así que
   * aquí se enumeran los motivos posibles en vez de un "no se pudo" que no orienta.
   */
  private mensajeMaterial(e: { status?: number }): string {
    if (e.status === 422) {
      return 'No se pudo: o el código ya existe, o el material todavía tiene existencia '
        + 'en alguna ubicación, o tiene movimientos y por eso no se le puede cambiar la unidad.';
    }
    if (e.status === 400) return 'Revisa los datos: el código admite letras, dígitos y guiones, y el mínimo no puede ser negativo.';
    if (e.status === 403) return 'Solo un administrador puede mantener el catálogo.';
    if (e.status === 404) return 'Ese material ya no existe; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo guardar el material.';
  }

  private mensajeUbicacion(e: { status?: number }): string {
    if (e.status === 422) {
      return 'No se pudo: o el código ya existe, o la ubicación todavía guarda material o '
        + 'equipos, o ese técnico ya tiene otra furgoneta asignada.';
    }
    if (e.status === 400) return 'Revisa los datos: el código admite letras, dígitos y guiones.';
    if (e.status === 403) return 'Solo un administrador puede mantener el catálogo.';
    if (e.status === 404) return 'Esa ubicación ya no existe; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo guardar la ubicación.';
  }
}
