import { AfterViewInit, Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';

import {
  GoogleMapInstance,
  GoogleMapsLoaderService,
  GoogleMarkerInstance,
  LatLngLiteral,
} from '../core/services/google-maps-loader.service';

/** Centro histórico de Cuenca: alternativa razonable si no hay geolocalización ni ubicación previa. */
const CENTRO_POR_DEFECTO: LatLngLiteral = { lat: -2.897318, lng: -79.004049 };

/**
 * Mapa interactivo con un pin arrastrable para elegir una ubicación, en vez de
 * escribir latitud/longitud a mano. Al abrirse intenta centrar en la posición
 * actual del dispositivo (el técnico suele estar frente al domicilio del
 * cliente); si no hay permiso o falla, cae al centro de Cuenca.
 *
 * Si el SDK de Google Maps no carga (red, bloqueador, cuota), se muestra un
 * aviso y el formulario que lo use debe ofrecer un modo manual: este
 * componente nunca bloquea el flujo, solo dejar de emitir ubicaciones.
 */
@Component({
  selector: 'app-mapa-selector',
  standalone: true,
  template: `
    @if (error(); as mensaje) {
      <p class="mapa-aviso mapa-aviso-error">{{ mensaje }}</p>
    } @else if (cargando()) {
      <div class="mapa-lienzo mapa-cargando">Cargando mapa…</div>
    }
    <div class="mapa-lienzo" [style.display]="error() || cargando() ? 'none' : 'block'" #lienzo></div>
    @if (coordenadas(); as c) {
      <p class="mapa-coords">📍 {{ c.lat.toFixed(6) }}, {{ c.lng.toFixed(6) }}</p>
    }
  `,
  styles: [
    `
      .mapa-lienzo {
        width: 100%;
        height: 260px;
        border-radius: 10px;
        border: 1px solid var(--border-2, #d5dad5);
      }
      .mapa-cargando {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted, #6b7280);
        font-size: 13px;
        background: var(--bg, #f7f8f7);
      }
      .mapa-aviso {
        margin: 0 0 8px;
        font-size: 12.5px;
      }
      .mapa-aviso-error {
        color: var(--danger, #b00020);
      }
      .mapa-coords {
        margin: 8px 0 0;
        font-size: 12.5px;
        color: var(--muted, #6b7280);
      }
    `,
  ],
})
export class MapaSelectorComponent implements AfterViewInit {
  private readonly loader = inject(GoogleMapsLoaderService);

  /** Ubicación ya conocida (p. ej. al editar una dirección existente); si no se pasa, se geolocaliza. */
  readonly inicial = input<LatLngLiteral | null>(null);
  readonly ubicacionElegida = output<LatLngLiteral>();

  @ViewChild('lienzo') private lienzoRef?: ElementRef<HTMLDivElement>;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly coordenadas = signal<LatLngLiteral | null>(null);

  private marcador?: GoogleMarkerInstance;

  ngAfterViewInit() {
    this.iniciar();
  }

  private async iniciar() {
    try {
      const [centro, google] = await Promise.all([
        this.inicial() ? Promise.resolve(this.inicial()!) : this.ubicacionDelDispositivo(),
        this.loader.cargar(),
      ]);
      const elemento = this.lienzoRef?.nativeElement;
      if (!elemento) return;

      const mapa: GoogleMapInstance = new google.maps.Map(elemento, {
        center: centro,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      this.marcador = new google.maps.Marker({ position: centro, map: mapa, draggable: true });
      this.coordenadas.set(centro);

      this.marcador.addListener('dragend', () => this.emitirDesdeMarcador());
      mapa.addListener('click', (e) => {
        if (!e.latLng) return;
        const posicion = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        this.marcador?.setPosition(posicion);
        this.coordenadas.set(posicion);
        this.ubicacionElegida.emit(posicion);
      });

      this.cargando.set(false);
    } catch {
      this.error.set('No se pudo cargar el mapa.');
      this.cargando.set(false);
    }
  }

  private emitirDesdeMarcador() {
    const posicion = this.marcador?.getPosition();
    if (!posicion) return;
    const literal = { lat: posicion.lat(), lng: posicion.lng() };
    this.coordenadas.set(literal);
    this.ubicacionElegida.emit(literal);
  }

  private ubicacionDelDispositivo(): Promise<LatLngLiteral> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(CENTRO_POR_DEFECTO);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (posicion) => resolve({ lat: posicion.coords.latitude, lng: posicion.coords.longitude }),
        () => resolve(CENTRO_POR_DEFECTO),
        { timeout: 5000 },
      );
    });
  }
}
