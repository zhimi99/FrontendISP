/**
 * Roles y usuario de sesión.
 *
 * El backend autentica localmente (MS-USUARIOS, usuarios.credencial) y los roles
 * viajan en el claim `realm_access.roles` del JWT — la misma forma que usaba
 * Keycloak, conservada a propósito al reemplazarlo para no tocar nada de lo que ya
 * leía ese claim. El rol del backend `ADMIN` se expone aquí como `ADMINISTRADOR`
 * (ver AuthService.mapearRoles); el resto es 1:1.
 */
export type Rol = 'ADMINISTRADOR' | 'FINANZAS' | 'TECNICO' | 'SOPORTE' | 'COBRANZAS';

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: string;
  iniciales: string;
}

/** Ficha completa de un empleado (`GET /api/usuarios`, solo ADMIN). */
export interface EmpleadoFicha {
  id: number;
  usuario: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombreCompleto?: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  activo: boolean;
  fechaIngreso: string | null;
  fechaSalida: string | null;
}

/** Datos editables de la ficha. La identidad (usuario, cédula) no se toca. */
export interface EditarEmpleadoRequest {
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
}

/**
 * Alta de un empleado (`POST /api/usuarios`, solo ADMIN): crea a la vez su cuenta de
 * acceso y su ficha.
 *
 * `passwordTemporal` no se guarda en ninguna base ni vuelve en la respuesta: se
 * guarda hasheada y queda marcada como temporal, lo que obliga a cambiarla en el
 * primer inicio de sesión. Quien da el alta se la comunica a la persona por otro
 * canal.
 */
export interface CrearEmpleadoRequest {
  usuario: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  cargo: string | null;
  rol: RolBackend;
  passwordTemporal: string;
  fechaIngreso: string | null;
}

/**
 * El rol tal y como lo nombra el backend (ADMIN, no ADMINISTRADOR): es lo que
 * valida contra su lista cerrada de roles.
 */
export type RolBackend = 'ADMIN' | 'FINANZAS' | 'COBRANZAS' | 'TECNICO' | 'SOPORTE';

export const ROL_BACKEND_ETIQUETA: Record<RolBackend, string> = {
  ADMIN: 'Administrador',
  FINANZAS: 'Finanzas',
  COBRANZAS: 'Cobranzas',
  TECNICO: 'Técnico de campo',
  SOPORTE: 'Soporte / atención',
};

export const ROL_ETIQUETA: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  FINANZAS: 'Finanzas',
  TECNICO: 'Técnico',
  SOPORTE: 'Soporte',
  COBRANZAS: 'Cobranzas',
};

/**
 * Identidad derivada del token: lo que se sabe del usuario SIN llamar al backend
 * (quién es, qué roles trae y su `usuario_id`, que enlaza con MS-USUARIOS).
 */
export interface PerfilSesion {
  sub: string;
  usuarioId: number | null;
  usuario: string;
  nombre: string;
  email: string;
  roles: Rol[];
  iniciales: string;
}

/**
 * Resumen de `GET /api/usuarios/{id}` (MS-USUARIOS): lo mínimo para poner un nombre
 * donde otras pantallas solo tienen un `usuario_id` (p. ej. el técnico de una orden).
 */
export interface UsuarioResumen {
  id: number;
  nombreCompleto: string;
  cargo: string;
  activo: boolean;
}

/**
 * Ficha del empleado que devuelve `GET /api/usuarios/yo` (MS-USUARIOS). La autoridad
 * de los datos personales y del `usuario_id`; el token solo lleva el resumen.
 */
export interface UsuarioFicha {
  id: number;
  usuario: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  cargo: string;
  activo: boolean;
  fechaIngreso: string | null;
  fechaSalida: string | null;
}
