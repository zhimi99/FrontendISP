import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { RedService } from '../../core/services/red.service';
import { AuthService } from '../../core/services/auth.service';
import { AbonadoRed, AbonadoRedResumen, RESULTADO_RED_TONO } from '../../core/models/red.model';

/**
 * Red: el estado de cada contrato en el RADIUS. Lo que importa de esta pantalla es la
 * columna "sincronizado": si el perfil aplicado no es el deseado, el cliente tiene un
 * servicio distinto del que le corresponde —cortado debiendo poco, o navegando sin
 * pagar— y hay que forzar la re-sincronización.
 *
 * MS-RED trabaja sobre todo por eventos (servicio.*); esta pantalla es la ventana para
 * ver por qué un abonado está como está y para reaplicar el perfil a mano.
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
  private readonly auth = inject(AuthService);

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
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver el estado de red.';
    if (e.status) return `El gateway respondió ${e.status} al cargar la red.`;
    return 'Error inesperado cargando el estado de red.';
  }

  private mensajeAccion(e: { status?: number }): string {
    if (e.status === 403) return 'Tu rol no tiene permiso para re-sincronizar.';
    if (e.status === 404) return 'Ese contrato ya no tiene estado de red.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo re-sincronizar el abonado.';
  }
}
