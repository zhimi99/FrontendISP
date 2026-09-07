import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  BajaContratoRequest,
  ContratoDetalle,
  ContratoListado,
  CrearContratoServicioRequest,
  CrearContratoServicioResponse,
  GuardarRegistroGponRequest,
  HistorialEstado,
  OfertaServicioCatalogo,
  RegistroGpon,
} from '../models/contratos.model';
import { ContratosService } from './contratos.service';

const BASE = `${environment.apiBase}/api/contratos`;

const CONTRATO_DETALLE: ContratoDetalle = {
  codigo: 'CTR-0001',
  clienteCodigo: 'CLI-0001',
  clienteNombre: 'Ana Pérez',
  clienteIdentificacion: '0102030405',
  tipoServicio: 'Internet',
  ofertaServicio: 'Internet residencial',
  ofertaCodigo: 'INTERNET',
  modalidadCobro: 'RECURRENTE',
  precioAcordado: 25,
  usaRed: true,
  sujetoMora: true,
  plan: 'Plan 50MB',
  planCodigo: 'PLAN-50',
  velocidad: '50/25',
  planPrecio: 25,
  estadoServicio: 'ACTIVO',
  diaCorte: 5,
  fechaAlta: '2026-01-01',
  fechaInstalacion: '2026-01-03',
  fechaBaja: null,
  direccionTexto: 'Chordeleg',
  direccionId: 1,
  pppoeUsuario: 'ana.perez',
  observaciones: null,
  documentoRegistradoEn: null,
};

describe('ContratosService', () => {
  let service: ContratosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContratosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar() pide GET /api/contratos', () => {
    const lista: ContratoListado[] = [];
    let resultado: ContratoListado[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const peticion = http.expectOne(BASE);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(lista);
    expect(resultado).toEqual(lista);
  });

  it('listarOfertasServicio() pide GET /api/catalogo-servicios', () => {
    const ofertas: OfertaServicioCatalogo[] = [];
    service.listarOfertasServicio().subscribe();

    const peticion = http.expectOne(`${environment.apiBase}/api/catalogo-servicios`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(ofertas);
  });

  it('agregarServicio() manda POST /api/clientes/{codigo}/contratos', () => {
    const request: CrearContratoServicioRequest = {
      ofertaCodigo: 'INTERNET',
      direccionId: 1,
      nuevaDireccion: null,
      planCodigo: 'PLAN-50',
      precioAcordado: 25,
      observaciones: null,
    };
    const respuesta: CrearContratoServicioResponse = {
      contratoCodigo: 'CTR-0002',
      estadoServicio: 'PENDIENTE',
      requiereInstalacion: true,
    };

    let resultado: CrearContratoServicioResponse | undefined;
    service.agregarServicio('CLI-0001', request).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${environment.apiBase}/api/clientes/CLI-0001/contratos`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush(respuesta);

    expect(resultado).toEqual(respuesta);
  });

  it('detalle() pide GET /api/contratos/{codigo}', () => {
    let resultado: ContratoDetalle | undefined;
    service.detalle('CTR-0001').subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${BASE}/CTR-0001`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(CONTRATO_DETALLE);

    expect(resultado).toEqual(CONTRATO_DETALLE);
  });

  it('historial() pide GET /api/contratos/{codigo}/historial', () => {
    const historial: HistorialEstado[] = [];
    service.historial('CTR-0001').subscribe();

    const peticion = http.expectOne(`${BASE}/CTR-0001/historial`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(historial);
  });

  it('registroGpon() pide GET /api/contratos/{codigo}/registro-gpon', () => {
    let resultado: RegistroGpon | null | undefined;
    service.registroGpon('CTR-0001').subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${BASE}/CTR-0001/registro-gpon`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(null);

    expect(resultado).toBeNull();
  });

  it('guardarRegistroGpon() manda PUT /api/contratos/{codigo}/registro-gpon', () => {
    const request: GuardarRegistroGponRequest = {
      interfaceGpon: '0/1',
      puertoPon: 3,
      ont: 12,
      vlanGestion: 100,
      vlanServicio: 200,
      ipServicio: '10.0.0.5',
      mascaraServicio: '255.255.255.0',
      barraServicio: '/24',
      ipGestion: '10.10.0.5',
      mascaraGestion: '255.255.255.0',
      barraGestion: '/24',
      serialOnt: '48575443217FDA9E',
      codigoServicio: 'FIB00002',
      nombreCliente: 'Juan Pérez',
      servicePortGestion: 10,
      servicePortServicio: 11,
      tx: 2.5,
      rx: -21.3,
      metrajeCable: 80,
    };

    service.guardarRegistroGpon('CTR-0001', request).subscribe();

    const peticion = http.expectOne(`${BASE}/CTR-0001/registro-gpon`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ ...request, id: 1, contratoId: 1 } satisfies RegistroGpon);
  });

  it('obtenerDocumento() pide GET como blob con el parámetro descargar', () => {
    const blob = new Blob(['pdf']);
    let resultado: Blob | undefined;
    service.obtenerDocumento('CTR-0001', true).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(
      (req) => req.url === `${BASE}/CTR-0001/documento` && req.params.get('descargar') === 'true',
    );
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(blob);

    expect(resultado).toEqual(blob);
  });

  it('darDeBaja() manda POST /api/contratos/{codigo}/baja', () => {
    const request: BajaContratoRequest = { motivo: 'Cliente se muda', fechaBaja: null };

    service.darDeBaja('CTR-0001', request).subscribe();

    const peticion = http.expectOne(`${BASE}/CTR-0001/baja`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({ ...CONTRATO_DETALLE, estadoServicio: 'RETIRADO' });
  });
});
