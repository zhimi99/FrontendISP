import { Injectable, signal } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

export interface GoogleMapInstance {
  addListener(evento: string, manejador: (e: { latLng: GoogleLatLng | null }) => void): void;
}

export interface GoogleMarkerInstance {
  addListener(evento: string, manejador: () => void): void;
  getPosition(): GoogleLatLng | null;
  setPosition(pos: LatLngLiteral): void;
}

export interface GoogleMapsApi {
  maps: {
    Map: new (elemento: HTMLElement, opciones: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (opciones: Record<string, unknown>) => GoogleMarkerInstance;
  };
}

declare global {
  interface Window {
    google?: GoogleMapsApi;
    /**
     * Callback global que el propio script de Google invoca cuando la clave no
     * puede autenticarse: API no habilitada en el proyecto de Cloud, facturación
     * sin vincular, o el dominio actual fuera de las restricciones de la clave.
     * Sin conectarlo, ese fallo solo se ve como un error en la consola del
     * navegador -el archivo del script sí descarga, `google.maps` sí llega a
     * existir como objeto- y el mapa se queda en blanco sin explicar por qué.
     */
    gm_authFailure?: () => void;
  }
}

/**
 * Carga perezosa del SDK de Google Maps: el script solo se pide la primera vez
 * que una pantalla necesita un mapa interactivo (hoy el selector de ubicación,
 * usado en el alta de cliente y al agregar o corregir la dirección de un
 * servicio), y se comparte entre todos los componentes que lo pidan después.
 * El resto de la app sigue usando la Static Maps API (una simple URL de
 * imagen), que no necesita este SDK.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private promesa: Promise<GoogleMapsApi> | null = null;

  /**
   * Se incrementa cada vez que Google avisa un fallo de autenticación de la
   * clave. IMPORTA que sea un contador y no una promesa: `ApiNotActivatedMapError`
   * -el caso real que dio pie a esto- lo detecta Google al construir un mapa de
   * verdad (`new google.maps.Map(...)`), no al descargar el script; para
   * entonces `cargar()` ya se resolvió con éxito, porque el archivo sí bajó y
   * `google.maps` sí existe como objeto en los dos casos. Por eso cada
   * `MapaSelectorComponent` escucha este contador durante toda su vida, no
   * solo en el momento de cargar.
   */
  readonly fallaAutenticacion = signal(0);

  cargar(): Promise<GoogleMapsApi> {
    this.instalarAvisoDeFallo();
    if (window.google?.maps) return Promise.resolve(window.google);
    if (this.promesa) return this.promesa;

    this.promesa = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
      script.async = true;
      script.onload = () => {
        if (window.google?.maps) resolve(window.google);
        else reject(new Error('Google Maps no quedó disponible tras cargar el script.'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar el script de Google Maps.'));
      document.head.appendChild(script);
    });
    return this.promesa;
  }

  private instalarAvisoDeFallo() {
    if (window.gm_authFailure) return; // ya lo instaló una carga anterior
    window.gm_authFailure = () => this.fallaAutenticacion.update((n) => n + 1);
  }
}
