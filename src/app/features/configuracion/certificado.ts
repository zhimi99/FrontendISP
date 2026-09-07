import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../shared/icon';
import { FacturacionService } from '../../core/services/facturacion.service';
import { CertificadoFirma } from '../../core/models/facturacion.model';
import { mensajeError } from '../../core/http/errores';

/**
 * Carga del certificado de firma electrónica (.p12) del SRI.
 *
 * <p>Es el último paso que separa al sistema de facturar de verdad. Antes el archivo
 * había que montarlo a mano en una carpeta del servidor; en un servicio que se
 * redespliega solo, ese disco desaparece en cada despliegue. Ahora se sube desde aquí
 * y el mismo proceso empieza a firmar con él <b>sin reiniciar</b>.</p>
 *
 * <p>Lo que la pantalla enseña, y que no es adorno:</p>
 *
 * <ul>
 *   <li><b>Con qué se está firmando ahora mismo</b> (`tecnicaFirma`), no solo si hay un
 *       archivo cargado. Es la diferencia entre creer que se emite legalmente y
 *       emitirlo.</li>
 *   <li><b>Cuándo vence.</b> Un certificado caducado no avisa: simplemente deja de
 *       poder firmar, y eso se descubre al intentar cobrar.</li>
 * </ul>
 */
@Component({
  selector: 'app-config-certificado',
  standalone: true,
  imports: [DatePipe, FormsModule, IconComponent],
  templateUrl: './certificado.html',
  styleUrls: ['../clientes/clientes.scss', './configuracion.scss'],
})
export class CertificadoComponent {
  private readonly facturacion = inject(FacturacionService);

  readonly certificado = signal<CertificadoFirma | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly subiendo = signal(false);
  readonly banner = signal<{ texto: string; error: boolean } | null>(null);

  readonly archivo = signal<File | null>(null);
  readonly clave = signal('');
  readonly alias = signal('');

  /** Aviso con antelación: renovar un certificado no es inmediato. */
  private static readonly DIAS_AVISO_VENCIMIENTO = 30;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.facturacion.certificado().subscribe({
      next: (c) => {
        this.certificado.set(c);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(
          mensajeError(e, {
            porEstado: { 403: 'Solo un administrador puede ver el certificado de firma.' },
            generico: () => `No se pudo consultar el certificado (${e.status ?? 'error'}).`,
          }),
        );
        this.certificado.set(null);
        this.cargando.set(false);
      },
    });
  }

  /**
   * Estado de la firma en una sola idea, que es lo que la persona necesita saber
   * antes de emitir. No se deduce de `presente`: un certificado cargado puede no
   * estarse usando.
   */
  readonly estadoFirma = computed(() => {
    const c = this.certificado();
    if (!c) return null;
    switch (c.tecnicaFirma) {
      case 'XADES_BES':
        return {
          tono: 'ok' as const,
          titulo: 'Firmando con validez legal',
          detalle: 'Los comprobantes se firman con el certificado cargado y se envían al SRI.',
        };
      case 'SIN_FIRMA':
        return {
          tono: 'error' as const,
          titulo: 'La emisión está detenida',
          detalle:
            'El emisor está en PRODUCCIÓN y no hay certificado cargado. Emitir ahora se '
            + 'detiene a propósito: un comprobante con firma simulada no tiene validez legal.',
        };
      default:
        return {
          tono: 'aviso' as const,
          titulo: 'Modo de ensayo',
          detalle:
            'Sin certificado, los comprobantes se firman en simulado y el RIDE sale impreso '
            + 'con «SIN VALIDEZ LEGAL». Sube el .p12 para empezar a facturar de verdad.',
        };
    }
  });

  readonly porVencer = computed(() => {
    const c = this.certificado();
    return (
      !!c?.presente && !c.vencido && c.diasParaVencer <= CertificadoComponent.DIAS_AVISO_VENCIMIENTO
    );
  });

  elegirArchivo(evento: Event) {
    const entrada = evento.target as HTMLInputElement;
    this.archivo.set(entrada.files?.[0] ?? null);
    this.banner.set(null);
  }

  readonly puedeSubir = computed(() => !!this.archivo() && this.clave().length > 0);

  subir() {
    const archivo = this.archivo();
    if (!archivo || !this.clave()) return;

    this.subiendo.set(true);
    this.banner.set(null);
    this.facturacion.subirCertificado(archivo, this.clave(), this.alias().trim() || undefined).subscribe({
      next: (c) => {
        this.subiendo.set(false);
        this.certificado.set(c);
        this.archivo.set(null);
        this.clave.set('');
        this.alias.set('');
        this.banner.set({
          texto:
            c.tecnicaFirma === 'XADES_BES'
              ? 'Certificado cargado. Desde ahora los comprobantes se firman con validez legal.'
              : 'Certificado cargado.',
          error: false,
        });
      },
      error: (e) => {
        this.subiendo.set(false);
        this.banner.set({
          texto: mensajeError(e, {
            porEstado: {
              400: 'No se pudo abrir el archivo: revisa que sea el .p12 correcto y que la '
                + 'contraseña sea la del certificado.',
              422: 'Ese certificado ya venció. Pide el renovado a tu entidad certificadora.',
              403: 'Solo un administrador puede cargar el certificado de firma.',
            },
            generico: 'No se pudo cargar el certificado.',
          }),
          error: true,
        });
      },
    });
  }
}
