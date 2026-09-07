import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ClienteNuevoComponent } from './cliente-nuevo';

const CLIENTES = `${environment.apiBase}/api/clientes`;

/** Cédula real de pruebas: dígito verificador módulo 10 correcto (Registro Civil). */
const CEDULA_VALIDA = '1710034065';
/** RUC de persona natural válido: la misma cédula + establecimiento 001. */
const RUC_PERSONA_NATURAL_VALIDO = '1710034065001';
/** RUC de sociedad privada válido: dígito verificador módulo 11 (coeficientes [4,3,2,7,6,5,4,3,2]). */
const RUC_SOCIEDAD_VALIDO = '1790012344001';

function eventoConArchivo(archivo: File | null): Event {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', { value: archivo ? [archivo] : [], configurable: true });
  return { target: input } as unknown as Event;
}

describe('ClienteNuevoComponent', () => {
  let component: ClienteNuevoComponent;
  let http: HttpTestingController;
  let router: Router;

  function llenarPersonaValida() {
    component.onTipoIdChange('CEDULA');
    component.form.patchValue({
      identificacion: CEDULA_VALIDA,
      nombres: 'Ana',
      apellidos: 'Pérez',
      telefono: '0987654321',
      direccion: 'Chordeleg, Azuay',
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    component = TestBed.createComponent(ClienteNuevoComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => http.verify());

  describe('validador de cédula ecuatoriana', () => {
    it('acepta una cédula con dígito verificador correcto', () => {
      component.onTipoIdChange('CEDULA');
      component.form.controls.identificacion.setValue(CEDULA_VALIDA);
      expect(component.form.controls.identificacion.errors).toBeNull();
    });

    it('rechaza una cédula con el dígito verificador incorrecto', () => {
      component.onTipoIdChange('CEDULA');
      component.form.controls.identificacion.setValue('1710034066');
      expect(component.form.controls.identificacion.errors).toEqual({ cedulaInvalida: true });
      expect(component.identificacionErrorMsg()).toBe('Esa cédula no existe (dígito verificador incorrecto).');
    });

    it('rechaza una cédula con código de provincia inexistente', () => {
      component.onTipoIdChange('CEDULA');
      component.form.controls.identificacion.setValue('9910034065');
      expect(component.form.controls.identificacion.errors).toEqual({ cedulaInvalida: true });
    });
  });

  describe('validador de RUC ecuatoriano', () => {
    it('acepta un RUC de persona natural válido (cédula + establecimiento)', () => {
      component.setTipo('EMPRESA');
      component.form.controls.razonSocial.setValue('Comercial Pérez');
      component.form.controls.identificacion.setValue(RUC_PERSONA_NATURAL_VALIDO);
      expect(component.form.controls.identificacion.errors).toBeNull();
    });

    it('acepta un RUC de sociedad privada válido (módulo 11)', () => {
      component.setTipo('EMPRESA');
      component.form.controls.identificacion.setValue(RUC_SOCIEDAD_VALIDO);
      expect(component.form.controls.identificacion.errors).toBeNull();
    });

    it('rechaza un RUC de sociedad privada con dígito verificador incorrecto', () => {
      component.setTipo('EMPRESA');
      component.form.controls.identificacion.setValue('1790012345001');
      expect(component.form.controls.identificacion.errors).toEqual({ rucInvalido: true });
      expect(component.identificacionErrorMsg()).toBe('Ese RUC no es válido (dígito verificador incorrecto).');
    });
  });

  describe('guardar()', () => {
    it('con el formulario inválido, no llama al backend y marca todo como tocado', () => {
      component.guardar();

      http.expectNone(CLIENTES);
      expect(component.form.controls.nombres.touched).toBe(true);
      expect(component.enviando()).toBe(false);
    });

    it('con éxito y sin archivo adjunto, crea el cliente y termina el alta', () => {
      llenarPersonaValida();
      component.guardar();

      const peticion = http.expectOne(CLIENTES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        tipoCliente: 'PERSONA',
        tipoIdentificacion: 'CEDULA',
        identificacion: CEDULA_VALIDA,
        nombres: 'Ana',
        apellidos: 'Pérez',
        razonSocial: null,
        email: null,
        telefono: '0987654321',
        whatsapp: null,
        direccionTexto: 'Chordeleg, Azuay',
        referencia: null,
        latitud: null,
        longitud: null,
      });
      peticion.flush({ clienteCodigo: 'CLI-0099' });

      expect(component.codigoNuevo()).toBe('CLI-0099');
      expect(component.guardado()).toBe(true);
      expect(component.enviando()).toBe(false);
    });

    it('tras crear el cliente, si hay un archivo adjunto lo sube antes de dar el alta por terminada', () => {
      llenarPersonaValida();
      const archivo = new File(['x'], 'cedula.png', { type: 'image/png' });
      component.archivoIdentificacion.set(archivo);

      component.guardar();
      http.expectOne(CLIENTES).flush({ clienteCodigo: 'CLI-0099' });

      // El cliente ya existe en el backend, pero el alta no se da por cerrada
      // hasta que se resuelve (con éxito o no) la subida del archivo.
      expect(component.guardado()).toBe(false);

      const subida = http.expectOne(`${CLIENTES}/CLI-0099/identificacion`);
      expect(subida.request.method).toBe('PUT');
      subida.flush(null);

      expect(component.identificacionCargada()).toBe(true);
      expect(component.guardado()).toBe(true);
    });

    it('si el cliente se crea pero falla la subida del archivo, igual da el alta por terminada', () => {
      llenarPersonaValida();
      component.archivoIdentificacion.set(new File(['x'], 'cedula.png', { type: 'image/png' }));

      component.guardar();
      http.expectOne(CLIENTES).flush({ clienteCodigo: 'CLI-0099' });
      http
        .expectOne(`${CLIENTES}/CLI-0099/identificacion`)
        .flush({ detail: 'Archivo corrupto' }, { status: 400, statusText: 'Bad Request' });

      // No se pierde el cliente ya creado por un problema aparte con el archivo.
      expect(component.guardado()).toBe(true);
      expect(component.errorCargaIdentificacion()).toBe('Archivo corrupto');
    });

    it('con identificación duplicada (409), muestra el mensaje y no queda a medias', () => {
      llenarPersonaValida();
      component.guardar();

      http.expectOne(CLIENTES).flush({ mensaje: 'Duplicado' }, { status: 409, statusText: 'Conflict' });

      expect(component.errorAlta()).toBe('Ya existe un cliente con esa identificación.');
      expect(component.guardado()).toBe(false);
      expect(component.enviando()).toBe(false);
    });

    it('sin conexión al gateway (status 0), muestra el mensaje correspondiente', () => {
      llenarPersonaValida();
      component.guardar();

      http.expectOne(CLIENTES).flush(null, { status: 0, statusText: 'Unknown Error' });

      expect(component.errorAlta()).toBe('No se pudo contactar el gateway (¿está arriba en :8089?).');
    });

    it('tras crear el cliente, ofrece ir a agregarle un servicio con el código real', () => {
      llenarPersonaValida();
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.guardar();
      http.expectOne(CLIENTES).flush({ clienteCodigo: 'CLI-0099' });

      component.irAAgregarServicio();

      expect(navegar).toHaveBeenCalledWith(['/clientes', 'CLI-0099'], { queryParams: { agregarServicio: 1 } });
    });
  });

  describe('onArchivoIdentificacionSeleccionado()', () => {
    it('acepta una imagen JPG', () => {
      const archivo = new File(['x'], 'cedula.jpg', { type: 'image/jpeg' });
      component.onArchivoIdentificacionSeleccionado(eventoConArchivo(archivo));

      expect(component.archivoIdentificacion()).toBe(archivo);
      expect(component.errorArchivoIdentificacion()).toBeNull();
    });

    it('rechaza un formato no permitido', () => {
      const archivo = new File(['x'], 'datos.exe', { type: 'application/octet-stream' });
      component.onArchivoIdentificacionSeleccionado(eventoConArchivo(archivo));

      expect(component.archivoIdentificacion()).toBeNull();
      expect(component.errorArchivoIdentificacion()).toBe('Usa una imagen JPG, PNG, WebP o un archivo PDF.');
    });

    it('rechaza un archivo de más de 10 MB', () => {
      const archivo = new File([new Uint8Array(11 * 1024 * 1024)], 'cedula.png', { type: 'image/png' });
      component.onArchivoIdentificacionSeleccionado(eventoConArchivo(archivo));

      expect(component.archivoIdentificacion()).toBeNull();
      expect(component.errorArchivoIdentificacion()).toBe('El archivo no puede superar 10 MB.');
    });
  });
});
