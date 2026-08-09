/**
 * Tipos y etiquetas de la pantalla de clientes.
 *
 * AQUÍ NO VAN DATOS. Todo lo que se muestre —clientes, planes, zonas, vendedores—
 * se pide al backend a través de los servicios de `core/services`. La pantalla se
 * alimentó durante un tiempo de una lista en memoria, que se conservó por inercia
 * después de que los componentes ya consumieran la API; se eliminó al comprobar
 * que no le quedaba un solo consumidor.
 *
 * Lo que sí pertenece al frontend es cómo se PINTA cada estado: el texto que lee
 * el operador y el tono del color son decisiones de interfaz, no del dominio.
 */

export type EstadoCliente = 'ACTIVO' | 'SUSPENDIDO' | 'CORTADO' | 'PENDIENTE' | 'RETIRADO';

/** Cómo se muestra cada estado en las insignias de la grilla. */
export const ESTADOS: Record<EstadoCliente, { texto: string; tono: string }> = {
  ACTIVO: { texto: 'Activo', tono: 'ok' },
  SUSPENDIDO: { texto: 'Suspendido', tono: 'warn' },
  CORTADO: { texto: 'Cortado', tono: 'danger' },
  PENDIENTE: { texto: 'Pendiente', tono: 'info' },
  RETIRADO: { texto: 'Retirado', tono: 'neutral' },
};

/**
 * Una fila de la grilla, ya resuelta para pintarse.
 *
 * Es la respuesta del backend adaptada a la vista (fechas formateadas, banderas en
 * vez de enums). Cada campo tiene origen en `ClienteListado`: si el backend no lo
 * envía, no debe existir aquí.
 */
export interface ClienteFila {
  codigo: string;
  nombre: string;
  esEmpresa: boolean;
  tipoId: 'CÉDULA' | 'RUC';
  identificacion: string;
  telefono: string;
  whatsapp: boolean;
  direccion: string;
  plan: string;
  velocidad: string;
  estado: EstadoCliente;
  fechaRegistro: string; // dd/mm/aaaa
}
