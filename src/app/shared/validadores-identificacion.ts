/**
 * Formato y checksum de cédula/RUC ecuatorianos, en funciones puras.
 *
 * Vive aparte de `cliente-nuevo.ts` porque `cliente-detalle.ts` (edición) necesita
 * la misma validación y no usa Reactive Forms: un helper con `AbstractControl` no le
 * serviría. Ambos importan de aquí para no mantener dos copias del algoritmo.
 */

export type TipoIdentificacion = 'CEDULA' | 'RUC' | 'PASAPORTE';

/** El checksum módulo 10 puro del Registro Civil (sin el chequeo de formato). */
export function cedulaValidaChecksum(cedula: string): boolean {
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  if (Number(cedula[2]) > 5) return false;

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let digito = Number(cedula[i]);
    if (i % 2 === 0) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

const COEF_RUC_SOCIEDAD_PRIVADA = [4, 3, 2, 7, 6, 5, 4, 3, 2];
const COEF_RUC_SECTOR_PUBLICO = [3, 2, 7, 6, 5, 4, 3, 2];

function modulo11(digitos: string, coeficientes: number[]): number {
  let suma = 0;
  for (let i = 0; i < coeficientes.length; i++) {
    suma += Number(digitos[i]) * coeficientes[i];
  }
  const residuo = suma % 11;
  return residuo === 0 ? 0 : 11 - residuo;
}

/**
 * RUC ecuatoriano (SRI), 13 dígitos, provincia 01-24. El tercer dígito decide el
 * tipo de contribuyente y su propio checksum: 0-5 persona natural (cédula +
 * establecimiento), 6 sector público (módulo 11 sobre 8 dígitos), 9 sociedad
 * privada (módulo 11 sobre 9 dígitos). El código de establecimiento final no puede
 * ser cero en ningún caso.
 */
export function rucValidoChecksum(ruc: string): boolean {
  const provincia = Number(ruc.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;

  const tercerDigito = Number(ruc[2]);
  if (tercerDigito <= 5) {
    return cedulaValidaChecksum(ruc.slice(0, 10)) && Number(ruc.slice(10)) >= 1;
  }
  if (tercerDigito === 6) {
    const verificador = modulo11(ruc, COEF_RUC_SECTOR_PUBLICO);
    return verificador <= 9 && verificador === Number(ruc[8]) && Number(ruc.slice(9)) >= 1;
  }
  if (tercerDigito === 9) {
    const verificador = modulo11(ruc, COEF_RUC_SOCIEDAD_PRIVADA);
    return verificador <= 9 && verificador === Number(ruc[9]) && Number(ruc.slice(10)) >= 1;
  }
  return false;
}

/** Formato esperado según el tipo de documento. */
export function patronIdentificacion(tipo: TipoIdentificacion): RegExp {
  if (tipo === 'RUC') return /^\d{13}$/;
  if (tipo === 'PASAPORTE') return /^[A-Za-z0-9]{5,20}$/;
  return /^\d{10}$/;
}

/** Formato + checksum. El pasaporte no tiene dígito verificador: solo formato. */
export function identificacionValida(tipo: TipoIdentificacion, valor: string): boolean {
  const v = (valor ?? '').trim();
  if (!patronIdentificacion(tipo).test(v)) return false;
  if (tipo === 'CEDULA') return cedulaValidaChecksum(v);
  if (tipo === 'RUC') return rucValidoChecksum(v);
  return true;
}
