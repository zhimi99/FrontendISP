import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import {
  ModalidadCobro,
  OfertaServicioCatalogo,
  TipoServicioCatalogo,
} from '../../core/models/contratos.model';
import { mensajeError } from '../../core/http/errores';

/** El detalle que Spring pone en el cuerpo de un 400 con include-binding-errors. */
interface HttpError {
  status?: number;
  error?: {
    message?: string;
    errors?: { field?: string; defaultMessage?: string }[];
  };
}

/**
 * Catálogo de servicios: qué se puede contratar y a qué precio.
 *
 * <p>Es lo que llena el desplegable «Oferta de servicio» del modal *Agregar contrato /
 * servicio*. Hasta ahora solo se podía sembrar por migración; desde aquí se crea y se
 * corrige sin tocar la base.
 *
 * <p>Dos cosas que la pantalla dice en voz alta porque no son evidentes:
 *
 * <ul>
 *   <li><b>El precio nuevo rige para lo que se venda desde ahora.</b> Cada contrato
 *       guarda su propio precio acordado desde el día que se firmó, así que corregir
 *       una oferta no reescribe nada ya vendido ni toca facturas emitidas.</li>
 *   <li><b>El tipo manda sobre la oferta.</b> Si pide dirección, si usa red o si entra
 *       en mora lo decide el tipo de servicio, no la oferta — por eso el tipo no se
 *       cambia al editar: sería cambiarle las reglas a algo ya vendido.</li>
 * </ul>
 */
@Component({
  selector: 'app-config-servicios',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './servicios.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class ServiciosComponent {
  private readonly catalogo = inject(CatalogoServiciosService);

  readonly lista = signal<OfertaServicioCatalogo[]>([]);
  readonly tipos = signal<TipoServicioCatalogo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);
  readonly procesandoId = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    // ?todos=true: aquí sí se ven las retiradas, es donde se vuelven a ofrecer.
    this.catalogo.listarOfertas(true).subscribe({
      next: (lista) => {
        this.lista.set(lista);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.lista.set([]);
        this.cargando.set(false);
      },
    });
    // Los tipos solo hacen falta para el desplegable del alta. Si fallan, se puede
    // seguir editando lo que ya existe, así que el error no bloquea la tabla.
    this.catalogo.listarTipos().subscribe({
      next: (tipos) => this.tipos.set(tipos),
      error: () => this.tipos.set([]),
    });
  }

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando servicios…';
    if (this.error()) return this.error()!;
    return 'Todavía no hay servicios en el catálogo.';
  });

  /** Solo los tipos activos pueden recibir una oferta nueva (el backend lo rechaza). */
  readonly tiposDisponibles = computed(() => this.tipos().filter((t) => t.activo));

  moneda(v: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(v ?? 0);
  }

  modalidadEtiqueta(m: ModalidadCobro | string): string {
    return m === 'RECURRENTE' ? 'Mensual' : 'Pago único';
  }

  /* ---------- Alta y edición ---------- */
  readonly editando = signal<OfertaServicioCatalogo | null>(null);
  readonly creando = signal(false);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly oTipo = signal('');
  readonly oCodigo = signal('');
  readonly oNombre = signal('');
  readonly oDescripcion = signal('');
  readonly oModalidad = signal<ModalidadCobro>('RECURRENTE');
  readonly oPrecio = signal(0);

  /** El tipo elegido en el alta: de él salen los avisos de reglas del formulario. */
  readonly tipoElegido = computed(() => {
    const codigo = this.oTipo();
    return this.tipos().find((t) => t.codigo === codigo) ?? null;
  });

  /**
   * Un servicio sujeto a mora o con plan de Internet tiene que cobrarse mensualmente
   * —el backend lo rechaza con un 422—. Aquí se bloquea el desplegable para que no se
   * llegue a intentar.
   */
  readonly modalidadBloqueada = computed(() => {
    const tipo = this.editando()
      ? this.tipos().find((t) => t.codigo === this.editando()!.tipoCodigo)
      : this.tipoElegido();
    return !!tipo && (tipo.sujetoMora || tipo.requierePlanInternet);
  });

  abrir(o: OfertaServicioCatalogo | null) {
    this.banner.set(null);
    this.errorForm.set(null);
    this.oTipo.set(o?.tipoCodigo ?? this.tiposDisponibles()[0]?.codigo ?? '');
    this.oCodigo.set(o?.codigo ?? '');
    this.oNombre.set(o?.nombre ?? '');
    this.oDescripcion.set(o?.descripcion ?? '');
    this.oModalidad.set(o?.modalidadCobro ?? 'RECURRENTE');
    this.oPrecio.set(o?.precioReferencial ?? 0);
    this.editando.set(o);
    this.creando.set(o === null);
  }

  cerrar() {
    if (this.guardando()) return;
    this.editando.set(null);
    this.creando.set(false);
  }

  onTipoChange(codigo: string) {
    this.oTipo.set(codigo);
    // Si el tipo obliga a cobro recurrente, se corrige la selección en el acto en vez
    // de dejar el formulario en un estado que el servidor va a rechazar.
    if (this.modalidadBloqueada()) this.oModalidad.set('RECURRENTE');
  }

  /** Igual que la @Pattern del backend en CrearOfertaServicioRequest. */
  private static readonly CODIGO_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

  guardar() {
    const nombre = this.oNombre().trim();
    const codigo = this.oCodigo().trim();

    if (!nombre || (this.creando() && !codigo)) {
      this.errorForm.set('El código y el nombre son obligatorios.');
      return;
    }
    if (this.creando() && !ServiciosComponent.CODIGO_VALIDO.test(codigo)) {
      this.errorForm.set('El código solo admite letras, dígitos, punto, guion y guion bajo. Sin espacios.');
      return;
    }
    if (this.creando() && !this.oTipo()) {
      this.errorForm.set('Elige el tipo de servicio al que pertenece esta oferta.');
      return;
    }
    if (Number(this.oPrecio()) < 0) {
      this.errorForm.set('El precio no puede ser negativo.');
      return;
    }

    const datos = {
      nombre,
      descripcion: this.oDescripcion().trim() || null,
      modalidadCobro: this.oModalidad(),
      precioReferencial: Number(this.oPrecio()),
    };

    this.guardando.set(true);
    this.errorForm.set(null);
    const editado = this.editando();
    const peticion = editado
      ? this.catalogo.editarOferta(editado.id, datos)
      : this.catalogo.crearOferta({ tipoCodigo: this.oTipo(), codigo, ...datos });

    peticion.subscribe({
      next: (o) => {
        this.guardando.set(false);
        this.cerrar();
        this.banner.set({
          texto: editado
            ? `${o.nombre} actualizado. El precio nuevo rige para lo que se venda desde ahora; los contratos vigentes conservan el suyo.`
            : `${o.nombre} creado y disponible en «Agregar contrato / servicio».`,
          error: false,
        });
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorForm.set(this.mensajeAccion(e));
      },
    });
  }

  cambiarEstado(o: OfertaServicioCatalogo) {
    this.banner.set(null);
    this.procesandoId.set(o.id);
    const peticion = o.activo
      ? this.catalogo.desactivarOferta(o.id)
      : this.catalogo.activarOferta(o.id);
    peticion.subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.banner.set({
          texto: o.activo
            ? `${o.nombre} deja de ofrecerse al dar de alta. Los contratos que ya lo tienen no cambian.`
            : `${o.nombre} vuelve a ofrecerse.`,
          error: false,
        });
        this.cargar();
      },
      error: (e) => {
        this.procesandoId.set(null);
        this.banner.set({ texto: this.mensajeAccion(e), error: true });
      },
    });
  }

  private mensajeDeError(e: HttpError): string {
    return mensajeError(e, {
      porEstado: { 403: 'No tienes permiso para ver el catálogo de servicios.' },
      generico: () => `No se pudo cargar el catálogo (${e.status ?? 'error'}).`,
    });
  }

  private mensajeAccion(e: HttpError): string {
    return mensajeError(e, {
      porEstado: {
        409: 'Ya existe un servicio con ese código.',
        422: () => e.error?.message ?? 'No se pudo: revisa que la modalidad de cobro sea compatible con el tipo de servicio.',
        400: () => this.mensajeValidacion(e),
        403: 'Solo un administrador puede mantener el catálogo de servicios.',
        404: 'Ese servicio ya no existe; recarga la página.',
      },
      generico: 'No se pudo guardar el servicio.',
    });
  }

  private mensajeValidacion(e: HttpError): string {
    const errores = e.error?.errors ?? [];
    if (errores.length) {
      const detalle = errores
        .map((f) => `${this.etiqueta(f.field)}: ${f.defaultMessage}`)
        .join(' · ');
      return 'Revisa los datos. ' + detalle + '.';
    }
    return e.error?.message ?? 'Revisa los datos: hay algún campo inválido.';
  }

  private etiqueta(campo?: string): string {
    switch (campo) {
      case 'codigo': return 'código';
      case 'nombre': return 'nombre';
      case 'descripcion': return 'descripción';
      case 'tipoCodigo': return 'tipo de servicio';
      case 'modalidadCobro': return 'modalidad de cobro';
      case 'precioReferencial': return 'precio';
      default: return campo ?? 'dato';
    }
  }
}
