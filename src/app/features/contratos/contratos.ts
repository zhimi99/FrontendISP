import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/icon';
import { ContratosService } from '../../core/services/contratos.service';
import { ContratoListado } from '../../core/models/contratos.model';
import { EstadoCliente, ESTADOS } from '../clientes/clientes.data';

/**
 * Grilla de contratos sobre datos reales (GET /api/contratos). Reutiliza la hoja de
 * estilos de la lista de clientes para mantener un aspecto consistente.
 */
@Component({
  selector: 'app-contratos',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './contratos.html',
  styleUrl: '../clientes/clientes.scss',
})
export class ContratosComponent {
  private readonly contratosService = inject(ContratosService);
  readonly estadosMap = ESTADOS;

  private readonly datos = signal<ContratoListado[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly q = signal('');
  readonly estado = signal<'' | EstadoCliente>('');
  readonly plan = signal('');

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  constructor() {
    this.contratosService.listar().subscribe({
      next: (lista) => {
        this.datos.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  readonly planes = computed(() => [...new Set(this.datos().map((c) => c.plan))].sort());

  get total() {
    return this.datos().length;
  }
  get activos() {
    return this.datos().filter((c) => c.estadoServicio === 'ACTIVO').length;
  }
  get suspendidos() {
    return this.datos().filter((c) => c.estadoServicio === 'SUSPENDIDO').length;
  }
  get cortados() {
    return this.datos().filter((c) => c.estadoServicio === 'CORTADO').length;
  }

  pct(n: number): string {
    return this.total ? ((n / this.total) * 100).toFixed(1) + '% del total' : '—';
  }

  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const est = this.estado();
    const pl = this.plan();

    return this.datos().filter((c) => {
      if (est && c.estadoServicio !== est) return false;
      if (pl && c.plan !== pl) return false;
      if (term) {
        const heno =
          `${c.codigo} ${c.clienteNombre} ${c.clienteIdentificacion} ${c.pppoeUsuario ?? ''} ${c.direccionTexto ?? ''}`.toLowerCase();
        if (!heno.includes(term)) return false;
      }
      return true;
    });
  });

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

  readonly mensajeTabla = computed(() => {
    if (this.cargando()) return 'Cargando contratos…';
    if (this.error()) return this.error()!;
    return 'No se encontraron contratos con los filtros aplicados.';
  });

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

  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver los contratos.';
    if (e.status) return `El gateway respondió ${e.status} al listar contratos.`;
    return 'Error inesperado cargando los contratos.';
  }
}
