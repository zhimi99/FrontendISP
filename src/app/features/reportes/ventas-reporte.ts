import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { VentasService } from '../../core/services/ventas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { Venta, VentasReporte } from '../../core/models/ventas.model';

type Periodo = 'HOY' | 'AYER' | 'SEMANA' | 'MES' | 'PERSONALIZADO';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Reporte de ventas de mostrador por período (hoy / ayer / esta semana / mensual /
 * personalizado). Proceso DELIBERADAMENTE aparte de Cobranzas: aquello es abrir una
 * caja e ir cobrando la jornada; esto es "qué se vendió" en cualquier rango de
 * fechas, sin caja de por medio (GET /api/ventas/reporte). Pensado para
 * imprimirse a PDF, igual que el reporte de cierres de caja.
 */
@Component({
  selector: 'app-ventas-reporte',
  standalone: true,
  imports: [FormsModule, IconComponent, RouterLink],
  templateUrl: './ventas-reporte.html',
  styleUrls: ['../clientes/clientes.scss', './cierres-caja.scss', './ventas-reporte.scss'],
})
export class VentasReporteComponent {
  private readonly ventasService = inject(VentasService);
  private readonly usuarios = inject(UsuariosService);

  readonly periodos: { valor: Periodo; etq: string }[] = [
    { valor: 'HOY', etq: 'Hoy' },
    { valor: 'AYER', etq: 'Ayer' },
    { valor: 'SEMANA', etq: 'Esta semana' },
    { valor: 'MES', etq: 'Mensual' },
    { valor: 'PERSONALIZADO', etq: 'Personalizado' },
  ];

  private readonly hoy = new Date();
  readonly periodo = signal<Periodo>('HOY');
  readonly mes = signal(`${this.hoy.getFullYear()}-${this.dos(this.hoy.getMonth() + 1)}`);
  readonly desdePersonalizado = signal(this.fmt(this.hoy));
  readonly hastaPersonalizado = signal(this.fmt(this.hoy));

  readonly reporte = signal<VentasReporte | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly generadoEn = signal<Date>(new Date());
  private readonly vendedorNombres = signal<Map<number, string>>(new Map());

  /** Años disponibles no hace falta aquí: el mes ya trae su propio año en el input. */

  constructor() {
    this.generar();
  }

  /** Rango [desde, hasta] en yyyy-MM-dd según el período elegido. */
  readonly rango = computed<{ desde: string; hasta: string } | null>(() => {
    switch (this.periodo()) {
      case 'HOY': {
        const h = this.fmt(this.hoy);
        return { desde: h, hasta: h };
      }
      case 'AYER': {
        const a = this.fmt(this.sumarDias(this.hoy, -1));
        return { desde: a, hasta: a };
      }
      case 'SEMANA': {
        return { desde: this.fmt(this.inicioDeSemana(this.hoy)), hasta: this.fmt(this.hoy) };
      }
      case 'MES': {
        const m = this.mes();
        if (!m || m.length < 7) return null;
        const [y, mm] = m.split('-').map(Number);
        return { desde: `${m}-01`, hasta: this.ultimoDia(y, mm) };
      }
      default: {
        const d = this.desdePersonalizado();
        const h = this.hastaPersonalizado();
        return d && h && d <= h ? { desde: d, hasta: h } : null;
      }
    }
  });

  /** Descripción legible del período, para pantalla e impresión. */
  readonly periodoLabel = computed(() => {
    const r = this.rango();
    switch (this.periodo()) {
      case 'HOY':
        return `Hoy · ${this.fechaLegible(r?.desde ?? null)}`;
      case 'AYER':
        return `Ayer · ${this.fechaLegible(r?.desde ?? null)}`;
      case 'SEMANA':
        return r ? `Esta semana · ${this.fechaLegible(r.desde)} al ${this.fechaLegible(r.hasta)}` : 'Esta semana';
      case 'MES': {
        const [y, mm] = this.mes().split('-').map(Number);
        return `Mensual · ${MESES[mm - 1]} ${y}`;
      }
      default:
        return r ? `Del ${this.fechaLegible(r.desde)} al ${this.fechaLegible(r.hasta)}` : 'Personalizado';
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
    this.ventasService.reporte(r.desde, r.hasta).subscribe({
      next: (rep) => {
        this.reporte.set(rep);
        this.generadoEn.set(new Date());
        this.cargando.set(false);
        this.resolverVendedores(rep.ventas);
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
  tipoCompradorEtq(v: Venta): string {
    return v.consumidorFinal ? 'Consumidor final' : 'Cliente identificado';
  }
  tipoCompradorTono(v: Venta): string {
    return v.consumidorFinal ? 'warn' : 'ok';
  }
  vendedorNombre(v: Venta): string {
    if (v.usuarioId == null) return '—';
    return this.vendedorNombres().get(v.usuarioId) ?? `Usuario #${v.usuarioId}`;
  }

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando ventas…';
    if (this.error()) return this.error()!;
    return 'No hubo ventas en el período seleccionado.';
  });

  /* ---------- Resolución de nombres de vendedores ---------- */
  private resolverVendedores(ventas: Venta[]) {
    const ya = this.vendedorNombres();
    const faltan = [
      ...new Set(ventas.map((v) => v.usuarioId).filter((id): id is number => id != null && !ya.has(id))),
    ];
    if (!faltan.length) return;
    this.usuarios.resumenes(false).pipe(catchError(() => of([]))).subscribe((lista) => {
      const m = new Map(this.vendedorNombres());
      lista.forEach((u) => m.set(u.id, u.nombreCompleto));
      this.vendedorNombres.set(m);
    });
  }

  /* ---------- Utilidades de fecha/moneda ---------- */
  private dos(n: number): string {
    return String(n).padStart(2, '0');
  }
  private fmt(d: Date): string {
    return `${d.getFullYear()}-${this.dos(d.getMonth() + 1)}-${this.dos(d.getDate())}`;
  }
  private sumarDias(d: Date, n: number): Date {
    const copia = new Date(d);
    copia.setDate(copia.getDate() + n);
    return copia;
  }
  /** El lunes de la semana de `d` (semana empieza en lunes, no en domingo). */
  private inicioDeSemana(d: Date): Date {
    const copia = new Date(d);
    const dia = copia.getDay(); // 0=domingo … 6=sábado
    const diff = dia === 0 ? -6 : 1 - dia;
    return this.sumarDias(copia, diff);
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
  moneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toFixed(2);
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver el reporte de ventas.';
    if (e.status) return `El gateway respondió ${e.status} al cargar el reporte.`;
    return 'Error inesperado cargando el reporte.';
  }
}
