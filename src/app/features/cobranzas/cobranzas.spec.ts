import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ClienteListado } from '../../core/models/contratos.model';
import { FacturaVista } from '../../core/models/facturacion.model';
import { CajaEstado, PagoRegistrado } from '../../core/models/finanzas.model';
import { CobranzasComponent } from './cobranzas';

const PAGOS = `${environment.apiBase}/api/pagos`;
const CAJAS = `${environment.apiBase}/api/cajas`;
const CLIENTES = `${environment.apiBase}/api/clientes`;
const FACTURAS = `${environment.apiBase}/api/facturas`;
const FORMAS_PAGO = `${environment.apiBase}/api/catalogos/formas-pago`;

const CLIENTE: ClienteListado = {
  id: 1,
  codigo: 'CLI-0001',
  tipoCliente: 'PERSONA',
  tipoIdentificacion: 'CEDULA',
  identificacion: '1710034065',
  nombre: 'Ana Pérez',
  telefono: '0987654321',
  tieneWhatsapp: true,
  direccion: 'Chordeleg',
  contratoCodigo: 'CTR-0001',
  plan: 'Plan 50MB',
  velocidad: '50/25',
  estadoServicio: 'ACTIVO',
  fechaRegistro: '2026-01-01T00:00:00Z',
};

const CAJA_CON_SESION: CajaEstado = {
  id: 1,
  codigo: 'CAJA-1',
  nombre: 'Caja principal',
  ubicacion: null,
  activa: true,
  sesionAbierta: {
    id: 9,
    usuarioId: 1,
    fechaApertura: '2026-01-01T08:00:00Z',
    montoInicial: 20,
    totalRecaudado: 0,
    cantidadPagos: 0,
    totalVendido: 0,
    cantidadVentas: 0,
    efectivoEnCaja: 20,
  },
};

const CAJA_SIN_SESION: CajaEstado = { ...CAJA_CON_SESION, sesionAbierta: null };

const FACTURA_PENDIENTE: FacturaVista = {
  id: 10,
  numeroDocumento: '001-001-000000010',
  claveAcceso: null,
  ambiente: 'PRUEBAS',
  estadoSri: 'GENERADA',
  estadoPago: 'PENDIENTE',
  numeroAutorizacion: null,
  fechaAutorizacion: null,
  contratoId: 1,
  clienteId: 1,
  clienteRazonSocial: 'Ana Pérez',
  fechaEmision: '2026-01-01',
  fechaVencimiento: '2026-01-10',
  periodoInicio: null,
  periodoFin: null,
  subtotalSinImpuestos: 25,
  valorIva: 0,
  total: 25,
  saldoPendiente: 25,
  xmlFirmadoUrl: null,
  ridePdfUrl: null,
};

const FACTURA_YA_PAGADA: FacturaVista = {
  ...FACTURA_PENDIENTE,
  id: 11,
  numeroDocumento: '001-001-000000011',
  estadoPago: 'PAGADA',
  saldoPendiente: 0,
};

describe('CobranzasComponent — flujo de cobro', () => {
  let component: CobranzasComponent;
  let http: HttpTestingController;

  function crearComponente(caja: CajaEstado): CobranzasComponent {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    const c = TestBed.createComponent(CobranzasComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);

    http.expectOne(PAGOS).flush([]);
    http.expectOne((req) => req.url === CAJAS).flush([caja]);
    http.expectOne(CLIENTES).flush([CLIENTE]);
    http.expectOne(FORMAS_PAGO).flush([{ codigo: 'EFECTIVO', nombre: 'Efectivo' }]);

    return c;
  }

  /** Abre el modal, elige el cliente y marca su única factura pendiente. */
  function prepararCobro(caja: CajaEstado): CobranzasComponent {
    const c = crearComponente(caja);
    c.abrirPago();
    c.onClienteSel(1);
    http
      .expectOne((req) => req.url === FACTURAS && req.params.get('clienteId') === '1')
      .flush([FACTURA_PENDIENTE, FACTURA_YA_PAGADA]);
    c.alternarFactura(FACTURA_PENDIENTE);
    return c;
  }

  afterEach(() => http.verify());

  describe('onClienteSel()', () => {
    it('solo deja seleccionables las facturas con saldo pendiente (PENDIENTE o PARCIAL)', () => {
      component = crearComponente(CAJA_CON_SESION);
      component.onClienteSel(1);

      http
        .expectOne((req) => req.url === FACTURAS && req.params.get('clienteId') === '1')
        .flush([FACTURA_PENDIENTE, FACTURA_YA_PAGADA]);

      expect(component.facturasCliente()).toEqual([FACTURA_PENDIENTE]);
    });
  });

  describe('alternarFactura()', () => {
    it('al marcarla, propone saldarla entera', () => {
      component = crearComponente(CAJA_CON_SESION);
      component.onClienteSel(1);
      http.expectOne((req) => req.url === FACTURAS).flush([FACTURA_PENDIENTE]);

      component.alternarFactura(FACTURA_PENDIENTE);

      expect(component.lineasCobro()).toEqual([
        {
          facturaId: 10,
          facturaNumero: '001-001-000000010',
          saldoPendiente: 25,
          montoAplicado: 25,
          contratoId: 1,
          opcion: 'FACTURA',
        },
      ]);
      expect(component.totalACobrar()).toBe(25);
    });

    it('al volver a marcarla, la quita', () => {
      component = crearComponente(CAJA_CON_SESION);
      component.onClienteSel(1);
      http.expectOne((req) => req.url === FACTURAS).flush([FACTURA_PENDIENTE]);

      component.alternarFactura(FACTURA_PENDIENTE);
      component.alternarFactura(FACTURA_PENDIENTE);

      expect(component.lineasCobro()).toEqual([]);
    });
  });

  describe('validarPago() (a través de guardarPago())', () => {
    it('sin cliente elegido, no llama al backend', () => {
      component = crearComponente(CAJA_CON_SESION);

      component.guardarPago();

      http.expectNone(PAGOS);
      expect(component.errorPago()).toBe('Elige un cliente.');
    });

    it('sin ninguna factura marcada, no llama al backend', () => {
      component = crearComponente(CAJA_CON_SESION);
      component.onClienteSel(1);
      http.expectOne((req) => req.url === FACTURAS).flush([]);

      component.guardarPago();

      http.expectNone(PAGOS);
      expect(component.errorPago()).toBe('Marca al menos una factura por cobrar.');
    });

    it('con un monto en cero, rechaza antes de llamar al backend', () => {
      component = prepararCobro(CAJA_CON_SESION);
      component.cambiarMontoLinea(10, 0);

      component.guardarPago();

      http.expectNone(PAGOS);
      expect(component.errorPago()).toBe('El monto de 001-001-000000010 debe ser mayor que cero.');
    });

    it('con un monto mayor al saldo pendiente, rechaza antes de llamar al backend', () => {
      component = prepararCobro(CAJA_CON_SESION);
      component.cambiarMontoLinea(10, 999);

      component.guardarPago();

      http.expectNone(PAGOS);
      expect(component.errorPago()).toBe('En 001-001-000000010 no se puede aplicar más que su saldo ($25.00).');
    });

    it('en efectivo sin una sesión de caja abierta, rechaza antes de llamar al backend', () => {
      component = prepararCobro(CAJA_SIN_SESION);

      component.guardarPago();

      http.expectNone(PAGOS);
      expect(component.errorPago()).toBe('El efectivo exige una sesión de caja abierta.');
    });
  });

  describe('guardarPago() con éxito', () => {
    it('arma el cuerpo del pago con la sesión de caja y la factura marcada, y refresca la pantalla', () => {
      component = prepararCobro(CAJA_CON_SESION);

      component.guardarPago();

      const peticion = http.expectOne(PAGOS);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        clienteId: 1,
        contratoId: 1,
        monto: 25,
        formaPago: 'EFECTIVO',
        referencia: null,
        banco: null,
        sesionCajaId: 9,
        observacion: null,
        aplicaciones: [
          { facturaId: 10, facturaNumero: '001-001-000000010', montoAplicado: 25, generarFacturaLegal: true },
        ],
      });
      peticion.flush({
        id: 1,
        numeroRecibo: 'REC-0001',
        monto: 25,
        estado: 'CONFIRMADO',
        fecha: '2026-01-01T00:00:00Z',
      } satisfies PagoRegistrado);

      expect(component.modalAbierto()).toBe(false);
      expect(component.guardando()).toBe(false);

      // guardarPago() exitoso dispara cargar() de nuevo: refresca pagos/cajas/clientes.
      http.expectOne(PAGOS).flush([]);
      http.expectOne((req) => req.url === CAJAS).flush([CAJA_CON_SESION]);
      http.expectOne(CLIENTES).flush([CLIENTE]);
    });

    it('cuando la factura no se marca "con factura", no pide generar factura legal', () => {
      component = prepararCobro(CAJA_CON_SESION);
      component.cambiarOpcionLinea(10, 'RECIBO');

      component.guardarPago();

      const peticion = http.expectOne(PAGOS);
      expect(peticion.request.body.aplicaciones).toEqual([
        { facturaId: 10, facturaNumero: '001-001-000000010', montoAplicado: 25, generarFacturaLegal: false },
      ]);
      peticion.flush({} as PagoRegistrado);

      http.expectOne(PAGOS).flush([]);
      http.expectOne((req) => req.url === CAJAS).flush([CAJA_CON_SESION]);
      http.expectOne(CLIENTES).flush([CLIENTE]);
    });

    it('con una forma de pago distinta de efectivo, no exige sesión de caja ni la manda', () => {
      component = prepararCobro(CAJA_SIN_SESION);
      component.formaSel.set('TRANSFERENCIA');
      component.referencia.set('TRX-001');

      component.guardarPago();

      const peticion = http.expectOne(PAGOS);
      expect(peticion.request.body.formaPago).toBe('TRANSFERENCIA');
      expect(peticion.request.body.sesionCajaId).toBeNull();
      expect(peticion.request.body.referencia).toBe('TRX-001');
      peticion.flush({} as PagoRegistrado);

      http.expectOne(PAGOS).flush([]);
      http.expectOne((req) => req.url === CAJAS).flush([CAJA_SIN_SESION]);
      http.expectOne(CLIENTES).flush([CLIENTE]);
    });
  });

  describe('guardarPago() con error del backend', () => {
    it('422 (regla de negocio) muestra su mensaje y libera el botón de guardar', () => {
      component = prepararCobro(CAJA_CON_SESION);

      component.guardarPago();
      http.expectOne(PAGOS).flush({}, { status: 422, statusText: 'Unprocessable Entity' });

      expect(component.errorPago()).toBe('La operación no cumple una regla de negocio (revisa el monto o la caja).');
      expect(component.guardando()).toBe(false);
      expect(component.modalAbierto()).toBe(true);
    });

    it('403 (sin permiso) muestra su mensaje', () => {
      component = prepararCobro(CAJA_CON_SESION);

      component.guardarPago();
      http.expectOne(PAGOS).flush({}, { status: 403, statusText: 'Forbidden' });

      expect(component.errorPago()).toBe('Tu rol no tiene permiso para registrar pagos.');
    });

    it('sin conexión al gateway (status 0) muestra su mensaje', () => {
      component = prepararCobro(CAJA_CON_SESION);

      component.guardarPago();
      http.expectOne(PAGOS).flush(null, { status: 0, statusText: 'Unknown Error' });

      expect(component.errorPago()).toBe('No se pudo contactar el gateway (¿está arriba en :8089?).');
    });
  });
});
