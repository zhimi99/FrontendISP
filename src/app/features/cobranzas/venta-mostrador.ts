import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { IconComponent } from '../../shared/icon';
import { OpcionCatalogo } from '../../core/services/catalogos.service';
import { FacturacionService } from '../../core/services/facturacion.service';
import { VentasService } from '../../core/services/ventas.service';
import { ClienteListado } from '../../core/models/contratos.model';
import { Emisor } from '../../core/models/facturacion.model';
import { FormaPago } from '../../core/models/finanzas.model';
import {
  ArticuloVendible,
  ComprobanteVenta,
  LineaCarrito,
  RegistrarVentaRequest,
  Venta,
} from '../../core/models/ventas.model';

/**
 * El mostrador: vender productos como en una caja registradora.
 *
 * <p>Está pensado para trabajar con un lector de códigos, que no es más que un
 * teclado: escribe el código y pulsa Enter. Por eso el foco vuelve al campo de
 * escaneo después de cada artículo — quien atiende no debería tener que tocar el
 * ratón entre producto y producto.</p>
 *
 * <p>Los precios NO se calculan aquí como verdad: la pantalla los anticipa para que
 * el cliente vea el total antes de pagar, pero el importe que se cobra es el que
 * devuelve el backend, que es quien lee el inventario y reparte el descuento.</p>
 */
@Component({
  selector: 'app-venta-mostrador',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './venta-mostrador.html',
  styleUrls: ['./venta-mostrador.scss'],
})
export class VentaMostradorComponent {
  private readonly ventas = inject(VentasService);
  private readonly facturacion = inject(FacturacionService);

  /** La jornada de caja abierta, si la hay. Sin ella no se cobra en efectivo. */
  readonly sesionCajaId = input<number | null>(null);
  readonly cajaNombre = input<string | null>(null);
  /** Clientes ya cargados por la pantalla de cobranzas: evita pedirlos otra vez. */
  readonly clientes = input<ClienteListado[]>([]);
  readonly formasPago = input<OpcionCatalogo[]>([]);

  readonly cerrar = output<void>();
  /** Se emite al cobrar, para que cobranzas refresque caja y totales. */
  readonly registrada = output<Venta>();

  private readonly campoEscaneo = viewChild<ElementRef<HTMLInputElement>>('escaneo');

  /* ---------- Búsqueda y escaneo ---------- */
  readonly termino = signal('');
  readonly resultados = signal<ArticuloVendible[]>([]);
  readonly buscando = signal(false);
  readonly aviso = signal<string | null>(null);
  private readonly teclas = new Subject<string>();

  /* ---------- Carrito ---------- */
  readonly carrito = signal<LineaCarrito[]>([]);

  /* ---------- Datos de la venta ---------- */
  readonly comprobante = signal<ComprobanteVenta>('RECIBO');
  readonly consumidorFinal = signal(true);
  readonly clienteSel = signal<number | null>(null);
  readonly identificacion = signal('');
  readonly nombre = signal('');
  readonly direccion = signal('');
  readonly email = signal('');
  readonly formaPago = signal<FormaPago>('EFECTIVO');
  readonly observacion = signal('');
  /** Total que el vendedor decidió cobrar. null = precio de lista. */
  readonly totalEditado = signal<number | null>(null);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  /** Cuando tiene valor, la venta ya se cobró y toca preguntar por la impresión. */
  readonly venta = signal<Venta | null>(null);
  private readonly emisor = signal<Emisor | null>(null);

  constructor() {
    // Búsqueda por texto: se espera a que deje de teclear para no lanzar una
    // petición por cada letra.
    this.teclas
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((texto) => {
          if (texto.trim().length < 2) {
            this.buscando.set(false);
            return of<ArticuloVendible[]>([]);
          }
          this.buscando.set(true);
          return this.ventas.buscarArticulos(texto.trim()).pipe(catchError(() => of([])));
        }),
      )
      .subscribe((lista) => {
        this.resultados.set(lista);
        this.buscando.set(false);
      });

    // La razón social y el RUC del recibo salen del backend, no de una constante
    // en el frontend. Si no se puede leer, el recibo se imprime igual sin cabecera:
    // no vale la pena bloquear un cobro por eso.
    this.facturacion
      .emisor()
      .pipe(catchError(() => of(null)))
      .subscribe((e) => this.emisor.set(e));

    afterNextRender(() => this.enfocarEscaneo());
  }

  /* ================================================================
   *  Escaneo y búsqueda
   * ================================================================ */

  onTermino(texto: string) {
    this.termino.set(texto);
    this.aviso.set(null);
    this.teclas.next(texto);
  }

  /** Enter en el campo: es lo que hace el lector al terminar de leer la etiqueta. */
  onEnter() {
    const codigo = this.termino().trim();
    if (!codigo) return;

    this.ventas.porCodigo(codigo).subscribe({
      next: (lista) => {
        if (lista.length === 0) {
          this.aviso.set(
            `No se encontró «${codigo}» disponible para la venta. ` +
              'Revisa que tenga precio y existencia en bodega.',
          );
          return;
        }
        this.agregar(lista[0]);
      },
      error: (e) => this.aviso.set(this.mensajeDeError(e)),
    });
  }

  agregar(articulo: ArticuloVendible) {
    const actual = this.carrito();
    const indice = actual.findIndex(
      (l) => l.articulo.origen === articulo.origen && l.articulo.articuloId === articulo.articuloId,
    );

    if (indice >= 0) {
      if (articulo.origen === 'EQUIPO') {
        // Una unidad física es una sola: no hay una segunda que añadir.
        this.aviso.set(`${articulo.descripcion} ya está en la venta.`);
        this.limpiarBusqueda();
        return;
      }
      this.cambiarCantidad(indice, actual[indice].cantidad + 1);
      this.limpiarBusqueda();
      return;
    }

    this.carrito.set([...actual, { articulo, cantidad: 1 }]);
    this.alCambiarElCarrito();
    this.limpiarBusqueda();
  }

  quitar(indice: number) {
    this.carrito.set(this.carrito().filter((_, i) => i !== indice));
    this.alCambiarElCarrito();
  }

  cambiarCantidad(indice: number, cantidad: number) {
    const actual = [...this.carrito()];
    const linea = actual[indice];
    if (!linea) return;

    // Un equipo no admite otra cantidad; el material, lo que haya en bodega.
    const tope = linea.articulo.origen === 'EQUIPO' ? 1 : linea.articulo.disponible;
    const valor = Math.min(Math.max(cantidad || 0, 1), tope);
    if (valor !== cantidad && cantidad > tope) {
      this.aviso.set(
        `Solo quedan ${tope} de ${linea.articulo.descripcion} en ${linea.articulo.ubicacion ?? 'bodega'}.`,
      );
    }
    actual[indice] = { ...linea, cantidad: valor };
    this.carrito.set(actual);
    this.alCambiarElCarrito();
  }

  /**
   * Cambiar el carrito descarta el total que se hubiera escrito a mano.
   *
   * Mantenerlo sería peor: quien añade un artículo después de fijar el total
   * acabaría regalándolo sin verlo, porque el descuento crecería solo para
   * seguir cuadrando con la cifra anterior.
   */
  private alCambiarElCarrito() {
    this.totalEditado.set(null);
    this.error.set(null);
  }

  private limpiarBusqueda() {
    this.termino.set('');
    this.resultados.set([]);
    this.enfocarEscaneo();
  }

  private enfocarEscaneo() {
    // El siguiente artículo se escanea sin tocar el ratón.
    setTimeout(() => this.campoEscaneo()?.nativeElement.focus(), 0);
  }

  /* ================================================================
   *  Importes (previsualización; el importe firme lo da el backend)
   * ================================================================ */

  private static redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  baseDe(linea: LineaCarrito): number {
    return VentaMostradorComponent.redondear(linea.cantidad * linea.articulo.precioUnitario);
  }

  ivaDe(linea: LineaCarrito): number {
    return VentaMostradorComponent.redondear((this.baseDe(linea) * linea.articulo.tarifaIva) / 100);
  }

  totalDe(linea: LineaCarrito): number {
    return VentaMostradorComponent.redondear(this.baseDe(linea) + this.ivaDe(linea));
  }

  readonly subtotal = computed(() =>
    VentaMostradorComponent.redondear(
      this.carrito().reduce((s, l) => s + this.baseDe(l), 0),
    ),
  );
  readonly iva = computed(() =>
    VentaMostradorComponent.redondear(this.carrito().reduce((s, l) => s + this.ivaDe(l), 0)),
  );
  readonly totalLista = computed(() =>
    VentaMostradorComponent.redondear(this.subtotal() + this.iva()),
  );
  readonly totalACobrar = computed(() => this.totalEditado() ?? this.totalLista());
  readonly descuento = computed(() =>
    VentaMostradorComponent.redondear(Math.max(0, this.totalLista() - this.totalACobrar())),
  );
  readonly hayDescuento = computed(() => this.descuento() > 0);

  onTotalEditado(valor: number | null) {
    this.totalEditado.set(valor == null || Number.isNaN(valor) ? null : valor);
  }

  restaurarTotal() {
    this.totalEditado.set(null);
  }

  /* ================================================================
   *  Comprador
   * ================================================================ */

  readonly clientesOrdenados = computed(() =>
    [...this.clientes()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  onConsumidorFinal(valor: boolean) {
    this.consumidorFinal.set(valor);
    this.error.set(null);
    if (valor) {
      this.clienteSel.set(null);
    }
  }

  /** Elegir un cliente rellena sus datos, pero se pueden corregir a mano. */
  onClienteSel(id: number | null) {
    this.clienteSel.set(id);
    const c = this.clientes().find((x) => x.id === id);
    if (!c) return;
    this.identificacion.set(c.identificacion);
    this.nombre.set(c.nombre);
    this.direccion.set(c.direccion ?? '');
  }

  readonly esEfectivo = computed(() => this.formaPago() === 'EFECTIVO');
  readonly faltaCaja = computed(() => this.esEfectivo() && this.sesionCajaId() == null);

  /* ================================================================
   *  Cobro
   * ================================================================ */

  cobrar() {
    const problema = this.validar();
    if (problema) {
      this.error.set(problema);
      return;
    }

    const req: RegistrarVentaRequest = {
      comprobante: this.comprobante(),
      consumidorFinal: this.consumidorFinal(),
      clienteId: this.consumidorFinal() ? null : this.clienteSel(),
      compradorIdentificacion: this.consumidorFinal() ? null : this.identificacion().trim(),
      compradorNombre: this.consumidorFinal() ? null : this.nombre().trim(),
      compradorDireccion: this.consumidorFinal() ? null : this.direccion().trim() || null,
      compradorEmail: this.consumidorFinal() ? null : this.email().trim() || null,
      formaPago: this.formaPago(),
      sesionCajaId: this.esEfectivo() ? this.sesionCajaId() : null,
      // Solo viaja si se editó: así el backend sabe distinguir «cóbralo a precio de
      // lista» de «cóbralo a esta cifra exacta».
      totalFinal: this.totalEditado(),
      observacion: this.observacion().trim() || null,
      lineas: this.carrito().map((l) => ({
        origen: l.articulo.origen,
        articuloId: l.articulo.articuloId,
        cantidad: l.cantidad,
      })),
    };

    this.guardando.set(true);
    this.error.set(null);
    this.ventas.registrar(req).subscribe({
      next: (v) => {
        this.guardando.set(false);
        this.venta.set(v);
        this.registrada.emit(v);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(this.mensajeDeError(e));
      },
    });
  }

  private validar(): string | null {
    if (this.carrito().length === 0) return 'Agrega al menos un producto a la venta.';
    if (!this.consumidorFinal()) {
      if (!this.identificacion().trim()) return 'Indica la identificación del comprador.';
      if (!this.nombre().trim()) return 'Indica el nombre del comprador.';
    }
    if (this.faltaCaja()) {
      return 'Para cobrar en efectivo hace falta una jornada de caja abierta.';
    }
    const total = this.totalACobrar();
    if (total <= 0) return 'El total a cobrar debe ser mayor que cero.';
    if (total > this.totalLista()) {
      return 'El total a cobrar no puede superar el precio de lista.';
    }
    return null;
  }

  /** Vender otra cosa sin salir de la ventana. */
  nuevaVenta() {
    this.venta.set(null);
    this.carrito.set([]);
    this.totalEditado.set(null);
    this.observacion.set('');
    this.error.set(null);
    this.aviso.set(null);
    this.limpiarBusqueda();
  }

  cerrarVentana() {
    if (this.guardando()) return;
    this.cerrar.emit();
  }

  /* ================================================================
   *  Impresión del recibo
   * ================================================================ */

  /**
   * Imprime en un iframe oculto en vez de abrir una ventana nueva: los bloqueadores
   * de ventanas emergentes cancelan `window.open` sin avisar, y un recibo que a
   * veces no sale es peor que no tener el botón.
   */
  imprimir() {
    const v = this.venta();
    if (!v) return;

    const marco = document.createElement('iframe');
    marco.setAttribute('aria-hidden', 'true');
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(marco);

    const doc = marco.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(marco);
      return;
    }
    doc.open();
    doc.write(this.reciboHtml(v));
    doc.close();

    const ventana = marco.contentWindow!;
    ventana.focus();
    ventana.print();
    // Se retira después de imprimir: quitarlo antes de que el navegador termine de
    // componer la vista deja el diálogo en blanco.
    setTimeout(() => marco.remove(), 1000);
  }

  /** Recibo en 80 mm, que es el ancho de una impresora térmica de mostrador. */
  private reciboHtml(v: Venta): string {
    const e = this.emisor();
    const esc = VentaMostradorComponent.escapar;
    const dinero = (n: number) => '$' + (n ?? 0).toFixed(2);

    const lineas = v.lineas
      .map(
        (l) => `
        <tr>
          <td colspan="2" class="desc">${esc(l.descripcion)}<br><span class="cod">${esc(l.codigo)}</span></td>
        </tr>
        <tr>
          <td class="cant">${l.cantidad} × ${dinero(l.precioUnitario)}${
            l.descuento > 0 ? ` <span class="cod">(−${dinero(l.descuento)})</span>` : ''
          }</td>
          <td class="num">${dinero(l.total)}</td>
        </tr>`,
      )
      .join('');

    const cabecera = e
      ? `<div class="empresa">${esc(e.nombreComercial || e.razonSocial)}</div>
         <div class="linea">${esc(e.razonSocial)}</div>
         <div class="linea">RUC ${esc(e.ruc)}</div>
         <div class="linea">${esc(e.direccionMatriz)}</div>`
      : '<div class="empresa">Comprobante de venta</div>';

    const documento =
      v.comprobante === 'FACTURA' && v.facturaNumero
        ? `<div class="linea"><strong>Factura ${esc(v.facturaNumero)}</strong></div>`
        : '<div class="linea">Recibo de venta · sin valor tributario</div>';

    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(v.numero)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #000;
         margin: 0; width: 72mm; }
  .centro { text-align: center; }
  .empresa { font-size: 13px; font-weight: 700; }
  .linea { font-size: 10px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .desc { font-weight: 600; padding-top: 4px; }
  .cod { font-size: 9px; color: #444; font-weight: 400; }
  .cant { font-size: 10px; }
  .num { text-align: right; white-space: nowrap; }
  .tot td { font-size: 13px; font-weight: 700; padding-top: 4px; }
  .pie { margin-top: 8px; font-size: 9px; }
</style></head>
<body>
  <div class="centro">
    ${cabecera}
    <hr>
    <div class="linea"><strong>${esc(v.numero)}</strong></div>
    ${documento}
    <div class="linea">${esc(VentaMostradorComponent.fechaLarga(v.fecha))}</div>
  </div>
  <hr>
  <div class="linea"><strong>Cliente:</strong> ${esc(v.compradorNombre)}</div>
  <div class="linea"><strong>Identificación:</strong> ${esc(v.compradorIdentificacion)}</div>
  ${v.compradorDireccion ? `<div class="linea">${esc(v.compradorDireccion)}</div>` : ''}
  <hr>
  <table>${lineas}</table>
  <hr>
  <table>
    <tr><td>Subtotal</td><td class="num">${dinero(v.subtotal)}</td></tr>
    ${v.descuento > 0 ? `<tr><td>Descuento</td><td class="num">−${dinero(v.descuento)}</td></tr>` : ''}
    <tr><td>IVA</td><td class="num">${dinero(v.valorIva)}</td></tr>
    <tr class="tot"><td>TOTAL</td><td class="num">${dinero(v.total)}</td></tr>
  </table>
  <hr>
  <div class="linea">Forma de pago: ${esc(v.formaPago)}</div>
  ${v.observacion ? `<div class="linea">${esc(v.observacion)}</div>` : ''}
  <div class="centro pie">¡Gracias por su compra!</div>
</body></html>`;
  }

  /**
   * Escapa lo que entra al recibo. El nombre y la dirección los teclea una persona,
   * y se insertan en una cadena HTML: sin esto, un nombre con «<» rompería el
   * documento (y en el peor caso metería marcado ajeno dentro del iframe).
   */
  private static escapar(texto: string | null | undefined): string {
    if (texto == null) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static fechaLarga(iso: string): string {
    const f = new Date(iso);
    if (isNaN(f.getTime())) return '';
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
  }

  /* ================================================================
   *  Utilidades de pantalla
   * ================================================================ */

  moneda(n: number): string {
    return '$' + (n ?? 0).toFixed(2);
  }

  /** Cuánto queda del artículo, en su unidad. Los equipos no la llevan. */
  disponibleDe(a: ArticuloVendible): string {
    const cantidad = a.disponible ?? 0;
    if (a.origen === 'EQUIPO') return '1 unidad';
    const unidad = a.unidad ? a.unidad.toLowerCase() : 'unidad(es)';
    return `${cantidad} ${unidad}`;
  }

  private mensajeDeError(e: { status?: number; error?: { message?: string } }): string {
    if (e.status === 422) {
      return (
        e.error?.message ??
        'La venta no cumple una regla: revisa cantidades, existencias o el estado de la caja.'
      );
    }
    if (e.status === 503) {
      return (
        e.error?.message ??
        'El mostrador no está disponible en este momento (falta inventario o facturación).'
      );
    }
    if (e.status === 400) return 'Hay algún dato inválido en la venta.';
    if (e.status === 403) return 'Tu rol no tiene permiso para vender.';
    if (e.status === 0) return 'No se pudo contactar el backend.';
    return 'No se pudo registrar la venta.';
  }
}
