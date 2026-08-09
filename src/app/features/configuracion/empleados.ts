import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { UsuariosService } from '../../core/services/usuarios.service';
import {
  CrearEmpleadoRequest,
  EditarEmpleadoRequest,
  EmpleadoFicha,
  ROL_BACKEND_ETIQUETA,
  RolBackend,
} from '../../core/models/auth.model';

/**
 * Plantilla de empleados: alta, ficha y quién sigue trabajando.
 *
 * <p><b>El alta crea la cuenta de verdad.</b> Este formulario no solo escribe una fila:
 * MS-USUARIOS crea la credencial de acceso con su rol y una contraseña temporal, y
 * solo entonces guarda la ficha. Si algo falla por el camino, no queda nada a medias
 * — ni cuenta sin ficha ni ficha sin cuenta.
 *
 * <p><b>Lo que sigue sin poder hacerse desde aquí.</b> Cambiar el rol de alguien que ya
 * existe no tiene pantalla propia todavía; se asigna en el alta porque una cuenta sin
 * rol entra al sistema y no puede hacer nada.
 *
 * <p>Y nadie se borra: quien se va se da de baja. Sus pagos, cierres de caja y órdenes
 * lo referencian por id. Darlo de baja además <b>deshabilita su cuenta</b>, así que deja
 * de poder entrar en el mismo acto.
 */
@Component({
  selector: 'app-config-empleados',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './empleados.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class EmpleadosComponent {
  private readonly usuarios = inject(UsuariosService);

  readonly rolEtiqueta = ROL_BACKEND_ETIQUETA;
  readonly roles: RolBackend[] = ['ADMIN', 'FINANZAS', 'COBRANZAS', 'TECNICO', 'SOPORTE'];

  private readonly empleados = signal<EmpleadoFicha[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly q = signal('');
  readonly verInactivos = signal(true);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);
  readonly procesandoId = signal<number | null>(null);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.usuarios.listar().subscribe({
      next: (lista) => {
        this.empleados.set(lista);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.empleados.set([]);
        this.cargando.set(false);
      },
    });
  }

  /* ---------- Resumen ---------- */
  get total() {
    return this.empleados().length;
  }
  get activos() {
    return this.empleados().filter((e) => e.activo).length;
  }
  get inactivos() {
    return this.empleados().filter((e) => !e.activo).length;
  }

  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    return this.empleados().filter((e) => {
      if (!this.verInactivos() && !e.activo) return false;
      if (!term) return true;
      return `${e.nombres} ${e.apellidos} ${e.usuario} ${e.cedula} ${e.cargo ?? ''}`
        .toLowerCase()
        .includes(term);
    });
  });

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando empleados…';
    if (this.error()) return this.error()!;
    return 'No hay empleados con los filtros aplicados.';
  });

  nombre(e: EmpleadoFicha): string {
    return `${e.nombres} ${e.apellidos}`.trim();
  }

  /* ---------- Alta ---------- */
  readonly creando = signal(false);
  readonly guardandoAlta = signal(false);
  readonly errorAlta = signal<string | null>(null);
  readonly nUsuario = signal('');
  readonly nCedula = signal('');
  readonly nNombres = signal('');
  readonly nApellidos = signal('');
  readonly nEmail = signal('');
  readonly nTelefono = signal('');
  readonly nCargo = signal('');
  readonly nRol = signal<RolBackend>('SOPORTE');
  readonly nPassword = signal('');

  abrirAlta() {
    this.banner.set(null);
    this.errorAlta.set(null);
    this.nUsuario.set('');
    this.nCedula.set('');
    this.nNombres.set('');
    this.nApellidos.set('');
    this.nEmail.set('');
    this.nTelefono.set('');
    this.nCargo.set('');
    this.nRol.set('SOPORTE');
    this.nPassword.set('');
    this.creando.set(true);
  }

  cerrarAlta() {
    if (this.guardandoAlta()) return;
    this.creando.set(false);
  }

  /**
   * Propone `nombre.apellido` a partir de lo que ya se escribió. Es una comodidad, no
   * una regla: el campo sigue siendo editable, porque los nombres compuestos y los
   * homónimos no los resuelve ninguna fórmula.
   */
  sugerirUsuario() {
    if (this.nUsuario().trim()) return;
    const limpio = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        // Quita las tildes: 'Sofía' → 'sofia'. El backend no las admite en el usuario.
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
    const n = limpio(this.nNombres().split(' ')[0] ?? '');
    const a = limpio(this.nApellidos().split(' ')[0] ?? '');
    if (n && a) this.nUsuario.set(`${n}.${a}`);
  }

  guardarAlta() {
    const faltan = !this.nUsuario().trim() || !this.nCedula().trim()
      || !this.nNombres().trim() || !this.nApellidos().trim() || !this.nEmail().trim();
    if (faltan) {
      this.errorAlta.set('Usuario, cédula, nombre, apellidos y correo son obligatorios.');
      return;
    }
    if (this.nPassword().trim().length < 8) {
      this.errorAlta.set('La contraseña temporal necesita al menos 8 caracteres.');
      return;
    }

    const req: CrearEmpleadoRequest = {
      usuario: this.nUsuario().trim().toLowerCase(),
      cedula: this.nCedula().trim(),
      nombres: this.nNombres().trim(),
      apellidos: this.nApellidos().trim(),
      email: this.nEmail().trim(),
      telefono: this.nTelefono().trim() || null,
      cargo: this.nCargo().trim() || null,
      rol: this.nRol(),
      passwordTemporal: this.nPassword(),
      fechaIngreso: null,
    };

    this.guardandoAlta.set(true);
    this.errorAlta.set(null);
    this.usuarios.crear(req).subscribe({
      next: (creado) => {
        this.guardandoAlta.set(false);
        this.creando.set(false);
        this.banner.set({
          texto: `${this.nombre(creado)} ya puede entrar con el usuario «${creado.usuario}». `
            + 'Entrégale la contraseña temporal: se le pedirá cambiarla al iniciar sesión.',
          error: false,
        });
        this.cargar();
      },
      error: (err) => {
        this.guardandoAlta.set(false);
        this.errorAlta.set(this.mensajeAlta(err));
      },
    });
  }

  /* ---------- Editar ficha ---------- */
  readonly editando = signal<EmpleadoFicha | null>(null);
  readonly guardando = signal(false);
  readonly errorEdicion = signal<string | null>(null);
  readonly fNombres = signal('');
  readonly fApellidos = signal('');
  readonly fEmail = signal('');
  readonly fTelefono = signal('');
  readonly fCargo = signal('');

  abrirEdicion(e: EmpleadoFicha) {
    this.banner.set(null);
    this.errorEdicion.set(null);
    this.fNombres.set(e.nombres);
    this.fApellidos.set(e.apellidos);
    this.fEmail.set(e.email ?? '');
    this.fTelefono.set(e.telefono ?? '');
    this.fCargo.set(e.cargo ?? '');
    this.editando.set(e);
  }

  cerrarEdicion() {
    if (this.guardando()) return;
    this.editando.set(null);
  }

  guardarEdicion() {
    const e = this.editando();
    if (!e) return;
    if (!this.fNombres().trim() || !this.fApellidos().trim()) {
      this.errorEdicion.set('El nombre y los apellidos son obligatorios.');
      return;
    }
    const req: EditarEmpleadoRequest = {
      nombres: this.fNombres().trim(),
      apellidos: this.fApellidos().trim(),
      email: this.fEmail().trim() || null,
      telefono: this.fTelefono().trim() || null,
      cargo: this.fCargo().trim() || null,
    };
    this.guardando.set(true);
    this.errorEdicion.set(null);
    this.usuarios.editar(e.id, req).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(null);
        this.banner.set({ texto: `Ficha de ${req.nombres} ${req.apellidos} actualizada.`, error: false });
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorEdicion.set(this.mensajeAccion(err));
      },
    });
  }

  /* ---------- Alta y baja ---------- */
  cambiarEstado(e: EmpleadoFicha) {
    if (this.procesandoId() != null) return;
    this.banner.set(null);
    this.procesandoId.set(e.id);
    const peticion = e.activo ? this.usuarios.desactivar(e.id) : this.usuarios.activar(e.id);
    peticion.subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.banner.set({
          texto: e.activo
            ? `${this.nombre(e)} queda dado de baja y su cuenta deshabilitada. Su histórico se conserva.`
            : `${this.nombre(e)} vuelve a estar activo y puede entrar de nuevo.`,
          error: false,
        });
        this.cargar();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.banner.set({ texto: this.mensajeAccion(err), error: true });
      },
    });
  }

  fecha(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(f.getTime())) return '—';
    const d2 = (n: number) => String(n).padStart(2, '0');
    return `${d2(f.getDate())}/${d2(f.getMonth() + 1)}/${f.getFullYear()}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Solo un administrador puede ver la plantilla.';
    if (e.status) return `El gateway respondió ${e.status} al cargar la plantilla.`;
    return 'Error inesperado cargando la plantilla.';
  }

  /**
   * El 502 se explica aparte: significa que el proveedor de identidad falló, y lo
   * importante que hay que decirle a quien está delante es que NO se creó nada a medias.
   */
  private mensajeAlta(e: { status?: number }): string {
    if (e.status === 409) return 'Ese usuario o esa cédula ya están registrados.';
    if (e.status === 400) return 'Revisa los datos: usuario en minúsculas, cédula de 10 a 13 dígitos, correo válido y contraseña de 8 caracteres o más.';
    if (e.status === 403) return 'Solo un administrador puede dar de alta a un empleado.';
    if (e.status === 502) return 'No se pudo crear la cuenta de acceso, así que no se creó ni la cuenta ni la ficha. Inténtalo de nuevo en un momento.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo dar de alta al empleado.';
  }

  private mensajeAccion(e: { status?: number }): string {
    if (e.status === 422) return 'El empleado ya estaba en ese estado; recarga la página.';
    if (e.status === 400) return 'Revisa los datos: hay algún campo inválido (¿el correo?).';
    if (e.status === 403) return 'Solo un administrador puede mantener la plantilla.';
    if (e.status === 404) return 'Ese empleado ya no existe; recarga la página.';
    if (e.status === 502) return 'No se pudo aplicar el cambio en la cuenta de acceso, así que tampoco se guardó aquí.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo completar la operación.';
  }
}
