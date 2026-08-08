import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Una opción de un catálogo cerrado del dominio, tal y como la publica el backend. */
export interface OpcionCatalogo {
  /** El valor que viaja en la API y se guarda en la base. */
  codigo: string;
  /** Cómo se muestra. Viene del backend para que no haya dos verdades. */
  nombre: string;
}

/**
 * Catálogos cerrados del dominio: formas de pago, tipos de equipo, estados de servicio.
 *
 * Estas listas estaban copiadas a mano dentro de los componentes. Al ser los valores de
 * un enum de la base, cualquier alta en el dominio dejaba la copia atrás y el operador
 * no podía elegir el valor nuevo. Ahora existen en un solo sitio y se piden aquí.
 *
 * Se cachean con `shareReplay`: no cambian mientras dure la sesión, y varias pantallas
 * piden las mismas. `refCount: false` mantiene el valor aunque no queden suscriptores,
 * de modo que volver a entrar en una pantalla no repite la petición.
 */
@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<OpcionCatalogo[]>>();

  /** Medios de recaudación admitidos al registrar un pago. */
  formasPago(): Observable<OpcionCatalogo[]> {
    return this.catalogo('formas-pago');
  }

  /** Tipos de equipo que se pueden dar de alta en inventario. */
  tiposEquipo(): Observable<OpcionCatalogo[]> {
    return this.catalogo('tipos-equipo');
  }

  /** Estados posibles del servicio de un contrato. */
  estadosServicio(): Observable<OpcionCatalogo[]> {
    return this.catalogo('estados-servicio');
  }

  private catalogo(nombre: string): Observable<OpcionCatalogo[]> {
    let peticion = this.cache.get(nombre);
    if (!peticion) {
      peticion = this.http
        .get<OpcionCatalogo[]>(`${environment.apiBase}/api/catalogos/${nombre}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(nombre, peticion);
    }
    return peticion;
  }
}
