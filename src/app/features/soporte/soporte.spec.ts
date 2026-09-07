import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ClienteListado, ContratoResumen } from '../../core/models/contratos.model';
import { Equipo, Existencia, Ubicacion } from '../../core/models/inventario.model';
import { Orden } from '../../core/models/operativo.model';
import { SoporteComponent } from './soporte';

const ORDENES = `${environment.apiBase}/api/ordenes`;
const CLIENTES = `${environment.apiBase}/api/clientes`;
const UBICACIONES = `${environment.apiBase}/api/ubicaciones`;
const EQUIPOS = `${environment.apiBase}/api/equipos`;
const EXISTENCIAS = `${environment.apiBase}/api/existencias`;
const CONSUMOS = `${environment.apiBase}/api/consumos`;
const CONTRATOS = `${environment.apiBase}/api/contratos`;

const UBICACION_FURGONETA: Ubicacion = {
  id: 5,
  codigo: 'FURG-1',
  nombre: 'Furgoneta técnico',
  tipo: 'TECNICO',
  usuarioId: null,
  activa: true,
};

const EQUIPO_DISPONIBLE: Equipo = {
  id: 50,
  tipo: 'ROUTER',
  marca: 'TP-Link',
  modelo: 'Archer C6',
  numeroSerie: 'SN-001',
  macAddress: null,
  estado: 'DISPONIBLE',
  ubicacionId: 5,
  ubicacion: 'Furgoneta técnico',
  contratoId: null,
  precioVenta: 0,
  observacion: null,
};

const MATERIAL_EXISTENCIA: Existencia = {
  materialId: 7,
  codigo: 'CAB-UTP',
  material: 'Cable UTP cat6',
  unidad: 'METRO',
  ubicacionId: 5,
  ubicacion: 'Furgoneta técnico',
  cantidad: 100,
};

function ordenSoporte(overrides: Partial<Orden> = {}): Orden {
  return {
    id: 1,
    numero: 'ORD-0001',
    tipo: 'SOPORTE',
    estado: 'EN_PROCESO',
    prioridad: 'NORMAL',
    contratoId: 1,
    clienteId: 1,
    tecnicoUsuarioId: 7,
    creadaPor: 2,
    descripcion: 'Sin señal',
    resultado: null,
    motivoCancelacion: null,
    fechaProgramada: null,
    fechaAsignacion: '2026-01-01T09:00:00Z',
    fechaInicio: '2026-01-01T09:30:00Z',
    fechaCierre: null,
    ...overrides,
  };
}

describe('SoporteComponent — cierre de orden', () => {
  let component: SoporteComponent;
  let http: HttpTestingController;

  /** El tablero pide clientes + las 3 colas de estado no bien se crea. */
  function flushCargaInicial(clientes: ClienteListado[] = []) {
    http.expectOne((r) => r.url === CLIENTES).flush(clientes);
    http.expectOne((r) => r.url === ORDENES && r.params.get('estado') === 'PENDIENTE').flush([]);
    http.expectOne((r) => r.url === ORDENES && r.params.get('estado') === 'ASIGNADA').flush([]);
    http.expectOne((r) => r.url === ORDENES && r.params.get('estado') === 'EN_PROCESO').flush([]);
  }

  function crearComponente(clientesIniciales: ClienteListado[] = []): SoporteComponent {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const c = TestBed.createComponent(SoporteComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
    flushCargaInicial(clientesIniciales);
    return c;
  }

  /** Abre el modal de cierre y resuelve los recursos de inventario que siempre pide. */
  function abrirCerrarConRecursos(
    orden: Orden,
    opciones: { ubicaciones?: Ubicacion[]; equipos?: Equipo[]; existencias?: Existencia[] } = {},
  ) {
    const ubicaciones = opciones.ubicaciones ?? [UBICACION_FURGONETA];
    const equipos = opciones.equipos ?? [EQUIPO_DISPONIBLE];
    const existencias = opciones.existencias ?? [MATERIAL_EXISTENCIA];

    component.abrirCerrar(orden);

    http.expectOne((r) => r.url === UBICACIONES).flush(ubicaciones);
    http.expectOne((r) => r.url === EQUIPOS && r.params.get('estado') === 'DISPONIBLE').flush(equipos);
    if (ubicaciones.some((u) => u.tipo === 'TECNICO' && u.activa)) {
      http
        .expectOne((r) => r.url === EXISTENCIAS && r.params.get('ubicacionId') === String(ubicaciones[0].id))
        .flush(existencias);
    }
  }

  afterEach(() => http.verify());

  describe('validaciones antes de llamar al backend', () => {
    it('sin describir el resultado, no llama a nada', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());

      component.confirmarCerrar();

      http.expectNone(`${ORDENES}/1/cerrar`);
      expect(component.errorAccion()).toBe('Describe el resultado del trabajo.');
    });

    it('con una línea de material a medio llenar (falta la cantidad), rechaza antes de llamar', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se revisó el equipo');
      component.materialesUsados.set([{ materialId: 7, cantidad: null, busqueda: '' }]);

      component.confirmarCerrar();

      http.expectNone(CONSUMOS);
      expect(component.errorAccion()).toBe('Revisa el material usado: falta elegir el material o la cantidad.');
    });

    it('si entrega un equipo pero la orden no tiene contrato asociado, rechaza', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte({ contratoId: null }));
      component.resultado.set('Se instaló un router de respaldo');
      component.equiposEntregados.set([{ equipoId: 50 }]);

      component.confirmarCerrar();

      http.expectNone(`${EQUIPOS}/50/asignar`);
      expect(component.errorAccion()).toBe('Esta orden no tiene un contrato asociado; no se pueden entregar equipos.');
    });

    it('si hay material que descontar pero no hay furgoneta en el catálogo, rechaza', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte(), { ubicaciones: [] });
      component.resultado.set('Se cambió un conector');
      component.materialesUsados.set([{ materialId: 7, cantidad: 2, busqueda: '' }]);

      component.confirmarCerrar();

      http.expectNone(CONSUMOS);
      expect(component.errorAccion()).toBe(
        'No se encontró la furgoneta en el catálogo de ubicaciones: no se puede descontar del inventario.',
      );
    });
  });

  describe('confirmarCerrar() con éxito', () => {
    it('sin material ni equipo, solo cierra la orden con el resultado', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se reinició el equipo y volvió el servicio');

      component.confirmarCerrar();

      const cierre = http.expectOne(`${ORDENES}/1/cerrar`);
      expect(cierre.request.method).toBe('POST');
      expect(cierre.request.body).toEqual({ resultado: 'Se reinició el equipo y volvió el servicio' });
      cierre.flush({});

      flushCargaInicial();

      expect(component.guardando()).toBe(false);
      expect(component.accion()).toBeNull();
      expect(component.banner()).toEqual({ texto: 'Orden ORD-0001 cerrada.', error: false });
    });

    it('con material y equipo, los descuenta/entrega en orden y recién entonces cierra', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se cambió el cable y se dejó un router nuevo');
      component.materialesUsados.set([{ materialId: 7, cantidad: 10, busqueda: '' }]);
      component.equiposEntregados.set([{ equipoId: 50 }]);

      component.confirmarCerrar();

      const consumo = http.expectOne(CONSUMOS);
      expect(consumo.request.method).toBe('POST');
      expect(consumo.request.body).toEqual({
        materialId: 7,
        cantidad: 10,
        ubicacionOrigenId: 5,
        ordenTrabajoId: 1,
        contratoId: 1,
      });
      consumo.flush({});

      const asignacion = http.expectOne(`${EQUIPOS}/50/asignar`);
      expect(asignacion.request.method).toBe('POST');
      expect(asignacion.request.body).toEqual({ contratoId: 1 });
      asignacion.flush({});

      const cierre = http.expectOne(`${ORDENES}/1/cerrar`);
      cierre.flush({});

      flushCargaInicial();

      expect(component.banner()?.texto).toBe('Orden ORD-0001 cerrada.');
    });

    it('reintentar tras un fallo NO vuelve a descontar el material ya consumido', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se cambió el cable y se dejó un router nuevo');
      component.materialesUsados.set([{ materialId: 7, cantidad: 10, busqueda: '' }]);
      component.equiposEntregados.set([{ equipoId: 50 }]);

      // Primer intento: el material sale bien, pero el equipo ya no está disponible.
      component.confirmarCerrar();
      http.expectOne(CONSUMOS).flush({});
      http.expectOne(`${EQUIPOS}/50/asignar`).flush(
        { message: 'El equipo ya no está disponible' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(component.errorAccion()).toBe('No se pudo entregar el equipo: El equipo ya no está disponible');

      // Reintento: NO debe volver a pedir /api/consumos (ya se descontó una vez).
      component.confirmarCerrar();
      http.expectNone(CONSUMOS);

      http.expectOne(`${EQUIPOS}/50/asignar`).flush({});
      http.expectOne(`${ORDENES}/1/cerrar`).flush({});
      flushCargaInicial();

      expect(component.banner()?.texto).toBe('Orden ORD-0001 cerrada.');
    });
  });

  describe('confirmarCerrar() cuando falla un paso', () => {
    it('si falla el consumo de material, muestra el motivo que da el backend', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se cambió el cable');
      component.materialesUsados.set([{ materialId: 7, cantidad: 500, busqueda: '' }]);

      component.confirmarCerrar();
      http
        .expectOne(CONSUMOS)
        .flush({ message: 'No hay suficiente stock' }, { status: 422, statusText: 'Unprocessable Entity' });

      expect(component.errorAccion()).toBe('No se pudo descontar el material: No hay suficiente stock');
      expect(component.guardando()).toBe(false);
      // La orden sigue abierta: no se llamó a /cerrar.
      http.expectNone(`${ORDENES}/1/cerrar`);
    });

    it('409 al cerrar, pero la orden YA estaba cerrada (doble clic): lo trata como éxito', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se resolvió el problema');

      component.confirmarCerrar();
      http.expectOne(`${ORDENES}/1/cerrar`).flush({}, { status: 409, statusText: 'Conflict' });

      http.expectOne(`${ORDENES}/1`).flush(ordenSoporte({ estado: 'CERRADA' }));
      flushCargaInicial();

      expect(component.banner()).toEqual({ texto: 'Orden ORD-0001 ya estaba cerrada.', error: false });
      expect(component.errorAccion()).toBeNull();
    });

    it('409 al cerrar, y la orden sigue abierta de verdad: muestra el error real', () => {
      component = crearComponente();
      abrirCerrarConRecursos(ordenSoporte());
      component.resultado.set('Se resolvió el problema');

      component.confirmarCerrar();
      http.expectOne(`${ORDENES}/1/cerrar`).flush({}, { status: 409, statusText: 'Conflict' });

      http.expectOne(`${ORDENES}/1`).flush(ordenSoporte({ estado: 'EN_PROCESO' }));
      flushCargaInicial();

      expect(component.errorAccion()).toBe('La orden ya cambió de estado; recarga e inténtalo de nuevo.');
      expect(component.banner()).toBeNull();
    });
  });

  describe('confirmarCerrar() con ficha GPON (solo en instalaciones)', () => {
    it('en una INSTALACION, guarda la ficha GPON antes de cerrar', () => {
      const cliente: ClienteListado = {
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
        estadoServicio: 'PENDIENTE',
        fechaRegistro: '2026-01-01T00:00:00Z',
      };
      const contrato: ContratoResumen = {
        id: 1,
        codigo: 'CTR-0001',
        tipoServicioCodigo: 'INTERNET',
        tipoServicioNombre: 'Internet',
        ofertaCodigo: 'INTERNET',
        ofertaNombre: 'Internet residencial',
        modalidadCobro: 'RECURRENTE',
        precioAcordado: 25,
        requiereInstalacion: true,
        usaRed: true,
        sujetoMora: true,
        detallesServicio: null,
        direccion: null,
        plan: 'Plan 50MB',
        velocidad: '50/25',
        estadoServicio: 'PENDIENTE',
        diaCorte: 5,
        fechaAlta: '2026-01-01',
        fechaInstalacion: null,
        fechaBaja: null,
        red: null,
      };

      component = crearComponente([cliente]);
      const orden = ordenSoporte({ tipo: 'INSTALACION', contratoId: 1, clienteId: 1 });

      component.abrirCerrar(orden);
      http.expectOne((r) => r.url === UBICACIONES).flush([]);
      http.expectOne((r) => r.url === EQUIPOS).flush([]);
      http.expectOne((r) => r.url === `${CLIENTES}/CLI-0001`).flush({ contratos: [contrato] });
      http.expectOne((r) => r.url === `${CONTRATOS}/CTR-0001/registro-gpon`).flush(null);

      component.resultado.set('Instalación completada');
      component.gponIpServicio.set('10.0.0.5');
      component.gponNombreEquipo.set('Huawei EG8145V5');

      component.confirmarCerrar();

      const gpon = http.expectOne(`${CONTRATOS}/CTR-0001/registro-gpon`);
      expect(gpon.request.method).toBe('PUT');
      expect(gpon.request.body).toEqual({
        interfaceGpon: null,
        puertoPon: null,
        ont: null,
        vlanGestion: null,
        vlanServicio: null,
        ipServicio: '10.0.0.5',
        mascaraServicio: null,
        barraServicio: null,
        ipGestion: null,
        mascaraGestion: null,
        barraGestion: null,
        serialOnt: null,
        codigoServicio: null,
        nombreCliente: null,
        servicePortGestion: null,
        servicePortServicio: null,
        gemportGestion: null,
        gemportServicio: null,
        tx: null,
        rx: null,
        nombreEquipo: 'Huawei EG8145V5',
        metrajeCable: null,
      });
      gpon.flush({});

      http.expectOne(`${ORDENES}/1/cerrar`).flush({});
      flushCargaInicial([cliente]);

      expect(component.banner()?.texto).toBe('Orden ORD-0001 cerrada.');
    });

    it('en una INSTALACION sin nada escrito en la ficha GPON, no manda ningún PUT', () => {
      const cliente: ClienteListado = {
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
        estadoServicio: 'PENDIENTE',
        fechaRegistro: '2026-01-01T00:00:00Z',
      };

      component = crearComponente([cliente]);
      const orden = ordenSoporte({ tipo: 'INSTALACION', contratoId: 1, clienteId: 1 });

      component.abrirCerrar(orden);
      http.expectOne((r) => r.url === UBICACIONES).flush([]);
      http.expectOne((r) => r.url === EQUIPOS).flush([]);
      // El cliente no tiene ese contrato todavía resuelto (o falló): no se resuelve el código GPON.
      http.expectOne((r) => r.url === `${CLIENTES}/CLI-0001`).flush({ contratos: [] });

      component.resultado.set('Instalación completada sin novedad');

      component.confirmarCerrar();

      http.expectNone(CONTRATOS);
      const cierre = http.expectOne(`${ORDENES}/1/cerrar`);
      cierre.flush({});
      flushCargaInicial([cliente]);

      expect(component.banner()?.texto).toBe('Orden ORD-0001 cerrada.');
    });
  });
});
