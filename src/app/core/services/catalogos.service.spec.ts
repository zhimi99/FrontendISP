import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CatalogosService } from './catalogos.service';

const BASE = `${environment.apiBase}/api/catalogos`;

describe('CatalogosService', () => {
  let service: CatalogosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('formasPago() pide GET /api/catalogos/formas-pago', () => {
    service.formasPago().subscribe();

    const peticion = http.expectOne(`${BASE}/formas-pago`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([{ codigo: 'EFECTIVO', nombre: 'Efectivo' }]);
  });

  it('tiposEquipo() pide GET /api/catalogos/tipos-equipo', () => {
    service.tiposEquipo().subscribe();

    const peticion = http.expectOne(`${BASE}/tipos-equipo`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('estadosServicio() pide GET /api/catalogos/estados-servicio', () => {
    service.estadosServicio().subscribe();

    const peticion = http.expectOne(`${BASE}/estados-servicio`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([]);
  });

  it('cachea por catálogo: dos suscriptores de formasPago() comparten una sola petición HTTP', () => {
    let primero: unknown;
    let segundo: unknown;
    service.formasPago().subscribe((r) => (primero = r));
    service.formasPago().subscribe((r) => (segundo = r));

    // Si no cacheara, esto fallaría con "expected one matching request, found 2".
    const peticion = http.expectOne(`${BASE}/formas-pago`);
    peticion.flush([{ codigo: 'EFECTIVO', nombre: 'Efectivo' }]);

    expect(primero).toEqual(segundo);
  });

  it('pedir formasPago() otra vez tras resolverse NO repite la petición (shareReplay sin refCount)', () => {
    service.formasPago().subscribe();
    http.expectOne(`${BASE}/formas-pago`).flush([{ codigo: 'EFECTIVO', nombre: 'Efectivo' }]);

    let segundo: unknown;
    service.formasPago().subscribe((r) => (segundo = r));

    // Sin una nueva petición HTTP pendiente: se sirve del valor ya cacheado.
    http.expectNone(`${BASE}/formas-pago`);
    expect(segundo).toEqual([{ codigo: 'EFECTIVO', nombre: 'Efectivo' }]);
  });

  it('cada catálogo tiene su propia caché: pedir uno no sirve el otro', () => {
    service.formasPago().subscribe();
    http.expectOne(`${BASE}/formas-pago`).flush([{ codigo: 'EFECTIVO', nombre: 'Efectivo' }]);

    service.tiposEquipo().subscribe();
    const peticion = http.expectOne(`${BASE}/tipos-equipo`);
    peticion.flush([{ codigo: 'ONT', nombre: 'ONT' }]);
  });
});
