import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { FinanzasService } from '../../core/services/finanzas.service';
import { ClientesService } from '../../core/services/clientes.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { AuthService } from '../../core/services/auth.service';
import { ClienteListado } from '../../core/models/contratos.model';
import { FacturaVista } from '../../core/models/facturacion.model';
import {
  CajaEstado,
  EstadoPago,
  FormaPago,
  FORMA_PAGO_ETIQUETA,
  ESTADO_PAGO_FIN_ETIQUETA,
  ESTADO_PAGO_FIN_TONO,
  PagoCobranzaVista,
  RegistrarPagoRequest,
} from '../../core/models/finanzas.model';

/** Formas de pago para el selector del alta. */
const FORMAS_PAGO: FormaPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'CHEQUE', 'PASARELA'];

/**
 * Cobranzas / Caja sobre datos reales (GET /api/pagos + /api/cajas). El nombre del
 * cliente no lo tiene MS-FINANZAS (solo el clienteId, referencia lógica): se resuelve
 * cruzando con /api/clientes. Reutiliza la hoja de estilos de la lista de clientes.
 */
@Component({
  selector: 'app-cobranzas',
  standalone: true,
  imports: [FormsModule, IconComponent, RouterLink],
  templateUrl: './cobranzas.html',
  styleUrls: ['../clientes/clientes.scss', './cobranzas.scss'],
})
export class CobranzasComponent {
  private readonly finanzas = inject(FinanzasService);
  private readonly clientesService = inject(ClientesService);
  private readonly facturacion = inject(FacturacionService);
  private readonly auth = inject(AuthService);

  readonly formaEtq = FORMA_PAGO_ETIQUETA;
  readonly estadoEtq = ESTADO_PAGO_FIN_ETIQUETA;
  readonly estadoTono = ESTADO_PAGO_FIN_TONO;
  readonly formasPago = FORMAS_PAGO;
  /** Solo COBRANZAS/ADMIN pueden registrar pagos (POST /api/pagos). */
  readonly puedeRegistrarPago = computed(() => this.auth.tieneRol('COBRANZAS', 'ADMINISTRADOR'));
  /** Abrir/cerrar la jornada de caja: mismo perfil que recauda. */
  readonly puedeOperarCaja = computed(() => this.auth.tieneRol('COBRANZAS', 'ADMINISTRADOR'));
  /** Anular mueve dinero hacia atrás: el backend lo restringe a ADMIN. */
  readonly puedeAnular = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  /** Aviso de resultado de operaciones de caja (apertura/cierre y su arqueo). */
  readonly avisoCaja = signal<{ texto: string; error: boolean } | null>(null);

  private readonly pagos = signal<PagoCobranzaVista[]>([]);
  readonly cajas = signal<CajaEstado[]>([]);
  private readonly clientesLista = signal<ClienteListado[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly q = signal('');
  readonly formaPago = signal<'' | FormaPago>('');
  readonly estado = signal<'' | EstadoPago>('');

  readonly filasPorPagina = signal(10);
  readonly pagina = signal(1);

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    forkJoin({
      pagos: this.finanzas.listarPagos(),
      cajas: this.finanzas.listarCajas(),
      // La lista de clientes resuelve el nombre y alimenta el selector del alta; si
      // falla, se degrada a "Cliente #id" en vez de tumbar toda la pantalla.
      clientes: this.clientesService.listar().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ pagos, cajas, clientes }) => {
        this.clientesLista.set(clientes);
        const nombre = new Map(clientes.map((c) => [c.id, c.nombre]));
        this.pagos.set(
          pagos.map((p) => ({
            ...p,
            clienteNombre: nombre.get(p.clienteId) ?? `Cliente #${p.clienteId}`,
          })),
        );
        this.cajas.set(cajas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /** Clientes ordenados por nombre para el selector del alta de pago. */
  readonly clientesOrdenados = computed(() =>
    [...this.clientesLista()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );
  /**
   * La caja de cobranza. Por ahora la operación es de una sola caja (la matriz):
   * el backend solo devuelve la(s) activa(s), así que se toma la primera.
   */
  readonly caja = computed<CajaEstado | null>(() => this.cajas()[0] ?? null);
  /** La jornada abierta de esa caja, si la hay (necesaria para cobrar en efectivo). */
  readonly sesionActual = computed(() => this.caja()?.sesionAbierta ?? null);

  /* ---------- Tarjetas de resumen ---------- */
  get totalRecaudado() {
    return this.pagos()
      .filter((p) => p.estado === 'CONFIRMADO')
      .reduce((s, p) => s + (p.monto ?? 0), 0);
  }
  get numeroPagos() {
    return this.pagos().length;
  }
  get cajaAbierta() {
    return this.caja()?.sesionAbierta != null;
  }
  get efectivoEnCaja() {
    return this.caja()?.sesionAbierta?.efectivoEnCaja ?? 0;
  }

  /* ---------- Filtro + paginación ---------- */
  readonly filtrados = computed(() => {
    const term = this.q().trim().toLowerCase();
    const fp = this.formaPago();
    const es = this.estado();

    return this.pagos().filter((p) => {
      if (fp && p.formaPago !== fp) return false;
      if (es && p.estado !== es) return false;
      if (term) {
        const heno = `${p.numeroRecibo} ${p.clienteNombre}`.toLowerCase();
        if (!heno.includes(term)) return false;
      }
      return true;
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / this.filasPorPagina())),
  );
  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  readonly pagina_ = computed(() => {
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
    if (this.cargando()) return 'Cargando recaudaciones…';
    if (this.error()) return this.error()!;
    return 'No se encontraron pagos con los filtros aplicados.';
  });

  /** Resumen legible de las facturas que cubrió un pago. */
  facturasDe(p: PagoCobranzaVista): string {
    const nums = p.aplicaciones.map((a) => a.facturaNumero).filter((n): n is string => !!n);
    if (nums.length === 0) return '—';
    if (nums.length === 1) return nums[0];
    return `${nums[0]} +${nums.length - 1}`;
  }

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
    this.formaPago.set('');
    this.estado.set('');
    this.pagina.set(1);
  }

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }
  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    const d = `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
    const h = `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
    return `${d} ${h}`;
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver cobranzas.';
    if (e.status) return `El gateway respondió ${e.status} al cargar cobranzas.`;
    return 'Error inesperado cargando las cobranzas.';
  }

  /* ---------- Registrar pago (modal) ---------- */
  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly errorPago = signal<string | null>(null);

  readonly clienteSel = signal<number | null>(null);
  readonly facturasCliente = signal<FacturaVista[]>([]);
  readonly facturasCargando = signal(false);
  readonly facturaSel = signal<number | null>(null);
  readonly formaSel = signal<FormaPago>('EFECTIVO');
  readonly sesionSel = signal<number | null>(null);
  readonly montoPago = signal<number | null>(null);
  readonly referencia = signal('');
  readonly banco = signal('');
  readonly observacion = signal('');

  readonly esEfectivo = computed(() => this.formaSel() === 'EFECTIVO');
  readonly facturaActual = computed(
    () => this.facturasCliente().find((f) => f.id === this.facturaSel()) ?? null,
  );

  abrirPago() {
    this.errorPago.set(null);
    this.clienteSel.set(null);
    this.facturasCliente.set([]);
    this.facturaSel.set(null);
    this.formaSel.set('EFECTIVO');
    this.sesionSel.set(this.sesionActual()?.id ?? null);
    this.montoPago.set(null);
    this.referencia.set('');
    this.banco.set('');
    this.observacion.set('');
    this.modalAbierto.set(true);
  }

  cerrarPago() {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
  }

  onClienteSel(id: number | null) {
    this.clienteSel.set(id);
    this.facturaSel.set(null);
    this.montoPago.set(null);
    this.facturasCliente.set([]);
    if (id == null) return;
    this.facturasCargando.set(true);
    this.facturacion.listar({ clienteId: id }).subscribe({
      next: (lista) => {
        this.facturasCliente.set(
          lista.filter(
            (f) =>
              (f.estadoPago === 'PENDIENTE' || f.estadoPago === 'PARCIAL') &&
              (f.saldoPendiente ?? 0) > 0,
          ),
        );
        this.facturasCargando.set(false);
      },
      error: () => {
        this.facturasCliente.set([]);
        this.facturasCargando.set(false);
      },
    });
  }

  onFacturaSel(id: number | null) {
    this.facturaSel.set(id);
    const f = this.facturasCliente().find((x) => x.id === id);
    this.montoPago.set(f ? f.saldoPendiente : null);
  }

  guardarPago() {
    const err = this.validarPago();
    if (err) {
      this.errorPago.set(err);
      return;
    }
    const f = this.facturaActual()!;
    const monto = this.montoPago()!;
    const req: RegistrarPagoRequest = {
      clienteId: this.clienteSel()!,
      contratoId: f.contratoId ?? null,
      monto,
      formaPago: this.formaSel(),
      referencia: this.referencia().trim() || null,
      banco: this.banco().trim() || null,
      sesionCajaId: this.esEfectivo() ? this.sesionSel() : null,
      observacion: this.observacion().trim() || null,
      aplicaciones: [{ facturaId: f.id, facturaNumero: f.numeroDocumento, montoAplicado: monto }],
    };
    this.guardando.set(true);
    this.errorPago.set(null);
    this.finanzas.registrarPago(req).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.cargar(); // refresca pagos, cajas y totales
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorPago.set(this.mensajePago(e));
      },
    });
  }

  private validarPago(): string | null {
    if (this.clienteSel() == null) return 'Elige un cliente.';
    const f = this.facturaActual();
    if (!f) return 'Elige una factura por cobrar.';
    const m = this.montoPago();
    if (m == null || m <= 0) return 'El monto debe ser mayor que cero.';
    if (m > (f.saldoPendiente ?? 0)) {
      return `El monto no puede superar el saldo (${this.moneda(f.saldoPendiente)}).`;
    }
    if (this.esEfectivo() && this.sesionSel() == null) {
      return 'El efectivo exige una sesión de caja abierta.';
    }
    return null;
  }

  private mensajePago(e: { status?: number }): string {
    if (e.status === 422) return 'La operación no cumple una regla de negocio (revisa el monto o la caja).';
    if (e.status === 400) return 'Revisa los datos del pago: hay algún campo inválido.';
    if (e.status === 403) return 'Tu rol no tiene permiso para registrar pagos.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo registrar el pago.';
  }

  /* ---------- Abrir / cerrar caja (modal) ---------- */
  readonly modalCaja = signal<'abrir' | 'cerrar' | null>(null);
  readonly guardandoCaja = signal(false);
  readonly errorCajaModal = signal<string | null>(null);
  readonly montoInicial = signal<number | null>(null);
  readonly montoDeclarado = signal<number | null>(null);
  readonly obsCaja = signal('');

  abrirCajaModal() {
    this.avisoCaja.set(null);
    this.errorCajaModal.set(null);
    this.montoInicial.set(null);
    this.obsCaja.set('');
    this.modalCaja.set('abrir');
  }

  cerrarCajaModal() {
    this.avisoCaja.set(null);
    this.errorCajaModal.set(null);
    this.montoDeclarado.set(null);
    this.obsCaja.set('');
    this.modalCaja.set('cerrar');
  }

  cerrarModalCaja() {
    if (this.guardandoCaja()) return;
    this.modalCaja.set(null);
  }

  confirmarAbrirCaja() {
    const c = this.caja();
    const m = this.montoInicial();
    if (!c) return;
    if (m == null || m < 0) {
      this.errorCajaModal.set('Indica el fondo inicial (0 o más).');
      return;
    }
    this.guardandoCaja.set(true);
    this.errorCajaModal.set(null);
    this.finanzas.abrirCaja(c.id, { montoInicial: m, observacion: this.obsCaja().trim() || null }).subscribe({
      next: () => {
        this.guardandoCaja.set(false);
        this.modalCaja.set(null);
        this.avisoCaja.set({ texto: `Caja abierta con un fondo de ${this.moneda(m)}.`, error: false });
        this.cargar();
      },
      error: (e) => {
        this.guardandoCaja.set(false);
        this.errorCajaModal.set(this.mensajeCaja(e));
      },
    });
  }

  confirmarCerrarCaja() {
    const c = this.caja();
    const m = this.montoDeclarado();
    if (!c) return;
    if (m == null || m < 0) {
      this.errorCajaModal.set('Indica el efectivo contado (0 o más).');
      return;
    }
    this.guardandoCaja.set(true);
    this.errorCajaModal.set(null);
    this.finanzas.cerrarCaja(c.id, { montoFinalDeclarado: m, observacion: this.obsCaja().trim() || null }).subscribe({
      next: (r) => {
        this.guardandoCaja.set(false);
        this.modalCaja.set(null);
        const dif = r.diferencia ?? 0;
        const etiqueta =
          dif === 0
            ? 'sin diferencia'
            : dif < 0
              ? `faltante de ${this.moneda(Math.abs(dif))}`
              : `sobrante de ${this.moneda(dif)}`;
        this.avisoCaja.set({
          texto: `Caja cerrada. Esperado ${this.moneda(r.montoFinalSistema)}, declarado ${this.moneda(r.montoFinalDeclarado)} — ${etiqueta}.`,
          error: dif !== 0,
        });
        this.cargar();
      },
      error: (e) => {
        this.guardandoCaja.set(false);
        this.errorCajaModal.set(this.mensajeCaja(e));
      },
    });
  }

  /* ---------- Anular pago (modal) ---------- */
  readonly pagoAnular = signal<PagoCobranzaVista | null>(null);
  readonly anulando = signal(false);
  readonly errorAnular = signal<string | null>(null);
  readonly motivoAnular = signal('');

  abrirAnular(p: PagoCobranzaVista) {
    this.avisoCaja.set(null);
    this.errorAnular.set(null);
    this.motivoAnular.set('');
    this.pagoAnular.set(p);
  }

  cerrarAnular() {
    if (this.anulando()) return;
    this.pagoAnular.set(null);
  }

  confirmarAnular() {
    const p = this.pagoAnular();
    const motivo = this.motivoAnular().trim();
    if (!p) return;
    if (!motivo) {
      this.errorAnular.set('Indica el motivo de la anulación.');
      return;
    }
    this.anulando.set(true);
    this.errorAnular.set(null);
    this.finanzas.anularPago(p.id, motivo).subscribe({
      next: () => {
        this.anulando.set(false);
        this.pagoAnular.set(null);
        this.avisoCaja.set({
          texto: `Pago ${p.numeroRecibo} anulado. Las facturas que cubría recuperan su saldo.`,
          error: false,
        });
        this.cargar();
      },
      error: (e) => {
        this.anulando.set(false);
        this.errorAnular.set(this.mensajeAnular(e));
      },
    });
  }

  private mensajeAnular(e: { status?: number; error?: { message?: string } }): string {
    if (e.status === 422) {
      // Spring no manda el detalle del 422 en el cuerpo por defecto, así que el texto
      // de reserva nombra las dos causas posibles en lugar de un "no se pudo" seco.
      return (
        e.error?.message ||
        'No se puede anular: el pago ya estaba anulado, o entró en efectivo por una ' +
          'jornada de caja ya cerrada y arqueada.'
      );
    }
    if (e.status === 400) return 'El motivo de la anulación es obligatorio.';
    if (e.status === 403) return 'Solo un administrador puede anular un pago.';
    if (e.status === 404) return 'El pago ya no existe; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo anular el pago.';
  }

  private mensajeCaja(e: { status?: number }): string {
    if (e.status === 422) return 'No se pudo operar la caja: revisa su estado (¿ya estaba abierta o cerrada?).';
    if (e.status === 400) return 'Revisa el monto: hay algún valor inválido.';
    if (e.status === 403) return 'Tu rol no tiene permiso para abrir o cerrar la caja.';
    if (e.status === 404) return 'La caja no existe; recarga la página.';
    if (e.status === 0) return 'No se pudo contactar el gateway (¿está arriba en :8089?).';
    return 'No se pudo completar la operación de caja.';
  }
}
