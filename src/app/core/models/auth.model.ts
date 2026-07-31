/**
 * Roles y usuario de sesión.
 *
 * La identidad ya es real: el proveedor es Keycloak (realm `smartuz`) y los roles
 * viajan en el claim `realm_access.roles` del JWT. El rol de Keycloak `ADMIN` se
 * expone aquí como `ADMINISTRADOR` (ver AuthService.mapearRoles); el resto es 1:1.
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

export const ROL_ETIQUETA: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  FINANZAS: 'Finanzas',
  TECNICO: 'Técnico',
  SOPORTE: 'Soporte',
  COBRANZAS: 'Cobranzas',
};

/**
 * Identidad derivada del token de Keycloak: lo que se sabe del usuario SIN llamar
 * al backend (quién es, qué roles trae y su `usuario_id`, que enlaza con MS-USUARIOS).
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
