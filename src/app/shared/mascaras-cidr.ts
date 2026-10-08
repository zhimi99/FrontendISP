/** Notación CIDR completa (/0 a /32) para elegir la barra de red en vez de escribirla a mano. */
export const MASCARAS_CIDR = Array.from({ length: 33 }, (_, prefijo) => `/${prefijo}`);
