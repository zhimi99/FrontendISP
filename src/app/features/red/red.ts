import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { RedService } from '../../core/services/red.service';
import { GponService } from '../../core/services/gpon.service';
import { AuthService } from '../../core/services/auth.service';
import { AbonadoRed, AbonadoRedResumen, RESULTADO_RED_TONO } from '../../core/models/red.model';
import { AprovisionamientoGpon, AprovisionamientoResumen } from '../../core/models/gpon.model';
import { mensajeError } from '../../core/http/errores';

/**
 * Red: dos ventanas sobre el mismo territorio.
 *
 * "Sincronización" es el estado de cada contrato en el RADIUS: si el perfil
 * aplicado no es el deseado, el cliente tiene un servicio distinto del que le
 * corresponde —cortado debiendo poco, o navegando sin pagar— y hay que forzar
 * la re-sincronización.
 *
 * "Registro GPON" es la pantalla que reemplaza a la hoja de cálculo con la que
 * se instalaba antes: todo el parque de abonados de la OLT, buscable, con los
 * comandos de cada uno listos para copiar y pegar en la sesión de la OLT. Los
 * comandos se generan en el servidor (ver GponService); aquí solo se muestran
 * y se copian.
 */
@Component({
  selector: 'app-red',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './red.html',
  styleUrls: ['../clientes/clientes.scss', './red.scss'],
})
export class RedComponent {
  private readonly red = inject(RedService);
  private readonly gpon = inject(GponService);
  private readonly auth = inject(AuthService);

  readonly tabActiva = signal<0 | 1>(0);
  setTab(i: 0 | 1) {
    this.tabActiva.set(i);
    if (i === 1 && this.registro().length === 0) this.cargarRegistro();
  }

  /** Forzar la re-sincronización toca la red de verdad: operación reservada. */
  readonly puedeResincronizar = computed(() => this.auth.tieneRol('SOPORTE', 'ADMINISTRADOR'));
  readonly resultadoTono = RESULTADO_RED_TONO;

  private readonly abonados = signal<AbonadoRedResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly q = signal('');
  /** '' = todos; 'no' = solo desincronizados. */
  readonly filtroSync = signal<'' | 'no'>('');
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);
  readonly procesandoId = signal<number | null>(null);

  // Detalle con bitácora
  readonly detalle = signal<AbonadoRed | null>(null);
  readonly detalleCargando = signal(false);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.red.listarAbonados(this.filtroSync() === 'no' ? false : undefined).subscribe({
      next: (lista) => {
        this.abonados.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.abonados.set([]);
        this.cargando.set(false);
      },
    });
  }

  cambiarFiltro(v: '' | 'no') {
    this.filtroSync.set(v);
    this.cargar();
  }

  /* ---------- Resumen ---------- */
  get total() {
    return this.abonados().length;
  }
  get desincronizados() {
    return this.abonados().filter((a) => !a.sincronizado).length;
  }
  get activos() {
    return this.abonados().filter((a) => (a.estadoServicio ?? '').toUpperCase() === 'ACTIVO').length;
  }
  get cortados() {
    return this.abonados().filter((a) => {
      const e = (a.estadoServicio ?? '').toUpperCase();
      return e === 'CORTADO' || e === 'SUSPENDIDO';
    }).length;
  }

  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.abonados();
    return this.abonados().filter((a) =>
      `${a.contratoCodigo} ${a.pppoeUsuario ?? ''} ${a.perfilDeseado ?? ''} ${a.nasIdentificador ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  });

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando abonados…';
    if (this.error()) return this.error()!;
    if (this.filtroSync() === 'no') return 'Todos los abonados están sincronizados.';
    return 'No hay abonados de red registrados.';
  });

  /* ---------- Acciones ---------- */
  verDetalle(a: AbonadoRedResumen) {
    this.banner.set(null);
    this.detalleCargando.set(true);
    this.detalle.set(null);
    this.red.detalle(a.contratoId).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.detalleCargando.set(false);
      },
      error: () => {
        this.detalleCargando.set(false);
        this.banner.set({ texto: 'No se pudo cargar la bitácora de ese abonado.', error: true });
      },
    });
  }

  cerrarDetalle() {
    this.detalle.set(null);
  }

  resincronizar(a: AbonadoRedResumen) {
    if (this.procesandoId() != null) return;
    this.banner.set(null);
    this.procesandoId.set(a.contratoId);
    this.red.resincronizar(a.contratoId).subscribe({
      next: (d) => {
        this.procesandoId.set(null);
        this.banner.set({
          texto: d.sincronizado
            ? `${a.contratoCodigo} sincronizado: la red ya aplica el perfil ${d.perfilAplicado}.`
            : `${a.contratoCodigo} sigue sin sincronizar; revisa la bitácora.`,
          error: !d.sincronizado,
        });
        // Si el detalle abierto es el de este abonado, refléjalo también.
        if (this.detalle()?.contratoId === a.contratoId) this.detalle.set(d);
        this.cargar();
      },
      error: (e) => {
        this.procesandoId.set(null);
        this.banner.set({ texto: this.mensajeAccion(e), error: true });
      },
    });
  }

  /* ---------- Formato ---------- */
  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    const d2 = (n: number) => String(n).padStart(2, '0');
    return `${d2(f.getDate())}/${d2(f.getMonth() + 1)}/${f.getFullYear()} ${d2(f.getHours())}:${d2(f.getMinutes())}`;
  }

  tonoResultado(resultado: string | null): string {
    return this.resultadoTono[(resultado ?? '').toUpperCase()] ?? 'neutral';
  }

  private mensajeDeError(e: { status?: number }): string {
    return mensajeError(e, {
      porEstado: { 403: 'Tu rol no tiene permiso para ver el estado de red.' },
      generico: () => (e.status ? `El gateway respondió ${e.status} al cargar la red.` : 'Error inesperado cargando el estado de red.'),
    });
  }

  private mensajeAccion(e: { status?: number }): string {
    return mensajeError(e, {
      porEstado: {
        403: 'Tu rol no tiene permiso para re-sincronizar.',
        404: 'Ese contrato ya no tiene estado de red.',
      },
      generico: 'No se pudo re-sincronizar el abonado.',
    });
  }

  /* ================= Registro GPON: la pantalla que reemplaza al Excel ================= */

  readonly registro = signal<AprovisionamientoResumen[]>([]);
  readonly registroCargando = signal(false);
  readonly registroError = signal<string | null>(null);

  readonly qGpon = signal('');
  readonly tarjetaGpon = signal('');
  readonly estadoGpon = signal('');

  cargarRegistro() {
    this.registroCargando.set(true);
    this.registroError.set(null);
    this.gpon
      .listar({ tarjeta: this.tarjetaGpon() || null, estado: this.estadoGpon() || null, q: this.qGpon() })
      .subscribe({
        next: (filas) => {
          this.registro.set(filas);
          this.registroCargando.set(false);
        },
        error: (e) => {
          this.registroError.set(this.mensajeDeError(e));
          this.registroCargando.set(false);
        },
      });
  }

  buscarGpon() {
    this.cargarRegistro();
  }

  cambiarTarjetaGpon(v: string) {
    this.tarjetaGpon.set(v);
    this.cargarRegistro();
  }

  cambiarEstadoGpon(v: string) {
    this.estadoGpon.set(v);
    this.cargarRegistro();
  }

  limpiarFiltrosGpon() {
    this.qGpon.set('');
    this.tarjetaGpon.set('');
    this.estadoGpon.set('');
    this.cargarRegistro();
  }

  readonly totalGpon = computed(() => this.registro().length);
  readonly pendientesGpon = computed(
    () => this.registro().filter((a) => a.estado === 'PENDIENTE').length,
  );

  readonly mensajeTablaGpon = computed(() => {
    if (this.registroCargando()) return 'Cargando el registro…';
    if (this.registroError()) return this.registroError()!;
    return 'No hay abonados con esos filtros.';
  });

  /* ---------- Comandos de una fila ---------- */

  readonly comandosAbiertos = signal<AprovisionamientoGpon | null>(null);
  readonly comandosCargando = signal(false);
  readonly comandosError = signal<string | null>(null);
  readonly copiado = signal(false);
  readonly marcandoAplicado = signal(false);

  verComandos(fila: AprovisionamientoResumen) {
    this.comandosError.set(null);
    this.copiado.set(false);
    this.comandosCargando.set(true);
    this.comandosAbiertos.set(null);
    this.gpon.porContrato(fila.contratoCodigo).subscribe({
      next: (a) => {
        this.comandosCargando.set(false);
        if (!a) {
          this.comandosError.set('Este abonado ya no tiene aprovisionamiento GPON.');
          return;
        }
        this.comandosAbiertos.set(a);
      },
      error: (e) => {
        this.comandosCargando.set(false);
        this.comandosError.set(this.mensajeDeError(e));
      },
    });
  }

  cerrarComandos() {
    this.comandosAbiertos.set(null);
  }

  /** El "simple Ctrl+C" que se pide: todo el guion, listo para pegar en la OLT. */
  copiarGuion() {
    const a = this.comandosAbiertos();
    if (!a) return;
    navigator.clipboard.writeText(a.scriptCompleto).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
    });
  }

  marcarAplicado() {
    const a = this.comandosAbiertos();
    if (!a || a.contratoId == null) return;
    this.marcandoAplicado.set(true);
    this.gpon.confirmarAplicado(a.contratoId).subscribe({
      next: (actualizado) => {
        this.marcandoAplicado.set(false);
        this.comandosAbiertos.set(actualizado);
        this.cargarRegistro();
      },
      error: (e) => {
        this.marcandoAplicado.set(false);
        this.comandosError.set(this.mensajeDeError(e));
      },
    });
  }

  fecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC');
  }
}
