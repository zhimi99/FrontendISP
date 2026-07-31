import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { IconComponent } from '../../shared/icon';
import { ClientesService } from '../../core/services/clientes.service';
import { PlanesService } from '../../core/services/planes.service';
import { AltaClienteRequest, PlanCatalogo } from '../../core/models/contratos.model';

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
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly clientesService = inject(ClientesService);
  private readonly planesService = inject(PlanesService);

  /** Catálogo real (GET /api/planes). */
  readonly planes = signal<PlanCatalogo[]>([]);
  readonly diasCorte = Array.from({ length: 28 }, (_, i) => i + 1);

  readonly enviado = signal(false);
  readonly enviando = signal(false);
  readonly guardado = signal(false);
  readonly errorAlta = signal<string | null>(null);
  /** Código real asignado por el backend al guardar. */
  readonly codigoNuevo = signal('');

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
    plan: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    diaCorte: this.fb.control(5, { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.planesService.listar().subscribe({
      next: (p) => this.planes.set(p),
      error: () => this.errorAlta.set('No se pudo cargar el catálogo de planes desde el gateway.'),
    });
  }

  private readonly valor = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly esEmpresa = computed(() => this.valor().tipoCliente === 'EMPRESA');

  /** Plan seleccionado, buscado por su código (el value del selector). */
  readonly planSel = computed(() => this.planes().find((p) => p.codigo === this.valor().plan) ?? null);

  readonly totales = computed(() => {
    const precio = this.planSel()?.precioMensual ?? 0;
    const iva = Math.round(precio * 0.15 * 100) / 100;
    return { precio, iva, total: Math.round((precio + iva) * 100) / 100 };
  });

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

  onPlanChange() {
    // La vista previa se actualiza sola vía la señal `valor`.
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
    this.clientesService.crear(this.construirRequest()).subscribe({
      next: (r) => {
        this.codigoNuevo.set(r.clienteCodigo);
        this.guardado.set(true);
        this.enviando.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (e) => {
        this.errorAlta.set(this.mensajeDeError(e));
        this.enviando.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
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
      planCodigo: v.plan,
      diaCorte: Number(v.diaCorte),
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

  crearOtro() {
    this.form.reset({ tipoCliente: 'PERSONA', tipoId: 'CEDULA', diaCorte: 5 });
    this.enviado.set(false);
    this.guardado.set(false);
    this.errorAlta.set(null);
    this.codigoNuevo.set('');
  }

  irADetalle() {
    this.router.navigate(['/clientes', this.codigoNuevo()]);
  }

  irALista() {
    this.router.navigate(['/clientes']);
  }
}
