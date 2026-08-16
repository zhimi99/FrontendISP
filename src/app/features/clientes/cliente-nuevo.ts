import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { IconComponent } from '../../shared/icon';
import { ClientesService } from '../../core/services/clientes.service';
import { AltaClienteRequest } from '../../core/models/contratos.model';

type TipoCliente = 'PERSONA' | 'EMPRESA';
type TipoId = 'CEDULA' | 'RUC' | 'PASAPORTE';

@Component({
  selector: 'app-cliente-nuevo',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './cliente-nuevo.html',
  styleUrl: './cliente-nuevo.scss',
})
export class ClienteNuevoComponent {
  private static readonly MAX_TAMANO_IDENTIFICACION = 10 * 1024 * 1024;

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly clientesService = inject(ClientesService);

  readonly enviado = signal(false);
  readonly enviando = signal(false);
  readonly guardado = signal(false);
  readonly errorAlta = signal<string | null>(null);
  /** Código real asignado por el backend al guardar. */
  readonly codigoNuevo = signal('');
  /** Archivo opcional: se carga tras crear el cliente y obtener su código. */
  readonly archivoIdentificacion = signal<File | null>(null);
  readonly errorArchivoIdentificacion = signal<string | null>(null);
  readonly subiendoIdentificacion = signal(false);
  readonly identificacionCargada = signal(false);
  readonly errorCargaIdentificacion = signal<string | null>(null);

  readonly form = this.fb.group({
    tipoCliente: this.fb.control<TipoCliente>('PERSONA', { nonNullable: true }),
    tipoId: this.fb.control<TipoId>('CEDULA', { nonNullable: true }),
    identificacion: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{10}$/)],
    }),
    nombres: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    apellidos: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    razonSocial: this.fb.control('', { nonNullable: true }),
    telefono: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9()+\s-]{7,15}$/)],
    }),
    whatsapp: this.fb.control('', { nonNullable: true }),
    email: this.fb.control('', { nonNullable: true, validators: [Validators.email] }),
    direccion: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    referencia: this.fb.control('', { nonNullable: true }),
    latitud: this.fb.control('', { nonNullable: true }),
    longitud: this.fb.control('', { nonNullable: true }),
  });

  private readonly valor = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly esEmpresa = computed(() => this.valor().tipoCliente === 'EMPRESA');

  readonly nombrePreview = computed(() => {
    const v = this.valor();
    if (v.tipoCliente === 'EMPRESA') return (v.razonSocial || '').trim() || 'Razón social…';
    const n = `${v.nombres ?? ''} ${v.apellidos ?? ''}`.trim();
    return n || 'Nombre del cliente…';
  });

  readonly iniciales = computed(() => {
    const v = this.valor();
    const base =
      v.tipoCliente === 'EMPRESA' ? v.razonSocial || '' : `${v.nombres ?? ''} ${v.apellidos ?? ''}`;
    const p = base.replace(/(Cía\.|Ltda\.|S\.A\.)/gi, '').trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'NC';
  });

  readonly grupo = computed(() => (this.esEmpresa() ? 'Corporativo' : 'Residencial'));

  readonly tipoIdLabel = computed(() =>
    this.valor().tipoId === 'RUC' ? 'RUC' : this.valor().tipoId === 'PASAPORTE' ? 'Pasaporte' : 'Cédula',
  );

  setTipo(tipo: TipoCliente) {
    this.form.patchValue({ tipoCliente: tipo, tipoId: tipo === 'EMPRESA' ? 'RUC' : 'CEDULA' });
    this.aplicarValidadoresNombre(tipo);
    this.aplicarValidadorId(tipo === 'EMPRESA' ? 'RUC' : 'CEDULA');
  }

  onTipoIdChange(tipoId: TipoId) {
    this.form.patchValue({ tipoId });
    this.aplicarValidadorId(tipoId);
  }

  private aplicarValidadoresNombre(tipo: TipoCliente) {
    const nombres = this.form.controls.nombres;
    const apellidos = this.form.controls.apellidos;
    const razon = this.form.controls.razonSocial;
    if (tipo === 'EMPRESA') {
      nombres.clearValidators();
      apellidos.clearValidators();
      razon.setValidators([Validators.required]);
    } else {
      nombres.setValidators([Validators.required]);
      apellidos.setValidators([Validators.required]);
      razon.clearValidators();
    }
    nombres.updateValueAndValidity();
    apellidos.updateValueAndValidity();
    razon.updateValueAndValidity();
  }

  private aplicarValidadorId(tipoId: TipoId) {
    const ctrl = this.form.controls.identificacion;
    const patron =
      tipoId === 'RUC' ? /^\d{13}$/ : tipoId === 'PASAPORTE' ? /^[A-Za-z0-9]{5,20}$/ : /^\d{10}$/;
    ctrl.setValidators([Validators.required, Validators.pattern(patron)]);
    ctrl.updateValueAndValidity();
  }

  idHelp(): string {
    switch (this.valor().tipoId) {
      case 'RUC':
        return '13 dígitos';
      case 'PASAPORTE':
        return '5 a 20 caracteres';
      default:
        return '10 dígitos';
    }
  }

  err(nombre: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[nombre];
    return c.invalid && (c.touched || this.enviado());
  }

  guardar() {
    this.enviado.set(true);
    this.errorAlta.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      document.querySelector('.field.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    this.enviando.set(true);
    this.identificacionCargada.set(false);
    this.errorCargaIdentificacion.set(null);
    this.clientesService.crear(this.construirRequest()).subscribe({
      next: (r) => {
        this.codigoNuevo.set(r.clienteCodigo);
        const archivo = this.archivoIdentificacion();
        if (archivo) {
          this.cargarIdentificacion(r.clienteCodigo, archivo);
        } else {
          this.finalizarAlta();
        }
      },
      error: (e) => {
        this.errorAlta.set(this.mensajeDeError(e));
        this.enviando.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  /** Selección local; el backend vuelve a validar tamaño, MIME y firma real. */
  onArchivoIdentificacionSeleccionado(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorArchivoIdentificacion.set(null);
    this.identificacionCargada.set(false);
    this.errorCargaIdentificacion.set(null);

    if (!archivo) {
      this.archivoIdentificacion.set(null);
      return;
    }
    if (!this.esFormatoIdentificacionPermitido(archivo)) {
      this.archivoIdentificacion.set(null);
      this.errorArchivoIdentificacion.set('Usa una imagen JPG, PNG, WebP o un archivo PDF.');
      input.value = '';
      return;
    }
    if (archivo.size > ClienteNuevoComponent.MAX_TAMANO_IDENTIFICACION) {
      this.archivoIdentificacion.set(null);
      this.errorArchivoIdentificacion.set('El archivo no puede superar 10 MB.');
      input.value = '';
      return;
    }
    this.archivoIdentificacion.set(archivo);
  }

  quitarArchivoIdentificacion(input: HTMLInputElement) {
    input.value = '';
    this.archivoIdentificacion.set(null);
    this.errorArchivoIdentificacion.set(null);
    this.errorCargaIdentificacion.set(null);
    this.identificacionCargada.set(false);
  }

  reintentarCargaIdentificacion() {
    const archivo = this.archivoIdentificacion();
    const codigo = this.codigoNuevo();
    if (!archivo || !codigo || this.enviando()) return;

    this.enviando.set(true);
    this.errorCargaIdentificacion.set(null);
    this.cargarIdentificacion(codigo, archivo);
  }

  private cargarIdentificacion(codigo: string, archivo: File) {
    this.subiendoIdentificacion.set(true);
    this.clientesService.subirIdentificacion(codigo, archivo).subscribe({
      next: () => {
        this.identificacionCargada.set(true);
        this.subiendoIdentificacion.set(false);
        this.finalizarAlta();
      },
      error: (e) => {
        // El cliente ya existe: no se intenta crearlo de nuevo; se ofrece reintento.
        this.errorCargaIdentificacion.set(this.mensajeErrorIdentificacion(e));
        this.subiendoIdentificacion.set(false);
        this.finalizarAlta();
      },
    });
  }

  private finalizarAlta() {
    this.guardado.set(true);
    this.enviando.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private esFormatoIdentificacionPermitido(archivo: File): boolean {
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    return tipos.includes(archivo.type) || /\.(jpe?g|png|webp|pdf)$/i.test(archivo.name);
  }

  private construirRequest(): AltaClienteRequest {
    const v = this.form.getRawValue();
    const empresa = v.tipoCliente === 'EMPRESA';
    return {
      tipoCliente: v.tipoCliente,
      tipoIdentificacion: v.tipoId,
      identificacion: v.identificacion.trim(),
      nombres: empresa ? null : v.nombres.trim() || null,
      apellidos: empresa ? null : v.apellidos.trim() || null,
      razonSocial: empresa ? v.razonSocial.trim() || null : null,
      email: v.email.trim() || null,
      telefono: v.telefono.trim() || null,
      whatsapp: v.whatsapp.trim() || null,
      direccionTexto: v.direccion.trim(),
      referencia: v.referencia.trim() || null,
      latitud: this.numero(v.latitud),
      longitud: this.numero(v.longitud),
    };
  }

  private numero(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return isNaN(n) ? null : n;
  }

  private mensajeDeError(e: { status?: number; error?: { mensaje?: string } }): string {
    if (e.status === 409) return 'Ya existe un cliente con esa identificación.';
    if (e.status === 400) return e.error?.mensaje ?? 'Revisa los datos del formulario.';
    if (e.status === 403) return 'Tu rol no tiene permiso para dar de alta clientes.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo registrar el cliente. Inténtalo de nuevo.';
  }

  private mensajeErrorIdentificacion(e: {
    status?: number;
    error?: { mensaje?: string; detail?: string };
  }): string {
    if (e.status === 400) {
      return e.error?.detail ?? e.error?.mensaje ?? 'El archivo de identificación no es válido.';
    }
    if (e.status === 403) return 'Tu rol no tiene permiso para adjuntar la identificación.';
    if (e.status === 413) return 'El archivo supera el tamaño máximo permitido de 10 MB.';
    if (e.status === 503) return 'El almacenamiento de identificaciones no está disponible. Reintenta.';
    if (e.status === 0) return 'No se pudo contactar el gateway para subir la identificación.';
    return 'El cliente fue creado, pero no se pudo adjuntar su identificación. Reintenta la carga.';
  }

  crearOtro() {
    this.form.reset({ tipoCliente: 'PERSONA', tipoId: 'CEDULA' });
    this.enviado.set(false);
    this.guardado.set(false);
    this.errorAlta.set(null);
    this.codigoNuevo.set('');
    this.archivoIdentificacion.set(null);
    this.errorArchivoIdentificacion.set(null);
    this.subiendoIdentificacion.set(false);
    this.identificacionCargada.set(false);
    this.errorCargaIdentificacion.set(null);
  }

  /** Va a la ficha con el modal de "Agregar servicio" ya abierto: el paso natural tras crear el cliente. */
  irAAgregarServicio() {
    this.router.navigate(['/clientes', this.codigoNuevo()], { queryParams: { agregarServicio: 1 } });
  }

  irALista() {
    this.router.navigate(['/clientes']);
  }
}
