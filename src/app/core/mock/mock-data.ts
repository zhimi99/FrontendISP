/**
 * DATOS DE PRUEBA — FIBRA NET (Chordeleg, Azuay)
 *
 * Todo lo que hay aquí es ficticio y vive solo en memoria. Sirve para levantar
 * la plantilla del frontend sin backend ni base de datos. Cuando los
 * microservicios expongan endpoints REST, estos arreglos se reemplazan por
 * llamadas HTTP sin tocar los componentes: los servicios de `core/services`
 * son la única frontera.
 *
 * Fecha de referencia del juego de datos: 2026-07-21.
 */

import { Usuario } from '../models/auth.model';
import {
  Cliente,
  Contrato,
  Direccion,
  HistorialEstado,
  IdentidadRed,
  Plan,
} from '../models/contratos.model';
import { Emisor, Factura, FacturaDetalle } from '../models/facturacion.model';
import { Caja, MovimientoCaja, Pago, SesionCaja } from '../models/finanzas.model';
import { Bodega, Equipo, ItemStock } from '../models/inventario.model';
import { OrdenTrabajo, Tecnico } from '../models/operativo.model';

/** Fecha "de hoy" del juego de datos. Fija, para que las pantallas sean estables. */
export const HOY = '2026-07-21';

/* =====================================================================
   Usuarios (MS-USUARIOS todavía no existe; uno por cada rol del diagrama)
   ===================================================================== */
export const USUARIOS: Usuario[] = [
  {
    id: 1,
    usuario: 'admin',
    nombre: 'Christian Uzhca',
    email: 'christian@fibranet.ec',
    rol: 'ADMINISTRADOR',
    cargo: 'Gerente General',
    iniciales: 'CU',
  },
  {
    id: 2,
    usuario: 'finanzas',
    nombre: 'Paola Ordóñez',
    email: 'paola@fibranet.ec',
    rol: 'FINANZAS',
    cargo: 'Contadora',
    iniciales: 'PO',
  },
  {
    id: 3,
    usuario: 'tecnico',
    nombre: 'Marco Guamán',
    email: 'marco@fibranet.ec',
    rol: 'TECNICO',
    cargo: 'Técnico de Campo',
    iniciales: 'MG',
  },
  {
    id: 4,
    usuario: 'soporte',
    nombre: 'Diana Bermeo',
    email: 'diana@fibranet.ec',
    rol: 'SOPORTE',
    cargo: 'Soporte Técnico',
    iniciales: 'DB',
  },
  {
    id: 5,
    usuario: 'cajera',
    nombre: 'Silvia Pauta',
    email: 'silvia@fibranet.ec',
    rol: 'COBRANZAS',
    cargo: 'Cajera Matriz',
    iniciales: 'SP',
  },
];

/* =====================================================================
   MS-CONTRATOS Y CLIENTES
   ===================================================================== */

export const PLANES: Plan[] = [
  {
    id: 1,
    codigo: 'FN-30',
    nombre: 'Fibra Hogar 30 Mbps',
    velocidadBajadaKbps: 30720,
    velocidadSubidaKbps: 15360,
    rateLimitMikrotik: '15360k/30720k',
    precioMensual: 22.0,
    activo: true,
  },
  {
    id: 2,
    codigo: 'FN-50',
    nombre: 'Fibra Hogar 50 Mbps',
    velocidadBajadaKbps: 51200,
    velocidadSubidaKbps: 25600,
    rateLimitMikrotik: '25600k/51200k',
    precioMensual: 28.0,
    activo: true,
  },
  {
    id: 3,
    codigo: 'FN-100',
    nombre: 'Fibra Hogar 100 Mbps',
    velocidadBajadaKbps: 102400,
    velocidadSubidaKbps: 51200,
    rateLimitMikrotik: '51200k/102400k',
    precioMensual: 35.0,
    activo: true,
  },
  {
    id: 4,
    codigo: 'FN-200',
    nombre: 'Fibra Plus 200 Mbps',
    velocidadBajadaKbps: 204800,
    velocidadSubidaKbps: 102400,
    rateLimitMikrotik: '102400k/204800k',
    precioMensual: 55.0,
    activo: true,
  },
  {
    id: 5,
    codigo: 'FN-CORP',
    nombre: 'Corporativo 300 Mbps simétrico',
    velocidadBajadaKbps: 307200,
    velocidadSubidaKbps: 307200,
    rateLimitMikrotik: '307200k/307200k',
    precioMensual: 120.0,
    activo: true,
  },
];

export const CLIENTES: Cliente[] = [
  {
    id: 1,
    codigo: 'CLI-0001',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0104829371',
    nombres: 'Juan Carlos',
    apellidos: 'Peralta Zhingre',
    email: 'jcperalta@gmail.com',
    telefono: '072223145',
    whatsapp: '0987451236',
    createdAt: '2024-03-12',
  },
  {
    id: 2,
    codigo: 'CLI-0002',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0103558214',
    nombres: 'María Fernanda',
    apellidos: 'Ordóñez Cabrera',
    email: 'mfordonez@hotmail.com',
    telefono: '072223890',
    whatsapp: '0996321478',
    createdAt: '2024-05-02',
  },
  {
    id: 3,
    codigo: 'CLI-0003',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0102947815',
    nombres: 'Segundo Manuel',
    apellidos: 'Guamán Tenesaca',
    telefono: '072224011',
    whatsapp: '0984125478',
    createdAt: '2024-06-18',
  },
  {
    id: 4,
    codigo: 'CLI-0004',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0105112478',
    nombres: 'Rosa Elvira',
    apellidos: 'Chuchuca Morocho',
    email: 'rosachuchuca@gmail.com',
    whatsapp: '0991478523',
    createdAt: '2024-08-07',
  },
  {
    id: 5,
    codigo: 'CLI-0005',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0103871259',
    nombres: 'Luis Alberto',
    apellidos: 'Sarmiento Loja',
    email: 'lsarmiento@yahoo.es',
    telefono: '072225147',
    whatsapp: '0985412369',
    createdAt: '2024-09-21',
  },
  {
    id: 6,
    codigo: 'CLI-0006',
    tipoCliente: 'EMPRESA',
    tipoIdentificacion: 'RUC',
    identificacion: '0190358741001',
    razonSocial: 'Joyería Filigrana de Chordeleg Cía. Ltda.',
    email: 'gerencia@filigranachordeleg.com',
    telefono: '072223500',
    whatsapp: '0999874521',
    createdAt: '2024-10-15',
  },
  {
    id: 7,
    codigo: 'CLI-0007',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0104471125',
    nombres: 'Ana Lucía',
    apellidos: 'Bermeo Padilla',
    email: 'analubermeo@gmail.com',
    whatsapp: '0993214785',
    createdAt: '2025-01-09',
  },
  {
    id: 8,
    codigo: 'CLI-0008',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0106214785',
    nombres: 'Carlos Vinicio',
    apellidos: 'Zhingre Uyaguari',
    telefono: '072226003',
    whatsapp: '0982547896',
    createdAt: '2026-07-08',
  },
  {
    id: 9,
    codigo: 'CLI-0009',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0102874136',
    nombres: 'Blanca Esperanza',
    apellidos: 'Pauta Quizhpi',
    whatsapp: '0994785213',
    createdAt: '2025-02-14',
  },
  {
    id: 10,
    codigo: 'CLI-0010',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0104963258',
    nombres: 'Jorge Patricio',
    apellidos: 'Cabrera Vintimilla',
    email: 'jpcabrera@outlook.com',
    telefono: '072224789',
    whatsapp: '0987412563',
    createdAt: '2025-03-30',
  },
  {
    id: 11,
    codigo: 'CLI-0011',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0103214569',
    nombres: 'Mercedes Olimpia',
    apellidos: 'Quizhpi Guacho',
    whatsapp: '0986541237',
    createdAt: '2024-11-11',
  },
  {
    id: 12,
    codigo: 'CLI-0012',
    tipoCliente: 'EMPRESA',
    tipoIdentificacion: 'RUC',
    identificacion: '0191247856001',
    razonSocial: 'Hostal Turístico El Dorado S.A.',
    email: 'reservas@hostaleldorado.ec',
    telefono: '072223777',
    whatsapp: '0998521473',
    createdAt: '2025-04-22',
  },
  {
    id: 13,
    codigo: 'CLI-0013',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0105874123',
    nombres: 'Miguel Ángel',
    apellidos: 'Morocho Sarmiento',
    email: 'mamorocho@gmail.com',
    whatsapp: '0983214569',
    createdAt: '2025-06-05',
  },
  {
    id: 14,
    codigo: 'CLI-0014',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0102369854',
    nombres: 'Narcisa de Jesús',
    apellidos: 'Uyaguari Chuchuca',
    whatsapp: '0992145873',
    createdAt: '2025-07-19',
  },
  {
    id: 15,
    codigo: 'CLI-0015',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0104125879',
    nombres: 'Fernando David',
    apellidos: 'Vintimilla Peralta',
    email: 'fvintimilla@gmail.com',
    telefono: '072225963',
    whatsapp: '0989632147',
    createdAt: '2025-09-01',
  },
  {
    id: 16,
    codigo: 'CLI-0016',
    tipoCliente: 'PERSONA',
    tipoIdentificacion: 'CEDULA',
    identificacion: '0106523147',
    nombres: 'Gladys Marlene',
    apellidos: 'Tenesaca Bermeo',
    whatsapp: '0995874123',
    createdAt: '2026-07-14',
  },
];

/** Coordenadas reales aproximadas del cantón Chordeleg (Azuay). */
export const DIRECCIONES: Direccion[] = [
  { id: 1, clienteId: 1, etiqueta: 'Domicilio', direccionTexto: 'Av. 24 de Mayo y Juan Bautista Cobos', referencia: 'Casa de dos pisos, portón verde', latitud: -2.92361, longitud: -78.78028, esPrincipal: true },
  { id: 2, clienteId: 2, etiqueta: 'Domicilio', direccionTexto: 'Calle Guayaquil s/n, sector Centro', referencia: 'Frente al parque central', latitud: -2.92415, longitud: -78.77956, esPrincipal: true },
  { id: 3, clienteId: 3, etiqueta: 'Domicilio', direccionTexto: 'Sector San Martín, vía a Sígsig km 2', latitud: -2.93102, longitud: -78.77412, esPrincipal: true },
  { id: 4, clienteId: 4, etiqueta: 'Domicilio', direccionTexto: 'Comunidad Delegsol, calle principal', latitud: -2.91587, longitud: -78.78964, esPrincipal: true },
  { id: 5, clienteId: 5, etiqueta: 'Domicilio', direccionTexto: 'Calle Luis Galarza Orellana 4-12', latitud: -2.92289, longitud: -78.78145, esPrincipal: true },
  { id: 6, clienteId: 6, etiqueta: 'Local comercial', direccionTexto: 'Plaza Central de Chordeleg, local 8', referencia: 'Almacén de joyería', latitud: -2.92398, longitud: -78.77991, esPrincipal: true },
  { id: 7, clienteId: 7, etiqueta: 'Domicilio', direccionTexto: 'Sector Zhordán, calle s/n', latitud: -2.93415, longitud: -78.78552, esPrincipal: true },
  { id: 8, clienteId: 8, etiqueta: 'Domicilio', direccionTexto: 'Sector Puzhio, junto a la escuela', latitud: -2.90987, longitud: -78.77234, esPrincipal: true },
  { id: 9, clienteId: 9, etiqueta: 'Domicilio', direccionTexto: 'Barrio Cristo Rey, calle Sucre', latitud: -2.92512, longitud: -78.78321, esPrincipal: true },
  { id: 10, clienteId: 10, etiqueta: 'Domicilio', direccionTexto: 'Sector La Playa, ribera del río Santa Bárbara', latitud: -2.92756, longitud: -78.77689, esPrincipal: true },
  { id: 11, clienteId: 11, etiqueta: 'Domicilio', direccionTexto: 'Comunidad Llavizhuñay, vía principal', latitud: -2.94021, longitud: -78.79187, esPrincipal: true },
  { id: 12, clienteId: 12, etiqueta: 'Hostal', direccionTexto: 'Av. 24 de Mayo 12-45 y Guayaquil', referencia: 'Edificio de 3 pisos', latitud: -2.92334, longitud: -78.78067, esPrincipal: true },
  { id: 13, clienteId: 13, etiqueta: 'Domicilio', direccionTexto: 'Sector Cerro de Oro, calle s/n', latitud: -2.91234, longitud: -78.76887, esPrincipal: true },
  { id: 14, clienteId: 14, etiqueta: 'Domicilio', direccionTexto: 'Comunidad El Tablón, sector alto', latitud: -2.94587, longitud: -78.76512, esPrincipal: true },
  { id: 15, clienteId: 15, etiqueta: 'Domicilio', direccionTexto: 'Calle Simón Bolívar 3-27', latitud: -2.92441, longitud: -78.78213, esPrincipal: true },
  { id: 16, clienteId: 16, etiqueta: 'Domicilio', direccionTexto: 'Sector Principal, junto al coliseo', latitud: -2.92198, longitud: -78.77845, esPrincipal: true },
];

export const CONTRATOS: Contrato[] = [
  { id: 1, codigo: 'CTR-0001', clienteId: 1, planId: 2, direccionId: 1, estadoServicio: 'ACTIVO', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2024-03-15', fechaInstalacion: '2024-03-18' },
  { id: 2, codigo: 'CTR-0002', clienteId: 2, planId: 3, direccionId: 2, estadoServicio: 'ACTIVO', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2024-05-04', fechaInstalacion: '2024-05-07' },
  { id: 3, codigo: 'CTR-0003', clienteId: 3, planId: 1, direccionId: 3, estadoServicio: 'SUSPENDIDO', diaCorte: 10, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2024-06-20', fechaInstalacion: '2024-06-25' },
  { id: 4, codigo: 'CTR-0004', clienteId: 4, planId: 2, direccionId: 4, estadoServicio: 'CORTADO', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2024-08-10', fechaInstalacion: '2024-08-14' },
  { id: 5, codigo: 'CTR-0005', clienteId: 5, planId: 3, direccionId: 5, estadoServicio: 'ACTIVO', diaCorte: 15, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2024-09-25', fechaInstalacion: '2024-09-28' },
  { id: 6, codigo: 'CTR-0006', clienteId: 6, planId: 5, direccionId: 6, estadoServicio: 'ACTIVO', diaCorte: 1, diasGraciaSuspension: 5, diasGraciaCorte: 10, fechaAlta: '2024-10-18', fechaInstalacion: '2024-10-22' },
  { id: 7, codigo: 'CTR-0007', clienteId: 7, planId: 1, direccionId: 7, estadoServicio: 'ACTIVO', diaCorte: 10, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2025-01-12', fechaInstalacion: '2025-01-16' },
  { id: 8, codigo: 'CTR-0008', clienteId: 8, planId: 2, direccionId: 8, estadoServicio: 'PENDIENTE', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2026-07-15' },
  { id: 9, codigo: 'CTR-0009', clienteId: 9, planId: 1, direccionId: 9, estadoServicio: 'SUSPENDIDO', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2025-02-18', fechaInstalacion: '2025-02-21' },
  { id: 10, codigo: 'CTR-0010', clienteId: 10, planId: 3, direccionId: 10, estadoServicio: 'ACTIVO', diaCorte: 15, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2025-04-02', fechaInstalacion: '2025-04-05' },
  { id: 11, codigo: 'CTR-0011', clienteId: 11, planId: 1, direccionId: 11, estadoServicio: 'RETIRADO', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2024-11-15', fechaInstalacion: '2024-11-19', fechaBaja: '2026-04-30' },
  { id: 12, codigo: 'CTR-0012', clienteId: 12, planId: 4, direccionId: 12, estadoServicio: 'ACTIVO', diaCorte: 1, diasGraciaSuspension: 5, diasGraciaCorte: 10, fechaAlta: '2025-04-25', fechaInstalacion: '2025-04-29' },
  { id: 13, codigo: 'CTR-0013', clienteId: 13, planId: 2, direccionId: 13, estadoServicio: 'ACTIVO', diaCorte: 10, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2025-06-08', fechaInstalacion: '2025-06-12' },
  { id: 14, codigo: 'CTR-0014', clienteId: 14, planId: 1, direccionId: 14, estadoServicio: 'CORTADO', diaCorte: 10, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2025-07-22', fechaInstalacion: '2025-07-26' },
  { id: 15, codigo: 'CTR-0015', clienteId: 15, planId: 3, direccionId: 15, estadoServicio: 'ACTIVO', diaCorte: 15, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2025-09-05', fechaInstalacion: '2025-09-09' },
  { id: 16, codigo: 'CTR-0016', clienteId: 16, planId: 2, direccionId: 16, estadoServicio: 'PENDIENTE', diaCorte: 5, diasGraciaSuspension: 3, diasGraciaCorte: 6, fechaAlta: '2026-07-18' },
];

export const IDENTIDADES_RED: IdentidadRed[] = [
  { id: 1, contratoId: 1, tipoConexion: 'PPPOE', pppoeUsuario: 'jperalta01', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '10.20.0.11', macAddress: 'A4:2B:B0:11:4C:01', vlan: 100, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 2, contratoId: 2, tipoConexion: 'PPPOE', pppoeUsuario: 'mordonez02', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '10.20.0.12', macAddress: 'A4:2B:B0:11:4C:02', vlan: 100, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 3, contratoId: 3, tipoConexion: 'PPPOE', pppoeUsuario: 'sguaman03', nasIdentificador: 'MK-SANMARTIN-02', nasIp: '10.10.0.2', ipAsignada: '10.20.1.13', macAddress: 'A4:2B:B0:11:4C:03', vlan: 110, perfilRadiusActual: 'suspendido', sincronizadoRed: true, ultimaSyncRed: '2026-07-21T06:00:00Z' },
  { id: 4, contratoId: 4, tipoConexion: 'PPPOE', pppoeUsuario: 'rchuchuca04', nasIdentificador: 'MK-DELEGSOL-03', nasIp: '10.10.0.3', ipAsignada: '10.20.2.14', macAddress: 'A4:2B:B0:11:4C:04', vlan: 120, perfilRadiusActual: 'cortado', sincronizadoRed: true, ultimaSyncRed: '2026-07-17T06:00:00Z' },
  { id: 5, contratoId: 5, tipoConexion: 'PPPOE', pppoeUsuario: 'lsarmiento05', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '10.20.0.15', macAddress: 'A4:2B:B0:11:4C:05', vlan: 100, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 6, contratoId: 6, tipoConexion: 'PPPOE', pppoeUsuario: 'filigrana06', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '190.152.44.86', macAddress: 'A4:2B:B0:11:4C:06', vlan: 200, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 7, contratoId: 7, tipoConexion: 'PPPOE', pppoeUsuario: 'abermeo07', nasIdentificador: 'MK-ZHORDAN-04', nasIp: '10.10.0.4', ipAsignada: '10.20.3.17', macAddress: 'A4:2B:B0:11:4C:07', vlan: 130, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 8, contratoId: 8, tipoConexion: 'PPPOE', pppoeUsuario: 'czhingre08', nasIdentificador: 'MK-PUZHIO-05', nasIp: '10.10.0.5', perfilRadiusActual: 'plan-normal', sincronizadoRed: false },
  { id: 9, contratoId: 9, tipoConexion: 'PPPOE', pppoeUsuario: 'bpauta09', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '10.20.0.19', macAddress: 'A4:2B:B0:11:4C:09', vlan: 100, perfilRadiusActual: 'suspendido', sincronizadoRed: false },
  { id: 10, contratoId: 10, tipoConexion: 'PPPOE', pppoeUsuario: 'jcabrera10', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '10.20.0.20', macAddress: 'A4:2B:B0:11:4C:10', vlan: 100, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 11, contratoId: 11, tipoConexion: 'PPPOE', pppoeUsuario: 'mquizhpi11', nasIdentificador: 'MK-LLAVIZHU-06', nasIp: '10.10.0.6', perfilRadiusActual: 'cortado', sincronizadoRed: true, ultimaSyncRed: '2026-05-01T06:00:00Z' },
  { id: 12, contratoId: 12, tipoConexion: 'PPPOE', pppoeUsuario: 'eldorado12', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '190.152.44.92', macAddress: 'A4:2B:B0:11:4C:12', vlan: 200, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 13, contratoId: 13, tipoConexion: 'PPPOE', pppoeUsuario: 'mmorocho13', nasIdentificador: 'MK-CERROORO-07', nasIp: '10.10.0.7', ipAsignada: '10.20.4.23', macAddress: 'A4:2B:B0:11:4C:13', vlan: 140, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 14, contratoId: 14, tipoConexion: 'HOTSPOT', pppoeUsuario: 'nuyaguari14', nasIdentificador: 'MK-TABLON-08', nasIp: '10.10.0.8', macAddress: 'A4:2B:B0:11:4C:14', vlan: 150, perfilRadiusActual: 'cortado', sincronizadoRed: false },
  { id: 15, contratoId: 15, tipoConexion: 'PPPOE', pppoeUsuario: 'fvintimilla15', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', ipAsignada: '10.20.0.25', macAddress: 'A4:2B:B0:11:4C:15', vlan: 100, perfilRadiusActual: 'plan-normal', sincronizadoRed: true, ultimaSyncRed: '2026-07-20T08:14:00Z' },
  { id: 16, contratoId: 16, tipoConexion: 'PPPOE', pppoeUsuario: 'gtenesaca16', nasIdentificador: 'MK-CHORDELEG-01', nasIp: '10.10.0.1', perfilRadiusActual: 'plan-normal', sincronizadoRed: false },
];

export const HISTORIAL_ESTADOS: HistorialEstado[] = [
  { id: 1, contratoId: 3, estadoAnterior: 'ACTIVO', estadoNuevo: 'SUSPENDIDO', motivo: 'MORA_SUSPENSION', origen: 'SISTEMA', referencia: 'FAC 001-001-000000112', diasVencido: 3, aplicadoEnRed: true, fecha: '2026-07-21T06:00:00Z' },
  { id: 2, contratoId: 4, estadoAnterior: 'SUSPENDIDO', estadoNuevo: 'CORTADO', motivo: 'MORA_CORTE', origen: 'SISTEMA', referencia: 'FAC 001-001-000000108', diasVencido: 6, aplicadoEnRed: true, fecha: '2026-07-17T06:00:00Z' },
  { id: 3, contratoId: 4, estadoAnterior: 'ACTIVO', estadoNuevo: 'SUSPENDIDO', motivo: 'MORA_SUSPENSION', origen: 'SISTEMA', referencia: 'FAC 001-001-000000108', diasVencido: 3, aplicadoEnRed: true, fecha: '2026-07-14T06:00:00Z' },
  { id: 4, contratoId: 9, estadoAnterior: 'ACTIVO', estadoNuevo: 'SUSPENDIDO', motivo: 'MORA_SUSPENSION', origen: 'SISTEMA', referencia: 'FAC 001-001-000000110', diasVencido: 4, aplicadoEnRed: false, fecha: '2026-07-20T06:00:00Z' },
  { id: 5, contratoId: 14, estadoAnterior: 'SUSPENDIDO', estadoNuevo: 'CORTADO', motivo: 'MORA_CORTE', origen: 'SISTEMA', referencia: 'FAC 001-001-000000104', diasVencido: 9, aplicadoEnRed: false, fecha: '2026-07-19T06:00:00Z' },
  { id: 6, contratoId: 1, estadoAnterior: 'SUSPENDIDO', estadoNuevo: 'ACTIVO', motivo: 'PAGO_REACTIVACION', origen: 'SISTEMA', referencia: 'REC-2026-000241', aplicadoEnRed: true, fecha: '2026-06-12T15:22:00Z' },
  { id: 7, contratoId: 11, estadoAnterior: 'CORTADO', estadoNuevo: 'RETIRADO', motivo: 'BAJA', origen: 'USUARIO', usuarioId: 1, referencia: 'Solicitud del cliente', aplicadoEnRed: true, fecha: '2026-04-30T11:05:00Z' },
  { id: 8, contratoId: 12, estadoAnterior: 'PENDIENTE', estadoNuevo: 'ACTIVO', motivo: 'ALTA', origen: 'USUARIO', usuarioId: 3, aplicadoEnRed: true, fecha: '2025-04-29T09:40:00Z' },
];

/* =====================================================================
   MS-FACTURACIÓN ELECTRÓNICA
   ===================================================================== */

export const EMISOR: Emisor = {
  id: 1,
  ruc: '0190847562001',
  razonSocial: 'FIBRA NET TELECOMUNICACIONES CÍA. LTDA.',
  nombreComercial: 'FIBRA NET',
  direccionMatriz: 'Av. 24 de Mayo y Guayaquil, Chordeleg — Azuay',
  ambiente: 'PRUEBAS',
  obligadoContabilidad: true,
  certificadoAlias: 'fibranet-firma-2026.p12',
  activo: true,
};

/** Construye una factura completa (cabecera + detalle) con IVA 15%. */
function mkFactura(p: {
  id: number;
  secuencial: number;
  contratoId: number;
  clienteId: number;
  periodo: string;
  emision: string;
  vencimiento: string;
  planNombre: string;
  planCodigo: string;
  precio: number;
  estadoPago: Factura['estadoPago'];
  estadoSri: Factura['estadoSri'];
  saldo?: number;
}): Factura {
  const cliente = CLIENTES.find((c) => c.id === p.clienteId)!;
  const direccion = DIRECCIONES.find((d) => d.clienteId === p.clienteId);
  const nombre =
    cliente.tipoCliente === 'EMPRESA'
      ? cliente.razonSocial!
      : `${cliente.nombres} ${cliente.apellidos}`;

  const subtotal = round2(p.precio);
  const iva = round2(subtotal * 0.15);
  const total = round2(subtotal + iva);
  const secuencialStr = String(p.secuencial).padStart(9, '0');
  const autorizada = p.estadoSri === 'AUTORIZADA';

  const detalle: FacturaDetalle[] = [
    {
      id: p.id * 10 + 1,
      facturaId: p.id,
      linea: 1,
      codigoPrincipal: p.planCodigo,
      descripcion: `Servicio de internet ${p.planNombre} — periodo ${p.periodo}`,
      cantidad: 1,
      precioUnitario: subtotal,
      descuento: 0,
      subtotal,
      tarifaIva: 15,
      valorIva: iva,
      total,
    },
  ];

  return {
    id: p.id,
    tipoComprobante: 'FACTURA',
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: secuencialStr,
    numeroDocumento: `001-001-${secuencialStr}`,
    claveAcceso: autorizada
      ? `${p.emision.split('-').reverse().join('')}01${EMISOR.ruc}1001001${secuencialStr}12345678`.slice(0, 49)
      : undefined,
    ambiente: 'PRUEBAS',
    contratoId: p.contratoId,
    clienteId: p.clienteId,
    clienteIdentificacion: cliente.identificacion,
    clienteRazonSocial: nombre,
    clienteDireccion: direccion?.direccionTexto,
    clienteEmail: cliente.email,
    periodo: p.periodo,
    fechaEmision: p.emision,
    fechaVencimiento: p.vencimiento,
    subtotalSinImpuestos: subtotal,
    descuento: 0,
    baseImponibleIva: subtotal,
    baseImponibleIva0: 0,
    valorIva: iva,
    total,
    saldoPendiente: p.saldo !== undefined ? round2(p.saldo) : p.estadoPago === 'PAGADA' ? 0 : total,
    estadoPago: p.estadoPago,
    estadoSri: p.estadoSri,
    numeroAutorizacion: autorizada ? `${p.emision.replace(/-/g, '')}0190847562001${secuencialStr}` : undefined,
    fechaAutorizacion: autorizada ? `${p.emision}T09:12:44-05:00` : undefined,
    xmlFirmadoUrl: autorizada ? `s3://fibranet-comprobantes/2026/${secuencialStr}.xml` : undefined,
    ridePdfUrl: autorizada ? `s3://fibranet-comprobantes/2026/${secuencialStr}.pdf` : undefined,
    detalle,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const P = (id: number) => PLANES.find((x) => x.id === id)!;

export const FACTURAS: Factura[] = [
  // --- Periodo 2026-06 (cerrado, mayormente cobrado) -------------------
  mkFactura({ id: 101, secuencial: 101, contratoId: 1, clienteId: 1, periodo: '2026-06', emision: '2026-06-05', vencimiento: '2026-06-15', planNombre: P(2).nombre, planCodigo: P(2).codigo, precio: 28, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 102, secuencial: 102, contratoId: 2, clienteId: 2, periodo: '2026-06', emision: '2026-06-05', vencimiento: '2026-06-15', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 103, secuencial: 103, contratoId: 5, clienteId: 5, periodo: '2026-06', emision: '2026-06-15', vencimiento: '2026-06-25', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 104, secuencial: 104, contratoId: 14, clienteId: 14, periodo: '2026-06', emision: '2026-06-10', vencimiento: '2026-06-20', planNombre: P(1).nombre, planCodigo: P(1).codigo, precio: 22, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 105, secuencial: 105, contratoId: 6, clienteId: 6, periodo: '2026-06', emision: '2026-06-01', vencimiento: '2026-06-11', planNombre: P(5).nombre, planCodigo: P(5).codigo, precio: 120, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 106, secuencial: 106, contratoId: 12, clienteId: 12, periodo: '2026-06', emision: '2026-06-01', vencimiento: '2026-06-11', planNombre: P(4).nombre, planCodigo: P(4).codigo, precio: 55, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),

  // --- Periodo 2026-07 (en curso) --------------------------------------
  mkFactura({ id: 107, secuencial: 107, contratoId: 1, clienteId: 1, periodo: '2026-07', emision: '2026-07-05', vencimiento: '2026-07-15', planNombre: P(2).nombre, planCodigo: P(2).codigo, precio: 28, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 108, secuencial: 108, contratoId: 4, clienteId: 4, periodo: '2026-07', emision: '2026-07-05', vencimiento: '2026-07-10', planNombre: P(2).nombre, planCodigo: P(2).codigo, precio: 28, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 109, secuencial: 109, contratoId: 2, clienteId: 2, periodo: '2026-07', emision: '2026-07-05', vencimiento: '2026-07-15', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 110, secuencial: 110, contratoId: 9, clienteId: 9, periodo: '2026-07', emision: '2026-07-05', vencimiento: '2026-07-17', planNombre: P(1).nombre, planCodigo: P(1).codigo, precio: 22, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 111, secuencial: 111, contratoId: 6, clienteId: 6, periodo: '2026-07', emision: '2026-07-01', vencimiento: '2026-07-11', planNombre: P(5).nombre, planCodigo: P(5).codigo, precio: 120, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 112, secuencial: 112, contratoId: 3, clienteId: 3, periodo: '2026-07', emision: '2026-07-10', vencimiento: '2026-07-18', planNombre: P(1).nombre, planCodigo: P(1).codigo, precio: 22, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 113, secuencial: 113, contratoId: 7, clienteId: 7, periodo: '2026-07', emision: '2026-07-10', vencimiento: '2026-07-20', planNombre: P(1).nombre, planCodigo: P(1).codigo, precio: 22, estadoPago: 'PARCIAL', estadoSri: 'AUTORIZADA', saldo: 10.3 }),
  mkFactura({ id: 114, secuencial: 114, contratoId: 12, clienteId: 12, periodo: '2026-07', emision: '2026-07-01', vencimiento: '2026-07-11', planNombre: P(4).nombre, planCodigo: P(4).codigo, precio: 55, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 115, secuencial: 115, contratoId: 13, clienteId: 13, periodo: '2026-07', emision: '2026-07-10', vencimiento: '2026-07-20', planNombre: P(2).nombre, planCodigo: P(2).codigo, precio: 28, estadoPago: 'PAGADA', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 116, secuencial: 116, contratoId: 10, clienteId: 10, periodo: '2026-07', emision: '2026-07-15', vencimiento: '2026-07-25', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 117, secuencial: 117, contratoId: 15, clienteId: 15, periodo: '2026-07', emision: '2026-07-15', vencimiento: '2026-07-25', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 118, secuencial: 118, contratoId: 5, clienteId: 5, periodo: '2026-07', emision: '2026-07-15', vencimiento: '2026-07-25', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),
  mkFactura({ id: 119, secuencial: 119, contratoId: 14, clienteId: 14, periodo: '2026-07', emision: '2026-07-10', vencimiento: '2026-07-20', planNombre: P(1).nombre, planCodigo: P(1).codigo, precio: 22, estadoPago: 'PENDIENTE', estadoSri: 'AUTORIZADA' }),

  // --- Emitidas hoy, aún sin autorizar (muestran el ciclo SRI) ----------
  mkFactura({ id: 120, secuencial: 120, contratoId: 13, clienteId: 13, periodo: '2026-07', emision: '2026-07-21', vencimiento: '2026-08-01', planNombre: P(2).nombre, planCodigo: P(2).codigo, precio: 28, estadoPago: 'PENDIENTE', estadoSri: 'FIRMADA' }),
  mkFactura({ id: 121, secuencial: 121, contratoId: 10, clienteId: 10, periodo: '2026-07', emision: '2026-07-21', vencimiento: '2026-08-01', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PENDIENTE', estadoSri: 'ENVIADA' }),
  mkFactura({ id: 122, secuencial: 122, contratoId: 7, clienteId: 7, periodo: '2026-07', emision: '2026-07-21', vencimiento: '2026-08-01', planNombre: P(1).nombre, planCodigo: P(1).codigo, precio: 22, estadoPago: 'PENDIENTE', estadoSri: 'GENERADA' }),
  mkFactura({ id: 123, secuencial: 123, contratoId: 15, clienteId: 15, periodo: '2026-07', emision: '2026-07-20', vencimiento: '2026-07-31', planNombre: P(3).nombre, planCodigo: P(3).codigo, precio: 35, estadoPago: 'PENDIENTE', estadoSri: 'NO_AUTORIZADA' }),
];

/* =====================================================================
   MS-FINANZAS Y COBRANZAS
   ===================================================================== */

export const CAJAS: Caja[] = [
  { id: 1, codigo: 'CAJA-MTZ', nombre: 'Caja Matriz Chordeleg', ubicacion: 'Av. 24 de Mayo y Guayaquil', activa: true },
  { id: 2, codigo: 'CAJA-SIG', nombre: 'Caja Sucursal Sígsig', ubicacion: 'Calle Bolívar 2-14, Sígsig', activa: true },
];

export const SESIONES_CAJA: SesionCaja[] = [
  { id: 41, cajaId: 1, usuarioId: 5, fechaApertura: '2026-07-21T08:00:00-05:00', montoInicial: 50, estado: 'ABIERTA' },
  { id: 40, cajaId: 2, usuarioId: 2, fechaApertura: '2026-07-21T08:30:00-05:00', montoInicial: 30, estado: 'ABIERTA' },
  { id: 39, cajaId: 1, usuarioId: 5, fechaApertura: '2026-07-20T08:05:00-05:00', montoInicial: 50, fechaCierre: '2026-07-20T17:40:00-05:00', montoFinalSistema: 218.6, montoFinalDeclarado: 218.6, diferencia: 0, estado: 'CERRADA' },
  { id: 38, cajaId: 1, usuarioId: 5, fechaApertura: '2026-07-19T08:00:00-05:00', montoInicial: 50, fechaCierre: '2026-07-19T17:30:00-05:00', montoFinalSistema: 165.4, montoFinalDeclarado: 163.4, diferencia: -2, estado: 'CERRADA', observacion: 'Faltante de $2.00, se descuenta a caja chica' },
  { id: 37, cajaId: 2, usuarioId: 2, fechaApertura: '2026-07-18T08:20:00-05:00', montoInicial: 30, fechaCierre: '2026-07-18T17:15:00-05:00', montoFinalSistema: 94.75, montoFinalDeclarado: 94.75, diferencia: 0, estado: 'CERRADA' },
];

export const PAGOS: Pago[] = [
  { id: 260, numeroRecibo: 'REC-2026-000260', clienteId: 13, contratoId: 13, fecha: '2026-07-21T10:15:00-05:00', monto: 32.2, formaPago: 'EFECTIVO', sesionCajaId: 41, usuarioId: 5, estado: 'CONFIRMADO', aplicaciones: [{ id: 1, pagoId: 260, facturaId: 115, facturaNumero: '001-001-000000115', montoAplicado: 32.2 }] },
  { id: 259, numeroRecibo: 'REC-2026-000259', clienteId: 7, contratoId: 7, fecha: '2026-07-21T09:42:00-05:00', monto: 15.0, formaPago: 'EFECTIVO', sesionCajaId: 41, usuarioId: 5, estado: 'CONFIRMADO', observacion: 'Abono parcial', aplicaciones: [{ id: 2, pagoId: 259, facturaId: 113, facturaNumero: '001-001-000000113', montoAplicado: 15.0 }] },
  { id: 258, numeroRecibo: 'REC-2026-000258', clienteId: 12, contratoId: 12, fecha: '2026-07-21T09:05:00-05:00', monto: 63.25, formaPago: 'TRANSFERENCIA', referencia: 'TRF-88451207', banco: 'Banco del Austro', usuarioId: 2, estado: 'CONFIRMADO', aplicaciones: [{ id: 3, pagoId: 258, facturaId: 114, facturaNumero: '001-001-000000114', montoAplicado: 63.25 }] },
  { id: 257, numeroRecibo: 'REC-2026-000257', clienteId: 6, contratoId: 6, fecha: '2026-07-20T16:20:00-05:00', monto: 138.0, formaPago: 'TRANSFERENCIA', referencia: 'TRF-88440931', banco: 'Banco Pichincha', usuarioId: 2, estado: 'CONFIRMADO', aplicaciones: [{ id: 4, pagoId: 257, facturaId: 111, facturaNumero: '001-001-000000111', montoAplicado: 138.0 }] },
  { id: 256, numeroRecibo: 'REC-2026-000256', clienteId: 2, contratoId: 2, fecha: '2026-07-20T14:10:00-05:00', monto: 40.25, formaPago: 'EFECTIVO', sesionCajaId: 39, usuarioId: 5, estado: 'CONFIRMADO', aplicaciones: [{ id: 5, pagoId: 256, facturaId: 109, facturaNumero: '001-001-000000109', montoAplicado: 40.25 }] },
  { id: 255, numeroRecibo: 'REC-2026-000255', clienteId: 1, contratoId: 1, fecha: '2026-07-20T11:35:00-05:00', monto: 32.2, formaPago: 'EFECTIVO', sesionCajaId: 39, usuarioId: 5, estado: 'CONFIRMADO', aplicaciones: [{ id: 6, pagoId: 255, facturaId: 107, facturaNumero: '001-001-000000107', montoAplicado: 32.2 }] },
  { id: 254, numeroRecibo: 'REC-2026-000254', clienteId: 5, contratoId: 5, fecha: '2026-07-20T10:02:00-05:00', monto: 40.25, formaPago: 'DEPOSITO', referencia: 'DEP-4471203', banco: 'JEP', usuarioId: 2, estado: 'CONFIRMADO', aplicaciones: [{ id: 7, pagoId: 254, facturaId: 103, facturaNumero: '001-001-000000103', montoAplicado: 40.25 }] },
  { id: 253, numeroRecibo: 'REC-2026-000253', clienteId: 10, contratoId: 10, fecha: '2026-07-19T15:48:00-05:00', monto: 40.25, formaPago: 'PASARELA', referencia: 'PAY-9928374', usuarioId: 2, estado: 'CONFIRMADO' },
  { id: 252, numeroRecibo: 'REC-2026-000252', clienteId: 12, contratoId: 12, fecha: '2026-07-19T12:15:00-05:00', monto: 63.25, formaPago: 'EFECTIVO', sesionCajaId: 38, usuarioId: 5, estado: 'CONFIRMADO', aplicaciones: [{ id: 8, pagoId: 252, facturaId: 106, facturaNumero: '001-001-000000106', montoAplicado: 63.25 }] },
  { id: 251, numeroRecibo: 'REC-2026-000251', clienteId: 6, contratoId: 6, fecha: '2026-07-19T09:30:00-05:00', monto: 138.0, formaPago: 'CHEQUE', referencia: 'CHQ-0012457', banco: 'Banco del Austro', usuarioId: 2, estado: 'REGISTRADO', observacion: 'Pendiente de efectivizar' },
  { id: 250, numeroRecibo: 'REC-2026-000250', clienteId: 15, contratoId: 15, fecha: '2026-07-18T16:05:00-05:00', monto: 40.25, formaPago: 'EFECTIVO', sesionCajaId: 37, usuarioId: 2, estado: 'CONFIRMADO' },
  { id: 249, numeroRecibo: 'REC-2026-000249', clienteId: 3, contratoId: 3, fecha: '2026-07-18T11:20:00-05:00', monto: 25.3, formaPago: 'EFECTIVO', sesionCajaId: 37, usuarioId: 2, estado: 'ANULADO', motivoAnulacion: 'Error de digitación en el monto' },
  { id: 248, numeroRecibo: 'REC-2026-000248', clienteId: 2, contratoId: 2, fecha: '2026-06-16T10:40:00-05:00', monto: 40.25, formaPago: 'TARJETA', referencia: 'VISA-4471', usuarioId: 5, estado: 'CONFIRMADO', aplicaciones: [{ id: 9, pagoId: 248, facturaId: 102, facturaNumero: '001-001-000000102', montoAplicado: 40.25 }] },
  { id: 247, numeroRecibo: 'REC-2026-000247', clienteId: 1, contratoId: 1, fecha: '2026-06-14T09:12:00-05:00', monto: 32.2, formaPago: 'EFECTIVO', sesionCajaId: 37, usuarioId: 5, estado: 'CONFIRMADO', aplicaciones: [{ id: 10, pagoId: 247, facturaId: 101, facturaNumero: '001-001-000000101', montoAplicado: 32.2 }] },
  { id: 246, numeroRecibo: 'REC-2026-000246', clienteId: 6, contratoId: 6, fecha: '2026-06-10T14:55:00-05:00', monto: 138.0, formaPago: 'TRANSFERENCIA', referencia: 'TRF-88012455', banco: 'Banco Pichincha', usuarioId: 2, estado: 'CONFIRMADO', aplicaciones: [{ id: 11, pagoId: 246, facturaId: 105, facturaNumero: '001-001-000000105', montoAplicado: 138.0 }] },
];

export const MOVIMIENTOS_CAJA: MovimientoCaja[] = [
  { id: 1, sesionCajaId: 41, tipo: 'INGRESO', concepto: 'Cobro factura 001-001-000000115', monto: 32.2, pagoId: 260, usuarioId: 5, fecha: '2026-07-21T10:15:00-05:00' },
  { id: 2, sesionCajaId: 41, tipo: 'INGRESO', concepto: 'Abono parcial factura 001-001-000000113', monto: 15.0, pagoId: 259, usuarioId: 5, fecha: '2026-07-21T09:42:00-05:00' },
  { id: 3, sesionCajaId: 41, tipo: 'EGRESO', concepto: 'Compra de suministros de oficina', monto: 8.5, usuarioId: 5, fecha: '2026-07-21T11:00:00-05:00' },
  { id: 4, sesionCajaId: 39, tipo: 'INGRESO', concepto: 'Cobro factura 001-001-000000109', monto: 40.25, pagoId: 256, usuarioId: 5, fecha: '2026-07-20T14:10:00-05:00' },
  { id: 5, sesionCajaId: 39, tipo: 'INGRESO', concepto: 'Cobro factura 001-001-000000107', monto: 32.2, pagoId: 255, usuarioId: 5, fecha: '2026-07-20T11:35:00-05:00' },
  { id: 6, sesionCajaId: 39, tipo: 'EGRESO', concepto: 'Movilización técnico a Delegsol', monto: 12.0, usuarioId: 5, fecha: '2026-07-20T13:00:00-05:00' },
];

/* =====================================================================
   MS-INVENTARIO E INFRAESTRUCTURA  (microservicio aún no construido)
   ===================================================================== */

export const BODEGAS: Bodega[] = [
  { id: 1, codigo: 'BOD-MTZ', nombre: 'Bodega Matriz', ubicacion: 'Oficina Chordeleg' },
  { id: 2, codigo: 'BOD-MOV', nombre: 'Stock móvil (camioneta)', ubicacion: 'Unidad técnica 01' },
];

export const EQUIPOS: Equipo[] = [
  { id: 1, codigo: 'EQ-0001', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B21C7', macAddress: '48:57:02:1A:4B:C7', estado: 'ASIGNADO', bodegaId: 1, contratoId: 1, costoUnitario: 38.5, fechaIngreso: '2024-02-20' },
  { id: 2, codigo: 'EQ-0002', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B21D1', macAddress: '48:57:02:1A:4B:D1', estado: 'ASIGNADO', bodegaId: 1, contratoId: 2, costoUnitario: 38.5, fechaIngreso: '2024-02-20' },
  { id: 3, codigo: 'EQ-0003', tipo: 'ONT', marca: 'ZTE', modelo: 'F670L', numeroSerie: 'ZTEGC4471285', macAddress: '9C:5D:12:33:71:85', estado: 'ASIGNADO', bodegaId: 1, contratoId: 3, costoUnitario: 34.0, fechaIngreso: '2024-05-11' },
  { id: 4, codigo: 'EQ-0004', tipo: 'ONT', marca: 'ZTE', modelo: 'F670L', numeroSerie: 'ZTEGC4471290', macAddress: '9C:5D:12:33:71:90', estado: 'ASIGNADO', bodegaId: 1, contratoId: 4, costoUnitario: 34.0, fechaIngreso: '2024-05-11' },
  { id: 5, codigo: 'EQ-0005', tipo: 'ROUTER', marca: 'Mikrotik', modelo: 'hAP ac²', numeroSerie: 'MKT9982143', macAddress: 'DC:2C:6E:88:21:43', estado: 'ASIGNADO', bodegaId: 1, contratoId: 6, costoUnitario: 72.0, fechaIngreso: '2024-09-30' },
  { id: 6, codigo: 'EQ-0006', tipo: 'ROUTER', marca: 'Mikrotik', modelo: 'CCR2004-16G-2S+', numeroSerie: 'MKT7741002', macAddress: 'DC:2C:6E:12:10:02', estado: 'ASIGNADO', bodegaId: 1, costoUnitario: 1450.0, fechaIngreso: '2024-01-15' },
  { id: 7, codigo: 'EQ-0007', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B22F3', macAddress: '48:57:02:1A:4C:F3', estado: 'DISPONIBLE', bodegaId: 1, costoUnitario: 38.5, fechaIngreso: '2026-05-08' },
  { id: 8, codigo: 'EQ-0008', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B22F4', macAddress: '48:57:02:1A:4C:F4', estado: 'DISPONIBLE', bodegaId: 1, costoUnitario: 38.5, fechaIngreso: '2026-05-08' },
  { id: 9, codigo: 'EQ-0009', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B22F5', macAddress: '48:57:02:1A:4C:F5', estado: 'DISPONIBLE', bodegaId: 2, costoUnitario: 38.5, fechaIngreso: '2026-05-08' },
  { id: 10, codigo: 'EQ-0010', tipo: 'SPLITTER', marca: 'Fiberhome', modelo: 'PLC 1x8 SC/APC', numeroSerie: 'FH-SPL-1x8-0231', estado: 'ASIGNADO', bodegaId: 1, costoUnitario: 18.0, fechaIngreso: '2025-03-14' },
  { id: 11, codigo: 'EQ-0011', tipo: 'SPLITTER', marca: 'Fiberhome', modelo: 'PLC 1x16 SC/APC', numeroSerie: 'FH-SPL-1x16-0074', estado: 'DISPONIBLE', bodegaId: 1, costoUnitario: 29.0, fechaIngreso: '2025-03-14' },
  { id: 12, codigo: 'EQ-0012', tipo: 'SWITCH', marca: 'TP-Link', modelo: 'TL-SG1016D', numeroSerie: 'TPL5541209', macAddress: '50:C7:BF:54:12:09', estado: 'ASIGNADO', bodegaId: 1, costoUnitario: 85.0, fechaIngreso: '2024-04-02' },
  { id: 13, codigo: 'EQ-0013', tipo: 'ONT', marca: 'ZTE', modelo: 'F670L', numeroSerie: 'ZTEGC4471301', macAddress: '9C:5D:12:33:73:01', estado: 'EN_REPARACION', bodegaId: 1, costoUnitario: 34.0, fechaIngreso: '2025-01-20' },
  { id: 14, codigo: 'EQ-0014', tipo: 'ONT', marca: 'ZTE', modelo: 'F670L', numeroSerie: 'ZTEGC4471315', macAddress: '9C:5D:12:33:73:15', estado: 'DANIADO', bodegaId: 1, costoUnitario: 34.0, fechaIngreso: '2025-01-20' },
  { id: 15, codigo: 'EQ-0015', tipo: 'ANTENA', marca: 'Ubiquiti', modelo: 'LiteBeam 5AC Gen2', numeroSerie: 'UBNT8874120', macAddress: '78:8A:20:88:74:12', estado: 'DISPONIBLE', bodegaId: 2, costoUnitario: 92.0, fechaIngreso: '2025-11-06' },
  { id: 16, codigo: 'EQ-0016', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B22F8', macAddress: '48:57:02:1A:4C:F8', estado: 'ASIGNADO', bodegaId: 1, contratoId: 12, costoUnitario: 38.5, fechaIngreso: '2025-04-10' },
  { id: 17, codigo: 'EQ-0017', tipo: 'ONT', marca: 'Huawei', modelo: 'EG8145V5', numeroSerie: 'HWTC8A4B22G1', macAddress: '48:57:02:1A:4D:A1', estado: 'ASIGNADO', bodegaId: 1, contratoId: 13, costoUnitario: 38.5, fechaIngreso: '2025-06-01' },
  { id: 18, codigo: 'EQ-0018', tipo: 'ONT', marca: 'ZTE', modelo: 'F670L', numeroSerie: 'ZTEGC4471340', macAddress: '9C:5D:12:33:73:40', estado: 'BAJA', bodegaId: 1, costoUnitario: 34.0, fechaIngreso: '2024-07-18' },
];

export const ITEMS_STOCK: ItemStock[] = [
  { id: 1, codigo: 'MAT-001', descripcion: 'Fibra óptica drop 1 hilo G.657A2', tipo: 'CABLE', unidad: 'metros', cantidadDisponible: 4250, stockMinimo: 1000, costoUnitario: 0.18, bodegaId: 1 },
  { id: 2, codigo: 'MAT-002', descripcion: 'Conector rápido SC/APC', tipo: 'CONECTOR', unidad: 'unidad', cantidadDisponible: 320, stockMinimo: 100, costoUnitario: 0.75, bodegaId: 1 },
  { id: 3, codigo: 'MAT-003', descripcion: 'Roseta óptica de pared 1 puerto', tipo: 'CONECTOR', unidad: 'unidad', cantidadDisponible: 68, stockMinimo: 80, costoUnitario: 1.9, bodegaId: 1 },
  { id: 4, codigo: 'MAT-004', descripcion: 'Patch cord SC/APC-SC/UPC 3 m', tipo: 'CABLE', unidad: 'unidad', cantidadDisponible: 145, stockMinimo: 60, costoUnitario: 2.4, bodegaId: 1 },
  { id: 5, codigo: 'MAT-005', descripcion: 'Tensor plástico para drop', tipo: 'CONECTOR', unidad: 'unidad', cantidadDisponible: 42, stockMinimo: 100, costoUnitario: 0.45, bodegaId: 2 },
  { id: 6, codigo: 'MAT-006', descripcion: 'Manga de empalme 24 hilos', tipo: 'CONECTOR', unidad: 'unidad', cantidadDisponible: 12, stockMinimo: 6, costoUnitario: 24.0, bodegaId: 1 },
];

/* =====================================================================
   MS-OPERATIVO Y TÉCNICOS  (microservicio aún no construido)
   ===================================================================== */

export const TECNICOS: Tecnico[] = [
  { id: 1, codigo: 'TEC-01', nombre: 'Marco Guamán', telefono: '0987412589', zona: 'Chordeleg Centro', activo: true },
  { id: 2, codigo: 'TEC-02', nombre: 'Édison Quizhpi', telefono: '0994512378', zona: 'San Martín / Delegsol', activo: true },
  { id: 3, codigo: 'TEC-03', nombre: 'Wilson Tenesaca', telefono: '0982145697', zona: 'Zhordán / Puzhio', activo: true },
  { id: 4, codigo: 'TEC-04', nombre: 'Byron Cabrera', telefono: '0996321475', zona: 'Sígsig', activo: false },
];

export const ORDENES: OrdenTrabajo[] = [
  { id: 1, codigo: 'OT-2026-0141', tipo: 'INSTALACION', estado: 'ASIGNADA', prioridad: 'ALTA', contratoId: 8, clienteId: 8, descripcion: 'Instalación nueva Fibra Hogar 50 Mbps', direccionTexto: 'Sector Puzhio, junto a la escuela', latitud: -2.90987, longitud: -78.77234, tecnicoId: 3, fechaCreacion: '2026-07-15T09:00:00-05:00', fechaProgramada: '2026-07-22T09:00:00-05:00' },
  { id: 2, codigo: 'OT-2026-0142', tipo: 'INSTALACION', estado: 'PENDIENTE', prioridad: 'NORMAL', contratoId: 16, clienteId: 16, descripcion: 'Instalación nueva Fibra Hogar 50 Mbps', direccionTexto: 'Sector Principal, junto al coliseo', latitud: -2.92198, longitud: -78.77845, fechaCreacion: '2026-07-18T14:30:00-05:00', fechaProgramada: '2026-07-23T10:00:00-05:00' },
  { id: 3, codigo: 'OT-2026-0140', tipo: 'SOPORTE', estado: 'EN_PROCESO', prioridad: 'URGENTE', contratoId: 6, clienteId: 6, descripcion: 'Intermitencia en el servicio corporativo, cliente reporta cortes cada 10 min', direccionTexto: 'Plaza Central de Chordeleg, local 8', latitud: -2.92398, longitud: -78.77991, tecnicoId: 1, fechaCreacion: '2026-07-21T08:15:00-05:00', fechaProgramada: '2026-07-21T11:00:00-05:00' },
  { id: 4, codigo: 'OT-2026-0139', tipo: 'SOPORTE', estado: 'PENDIENTE', prioridad: 'ALTA', contratoId: 12, clienteId: 12, descripcion: 'Wi-Fi no llega al tercer piso, evaluar repetidor', direccionTexto: 'Av. 24 de Mayo 12-45 y Guayaquil', latitud: -2.92334, longitud: -78.78067, fechaCreacion: '2026-07-20T17:20:00-05:00' },
  { id: 5, codigo: 'OT-2026-0138', tipo: 'RETIRO', estado: 'COMPLETADA', prioridad: 'NORMAL', contratoId: 11, clienteId: 11, descripcion: 'Retiro de equipos por baja del servicio', direccionTexto: 'Comunidad Llavizhuñay, vía principal', tecnicoId: 2, fechaCreacion: '2026-04-28T10:00:00-05:00', fechaProgramada: '2026-04-30T14:00:00-05:00', fechaCierre: '2026-04-30T15:25:00-05:00', observacionCierre: 'Se retiró ONT y roseta. Equipo en buen estado, reingresa a bodega.' },
  { id: 6, codigo: 'OT-2026-0137', tipo: 'MANTENIMIENTO', estado: 'COMPLETADA', prioridad: 'NORMAL', descripcion: 'Limpieza y revisión de mufa troncal sector Zhordán', direccionTexto: 'Poste 44, vía a Zhordán', latitud: -2.93415, longitud: -78.78552, tecnicoId: 3, fechaCreacion: '2026-07-14T08:00:00-05:00', fechaProgramada: '2026-07-16T08:00:00-05:00', fechaCierre: '2026-07-16T12:40:00-05:00', observacionCierre: 'Se reemplazaron 2 conectores con pérdida alta. Potencia normalizada a -18 dBm.' },
  { id: 7, codigo: 'OT-2026-0136', tipo: 'SOPORTE', estado: 'COMPLETADA', prioridad: 'ALTA', contratoId: 2, clienteId: 2, descripcion: 'Sin servicio, ONT en rojo', direccionTexto: 'Calle Guayaquil s/n, sector Centro', tecnicoId: 1, fechaCreacion: '2026-07-13T09:30:00-05:00', fechaProgramada: '2026-07-13T14:00:00-05:00', fechaCierre: '2026-07-13T15:10:00-05:00', observacionCierre: 'Drop cortado por poda de árbol. Se tendió nuevo tramo de 45 m.' },
  { id: 8, codigo: 'OT-2026-0135', tipo: 'TRASLADO', estado: 'CANCELADA', prioridad: 'BAJA', contratoId: 10, clienteId: 10, descripcion: 'Traslado de domicilio dentro del mismo sector', direccionTexto: 'Sector La Playa', tecnicoId: 2, fechaCreacion: '2026-07-08T11:00:00-05:00', fechaCierre: '2026-07-10T09:00:00-05:00', observacionCierre: 'Cliente desistió del traslado.' },
  { id: 9, codigo: 'OT-2026-0143', tipo: 'SOPORTE', estado: 'PENDIENTE', prioridad: 'NORMAL', contratoId: 15, clienteId: 15, descripcion: 'Velocidad menor a la contratada en horario nocturno', direccionTexto: 'Calle Simón Bolívar 3-27', latitud: -2.92441, longitud: -78.78213, fechaCreacion: '2026-07-21T07:50:00-05:00' },
  { id: 10, codigo: 'OT-2026-0144', tipo: 'INSTALACION', estado: 'ASIGNADA', prioridad: 'NORMAL', contratoId: 5, clienteId: 5, descripcion: 'Cambio de plan a 100 Mbps, requiere reconfiguración de ONT', direccionTexto: 'Calle Luis Galarza Orellana 4-12', latitud: -2.92289, longitud: -78.78145, tecnicoId: 1, fechaCreacion: '2026-07-20T15:00:00-05:00', fechaProgramada: '2026-07-22T15:00:00-05:00' },
  { id: 11, codigo: 'OT-2026-0134', tipo: 'MANTENIMIENTO', estado: 'COMPLETADA', prioridad: 'URGENTE', descripcion: 'Corte de fibra troncal por accidente vehicular km 2 vía Sígsig', direccionTexto: 'Vía a Sígsig km 2', tecnicoId: 2, fechaCreacion: '2026-07-05T06:20:00-05:00', fechaProgramada: '2026-07-05T07:00:00-05:00', fechaCierre: '2026-07-05T13:45:00-05:00', observacionCierre: 'Empalme de 24 hilos reconstruido. 38 clientes afectados, servicio restablecido.' },
  { id: 12, codigo: 'OT-2026-0145', tipo: 'RETIRO', estado: 'PENDIENTE', prioridad: 'BAJA', contratoId: 14, clienteId: 14, descripcion: 'Retiro de equipos, contrato cortado por mora sin acuerdo de pago', direccionTexto: 'Comunidad El Tablón, sector alto', latitud: -2.94587, longitud: -78.76512, fechaCreacion: '2026-07-21T08:00:00-05:00' },
];
