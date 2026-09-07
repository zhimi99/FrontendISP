import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CrearOrdenRequest, Orden } from '../models/operativo.model';
import { OperativoService } from './operativo.service';

const BASE = `${environment.apiBase}/api/ordenes`;

const ORDEN: Orden = {
  id: 1,
  numero: 'ORD-0001',
  tipo: 'SOPORTE',
  estado: 'PENDIENTE',
  prioridad: 'NORMAL',
  contratoId: 1,
  clienteId: 1,
  tecnicoUsuarioId: null,
  creadaPor: 2,
  descripcion: 'Sin señal',
  resultado: null,
  motivoCancelacion: null,
  fechaProgramada: null,
  fechaAsignacion: null,
  fechaInicio: null,
  fechaCierre: null,
};

describe('OperativoService', () => {
  let service: OperativoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OperativoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listarOrdenes() sin filtro pide GET /api/ordenes sin parámetros', () => {
    service.listarOrdenes().subscribe();

    const peticion = http.expectOne((req) => req.url === BASE);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys().length).toBe(0);
    peticion.flush([ORDEN]);
  });

  it('listarOrdenes() con filtro arma los query params esperados', () => {
    service.listarOrdenes({ estado: 'ASIGNADA', contratoId: 1, tecnicoUsuarioId: 7 }).subscribe();

    const peticion = http.expectOne(
      (req) =>
        req.url === BASE &&
        req.params.get('estado') === 'ASIGNADA' &&
        req.params.get('contratoId') === '1' &&
        req.params.get('tecnicoUsuarioId') === '7',
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush([ORDEN]);
  });

  it('crear() manda POST /api/ordenes con el cuerpo del ticket', () => {
    const request: CrearOrdenRequest = {
      tipo: 'SOPORTE',
      prioridad: 'ALTA',
      contratoId: 1,
      clienteId: 1,
      descripcion: 'Sin señal desde ayer',
      fechaProgramada: null,
      tecnicoUsuarioId: null,
    };

    let resultado: Orden | undefined;
    service.crear(request).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(BASE);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush(ORDEN);

    expect(resultado).toEqual(ORDEN);
  });

  it('asignar() manda POST /api/ordenes/{id}/asignar con el técnico', () => {
    service.asignar(1, 7).subscribe();

    const peticion = http.expectOne(`${BASE}/1/asignar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ tecnicoUsuarioId: 7 });
    peticion.flush({ ...ORDEN, estado: 'ASIGNADA', tecnicoUsuarioId: 7 });
  });

  it('iniciar() manda POST /api/ordenes/{id}/iniciar sin cuerpo', () => {
    service.iniciar(1).subscribe();

    const peticion = http.expectOne(`${BASE}/1/iniciar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({});
    peticion.flush({ ...ORDEN, estado: 'EN_PROCESO' });
  });

  it('aceptar() manda POST /api/ordenes/{id}/aceptar sin cuerpo', () => {
    service.aceptar(1).subscribe();

    const peticion = http.expectOne(`${BASE}/1/aceptar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({});
    peticion.flush({ ...ORDEN, estado: 'ASIGNADA' });
  });

  it('porId() pide GET /api/ordenes/{id}', () => {
    let resultado: Orden | undefined;
    service.porId(1).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${BASE}/1`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(ORDEN);

    expect(resultado).toEqual(ORDEN);
  });

  it('cerrar() manda POST /api/ordenes/{id}/cerrar con el resultado', () => {
    service.cerrar(1, 'Se reemplazó el ONT').subscribe();

    const peticion = http.expectOne(`${BASE}/1/cerrar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ resultado: 'Se reemplazó el ONT' });
    peticion.flush({ ...ORDEN, estado: 'CERRADA', resultado: 'Se reemplazó el ONT' });
  });

  it('subirFoto() manda POST multipart con el archivo', () => {
    const archivo = new File(['foto'], 'trabajo.jpg', { type: 'image/jpeg' });
    service.subirFoto(1, archivo).subscribe();

    const peticion = http.expectOne(`${BASE}/1/foto`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body instanceof FormData).toBe(true);
    expect((peticion.request.body as FormData).get('archivo')).toStrictEqual(archivo);
    peticion.flush(null);
  });

  it('cancelar() manda POST /api/ordenes/{id}/cancelar con el motivo', () => {
    service.cancelar(1, 'Cliente canceló la visita').subscribe();

    const peticion = http.expectOne(`${BASE}/1/cancelar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ motivo: 'Cliente canceló la visita' });
    peticion.flush({ ...ORDEN, estado: 'CANCELADA', motivoCancelacion: 'Cliente canceló la visita' });
  });
});
