import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icon';
import { ClientesService } from '../../core/services/clientes.service';
import { ClienteListado } from '../../core/models/contratos.model';
import { ClienteFila, EstadoCliente, ESTADOS } from './clientes.data';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class ClientesComponent {
  private readonly clientesService = inject(ClientesService);
  readonly estadosMap = ESTADOS;

  /* -------- Datos reales (MS-CONTRATOS, vía gateway) -------- */
  private readonly datos = signal<ClienteFila[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /* -------- Filtros (signals) -------- */
  readonly q = signal('');
  readonly estado = signal<'' | EstadoCliente>('');
  readonly plan = signal('');

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  constructor() {
    this.clientesService.listar().subscribe({
      next: (lista) => {
        this.datos.set(lista.map((d) => this.aFila(d)));
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /* -------- Opciones de los selects (derivadas de los datos reales) -------- */
  readonly planes = computed(() =>
    [...new Set(this.datos().map((d) => d.plan))].filter((p) => p && p !== '—').sort(),
  );

  /* -------- Métricas -------- */
  get total() {
    return this.datos().length;
  }
  get activos() {
    return this.datos().filter((d) => d.estado === 'ACTIVO').length;
  }
  get suspendidos() {
    return this.datos().filter((d) => d.estado === 'SUSPENDIDO').length;
  }
  get cortados() {
    return this.datos().filter((d) => d.estado === 'CORTADO').length;
  }

  pct(n: number): string {
    return this.total ? ((n / this.total) * 100).toFixed(1) + '% del total' : '—';
  }

  /* -------- Resultado filtrado -------- */
  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const est = this.estado();
    const pl = this.plan();

    return this.datos().filter((d) => {
      if (est && d.estado !== est) return false;
      if (pl && d.plan !== pl) return false;
      if (term) {
        const heno = `${d.nombre} ${d.codigo} ${d.identificacion} ${d.telefono} ${d.direccion}`.toLowerCase();
        if (!heno.includes(term)) return false;
      }
      return true;
    });
  });

  /* -------- Paginación -------- */
  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / this.filasPorPagina())),
  );

  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  readonly pagados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.filasPorPagina();
    return this.filtrados().slice(inicio, inicio + this.filasPorPagina());
  });

  readonly rangoDesde = computed(() =>
    this.filtrados().length === 0 ? 0 : (this.paginaActual() - 1) * this.filasPorPagina() + 1,
  );

  readonly rangoHasta = computed(() =>
    Math.min(this.paginaActual() * this.filasPorPagina(), this.filtrados().length),
  );

  readonly numerosPagina = computed<number[]>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const nums: number[] = [];
    const inicio = Math.max(1, actual - 1);
    const fin = Math.min(total, inicio + 2);
    for (let i = inicio; i <= fin; i++) nums.push(i);
    return nums;
  });

  /** Mensaje de la tabla vacía según el estado de la carga. */
  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando clientes…';
    if (this.error()) return this.error()!;
    return 'No se encontraron clientes con los filtros aplicados.';
  });

  /* -------- Acciones -------- */
  irA(p: number) {
    this.pagina.set(Math.min(Math.max(1, p), this.totalPaginas()));
  }

  cambiarFilas(valor: string) {
    this.filasPorPagina.set(Number(valor));
    this.pagina.set(1);
  }

  onFiltroCambio() {
    this.pagina.set(1);
  }

  limpiar() {
    this.q.set('');
    this.estado.set('');
    this.plan.set('');
    this.pagina.set(1);
  }

  iniciales(nombre: string): string {
    const partes = nombre.replace(/(Cía\.|Ltda\.|S\.A\.)/g, '').trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  /* -------- Mapeo del DTO del backend a la fila de la grilla -------- */
  private aFila(d: ClienteListado): ClienteFila {
    return {
      codigo: d.codigo,
      nombre: d.nombre,
      esEmpresa: d.tipoCliente === 'EMPRESA',
      tipoId: d.tipoIdentificacion === 'RUC' ? 'RUC' : 'CÉDULA',
      identificacion: d.identificacion,
      telefono: d.telefono ?? '',
      whatsapp: d.tieneWhatsapp,
      direccion: d.direccion ?? '—',
      zona: '', // sin origen en el dominio
      plan: d.plan ?? '—',
      velocidad: d.velocidad ?? '',
      estado: (d.estadoServicio ?? 'PENDIENTE') as EstadoCliente,
      fechaRegistro: this.formatoFecha(d.fechaRegistro),
      vendedor: '—', // sin origen en el dominio
    };
  }

  private formatoFecha(iso: string): string {
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver la lista de clientes.';
    if (e.status) return `El gateway respondió ${e.status} al listar clientes.`;
    return 'Error inesperado cargando la lista de clientes.';
  }
}
