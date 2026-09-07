import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { EditarEmisorRequest, Emisor, Factura, FacturaVista, MoraContrato } from '../models/facturacion.model';
import { FacturacionService } from './facturacion.service';

const FACTURAS = `${environment.apiBase}/api/facturas`;

const EMISOR: Emisor = {
  id: 1,
  ruc: '0190000000001',
  razonSocial: 'Smartuz C.Z.',
  nombreComercial: 'FIBRA NET',
  direccionMatriz: 'Chordeleg, Azuay',
  ambiente: 'PRUEBAS',
  contribuyenteEspecial: null,
  obligadoContabilidad: false,
  certificadoAlias: null,
  activo: true,
  facturasEmitidas: 0,
  rucEditable: true,
};

describe('FacturacionService', () => {
  let service: FacturacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FacturacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar() sin filtro pide GET /api/facturas sin parámetros', () => {
    service.listar().subscribe();

    const peticion = http.expectOne((req) => req.url === FACTURAS);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys().length).toBe(0);
    peticion.flush([] as FacturaVista[]);
  });

  it('listar() con filtro arma los query params esperados', () => {
    service.listar({ contratoId: 1, clienteId: 2 }).subscribe();

    const peticion = http.expectOne(
      (req) => req.url === FACTURAS && req.params.get('contratoId') === '1' && req.params.get('clienteId') === '2',
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush([] as FacturaVista[]);
  });

  it('mora() pide GET /api/mora', () => {
    const mora: MoraContrato[] = [];
    let resultado: MoraContrato[] | undefined;
    service.mora().subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${environment.apiBase}/api/mora`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(mora);

    expect(resultado).toEqual(mora);
  });

  it('ver() pide GET /api/facturas/{id}', () => {
    const factura = { id: 1 } as Factura;
    let resultado: Factura | undefined;
    service.ver(1).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${FACTURAS}/1`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(factura);

    expect(resultado).toEqual(factura);
  });

  it('descargarComprobante() pide GET como blob', () => {
    const blob = new Blob(['pdf']);
    let resultado: Blob | undefined;
    service.descargarComprobante(1).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${FACTURAS}/1/comprobante`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(blob);

    expect(resultado).toEqual(blob);
  });

  it('emisor() pide GET /api/emisor', () => {
    let resultado: Emisor | undefined;
    service.emisor().subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${environment.apiBase}/api/emisor`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(EMISOR);

    expect(resultado).toEqual(EMISOR);
  });

  it('guardarEmisor() manda PUT /api/emisor', () => {
    const request: EditarEmisorRequest = {
      ruc: EMISOR.ruc,
      razonSocial: EMISOR.razonSocial,
      nombreComercial: EMISOR.nombreComercial,
      direccionMatriz: EMISOR.direccionMatriz,
      ambiente: 'PRODUCCION',
      contribuyenteEspecial: null,
      obligadoContabilidad: false,
      certificadoAlias: 'cert-2026',
    };

    let resultado: Emisor | undefined;
    service.guardarEmisor(request).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${environment.apiBase}/api/emisor`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ ...EMISOR, ambiente: 'PRODUCCION' });

    expect(resultado?.ambiente).toBe('PRODUCCION');
  });
});
