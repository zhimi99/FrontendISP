import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { PlanesService } from '../../core/services/planes.service';
import { PlanCatalogo } from '../../core/models/contratos.model';

/** El detalle que Spring pone en el cuerpo de un 400 con include-binding-errors. */
interface HttpError {
  status?: number;
  error?: {
    message?: string;
    errors?: { field?: string; defaultMessage?: string }[];
  };
}

/**
 * Catálogo comercial: qué planes se venden y a qué precio.
 *
 * <p>Las velocidades se piden en <b>Mbps</b> porque es como se venden, y se envían en
 * kbps porque es la unidad del perfil de RADIUS. La conversión se hace aquí para que
 * nadie tenga que escribir 30720 en un formulario comercial.
 *
 * <p>Dos consecuencias que la pantalla dice en voz alta, porque no son evidentes:
 * cambiar el precio rige desde la <b>siguiente</b> facturación (las facturas emitidas
 * conservan su total, y muchas ya están autorizadas por el SRI), y cambiar la velocidad
 * no llega a la red hasta que el abonado se resincroniza.
 */
@Component({
  selector: 'app-config-planes',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './planes.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class PlanesComponent {
  private readonly planes = inject(PlanesService);

  readonly lista = signal<PlanCatalogo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);
  readonly procesandoId = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    // ?todos=true: aquí sí se ven los retirados, es donde se vuelven a ofrecer.
    this.planes.listar(true).subscribe({
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
  }

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando planes…';
    if (this.error()) return this.error()!;
    return 'Todavía no hay planes en el catálogo.';
  });

  moneda(v: number): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(v ?? 0);
  }

  /* ---------- Alta y edición ---------- */
  readonly editando = signal<PlanCatalogo | null>(null);
  readonly creando = signal(false);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly pCodigo = signal('');
  readonly pNombre = signal('');
  readonly pBajada = signal(30);
  readonly pSubida = signal(15);
  readonly pPrecio = signal(0);

  abrir(p: PlanCatalogo | null) {
    this.banner.set(null);
    this.errorForm.set(null);
    this.pCodigo.set(p?.codigo ?? '');
    this.pNombre.set(p?.nombre ?? '');
    this.pBajada.set(p ? this.aMbps(p.velocidadBajadaKbps) : 30);
    this.pSubida.set(p ? this.aMbps(p.velocidadSubidaKbps) : 15);
    this.pPrecio.set(p?.precioMensual ?? 0);
    this.editando.set(p);
    this.creando.set(p === null);
  }

  cerrar() {
    if (this.guardando()) return;
    this.editando.set(null);
    this.creando.set(false);
  }

  /** Mbps con dos decimales: 30720 kbps → 30, 1536 kbps → 1.5. */
  private aMbps(kbps: number): number {
    return Math.round((kbps / 1024) * 100) / 100;
  }

  private aKbps(mbps: number): number {
    return Math.round(Number(mbps) * 1024);
  }

  /** Igual que la @Pattern del backend en CrearPlanRequest: sin esto el 400 dice poco. */
  private static readonly CODIGO_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

  guardar() {
    if (!this.pNombre().trim() || (this.creando() && !this.pCodigo().trim())) {
      this.errorForm.set('El código y el nombre son obligatorios.');
      return;
    }
    if (this.creando() && !PlanesComponent.CODIGO_VALIDO.test(this.pCodigo().trim())) {
      this.errorForm.set('El código solo admite letras, dígitos, punto, guion y guion bajo. Sin espacios.');
      return;
    }
    if (this.aKbps(this.pBajada()) < 128 || this.aKbps(this.pSubida()) < 128) {
      this.errorForm.set('Las velocidades no pueden ser menores de 0,125 Mbps (128 kbps).');
      return;
    }
    if (this.aKbps(this.pBajada()) > 10_000_000 || this.aKbps(this.pSubida()) > 10_000_000) {
      this.errorForm.set('Las velocidades no pueden pasar de 10 000 Mbps (10 Gbps).');
      return;
    }
    if (Number(this.pPrecio()) < 0) {
      this.errorForm.set('El precio no puede ser negativo.');
      return;
    }

    const datos = {
      nombre: this.pNombre().trim(),
      velocidadBajadaKbps: this.aKbps(this.pBajada()),
      velocidadSubidaKbps: this.aKbps(this.pSubida()),
      precioMensual: Number(this.pPrecio()),
    };

    this.guardando.set(true);
    this.errorForm.set(null);
    const editado = this.editando();
    const peticion = editado
      ? this.planes.editar(editado.id, datos)
      : this.planes.crear({ codigo: this.pCodigo().trim(), ...datos });

    peticion.subscribe({
      next: (p) => {
        this.guardando.set(false);
        this.cerrar();
        this.banner.set({
          texto: editado
            ? `Plan ${p.codigo} actualizado. El precio nuevo rige desde la siguiente facturación.`
            : `Plan ${p.codigo} creado y disponible en el alta de clientes.`,
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

  cambiarEstado(p: PlanCatalogo) {
    this.banner.set(null);
    this.procesandoId.set(p.id);
    const peticion = p.activo ? this.planes.desactivar(p.id) : this.planes.activar(p.id);
    peticion.subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.banner.set({
          texto: p.activo
            ? `${p.codigo} deja de ofrecerse en el alta. Los contratos que ya lo tenían no cambian.`
            : `${p.codigo} vuelve a ofrecerse.`,
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
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'No tienes permiso para ver el catálogo de planes.';
    return `No se pudo cargar el catálogo (${e.status ?? 'error'}).`;
  }

  private mensajeAccion(e: HttpError): string {
    if (e.status === 409) return 'Ya existe un plan con ese código.';
    if (e.status === 422) {
      return 'No se pudo: o el plan todavía lo tienen contratos activos, o ya estaba en ese estado.';
    }
    if (e.status === 400) return this.mensajeValidacion(e);
    if (e.status === 403) return 'Solo un administrador puede mantener el catálogo de planes.';
    if (e.status === 404) return 'Ese plan ya no existe; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo guardar el plan.';
  }

  /**
   * Convierte el 400 del backend en algo que el operador entienda. Spring devuelve
   * `errors[]` cuando activamos server.error.include-binding-errors: cada elemento
   * trae el campo y el mensaje declarado en el DTO. Si no vino la lista, se muestra
   * `message`, y si tampoco, un mensaje genérico —pero eso ya no debería pasar—.
   */
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
      case 'velocidadBajadaKbps': return 'bajada';
      case 'velocidadSubidaKbps': return 'subida';
      case 'precioMensual': return 'precio';
      default: return campo ?? 'dato';
    }
  }
}
