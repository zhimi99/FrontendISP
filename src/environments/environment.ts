/**
 * Configuración por entorno.
 *
 * `apiBase` es la URL del backend: el login es local (`POST /api/auth/login`
 * contra ese mismo backend), así que no hace falta la URL de ningún proveedor de
 * identidad aparte.
 *
 * `googleMapsApiKey` habilita el mapa estático de la ficha del cliente. Vacía, la
 * ficha cae al mapa de marcador propio y el botón «Cómo llegar» sigue
 * funcionando, porque ese enlace no consume API alguna.
 *
 * Nada de esto es secreto: la URL del backend es pública y una clave de Maps
 * viaja en cada petición del navegador —por eso Google la protege restringiéndola
 * por dominio, no ocultándola—. Los secretos reales (JWT_SECRET, credenciales de
 * base de datos) viven solo en el backend.
 */
export const environment = {
  produccion: false,
  apiBase: 'http://localhost:8089',
  googleMapsApiKey: '',
};
