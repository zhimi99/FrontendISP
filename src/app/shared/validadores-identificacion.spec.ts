import {
  cedulaValidaChecksum,
  identificacionValida,
  patronIdentificacion,
  rucValidoChecksum,
} from './validadores-identificacion';

// Fixtures verificados a mano contra el algoritmo del Registro Civil / SRI.
const CEDULA_VALIDA = '1710034065';
const RUC_PERSONA_NATURAL_VALIDO = '1710034065001';
const RUC_SOCIEDAD_VALIDO = '1790012344001';

describe('validadores-identificacion', () => {
  describe('cedulaValidaChecksum', () => {
    it('acepta una cédula con dígito verificador correcto', () => {
      expect(cedulaValidaChecksum(CEDULA_VALIDA)).toBe(true);
    });

    it('rechaza una cédula con provincia fuera de rango', () => {
      expect(cedulaValidaChecksum('9910034065')).toBe(false);
    });

    it('rechaza una cédula cuyo dígito verificador no cuadra', () => {
      expect(cedulaValidaChecksum('1710034066')).toBe(false);
    });

    it('rechaza el placeholder heredado de la importación GPON', () => {
      // No es un caso hipotético: V17__importar_100_clientes_gpon.sql deja
      // 'GPON-000001'..'GPON-000100' como identificación provisional.
      expect(cedulaValidaChecksum('0102030405')).toBe(false);
    });
  });

  describe('rucValidoChecksum', () => {
    it('acepta un RUC de persona natural (cédula + establecimiento)', () => {
      expect(rucValidoChecksum(RUC_PERSONA_NATURAL_VALIDO)).toBe(true);
    });

    it('acepta un RUC de sociedad privada (módulo 11)', () => {
      expect(rucValidoChecksum(RUC_SOCIEDAD_VALIDO)).toBe(true);
    });

    it('rechaza un RUC con establecimiento en 000', () => {
      expect(rucValidoChecksum('1710034065000')).toBe(false);
    });
  });

  describe('patronIdentificacion', () => {
    it('exige 10 dígitos para cédula, 13 para RUC y 5-20 alfanuméricos para pasaporte', () => {
      expect(patronIdentificacion('CEDULA').test(CEDULA_VALIDA)).toBe(true);
      expect(patronIdentificacion('RUC').test(RUC_SOCIEDAD_VALIDO)).toBe(true);
      expect(patronIdentificacion('PASAPORTE').test('AB123')).toBe(true);
      expect(patronIdentificacion('PASAPORTE').test('AB1')).toBe(false);
    });
  });

  describe('identificacionValida', () => {
    it('combina formato y checksum para cédula/RUC', () => {
      expect(identificacionValida('CEDULA', CEDULA_VALIDA)).toBe(true);
      expect(identificacionValida('CEDULA', '0102030405')).toBe(false);
      expect(identificacionValida('RUC', RUC_SOCIEDAD_VALIDO)).toBe(true);
    });

    it('el pasaporte solo valida formato: no tiene dígito verificador', () => {
      expect(identificacionValida('PASAPORTE', 'X1234567')).toBe(true);
      expect(identificacionValida('PASAPORTE', 'AB')).toBe(false);
    });

    it('recorta espacios antes de validar', () => {
      expect(identificacionValida('CEDULA', `  ${CEDULA_VALIDA}  `)).toBe(true);
    });
  });
});
