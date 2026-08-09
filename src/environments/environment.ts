/**
 * Configuración por entorno.
 *
 * `apiBase` es el único dato: el login es local (`POST /api/auth/login` contra el
 * mismo backend), así que no hace falta la URL de ningún proveedor de identidad
 * aparte.
 *
 * Nada de esto es secreto: es la URL pública del backend. Los secretos reales
 * (JWT_SECRET, credenciales de base de datos) viven solo en el backend.
 */
export const environment = {
  produccion: false,
  apiBase: 'http://localhost:8089',
};
