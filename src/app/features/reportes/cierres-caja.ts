import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { FinanzasService } from '../../core/services/finanzas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { CierreCaja, CierresReporte } from '../../core/models/finanzas.model';

type Periodo = 'DIARIO' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Reporte de cierres de caja por período (diario / mensual / trimestral / anual).
 * El período se traduce a un rango de fechas que resuelve MS-FINANZAS (GET
 * /api/cajas/cierres). Pensado para imprimirse a PDF: los controles llevan `.no-print`
 * y hay un encabezado `.print-only` con el título, el período y la fecha de generación.
 */
@Component({
  selector: 'app-cierres-caja',
  standalone: true,
  imports: [FormsModule, IconComponent, RouterLink],
  templateUrl: './cierres-caja.html',
  styleUrls: ['../clientes/clientes.scss', './cierres-caja.scss'],
})
export class CierresCajaComponent {
  private readonly finanzas = inject(FinanzasService);
  private readonly usuarios = inject(UsuariosService);

  readonly periodos: { valor: Periodo; etq: string }[] = [
    { valor: 'DIARIO', etq: 'Diario' },
    { valor: 'MENSUAL', etq: 'Mensual' },
    { valor: 'TRIMESTRAL', etq: 'Trimestral' },
    { valor: 'ANUAL', etq: 'Anual' },
  ];
  readonly trimestres = [1, 2, 3, 4];

  private readonly hoy = new Date();
  readonly periodo = signal<Periodo>('MENSUAL');
  readonly dia = signal(this.fmt(this.hoy));
  readonly mes = signal(`${this.hoy.getFullYear()}-${this.dos(this.hoy.getMonth() + 1)}`);
  readonly anio = signal(this.hoy.getFullYear());
  readonly trimestre = signal(Math.floor(this.hoy.getMonth() / 3) + 1);

  readonly reporte = signal<CierresReporte | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly generadoEn = signal<Date>(new Date());
  private readonly cajeroNombres = signal<Map<number, string>>(new Map());

  /** Años disponibles en el selector (los últimos 6). */
  readonly anios = Array.from({ length: 6 }, (_, i) => this.hoy.getFullYear() - i);

  constructor() {
    this.generar();
  }

  /** Rango [desde, hasta] en yyyy-MM-dd según el período elegido. */
  readonly rango = computed<{ desde: string; hasta: string } | null>(() => {
    switch (this.periodo()) {
      case 'DIARIO': {
        const d = this.dia();
        return d ? { desde: d, hasta: d } : null;
      }
      case 'MENSUAL': {
        const m = this.mes();
        if (!m || m.length < 7) return null;
        const [y, mm] = m.split('-').map(Number);
        return { desde: `${m}-01`, hasta: this.ultimoDia(y, mm) };
      }
      case 'TRIMESTRAL': {
        const y = this.anio();
        const m1 = (this.trimestre() - 1) * 3 + 1;
        return { desde: `${y}-${this.dos(m1)}-01`, hasta: this.ultimoDia(y, m1 + 2) };
      }
      default: {
        const y = this.anio();
        return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
      }
    }
  });

  /** Descripción legible del período, para pantalla e impresión. */
  readonly periodoLabel = computed(() => {
    switch (this.periodo()) {
      case 'DIARIO':
        return `Diario · ${this.fechaLegible(this.dia())}`;
      case 'MENSUAL': {
        const [y, mm] = this.mes().split('-').map(Number);
        return `Mensual · ${MESES[mm - 1]} ${y}`;
      }
      case 'TRIMESTRAL':
        return `Trimestral · T${this.trimestre()} ${this.anio()}`;
      default:
        return `Anual · ${this.anio()}`;
    }
  });

  setPeriodo(p: Periodo) {
    this.periodo.set(p);
    this.generar();
  }

  generar() {
    const r = this.rango();
    if (!r) return;
    this.cargando.set(true);
    this.error.set(null);
    this.finanzas.reporteCierres(r.desde, r.hasta).subscribe({
      next: (rep) => {
        this.reporte.set(rep);
        this.generadoEn.set(new Date());
        this.cargando.set(false);
        this.resolverCajeros(rep.cierres);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.reporte.set(null);
        this.cargando.set(false);
      },
    });
  }

  imprimir() {
    window.print();
  }

  /* ---------- Derivados de la vista ---------- */
  efectivoRecaudado(c: CierreCaja): number {
    return (c.montoFinalSistema ?? 0) - (c.montoInicial ?? 0);
  }
  cajeroNombre(c: CierreCaja): string {
    return this.cajeroNombres().get(c.usuarioId) ?? `Cajero #${c.usuarioId}`;
  }
  difTono(dif: number): string {
    if (dif < 0) return 'danger';
    if (dif > 0) return 'warn';
    return 'ok';
  }
  difEtq(dif: number): string {
    if (dif < 0) return `Faltante ${this.moneda(Math.abs(dif))}`;
    if (dif > 0) return `Sobrante ${this.moneda(dif)}`;
    return 'Cuadrada';
  }

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando cierres…';
    if (this.error()) return this.error()!;
    return 'No hubo cierres de caja en el período seleccionado.';
  });

  /* ---------- Resolución de nombres de cajeros ---------- */
  private resolverCajeros(cierres: CierreCaja[]) {
    const ya = this.cajeroNombres();
    const faltan = [...new Set(cierres.map((c) => c.usuarioId).filter((id) => id != null && !ya.has(id)))];
    if (!faltan.length) return;
    // Una sola llamada al padrón reducido resuelve todos los ids que falten.
    this.usuarios.resumenes(false).pipe(catchError(() => of([]))).subscribe((lista) => {
      const m = new Map(this.cajeroNombres());
      lista.forEach((u) => m.set(u.id, u.nombreCompleto));
      this.cajeroNombres.set(m);
    });
  }

  /* ---------- Utilidades de fecha/moneda ---------- */
  private dos(n: number): string {
    return String(n).padStart(2, '0');
  }
  private fmt(d: Date): string {
    return `${d.getFullYear()}-${this.dos(d.getMonth() + 1)}-${this.dos(d.getDate())}`;
  }
  private ultimoDia(anio: number, mes1: number): string {
    return this.fmt(new Date(anio, mes1, 0)); // día 0 del mes siguiente = último del mes
  }
  fechaLegible(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(f.getTime())) return '—';
    return `${this.dos(f.getDate())}/${this.dos(f.getMonth() + 1)}/${f.getFullYear()}`;
  }
  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${this.dos(f.getDate())}/${this.dos(f.getMonth() + 1)}/${f.getFullYear()} ${this.dos(f.getHours())}:${this.dos(f.getMinutes())}`;
  }
  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver los cierres de caja.';
    if (e.status) return `El gateway respondió ${e.status} al cargar el reporte.`;
    return 'Error inesperado cargando el reporte.';
  }
}
