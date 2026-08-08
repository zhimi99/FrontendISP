import { Component, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

import { ContratosService } from '../core/services/contratos.service';

/**
 * Visor del contrato en PDF, compartido por la grilla de contratos y la ficha del
 * cliente para que «ver contrato» signifique lo mismo en los dos sitios.
 *
 * El documento exige token, así que no puede abrirse con un enlace directo: se pide
 * autenticado y se muestra desde un Blob URL privado que se libera al cerrar. La
 * descarga reutiliza ese mismo blob en vez de repetir la petición.
 */
@Component({
  selector: 'app-visor-contrato',
  standalone: true,
  template: `
    <div class="modal-backdrop" (click)="cerrar.emit()">
      <div class="modal modal-contrato" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <h3>Contrato {{ codigo() }}</h3>
            @if (subtitulo(); as texto) {
              <p class="modal-sub">{{ texto }}</p>
            }
          </div>
          <button class="modal-x" type="button" (click)="cerrar.emit()" aria-label="Cerrar">×</button>
        </div>

        <div class="modal-body contrato-body">
          @if (cargando()) {
            <div class="contrato-estado">Generando el contrato…</div>
          } @else if (error()) {
            <div class="modal-error">{{ error() }}</div>
          } @else if (recurso(); as src) {
            <iframe class="contrato-pdf" [src]="src" title="Contrato del abonado"></iframe>
          }
        </div>

        <div class="modal-foot">
          <button
            type="button"
            class="btn"
            [disabled]="!url()"
            (click)="descargar()"
          >
            Descargar / Imprimir
          </button>
          <button type="button" class="btn btn-primary" (click)="cerrar.emit()">Cerrar</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: grid;
        place-items: center;
        padding: 24px;
        z-index: 60;
      }
      .modal {
        background: #fff;
        border-radius: 12px;
        width: min(920px, 100%);
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
      }
      .modal-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid #e6e9e6;
      }
      .modal-head h3 {
        margin: 0;
        font-size: 15px;
      }
      .modal-sub {
        margin: 2px 0 0;
        font-size: 12px;
        color: #6b7280;
      }
      .modal-x {
        border: 0;
        background: transparent;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        color: #6b7280;
      }
      .modal-body {
        padding: 0;
        flex: 1;
        min-height: 0;
      }
      .contrato-pdf {
        width: 100%;
        height: 68vh;
        border: 0;
        display: block;
      }
      .contrato-estado,
      .modal-error {
        padding: 40px 18px;
        text-align: center;
        color: #6b7280;
        font-size: 13px;
      }
      .modal-error {
        color: #b00020;
      }
      .modal-foot {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 18px;
        border-top: 1px solid #e6e9e6;
      }
      .btn {
        border: 1px solid #d5dad5;
        background: #fff;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 13px;
        cursor: pointer;
      }
      .btn[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .btn-primary {
        background: #16a34a;
        border-color: #16a34a;
        color: #fff;
      }
    `,
  ],
})
export class VisorContratoComponent implements OnDestroy {
  private readonly contratosService = inject(ContratosService);
  private readonly sanitizer = inject(DomSanitizer);

  /** Código del contrato a mostrar; al cambiar, se recarga el documento. */
  readonly codigo = input.required<string>();
  /** Texto opcional bajo el título (p. ej. el nombre del abonado). */
  readonly subtitulo = input<string | null>(null);

  readonly cerrar = output<void>();

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly url = signal<string | null>(null);

  readonly recurso = computed<SafeResourceUrl | null>(() => {
    const url = this.url();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  private peticion?: Subscription;
  private cargadoPara?: string;

  constructor() {
    // Reacciona al código: sirve tanto para la primera apertura como para cuando el
    // visor permanece montado y se le pasa otro contrato.
    effect(() => this.cargar(this.codigo()));
  }

  private cargar(codigo: string) {
    if (!codigo || this.cargadoPara === codigo) return;
    this.cargadoPara = codigo;

    this.peticion?.unsubscribe();

    this.liberar();
    this.cargando.set(true);
    this.error.set(null);

    this.peticion = this.contratosService.obtenerDocumento(codigo).subscribe({
      next: (archivo) => {
        this.url.set(URL.createObjectURL(archivo));
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(this.mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  /** Reutiliza el blob ya descargado: no vuelve a pedirle el PDF al backend. */
  descargar() {
    const url = this.url();
    if (!url) return;

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `contrato-${this.codigo()}.pdf`;
    enlace.click();
  }

  private liberar() {
    const url = this.url();
    if (url) URL.revokeObjectURL(url);
    this.url.set(null);
  }

  private mensajeDeError(e: { status?: number }): string {
    if (e.status === 0) return 'No se pudo contactar el backend (¿está arriba en :8089?).';
    if (e.status === 403) return 'Tu rol no tiene permiso para ver este contrato.';
    if (e.status === 404) return 'Este contrato ya no existe.';
    return 'No se pudo generar el contrato.';
  }

  ngOnDestroy() {
    this.peticion?.unsubscribe();
    this.liberar();
  }
}
