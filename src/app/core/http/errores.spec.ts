import { MENSAJE_SIN_GATEWAY, detalleErrorBackend, mensajeError } from './errores';

describe('detalleErrorBackend()', () => {
  it('sin cuerpo, no hay nada que leer', () => {
    expect(detalleErrorBackend(null)).toBeNull();
    expect(detalleErrorBackend(undefined)).toBeNull();
  });

  it('un cuerpo de texto plano se devuelve tal cual', () => {
    expect(detalleErrorBackend('Solicitud inválida')).toBe('Solicitud inválida');
  });

  it('lee `message` (el campo típico de Spring)', () => {
    expect(detalleErrorBackend({ message: 'No hay suficiente stock' })).toBe('No hay suficiente stock');
  });

  it('lee `mensaje` cuando no hay `message`', () => {
    expect(detalleErrorBackend({ mensaje: 'RUC ya registrado' })).toBe('RUC ya registrado');
  });

  it('junta un arreglo `errors[]` de bean validation', () => {
    const cuerpo = { errors: [{ defaultMessage: 'no puede ir vacío' }, 'otro motivo'] };
    expect(detalleErrorBackend(cuerpo)).toBe('no puede ir vacío; otro motivo');
  });

  it('sin ninguno de los campos conocidos, no hay nada que mostrar', () => {
    expect(detalleErrorBackend({ codigo: 'X' })).toBeNull();
  });
});

describe('mensajeError()', () => {
  it('sin ninguna opción, cae al gateway para status 0', () => {
    expect(mensajeError({ status: 0 })).toBe(MENSAJE_SIN_GATEWAY);
  });

  it('sin ninguna opción y sin status, cae al genérico por defecto', () => {
    expect(mensajeError({})).toBe('No se pudo completar la operación.');
  });

  it('usa el texto específico del código si está definido', () => {
    const texto = mensajeError(
      { status: 403 },
      { porEstado: { 403: 'Tu rol no tiene permiso para ver cobranzas.' } },
    );
    expect(texto).toBe('Tu rol no tiene permiso para ver cobranzas.');
  });

  it('un código sin regla específica cae al genérico, no al de gateway', () => {
    const texto = mensajeError({ status: 500 }, { generico: 'No se pudo completar la operación de caja.' });
    expect(texto).toBe('No se pudo completar la operación de caja.');
  });

  it('permite sobrescribir el propio mensaje de status 0 (p. ej. una pantalla de diagnóstico)', () => {
    const texto = mensajeError(
      { status: 0 },
      { porEstado: { 0: 'No se pudo contactar el gateway (¿está arriba en :8089? ¿CORS?).' } },
    );
    expect(texto).toBe('No se pudo contactar el gateway (¿está arriba en :8089? ¿CORS?).');
  });

  it('el genérico puede ser una función que cite el código real', () => {
    const texto = mensajeError(
      { status: 502 },
      { generico: (e) => `El gateway respondió ${e.status} al listar clientes.` },
    );
    expect(texto).toBe('El gateway respondió 502 al listar clientes.');
  });

  it('el genérico como función distingue "hubo status" de "no hubo ninguno"', () => {
    const regla = { generico: (e: { status?: number }) => (e.status ? `El gateway respondió ${e.status}.` : 'Error inesperado.') };
    expect(mensajeError({ status: 500 }, regla)).toBe('El gateway respondió 500.');
    expect(mensajeError({}, regla)).toBe('Error inesperado.');
  });

  it('una regla por código puede usar el detalle del backend y caer al resto si no hay', () => {
    const opciones = {
      porEstado: {
        422: (e: { error?: unknown }) => detalleErrorBackend(e.error),
        403: 'Tu rol no tiene permiso para esta operación de red.',
      },
      generico: 'No se pudo completar la operación. Inténtalo de nuevo.',
    };

    // 422 CON detalle: se usa el detalle.
    expect(mensajeError({ status: 422, error: { message: 'Puerto PON lleno' } }, opciones)).toBe('Puerto PON lleno');
    // 422 SIN detalle: no se queda muda, cae al genérico (no hay texto de reserva para 422).
    expect(mensajeError({ status: 422 }, opciones)).toBe('No se pudo completar la operación. Inténtalo de nuevo.');
    // Otro código sí tiene su propio texto.
    expect(mensajeError({ status: 403 }, opciones)).toBe('Tu rol no tiene permiso para esta operación de red.');
  });

  it('dos códigos distintos pueden compartir el mismo texto (409 y 422 como "ya cambió de estado")', () => {
    const opciones = { porEstado: { 409: 'La orden ya cambió de estado; recarga e inténtalo de nuevo.', 422: 'La orden ya cambió de estado; recarga e inténtalo de nuevo.' } };
    expect(mensajeError({ status: 409 }, opciones)).toBe('La orden ya cambió de estado; recarga e inténtalo de nuevo.');
    expect(mensajeError({ status: 422 }, opciones)).toBe('La orden ya cambió de estado; recarga e inténtalo de nuevo.');
  });
});
