import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  AbrirCajaRequest,
  CajaEstado,
  CerrarCajaRequest,
  CierreCaja,
  CierresReporte,
  PagoCobranza,
  PagoRegistrado,
  RegistrarPagoRequest,
} from '../models/finanzas.model';
import { FinanzasService } from './finanzas.service';

const PAGOS = `${environment.apiBase}/api/pagos`;
const CAJAS = `${environment.apiBase}/api/cajas`;

const PAGO: PagoCobranza = {
  id: 1,
  numeroRecibo: 'REC-0001',
  clienteId: 1,
  contratoId: 1,
  fecha: '2026-01-01T00:00:00Z',
  monto: 25,
  formaPago: 'EFECTIVO',
  estado: 'CONFIRMADO',
  referencia: null,
  banco: null,
  sesionCajaId: 1,
  cajaCodigo: 'CAJA-1',
  cajaNombre: 'Caja principal',
  usuarioId: 1,
  observacion: null,
  aplicaciones: [],
};

describe('FinanzasService', () => {
  let service: FinanzasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FinanzasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listarPagos() sin filtro pide GET /api/pagos sin parámetros', () => {
    service.listarPagos().subscribe();

    const peticion = http.expectOne((req) => req.url === PAGOS);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys().length).toBe(0);
    peticion.flush([PAGO]);
  });

  it('listarPagos() con filtro arma los query params esperados', () => {
    service.listarPagos({ clienteId: 5, contratoId: 9, estado: 'CONFIRMADO' }).subscribe();

    const peticion = http.expectOne(
      (req) =>
        req.url === PAGOS &&
        req.params.get('clienteId') === '5' &&
        req.params.get('contratoId') === '9' &&
        req.params.get('estado') === 'CONFIRMADO',
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush([PAGO]);
  });

  it('listarCajas() pide GET /api/cajas', () => {
    const cajas: CajaEstado[] = [
      { id: 1, codigo: 'CAJA-1', nombre: 'Caja principal', ubicacion: null, activa: true, sesionAbierta: null },
    ];
    let resultado: CajaEstado[] | undefined;
    service.listarCajas().subscribe((r) => (resultado = r));

    const peticion = http.expectOne(CAJAS);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(cajas);

    expect(resultado).toEqual(cajas);
  });

  it('registrarPago() manda POST /api/pagos con el reparto a facturas', () => {
    const request: RegistrarPagoRequest = {
      clienteId: 1,
      contratoId: 1,
      monto: 25,
      formaPago: 'EFECTIVO',
      referencia: null,
      banco: null,
      sesionCajaId: 1,
      observacion: null,
      aplicaciones: [{ facturaId: 10, facturaNumero: '001-001-000000010', montoAplicado: 25, generarFacturaLegal: true }],
    };
    const respuesta: PagoRegistrado = {
      id: 1,
      numeroRecibo: 'REC-0001',
      monto: 25,
      estado: 'CONFIRMADO',
      fecha: '2026-01-01T00:00:00Z',
    };

    let resultado: PagoRegistrado | undefined;
    service.registrarPago(request).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(PAGOS);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush(respuesta);

    expect(resultado).toEqual(respuesta);
  });

  it('abrirCaja() manda POST /api/cajas/{id}/abrir', () => {
    const request: AbrirCajaRequest = { montoInicial: 20, observacion: null };
    service.abrirCaja(1, request).subscribe();

    const peticion = http.expectOne(`${CAJAS}/1/abrir`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush({} as CajaEstado);
  });

  it('cerrarCaja() manda POST /api/cajas/{id}/cerrar', () => {
    const request: CerrarCajaRequest = { montoFinalDeclarado: 100, observacion: 'Cuadró' };
    const cierre: CierreCaja = {
      sesionId: 1,
      cajaId: 1,
      cajaCodigo: 'CAJA-1',
      cajaNombre: 'Caja principal',
      usuarioId: 1,
      fechaApertura: '2026-01-01T08:00:00Z',
      fechaCierre: '2026-01-01T18:00:00Z',
      montoInicial: 20,
      montoFinalSistema: 100,
      montoFinalDeclarado: 100,
      diferencia: 0,
    };

    let resultado: CierreCaja | undefined;
    service.cerrarCaja(1, request).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(`${CAJAS}/1/cerrar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(request);
    peticion.flush(cierre);

    expect(resultado).toEqual(cierre);
  });

  it('anularPago() manda POST /api/pagos/{id}/anular con el motivo', () => {
    service.anularPago(1, 'Cobro duplicado').subscribe();

    const peticion = http.expectOne(`${PAGOS}/1/anular`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ motivo: 'Cobro duplicado' });
    peticion.flush(PAGO);
  });

  it('reporteCierres() arma los query params desde/hasta', () => {
    const reporte: CierresReporte = {
      desde: '2026-01-01',
      hasta: '2026-01-31',
      cierres: [],
      resumen: { cantidad: 0, sumaInicial: 0, sumaSistema: 0, sumaDeclarado: 0, sumaDiferencia: 0 },
    };

    let resultado: CierresReporte | undefined;
    service.reporteCierres('2026-01-01', '2026-01-31').subscribe((r) => (resultado = r));

    const peticion = http.expectOne(
      (req) =>
        req.url === `${CAJAS}/cierres` &&
        req.params.get('desde') === '2026-01-01' &&
        req.params.get('hasta') === '2026-01-31',
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush(reporte);

    expect(resultado).toEqual(reporte);
  });
});
