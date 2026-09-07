import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  AltaClienteRequest,
  AltaClienteResponse,
  ClienteDetalle,
  ClienteListado,
  EditarClienteRequest,
} from '../models/contratos.model';
import { ClientesService } from './clientes.service';

const BASE = `${environment.apiBase}/api/clientes`;

describe('ClientesService', () => {
  let service: ClientesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar() pide GET /api/clientes y devuelve la lista', () => {
    const lista: ClienteListado[] = [
      {
        id: 1,
        codigo: 'CLI-0001',
        tipoCliente: 'PERSONA',
        tipoIdentificacion: 'CEDULA',
        identificacion: '0102030405',
        nombre: 'Ana Pérez',
        telefono: '0987654321',
        tieneWhatsapp: true,
        direccion: 'Chordeleg',
        contratoCodigo: 'CTR-0001',
        plan: 'Plan 50MB',
        velocidad: '50/25',
        estadoServicio: 'ACTIVO',
        fechaRegistro: '2026-01-01T00:00:00Z',
      },
    ];

    let resultado: ClienteListado[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const peticion = http.expectOne(BASE);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(lista);

    expect(resultado).toEqual(lista);
  });

  it('detalle() pide GET /api/clientes/{codigo}', () => {
    const detalle: ClienteDetalle = {
      id: 1,
      codigo: 'CLI-0001',
      tipoCliente: 'PERSONA',
      tipoIdentificacion: 'CEDULA',
      identificacion: '0102030405',
      nombre: 'Ana Pérez',
      nombres: 'Ana',
      apellidos: 'Pérez',
      razonSocial: null,
      email: null,
      telefono: '0987654321',
      tieneWhatsapp: true,
      whatsapp: '0987654321',
      fechaRegistro: '2026-01-01T00:00:00Z',
      tieneIdentificacion: false,
      direccionPrincipal: null,
      direcciones: [],
      contratos: [],
    };

    let resultado: ClienteDetalle | undefined;
    service.detalle('CLI-0001').subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${BASE}/CLI-0001`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(detalle);

    expect(resultado).toEqual(detalle);
  });

  it('crear() manda POST /api/clientes con el cuerpo del alta', () => {
    const request: AltaClienteRequest = {
      tipoCliente: 'PERSONA',
      tipoIdentificacion: 'CEDULA',
      identificacion: '0102030405',
      nombres: 'Ana',
      apellidos: 'Pérez',
      razonSocial: null,
      email: null,
      telefono: '0987654321',
      whatsapp: '0987654321',
      direccionTexto: 'Chordeleg, Azuay',
      referencia: null,
      latitud: null,
      longitud: null,
    };
    const respuesta: AltaClienteResponse = { clienteCodigo: 'CLI-0002' };

    let resultado: AltaClienteResponse | undefined;
    service.crear(request).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(BASE);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush(respuesta);

    expect(resultado).toEqual(respuesta);
  });

  it('editar() manda PUT /api/clientes/{codigo} con identidad, nombre y contacto', () => {
    const request: EditarClienteRequest = {
      tipoIdentificacion: 'CEDULA',
      identificacion: '1710034065',
      nombres: 'Ana',
      apellidos: 'Pérez Gómez',
      razonSocial: null,
      email: 'ana@example.com',
      telefono: '0987654321',
      whatsapp: '0987654321',
    };

    service.editar('CLI-0001', request).subscribe();

    const peticion = http.expectOne(`${BASE}/CLI-0001`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({});
  });

  it('subirIdentificacion() manda PUT multipart con el archivo', () => {
    const archivo = new File(['contenido'], 'cedula.png', { type: 'image/png' });

    service.subirIdentificacion('CLI-0001', archivo).subscribe();

    const peticion = http.expectOne(`${BASE}/CLI-0001/identificacion`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body instanceof FormData).toBe(true);
    expect((peticion.request.body as FormData).get('archivo')).toStrictEqual(archivo);
    peticion.flush(null);
  });

  it('obtenerIdentificacion() pide GET como blob', () => {
    const blob = new Blob(['x']);

    let resultado: Blob | undefined;
    service.obtenerIdentificacion('CLI-0001').subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${BASE}/CLI-0001/identificacion`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(blob);

    expect(resultado).toEqual(blob);
  });
});
