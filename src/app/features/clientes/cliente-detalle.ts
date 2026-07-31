import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { ClientesService } from '../../core/services/clientes.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { ClienteDetalle } from '../../core/models/contratos.model';
import {
  ESTADO_PAGO_ETIQUETA,
  ESTADO_PAGO_TONO,
  ESTADO_SRI_ETIQUETA,
  ESTADO_SRI_TONO,
  FacturaVista,
} from '../../core/models/facturacion.model';
import { EstadoCliente, ESTADOS } from './clientes.data';

/** Estado de la carga perezosa de facturas para la pestaña de Facturación. */
type EstadoFacturas = { estado: 'cargando' | 'ok' | 'error'; lista: FacturaVista[] };

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [IconComponent, RouterLink],
  templateUrl: './cliente-detalle.html',
  styleUrl: './cliente-detalle.scss',
})
export class ClienteDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly clientesService = inject(ClientesService);
  private readonly facturacionService = inject(FacturacionService);
  readonly estadosMap = ESTADOS;

  // Mapas de etiqueta/tono para las insignias de la pestaña de Facturación.
  readonly pagoEtq = ESTADO_PAGO_ETIQUETA;
  readonly pagoTono = ESTADO_PAGO_TONO;
  readonly sriEtq = ESTADO_SRI_ETIQUETA;
  readonly sriTono = ESTADO_SRI_TONO;

  readonly tabs = [
    'Resumen',
    'Servicios',
    'Facturación',
    'Soporte',
    'Documentos',
    'Historial',
    'Red / Equipos',
    'Ubicación',
  ];
  readonly tabActiva = signal(0);

  /**
   * Ficha real desde MS-CONTRATOS. `undefined` = cargando, `null` = no encontrado
   * o error, objeto = cargada. Se recarga sola si cambia el código de la URL.
   */
  // Sin initialValue: toSignal arranca en `undefined` (= cargando) hasta la 1ª emisión.
  private readonly detalle = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('id') ?? ''),
      switchMap((codigo) =>
        codigo
          ? this.clientesService.detalle(codigo).pipe(catchError(() => of(null)))
          : of(null),
      ),
    ),
  );

  readonly cargando = computed(() => this.detalle() === undefined);

  /** Modelo de vista derivado de la ficha real. Null mientras no haya datos. */
  readonly d = computed(() => {
    const det = this.detalle();
    return det ? this.armarVista(det) : null;
  });

  /**
   * Facturas del cliente (MS-FACTURACION) para la pestaña de Facturación. Se cargan
   * en cuanto la ficha resuelve su id numérico —la referencia lógica que enlaza con
   * factura.cliente_id— y se recargan solas si se navega a otro cliente.
   */
  private readonly facturasResp = toSignal(
    toObservable(this.detalle).pipe(
      switchMap((det): Observable<EstadoFacturas> =>
        det && det.id != null
          ? this.facturacionService.listar({ clienteId: det.id }).pipe(
              map((lista) => ({ estado: 'ok' as const, lista })),
              startWith({ estado: 'cargando' as const, lista: [] as FacturaVista[] }),
              catchError(() => of({ estado: 'error' as const, lista: [] as FacturaVista[] })),
            )
          : of({ estado: 'ok' as const, lista: [] as FacturaVista[] }),
      ),
    ),
    { initialValue: { estado: 'cargando', lista: [] } as EstadoFacturas },
  );

  readonly facturas = computed(() => this.facturasResp().lista);
  readonly facturasCargando = computed(() => this.facturasResp().estado === 'cargando');
  readonly facturasError = computed(() => this.facturasResp().estado === 'error');
  readonly facturasSaldo = computed(() =>
    this.facturas().reduce((s, f) => s + (f.saldoPendiente ?? 0), 0),
  );
  readonly facturasTotal = computed(() =>
    this.facturas().reduce((s, f) => s + (f.total ?? 0), 0),
  );

  setTab(i: number) {
    this.tabActiva.set(i);
  }

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }

  /** dd/mm/aaaa a partir de un ISO; reutiliza el formateador interno. */
  fecha(iso: string | null): string {
    return this.fmt(iso);
  }

  iniciales(nombre: string): string {
    const p = nombre.replace(/(Cía\.|Ltda\.|S\.A\.)/g, '').trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
  }

  /* ---------- Derivación de la vista desde datos reales ---------- */
  private armarVista(det: ClienteDetalle) {
    // Los contratos llegan ordenados por fecha de alta desc: el primero es el vigente.
    const principal = det.contratos[0] ?? null;
    const estado = (principal?.estadoServicio ?? 'PENDIENTE') as EstadoCliente;
    const red = principal?.red ?? null;

    const servicios = det.contratos.map((c) => ({
      id: c.codigo,
      servicio: det.tipoCliente === 'EMPRESA' ? 'Internet Corporativo' : 'Internet Residencial',
      plan: c.plan,
      velocidad: c.velocidad,
      estado: c.estadoServicio as EstadoCliente,
      fechaInicio: this.fmt(c.fechaAlta),
      precio: c.precioMensual,
    }));

    const valorTotal = det.contratos
      .filter((c) => c.estadoServicio !== 'RETIRADO')
      .reduce((s, c) => s + (c.precioMensual ?? 0), 0);

    return {
      base: {
        nombre: det.nombre,
        esEmpresa: det.tipoCliente === 'EMPRESA',
        codigo: det.codigo,
        tipoId: det.tipoIdentificacion === 'RUC' ? 'RUC' : 'CÉDULA',
        identificacion: det.identificacion,
        telefono: det.telefono ?? '—',
        direccion: det.direccionPrincipal?.direccionTexto ?? '—',
        fechaRegistro: this.fmt(det.fechaRegistro),
        plan: principal?.plan ?? '—',
        velocidad: principal?.velocidad ?? '',
        estado,
      },
      email: det.email ?? '—',
      grupo: det.tipoCliente === 'EMPRESA' ? 'Corporativo' : 'Residencial',
      // Datos de red reales (identidad_red); lo que no tenemos queda en "—".
      tecnologia: red ? red.tipoConexion : '—',
      ipUsuario: red?.ipAsignada ?? red?.pppoeUsuario ?? '—',
      perfilRed: red?.perfilRadiusActual ?? '—',
      sincronizado: red?.sincronizadoRed ?? false,
      olt: '—',
      puertoOnu: '—',
      uptime: '—',
      conectado: estado === 'ACTIVO',
      estadoConexion: this.estadoConexion(estado),
      // Facturación: no vive en MS-CONTRATOS. Solo mostramos la mensualidad (suma de planes).
      valorTotal,
      servicios,
    };
  }

  private estadoConexion(estado: EstadoCliente): { texto: string; tono: string } {
    switch (estado) {
      case 'ACTIVO':
        return { texto: 'CONECTADO', tono: 'ok' };
      case 'SUSPENDIDO':
        return { texto: 'SUSPENDIDO', tono: 'warn' };
      case 'CORTADO':
        return { texto: 'DESCONECTADO', tono: 'danger' };
      case 'RETIRADO':
        return { texto: 'RETIRADO', tono: 'neutral' };
      default:
        return { texto: 'POR INSTALAR', tono: 'info' };
    }
  }

  /** ISO (instante o fecha) a dd/mm/aaaa. */
  private fmt(iso: string | null): string {
    if (!iso) return '—';
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '—';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  }
}
