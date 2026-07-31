/**
 * Configuración por entorno.
 *
 * En desarrollo el frontend NUNCA habla directo con un microservicio: todo pasa por
 * el API Gateway, que es quien resuelve CORS, valida el token y sella el origen. En
 * ESTA máquina el gateway se publica en :8089 porque el 8080 estaba ocupado (ver
 * docker-compose, variable GATEWAY_PORT).
 *
 * Keycloak es el proveedor de identidad: el navegador va allí a iniciar sesión
 * (authorization code + PKCE) y vuelve con el token que el interceptor adjunta.
 *
 * Nada de esto es secreto: el clientId es público por definición (cliente PKCE) y
 * las URLs son de desarrollo local. Los secretos reales viven en el backend.
 */
export const environment = {
  produccion: false,
  apiBase: 'http://localhost:8089',
  keycloak: {
    url: 'http://localhost:8090',
    realm: 'smartuz',
    clientId: 'isp-frontend',
  },
};
