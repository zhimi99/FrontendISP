/** Cuerpo de `POST /api/auth/login`. */
export interface LoginRequest {
  usuario: string;
  password: string;
}

/** Respuesta del login: el token y si toca cambiar la contraseña antes de seguir. */
export interface LoginResponse {
  token: string;
  tokenType: string;
  expiraEnSegundos: number;
  debeCambiarPassword: boolean;
}

/** Cuerpo de `POST /api/auth/cambiar-password`. */
export interface CambiarPasswordRequest {
  passwordActual: string;
  passwordNueva: string;
}
