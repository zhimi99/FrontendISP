/**
 * MS-CONTRATOS Y CLIENTES · esquema `contratos`
 * Tipos derivados de V1__init_contratos.sql (los enum de PostgreSQL se
 * mapean 1:1 a union types).
 */

export type TipoCliente = 'PERSONA' | 'EMPRESA';
export type TipoIdentificacion = 'CEDULA' | 'RUC' | 'PASAPORTE';
export type TipoConexion = 'PPPOE' | 'HOTSPOT';
export type OrigenCambio = 'SISTEMA' | 'USUARIO';
/** Forma en que se cobra una oferta de servicio. */
export type ModalidadCobro = 'RECURRENTE' | 'UNICO';

/** Máquina de estados del servicio: PENDIENTE → ACTIVO → SUSPENDIDO → CORTADO → RETIRADO */
export type EstadoServicio = 'PENDIENTE' | 'ACTIVO' | 'SUSPENDIDO' | 'CORTADO' | 'RETIRADO';

export type MotivoCambio =
  | 'ALTA'
  | 'MORA_SUSPENSION'
  | 'MORA_CORTE'
  | 'PAGO_REACTIVACION'
  | 'BAJA'
  | 'MANUAL';

export interface Plan {
  id: number;
  codigo: string;
  nombre: string;
  velocidadBajadaKbps: number;
  velocidadSubidaKbps: number;
  /** Derivado en la BD: "subidak/bajadak" para el atributo Mikrotik-Rate-Limit */
  rateLimitMikrotik: string;
  precioMensual: number;
  activo: boolean;
}

export interface Cliente {
  id: number;
  codigo: string;
  tipoCliente: TipoCliente;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  email?: string;
  telefono?: string;
  whatsapp?: string;
  createdAt: string;
}

export interface Direccion {
  id: number;
  clienteId: number;
  etiqueta?: string;
  direccionTexto: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  esPrincipal: boolean;
}

export interface Contrato {
  id: number;
  codigo: string;
  clienteId: number;
  planId: number;
  direccionId?: number;
  estadoServicio: EstadoServicio;
  /** Día del mes en que se emite la factura (1..28) */
  diaCorte: number;
  /** Política de mora; por defecto la regla 3/6 días */
  diasGraciaSuspension: number;
  diasGraciaCorte: number;
  fechaAlta: string;
  fechaInstalacion?: string;
  fechaBaja?: string;
}

export interface IdentidadRed {
  id: number;
  contratoId: number;
  tipoConexion: TipoConexion;
  pppoeUsuario?: string;
  nasIdentificador?: string;
  nasIp?: string;
  ipAsignada?: string;
  macAddress?: string;
  vlan?: number;
  /** plan-normal | suspendido | cortado — lo que MS-RED debe reflejar en RADIUS */
  perfilRadiusActual: string;
  sincronizadoRed: boolean;
  ultimaSyncRed?: string;
}

/** `GET /api/contratos/{codigo}/registro-gpon` — ficha técnica de la instalación GPON. */
export interface RegistroGpon {
  id: number;
  contratoId: number;
  ip: string | null;
  router: string | null;
  metrajeCable: number | null;
  puerto: number | null;
  tarjeta: string | null;
  ont: number | null;
  puertoServicio: number | null;
  /** Comandos para la terminal del router (p. ej. interfaz gpon...); se completa a mano. */
  ams: string | null;
}

/** Cuerpo de `PUT /api/contratos/{codigo}/registro-gpon`: todos los campos son opcionales. */
export interface GuardarRegistroGponRequest {
  ip: string | null;
  router: string | null;
  metrajeCable: number | null;
  puerto: number | null;
  tarjeta: string | null;
  ont: number | null;
  puertoServicio: number | null;
  ams: string | null;
}

export interface HistorialEstado {
  id: number;
  contratoId: number;
  estadoAnterior?: EstadoServicio;
  estadoNuevo: EstadoServicio;
  motivo: MotivoCambio;
  origen: OrigenCambio;
  usuarioId?: number;
  referencia?: string;
  diasVencido?: number;
  aplicadoEnRed: boolean;
  fecha: string;
}

/** Fila de la grilla de contratos: contrato + datos ya resueltos del cliente y el plan. */
export interface ContratoVista extends Contrato {
  clienteNombre: string;
  clienteIdentificacion: string;
  planNombre: string;
  planPrecio: number;
  direccionTexto?: string;
  pppoeUsuario?: string;
}

/**
 * Fila de la lista de clientes que devuelve `GET /api/clientes` (MS-CONTRATOS): el
 * cliente con el resumen de su contrato principal ya resuelto por el backend.
 *
 * Campos nulos cuando el cliente aún no tiene contrato. `zona` y `vendedor`, que la
 * grilla mostraba con datos de prueba, NO existen en el dominio: no vienen aquí.
 */
export interface ClienteListado {
  /** PK numérico: permite resolver clienteId (referencia lógica) -> nombre en otras pantallas. */
  id: number;
  codigo: string;
  tipoCliente: TipoCliente;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  nombre: string;
  telefono: string | null;
  tieneWhatsapp: boolean;
  direccion: string | null;
  contratoCodigo: string | null;
  plan: string | null;
  velocidad: string | null;
  estadoServicio: EstadoServicio | null;
  fechaRegistro: string; // instante ISO-8601 (created_at del cliente)
}

/** Identidad de red del contrato (lo que consumirá MS-RED). */
export interface RedDetalle {
  tipoConexion: string;
  pppoeUsuario: string | null;
  nasIdentificador: string | null;
  nasIp: string | null;
  ipAsignada: string | null;
  perfilRadiusActual: string;
  sincronizadoRed: boolean;
}

/** Un contrato del cliente en la ficha de detalle: cada uno representa un servicio vendido. */
export interface ContratoResumen {
  /** PK numérico del contrato: referencia lógica que usa factura.contrato_id. */
  id: number;
  codigo: string;
  /** Tipo y oferta vienen del catálogo extensible, no de un enum fijo de la interfaz. */
  tipoServicioCodigo: string;
  tipoServicioNombre: string;
  ofertaCodigo: string;
  ofertaNombre: string;
  modalidadCobro: ModalidadCobro;
  precioAcordado: number;
  requiereInstalacion: boolean;
  usaRed: boolean;
  sujetoMora: boolean;
  detallesServicio: string | null;
  /** Puede ser nula para servicios que no se prestan en un domicilio. */
  direccion: DireccionDetalle | null;
  /** Solo se completan en servicios de Internet. */
  plan: string | null;
  velocidad: string | null;
  estadoServicio: EstadoServicio;
  /** Solo aplica a servicios recurrentes sujetos a mora. */
  diaCorte: number | null;
  fechaAlta: string | null;
  fechaInstalacion: string | null;
  fechaBaja: string | null;
  red: RedDetalle | null;
}

export interface DireccionDetalle {
  /** PK que permite reutilizar el domicilio al contratar otro servicio. */
  id: number;
  etiqueta: string | null;
  direccionTexto: string;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  esPrincipal: boolean;
}

/**
 * Ficha 360 del cliente que devuelve `GET /api/clientes/{codigo}`. Solo lo que
 * MS-CONTRATOS posee; facturación/uptime/OLT vienen de otros servicios (no aquí).
 */
export interface ClienteDetalle {
  /**
   * PK numérico del cliente: la referencia lógica que MS-FACTURACION guarda en
   * factura.cliente_id. Se usa para consultar /api/facturas?clienteId=; el codigo no.
   */
  id: number;
  codigo: string;
  tipoCliente: TipoCliente;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  /** Nombre ya formateado para mostrar. Para editar usa los componentes crudos de abajo. */
  nombre: string;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
  tieneWhatsapp: boolean;
  whatsapp: string | null;
  fechaRegistro: string;
  /** Solo indica disponibilidad; la ruta privada del archivo nunca se expone. */
  tieneIdentificacion: boolean;
  direccionPrincipal: DireccionDetalle | null;
  /** Todas las direcciones disponibles para contratar servicios adicionales. */
  direcciones: DireccionDetalle[];
  contratos: ContratoResumen[];
}

/**
 * Cuerpo de la edición de un cliente (`PUT /api/clientes/{codigo}`): solo su nombre
 * (según el tipo) y su contacto. Identidad (tipo/identificación) y dirección no se
 * editan aquí.
 */
export interface EditarClienteRequest {
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
}

/** Plan del catálogo que devuelve `GET /api/planes` (para el selector del alta). */
export interface PlanCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  velocidad: string;
  velocidadBajadaKbps: number;
  velocidadSubidaKbps: number;
  precioMensual: number;
  /** El selector del alta solo recibe activos; el mantenimiento pide `?todos=true`. */
  activo: boolean;
}

/**
 * Mantenimiento del catálogo de planes (solo ADMIN).
 *
 * Las velocidades van en kbps porque es la unidad del perfil de RADIUS y del
 * rate-limit del Mikrotik. El precio es sin impuestos: el IVA lo aplica
 * MS-FACTURACIÓN al emitir, que es quien conoce el porcentaje vigente en cada fecha.
 */
export interface CrearPlanRequest {
  codigo: string;
  nombre: string;
  velocidadBajadaKbps: number;
  velocidadSubidaKbps: number;
  precioMensual: number;
}

/** Igual, sin el código: es la referencia del plan en el contrato firmado. */
export interface EditarPlanRequest {
  nombre: string;
  velocidadBajadaKbps: number;
  velocidadSubidaKbps: number;
  precioMensual: number;
}

/** Cuerpo del alta de cliente (`POST /api/clientes`). */
export interface AltaClienteRequest {
  tipoCliente: TipoCliente;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  direccionTexto: string;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  planCodigo: string;
  diaCorte: number;
}

/** Respuesta del alta: códigos asignados para navegar a la ficha. */
export interface AltaClienteResponse {
  clienteCodigo: string;
  contratoCodigo: string;
  estadoServicio: EstadoServicio;
}

/** Oferta activa del catálogo extensible que puede venderse a un cliente. */
export interface OfertaServicioCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipoCodigo: string;
  tipoNombre: string;
  modalidadCobro: ModalidadCobro;
  precioReferencial: number;
  requiereDireccion: boolean;
  requiereInstalacion: boolean;
  usaRed: boolean;
  sujetoMora: boolean;
  requierePlanInternet: boolean;
}

/** Domicilio que se crea junto con un contrato adicional. */
export interface NuevaDireccionContratoRequest {
  etiqueta: string | null;
  direccionTexto: string;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
}

/** Cuerpo de `POST /api/clientes/{codigo}/contratos`. */
export interface CrearContratoServicioRequest {
  ofertaCodigo: string;
  direccionId: number | null;
  nuevaDireccion: NuevaDireccionContratoRequest | null;
  planCodigo: string | null;
  precioAcordado: number | null;
  diaCorte: number | null;
  observaciones: string | null;
}

/** Resultado de registrar un servicio adicional para el cliente. */
export interface CrearContratoServicioResponse {
  contratoCodigo: string;
  estadoServicio: EstadoServicio;
  requiereInstalacion: boolean;
}

/** Fila de la grilla de contratos que devuelve `GET /api/contratos`. */
export interface ContratoListado {
  codigo: string;
  clienteCodigo: string;
  clienteNombre: string;
  clienteIdentificacion: string;
  plan: string;
  velocidad: string;
  planPrecio: number;
  estadoServicio: EstadoServicio;
  diaCorte: number;
  fechaAlta: string | null;
  fechaInstalacion: string | null;
  direccionTexto: string | null;
  pppoeUsuario: string | null;
}

/** Ficha de un contrato que devuelve `GET /api/contratos/{codigo}`. */
export interface ContratoDetalle {
  codigo: string;
  clienteCodigo: string;
  clienteNombre: string;
  clienteIdentificacion: string;
  tipoServicio: string;
  ofertaServicio: string;
  ofertaCodigo: string;
  modalidadCobro: string;
  precioAcordado: number;
  usaRed: boolean;
  sujetoMora: boolean;
  plan: string | null;
  planCodigo: string | null;
  velocidad: string | null;
  planPrecio: number | null;
  estadoServicio: EstadoServicio;
  diaCorte: number | null;
  fechaAlta: string | null;
  fechaInstalacion: string | null;
  fechaBaja: string | null;
  direccionTexto: string | null;
  direccionId: number | null;
  pppoeUsuario: string | null;
  observaciones: string | null;
  /** Instante en que se congelaron las condiciones; null si aún no se emitió. */
  documentoRegistradoEn: string | null;
}

/**
 * Cuerpo de `PUT /api/contratos/{codigo}`: solo condiciones comerciales.
 *
 * Un campo nulo significa «no tocar». No se cambia el cliente, la oferta ni el
 * estado del servicio: eso lo gobiernan las órdenes de trabajo, la mora y los pagos.
 */
export interface EditarContratoRequest {
  planCodigo: string | null;
  precioAcordado: number | null;
  diaCorte: number | null;
  direccionId: number | null;
  observaciones: string | null;
}

/**
 * Cuerpo de `POST /api/contratos/{codigo}/baja`.
 *
 * El contrato no se borra: queda RETIRADO conservando su historial, porque está
 * ligado a facturas emitidas y pagos.
 */
export interface BajaContratoRequest {
  motivo: string;
  fechaBaja: string | null;
}

export const ESTADO_SERVICIO_ETIQUETA: Record<EstadoServicio, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  CORTADO: 'Cortado',
  RETIRADO: 'Retirado',
};

/** Clase de la insignia según el estado del servicio. */
export const ESTADO_SERVICIO_TONO: Record<EstadoServicio, string> = {
  PENDIENTE: 'info',
  ACTIVO: 'ok',
  SUSPENDIDO: 'warn',
  CORTADO: 'danger',
  RETIRADO: 'neutral',
};

export const MOTIVO_ETIQUETA: Record<MotivoCambio, string> = {
  ALTA: 'Alta de servicio',
  MORA_SUSPENSION: 'Suspensión por mora',
  MORA_CORTE: 'Corte por mora',
  PAGO_REACTIVACION: 'Reactivación por pago',
  BAJA: 'Baja del servicio',
  MANUAL: 'Cambio manual',
};
