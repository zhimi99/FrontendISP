import { Injectable } from '@angular/core';

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
  }
}

/**
 * Carga perezosa del SDK de Google Maps: el script solo se pide la primera vez
 * que una pantalla necesita un mapa interactivo (hoy solo el selector de
 * ubicación), y se comparte entre todos los componentes que lo pidan después.
 * El resto de la app sigue usando la Static Maps API (una simple URL de
 * imagen), que no necesita este SDK.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private promesa: Promise<GoogleMapsApi> | null = null;

  cargar(): Promise<GoogleMapsApi> {
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
}
