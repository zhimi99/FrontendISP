/**
 * Genera `src/environments/environment.prod.ts` a partir de variables de entorno.
 *
 * POR QUÉ HACE FALTA ESTO
 * Angular no lee variables de entorno en tiempo de ejecución. `environment.ts` es un
 * archivo TypeScript que el compilador incrusta en el paquete: para cuando el
 * navegador ejecuta la aplicación, la URL de la API ya es una cadena literal dentro
 * del JavaScript. Definir variables en el panel de Vercel no cambia nada por sí solo,
 * porque no hay ningún código que las consulte.
 *
 * Lo que sí ocurre es que esas variables existen DURANTE la construcción. Este script
 * corre antes de compilar (hook `prebuild` de npm), las lee y escribe el archivo que
 * el compilador va a incrustar. Ese es el único momento en que pueden entrar.
 *
 * SIN VARIABLES DEFINIDAS cae a los valores de desarrollo, de modo que un `npm run
 * build` en una máquina local sigue produciendo exactamente lo de siempre.
 *
 * NADA DE ESTO ES SECRETO: `API_BASE` es la URL pública del backend, visible en la
 * pestaña de red de cualquier navegador. Las credenciales de verdad (JWT_SECRET,
 * base de datos) viven solo en el backend y nunca deben llegar aquí.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aqui, '../src/environments/environment.prod.ts');

// Valor de desarrollo como red de seguridad: si falta la variable, el build no se
// rompe, pero el resultado apunta a localhost y eso se nota de inmediato.
const API_BASE = process.env.API_BASE ?? 'http://localhost:8089';

if (process.env.VERCEL && API_BASE.includes('localhost')) {
  // En Vercel, apuntar a localhost significa apuntar al ordenador de quien visita la
  // página. La aplicación se desplegaría "bien" y fallaría entera en el navegador,
  // con errores de red que no explican la causa. Mejor romper aquí.
  console.error(
    '\n[environment] Se está construyendo en Vercel con API_BASE de localhost.\n' +
      `  API_BASE=${API_BASE}\n` +
      'Defina API_BASE en las variables de entorno del proyecto.\n',
  );
  process.exit(1);
}

const contenido = `/**
 * GENERADO POR scripts/generar-environment.mjs — NO EDITAR A MANO.
 *
 * Se reescribe en cada construcción a partir de las variables de entorno. Para
 * cambiar estos valores, cámbielos en el entorno (panel de Vercel) y vuelva a
 * desplegar; editar este archivo no tiene efecto porque se sobrescribe.
 */
export const environment = {
  produccion: true,
  apiBase: '${API_BASE}',
};
`;

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, contenido, 'utf8');

console.log(`[environment] escrito ${destino}`);
console.log(`[environment]   apiBase = ${API_BASE}`);
