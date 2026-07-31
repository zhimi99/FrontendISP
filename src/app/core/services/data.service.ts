import { Injectable } from '@angular/core';

import {
  CAJAS,
  CLIENTES,
  CONTRATOS,
  DIRECCIONES,
  EQUIPOS,
  FACTURAS,
  HISTORIAL_ESTADOS,
  IDENTIDADES_RED,
  ITEMS_STOCK,
  MOVIMIENTOS_CAJA,
  ORDENES,
  PAGOS,
  PLANES,
  SESIONES_CAJA,
  TECNICOS,
  USUARIOS,
  HOY,
} from '../mock/mock-data';
import { Cliente, ContratoVista, EstadoServicio } from '../models/contratos.model';
import { Factura, MoraContrato } from '../models/facturacion.model';
import { PagoVista } from '../models/finanzas.model';
import { EquipoVista } from '../models/inventario.model';
import { OrdenVista } from '../models/operativo.model';

/**
 * Acceso a los datos de prueba en memoria.
 *
 * Es la ÚNICA frontera entre las pantallas y el origen de datos: cuando los
 * microservicios expongan REST, cada método pasa a ser una llamada HttpClient
 * y los componentes no cambian.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly hoy = HOY;

  /* ---------------- Catálogos ---------------- */
  planes = () => PLANES;
  cajas = () => CAJAS;
  tecnicos = () => TECNICOS;
  usuarios = () => USUARIOS;
  bodegas = () => [
    { id: 1, nombre: 'Bodega Matriz' },
    { id: 2, nombre: 'Stock móvil (camioneta)' },
  ];

  /* ---------------- Clientes y contratos ---------------- */
  clientes = () => CLIENTES;

  nombreCliente(clienteId: number): string {
    const c = CLIENTES.find((x) => x.id === clienteId);
    if (!c) return '—';
    return this.nombreDe(c);
  }

  nombreDe(c: Cliente): string {
    return c.tipoCliente === 'EMPRESA' ? c.razonSocial! : `${c.nombres} ${c.apellidos}`;
  }

  /** Contratos con cliente, plan y dirección ya resueltos para la grilla. */
  contratos(): ContratoVista[] {
    return CONTRATOS.map((ct) => {
      const cli = CLIENTES.find((c) => c.id === ct.clienteId)!;
      const plan = PLANES.find((p) => p.id === ct.planId)!;
      const dir = DIRECCIONES.find((d) => d.id === ct.direccionId);
      const red = IDENTIDADES_RED.find((r) => r.contratoId === ct.id);
      return {
        ...ct,
        clienteNombre: this.nombreDe(cli),
        clienteIdentificacion: cli.identificacion,
        planNombre: plan.nombre,
        planPrecio: plan.precioMensual,
        direccionTexto: dir?.direccionTexto,
        pppoeUsuario: red?.pppoeUsuario,
      };
    });
  }

  contratosDeCliente = (clienteId: number) =>
    this.contratos().filter((c) => c.clienteId === clienteId);

  direccionesDeCliente = (clienteId: number) =>
    DIRECCIONES.filter((d) => d.clienteId === clienteId);

  identidadRed = (contratoId: number) => IDENTIDADES_RED.find((r) => r.contratoId === contratoId);

  historial = (contratoId?: number) =>
    (contratoId ? HISTORIAL_ESTADOS.filter((h) => h.contratoId === contratoId) : HISTORIAL_ESTADOS)
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

  contarPorEstado(): Record<EstadoServicio, number> {
    const base: Record<EstadoServicio, number> = {
      PENDIENTE: 0,
      ACTIVO: 0,
      SUSPENDIDO: 0,
      CORTADO: 0,
      RETIRADO: 0,
    };
    for (const c of CONTRATOS) base[c.estadoServicio]++;
    return base;
  }

  /* ---------------- Facturación ---------------- */
  facturas = () => FACTURAS.slice().sort((a, b) => b.id - a.id);

  facturasDeContrato = (contratoId: number) =>
    FACTURAS.filter((f) => f.contratoId === contratoId).sort((a, b) => b.id - a.id);

  /** Equivalente a la vista `v_mora_contrato` del esquema de facturación. */
  mora(): MoraContrato[] {
    const vencidas = FACTURAS.filter(
      (f) =>
        f.contratoId != null &&
        (f.estadoPago === 'PENDIENTE' || f.estadoPago === 'PARCIAL') &&
        f.estadoSri === 'AUTORIZADA' &&
        f.fechaVencimiento < HOY,
    );

    const porContrato = new Map<number, Factura[]>();
    for (const f of vencidas) {
      const lista = porContrato.get(f.contratoId!) ?? [];
      lista.push(f);
      porContrato.set(f.contratoId!, lista);
    }

    return [...porContrato.entries()]
      .map(([contratoId, lista]) => ({
        contratoId,
        facturasVencidas: lista.length,
        diasVencidoMax: Math.max(...lista.map((f) => this.diasEntre(f.fechaVencimiento, HOY))),
        vencimientoMasAntiguo: lista
          .map((f) => f.fechaVencimiento)
          .sort()[0],
        saldoTotal: this.redondear(lista.reduce((s, f) => s + f.saldoPendiente, 0)),
      }))
      .sort((a, b) => b.diasVencidoMax - a.diasVencidoMax);
  }

  /* ---------------- Finanzas ---------------- */
  pagos(): PagoVista[] {
    return PAGOS.slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((p) => ({
        ...p,
        clienteNombre: this.nombreCliente(p.clienteId),
        cajaNombre: this.nombreCajaDeSesion(p.sesionCajaId),
        cajeroNombre: USUARIOS.find((u) => u.id === p.usuarioId)?.nombre,
      }));
  }

  sesionesCaja = () =>
    SESIONES_CAJA.slice().sort((a, b) => b.fechaApertura.localeCompare(a.fechaApertura));

  movimientos = (sesionId: number) => MOVIMIENTOS_CAJA.filter((m) => m.sesionCajaId === sesionId);

  nombreCaja = (cajaId?: number) => CAJAS.find((c) => c.id === cajaId)?.nombre;

  nombreCajaDeSesion(sesionId?: number): string | undefined {
    if (!sesionId) return undefined;
    const s = SESIONES_CAJA.find((x) => x.id === sesionId);
    return this.nombreCaja(s?.cajaId);
  }

  /** Recaudación confirmada agrupada por forma de pago para una fecha. */
  recaudacionDelDia(fecha = HOY) {
    const delDia = PAGOS.filter((p) => p.estado === 'CONFIRMADO' && p.fecha.startsWith(fecha));
    const mapa = new Map<string, { cantidad: number; total: number }>();
    for (const p of delDia) {
      const acc = mapa.get(p.formaPago) ?? { cantidad: 0, total: 0 };
      acc.cantidad++;
      acc.total = this.redondear(acc.total + p.monto);
      mapa.set(p.formaPago, acc);
    }
    return [...mapa.entries()].map(([formaPago, v]) => ({ formaPago, ...v }));
  }

  /* ---------------- Inventario ---------------- */
  equipos(): EquipoVista[] {
    return EQUIPOS.map((e) => {
      const ct = CONTRATOS.find((c) => c.id === e.contratoId);
      return {
        ...e,
        bodegaNombre: this.bodegas().find((b) => b.id === e.bodegaId)?.nombre,
        contratoCodigo: ct?.codigo,
        clienteNombre: ct ? this.nombreCliente(ct.clienteId) : undefined,
      };
    });
  }

  stock = () => ITEMS_STOCK;

  /* ---------------- Operativo ---------------- */
  ordenes(): OrdenVista[] {
    return ORDENES.slice()
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .map((o) => ({
        ...o,
        clienteNombre: o.clienteId ? this.nombreCliente(o.clienteId) : 'Infraestructura',
        contratoCodigo: CONTRATOS.find((c) => c.id === o.contratoId)?.codigo,
        tecnicoNombre: TECNICOS.find((t) => t.id === o.tecnicoId)?.nombre,
      }));
  }

  /* ---------------- Utilidades ---------------- */
  diasEntre(desde: string, hasta: string): number {
    const ms = new Date(hasta).getTime() - new Date(desde).getTime();
    return Math.round(ms / 86_400_000);
  }

  redondear = (n: number) => Math.round(n * 100) / 100;
}
