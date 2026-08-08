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
 * NADA DE ESTO ES SECRETO. El clientId de un cliente público (PKCE) es visible por
 * definición y las URLs se ven en la pestaña de red del navegador. Las credenciales
 * de verdad viven en el backend y nunca deben llegar aquí: cualquier cosa que se
 * escriba en este archivo acaba descargándose al navegador de cualquiera.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aqui, '../src/environments/environment.prod.ts');

// Valores de desarrollo como red de seguridad: si falta una variable, el build no
// se rompe, pero el resultado apunta a localhost y eso se nota de inmediato.
const API_BASE = process.env.API_BASE ?? 'http://localhost:8089';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://localhost:8090';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'smartuz';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? 'isp-frontend';

const usaLocalhost = [API_BASE, KEYCLOAK_URL].some((u) => u.includes('localhost'));
if (process.env.VERCEL && usaLocalhost) {
  // En Vercel, apuntar a localhost significa apuntar al ordenador de quien visita la
  // página. La aplicación se desplegaría "bien" y fallaría entera en el navegador,
  // con errores de red que no explican la causa. Mejor romper aquí.
  console.error(
    '\n[environment] Se está construyendo en Vercel con URLs de localhost.\n' +
      `  API_BASE=${API_BASE}\n  KEYCLOAK_URL=${KEYCLOAK_URL}\n` +
      'Defina API_BASE y KEYCLOAK_URL en las variables de entorno del proyecto.\n',
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
  keycloak: {
    url: '${KEYCLOAK_URL}',
    realm: '${KEYCLOAK_REALM}',
    clientId: '${KEYCLOAK_CLIENT_ID}',
  },
};
`;

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, contenido, 'utf8');

console.log(`[environment] escrito ${destino}`);
console.log(`[environment]   apiBase  = ${API_BASE}`);
console.log(`[environment]   keycloak = ${KEYCLOAK_URL} (realm ${KEYCLOAK_REALM})`);
