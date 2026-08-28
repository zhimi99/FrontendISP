/**
 * Genera `src/environments/environment.ts` y `environment.prod.ts` a partir del
 * entorno (y de un `.env` local para desarrollo).
 *
 * POR QUÉ HACE FALTA ESTO
 * Angular no lee variables de entorno en tiempo de ejecución. `environment.ts` es un
 * archivo TypeScript que el compilador incrusta en el paquete: para cuando el
 * navegador ejecuta la aplicación, la URL de la API ya es una cadena literal dentro
 * del JavaScript. Definir variables en el panel de Vercel no cambia nada por sí solo,
 * porque no hay ningún código que las consulte.
 *
 * Lo que sí ocurre es que esas variables existen DURANTE la construcción. Este script
 * corre antes de compilar, servir y probar, las lee y escribe los archivos que el
 * compilador va a incrustar. Ese es el único momento en que pueden entrar.
 *
 * POR QUÉ TAMBIÉN EL DE DESARROLLO
 * `ng serve` no aplica `fileReplacements`: compila `environment.ts` tal cual. Si ese
 * archivo estuviera versionado, la única forma de probar el mapa en local sería
 * escribir la clave de Maps dentro de un archivo que git rastrea, y acabaría
 * publicada en el repositorio. Generándolo, la clave vive solo en `.env` —ignorado
 * por git— y nunca llega a un commit. Por eso ambos archivos están en .gitignore.
 *
 * SIN VARIABLES DEFINIDAS cae a los valores de desarrollo, de modo que un clon
 * recién bajado sigue arrancando sin configurar nada.
 *
 * QUÉ ES SECRETO Y QUÉ NO: `API_BASE` es la URL pública del backend, visible en la
 * pestaña de red de cualquier navegador. `GOOGLE_MAPS_API_KEY` también viaja al
 * navegador —toda clave de Maps lo hace, por diseño— y se protege restringiéndola
 * por dominio en la consola de Google, no ocultándola; aun así no se versiona,
 * porque Static Maps se factura por petición y las claves expuestas en repositorios
 * se rastrean y se consumen. Las credenciales de verdad (JWT_SECRET, base de datos)
 * viven solo en el backend y nunca deben llegar aquí.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const carpeta = resolve(aqui, '../src/environments');
const raiz = resolve(aqui, '..');

/**
 * Lee `.env` como respaldo para desarrollo. En Vercel no existe: allí las variables
 * llegan ya en `process.env`, que tiene prioridad sobre lo que diga el archivo.
 */
function leerDotEnv() {
  const ruta = resolve(raiz, '.env');
  if (!existsSync(ruta)) return {};
  const pares = {};
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte === -1) continue;
    const nombre = limpia.slice(0, corte).trim();
    // Se admiten comillas alrededor del valor por costumbre de los .env.
    const valor = limpia.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
    pares[nombre] = valor;
  }
  return pares;
}

const dotEnv = leerDotEnv();
const leer = (nombre, porDefecto) => process.env[nombre] ?? dotEnv[nombre] ?? porDefecto;

// Valor de desarrollo como red de seguridad: si falta la variable, el build no se
// rompe, pero el resultado apunta a localhost y eso se nota de inmediato.
const API_BASE = leer('API_BASE', 'http://localhost:8089');

// Sin clave, la ficha del cliente cae al mapa propio en vez de romperse, así que
// aquí no se aborta la construcción: es una mejora visual, no un requisito.
const GOOGLE_MAPS_API_KEY = leer('GOOGLE_MAPS_API_KEY', '');

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

/** Cierra la puerta a que un valor con comillas rompa el archivo generado. */
const cadena = (valor) => JSON.stringify(String(valor));

function contenido(produccion) {
  return `/**
 * GENERADO POR scripts/generar-environment.mjs — NO EDITAR A MANO.
 *
 * Se reescribe antes de cada build, serve y test a partir de las variables de
 * entorno (o del \`.env\` local). Para cambiar estos valores, cámbielos allí —o en
 * el panel de Vercel— y vuelva a ejecutar; editar este archivo no tiene efecto
 * porque se sobrescribe, y además no está versionado.
 */
export const environment = {
  produccion: ${produccion},
  apiBase: ${cadena(API_BASE)},
  googleMapsApiKey: ${cadena(GOOGLE_MAPS_API_KEY)},
};
`;
}

mkdirSync(carpeta, { recursive: true });
writeFileSync(resolve(carpeta, 'environment.ts'), contenido(false), 'utf8');
writeFileSync(resolve(carpeta, 'environment.prod.ts'), contenido(true), 'utf8');

console.log(`[environment] escritos environment.ts y environment.prod.ts en ${carpeta}`);
console.log(`[environment]   apiBase = ${API_BASE}`);
console.log(
  `[environment]   googleMapsApiKey = ${GOOGLE_MAPS_API_KEY ? 'definida' : '(sin definir: mapa propio)'}`,
);
