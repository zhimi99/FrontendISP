import { esPreFactura, esPreFacturaCobrable, estadoDocumento } from './facturacion.model';

describe('esPreFactura()', () => {
  it('es verdadero solo mientras el comprobante sigue en GENERADA', () => {
    expect(esPreFactura({ estadoSri: 'GENERADA' })).toBe(true);
    expect(esPreFactura({ estadoSri: 'AUTORIZADA' })).toBe(false);
    expect(esPreFactura({ estadoSri: 'ANULADA' })).toBe(false);
  });
});

describe('esPreFacturaCobrable()', () => {
  it('es cobrable si sigue GENERADA y con saldo (PENDIENTE o PARCIAL)', () => {
    expect(esPreFacturaCobrable({ estadoSri: 'GENERADA', estadoPago: 'PENDIENTE' })).toBe(true);
    expect(esPreFacturaCobrable({ estadoSri: 'GENERADA', estadoPago: 'PARCIAL' })).toBe(true);
  });

  it('no es cobrable si ya está PAGADA, aunque siga GENERADA', () => {
    expect(esPreFacturaCobrable({ estadoSri: 'GENERADA', estadoPago: 'PAGADA' })).toBe(false);
  });

  it('no es cobrable si ya salió de GENERADA (es factura legal, no comprobante)', () => {
    expect(esPreFacturaCobrable({ estadoSri: 'AUTORIZADA', estadoPago: 'PENDIENTE' })).toBe(false);
  });
});

describe('estadoDocumento()', () => {
  it('un comprobante sin cobrar se lee como "pendiente", no como el estado SRI técnico', () => {
    const r = estadoDocumento({ estadoSri: 'GENERADA', estadoPago: 'PENDIENTE' });
    expect(r).toEqual({ texto: 'Comprobante pendiente', tono: 'warn' });
  });

  it('un comprobante con abono parcial NO se llama "cobrado": todavía se debe algo', () => {
    const r = estadoDocumento({ estadoSri: 'GENERADA', estadoPago: 'PARCIAL' });
    expect(r).toEqual({ texto: 'Comprobante con abono parcial', tono: 'warn' });
  });

  it('un comprobante ya saldado pero aún sin pasar por el SRI queda "pendiente de autorización"', () => {
    const r = estadoDocumento({ estadoSri: 'GENERADA', estadoPago: 'PAGADA' });
    expect(r).toEqual({ texto: 'Cobrada · pendiente de autorización SRI', tono: 'info' });
  });

  it('fuera de GENERADA, muestra el estado SRI técnico tal cual (p. ej. AUTORIZADA)', () => {
    const r = estadoDocumento({ estadoSri: 'AUTORIZADA', estadoPago: 'PAGADA' });
    expect(r).toEqual({ texto: 'Autorizada', tono: 'ok' });
  });

  it('una factura anulada se muestra como tal sin importar su estado de pago', () => {
    const r = estadoDocumento({ estadoSri: 'ANULADA', estadoPago: 'ANULADA' });
    expect(r).toEqual({ texto: 'Anulada', tono: 'neutral' });
  });
});
