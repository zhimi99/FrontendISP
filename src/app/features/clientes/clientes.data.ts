/**
 * Datos de prueba de clientes (Chordeleg, Azuay) — en memoria.
 *
 * Fuente única compartida por la lista y el detalle. Cuando exista el backend,
 * este archivo se reemplaza por llamadas al MS-CONTRATOS-CLIENTES.
 */

export type EstadoCliente = 'ACTIVO' | 'SUSPENDIDO' | 'CORTADO' | 'PENDIENTE' | 'RETIRADO';

export interface ClienteFila {
  codigo: string;
  nombre: string;
  esEmpresa: boolean;
  tipoId: 'CÉDULA' | 'RUC';
  identificacion: string;
  telefono: string;
  whatsapp: boolean;
  direccion: string;
  zona: string;
  plan: string;
  velocidad: string;
  estado: EstadoCliente;
  fechaRegistro: string; // dd/mm/aaaa
  vendedor: string;
}

export const ESTADOS: Record<EstadoCliente, { texto: string; tono: string }> = {
  ACTIVO: { texto: 'Activo', tono: 'ok' },
  SUSPENDIDO: { texto: 'Suspendido', tono: 'warn' },
  CORTADO: { texto: 'Cortado', tono: 'danger' },
  PENDIENTE: { texto: 'Pendiente', tono: 'info' },
  RETIRADO: { texto: 'Retirado', tono: 'neutral' },
};

/** Precio mensual base por plan (USD, sin IVA). */
export const PLAN_PRECIO: Record<string, number> = {
  'Plan 30 Megas': 22,
  'Plan 50 Megas': 28,
  'Plan 100 Megas': 35,
  'Plan 200 Megas': 55,
  'Corporativo 300': 120,
};

export interface PlanMeta {
  nombre: string;
  velocidad: string;
  precio: number;
}

/** Catálogo de planes para el formulario (velocidad y precio ya resueltos). */
export const PLANES: PlanMeta[] = [
  { nombre: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', precio: 22 },
  { nombre: 'Plan 50 Megas', velocidad: '50 / 25 Mbps', precio: 28 },
  { nombre: 'Plan 100 Megas', velocidad: '100 / 50 Mbps', precio: 35 },
  { nombre: 'Plan 200 Megas', velocidad: '200 / 100 Mbps', precio: 55 },
  { nombre: 'Corporativo 300', velocidad: '300 / 300 Mbps', precio: 120 },
];

/** Parroquias / sectores de cobertura (cantón Chordeleg y aledaños, Azuay). */
export const ZONAS: string[] = [
  'Chordeleg, Azuay',
  'San Martín, Azuay',
  'Delegsol, Azuay',
  'Zhordán, Azuay',
  'Puzhio, Azuay',
  'La Playa, Azuay',
  'Llavizhuñay, Azuay',
  'Cerro de Oro, Azuay',
  'El Tablón, Azuay',
  'Gualaceo, Azuay',
  'Sígsig, Azuay',
];

export const VENDEDORES: string[] = ['María González', 'Carlos Vélez', 'Sofía Peralta'];

export const CLIENTES_LISTA: ClienteFila[] = [
  { codigo: 'CLI-0001258', nombre: 'Juan Carlos Peralta Zhingre', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0104829371', telefono: '099 745 1236', whatsapp: true, direccion: 'Av. 24 de Mayo y Juan B. Cobos', zona: 'Chordeleg, Azuay', plan: 'Plan 50 Megas', velocidad: '50 / 25 Mbps', estado: 'ACTIVO', fechaRegistro: '15/03/2024', vendedor: 'María González' },
  { codigo: 'CLI-0001257', nombre: 'María Fernanda Ordóñez Cabrera', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0103558214', telefono: '099 632 1478', whatsapp: true, direccion: 'Calle Guayaquil s/n, Centro', zona: 'Chordeleg, Azuay', plan: 'Plan 100 Megas', velocidad: '100 / 50 Mbps', estado: 'ACTIVO', fechaRegistro: '02/05/2024', vendedor: 'Carlos Vélez' },
  { codigo: 'CLI-0001256', nombre: 'Joyería Filigrana de Chordeleg Cía. Ltda.', esEmpresa: true, tipoId: 'RUC', identificacion: '0190358741001', telefono: '072 223 500', whatsapp: false, direccion: 'Plaza Central de Chordeleg, local 8', zona: 'Chordeleg, Azuay', plan: 'Corporativo 300', velocidad: '300 / 300 Mbps', estado: 'ACTIVO', fechaRegistro: '15/10/2024', vendedor: 'María González' },
  { codigo: 'CLI-0001255', nombre: 'Segundo Manuel Guamán Tenesaca', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0102947815', telefono: '098 412 5478', whatsapp: true, direccion: 'Sector San Martín, vía a Sígsig km 2', zona: 'San Martín, Azuay', plan: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', estado: 'SUSPENDIDO', fechaRegistro: '18/06/2024', vendedor: 'Carlos Vélez' },
  { codigo: 'CLI-0001254', nombre: 'Rosa Elvira Chuchuca Morocho', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0105112478', telefono: '099 147 8523', whatsapp: true, direccion: 'Comunidad Delegsol, calle principal', zona: 'Delegsol, Azuay', plan: 'Plan 50 Megas', velocidad: '50 / 25 Mbps', estado: 'CORTADO', fechaRegistro: '07/08/2024', vendedor: 'Sofía Peralta' },
  { codigo: 'CLI-0001253', nombre: 'Luis Alberto Sarmiento Loja', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0103871259', telefono: '098 541 2369', whatsapp: true, direccion: 'Calle Luis Galarza Orellana 4-12', zona: 'Chordeleg, Azuay', plan: 'Plan 100 Megas', velocidad: '100 / 50 Mbps', estado: 'ACTIVO', fechaRegistro: '21/09/2024', vendedor: 'María González' },
  { codigo: 'CLI-0001252', nombre: 'Ana Lucía Bermeo Padilla', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0104471125', telefono: '099 321 4785', whatsapp: true, direccion: 'Sector Zhordán, calle s/n', zona: 'Zhordán, Azuay', plan: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', estado: 'ACTIVO', fechaRegistro: '09/01/2025', vendedor: 'Carlos Vélez' },
  { codigo: 'CLI-0001251', nombre: 'Carlos Vinicio Zhingre Uyaguari', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0106214785', telefono: '098 254 7896', whatsapp: true, direccion: 'Sector Puzhio, junto a la escuela', zona: 'Puzhio, Azuay', plan: 'Plan 50 Megas', velocidad: '50 / 25 Mbps', estado: 'PENDIENTE', fechaRegistro: '15/07/2026', vendedor: 'Sofía Peralta' },
  { codigo: 'CLI-0001250', nombre: 'Hostal Turístico El Dorado S.A.', esEmpresa: true, tipoId: 'RUC', identificacion: '0191247856001', telefono: '072 223 777', whatsapp: false, direccion: 'Av. 24 de Mayo 12-45 y Guayaquil', zona: 'Chordeleg, Azuay', plan: 'Plan 200 Megas', velocidad: '200 / 100 Mbps', estado: 'ACTIVO', fechaRegistro: '22/04/2025', vendedor: 'María González' },
  { codigo: 'CLI-0001249', nombre: 'Blanca Esperanza Pauta Quizhpi', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0102874136', telefono: '099 478 5213', whatsapp: true, direccion: 'Barrio Cristo Rey, calle Sucre', zona: 'Chordeleg, Azuay', plan: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', estado: 'SUSPENDIDO', fechaRegistro: '14/02/2025', vendedor: 'Carlos Vélez' },
  { codigo: 'CLI-0001248', nombre: 'Jorge Patricio Cabrera Vintimilla', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0104963258', telefono: '098 741 2563', whatsapp: true, direccion: 'Sector La Playa, ribera del río', zona: 'La Playa, Azuay', plan: 'Plan 100 Megas', velocidad: '100 / 50 Mbps', estado: 'ACTIVO', fechaRegistro: '30/03/2025', vendedor: 'Sofía Peralta' },
  { codigo: 'CLI-0001247', nombre: 'Mercedes Olimpia Quizhpi Guacho', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0103214569', telefono: '098 654 1237', whatsapp: true, direccion: 'Comunidad Llavizhuñay, vía principal', zona: 'Llavizhuñay, Azuay', plan: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', estado: 'CORTADO', fechaRegistro: '11/11/2024', vendedor: 'Carlos Vélez' },
  { codigo: 'CLI-0001246', nombre: 'Miguel Ángel Morocho Sarmiento', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0105874123', telefono: '098 321 4569', whatsapp: true, direccion: 'Sector Cerro de Oro, calle s/n', zona: 'Cerro de Oro, Azuay', plan: 'Plan 50 Megas', velocidad: '50 / 25 Mbps', estado: 'ACTIVO', fechaRegistro: '05/06/2025', vendedor: 'María González' },
  { codigo: 'CLI-0001245', nombre: 'Narcisa de Jesús Uyaguari Chuchuca', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0102369854', telefono: '099 214 5873', whatsapp: true, direccion: 'Comunidad El Tablón, sector alto', zona: 'El Tablón, Azuay', plan: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', estado: 'CORTADO', fechaRegistro: '19/07/2025', vendedor: 'Sofía Peralta' },
  { codigo: 'CLI-0001244', nombre: 'Fernando David Vintimilla Peralta', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0104125879', telefono: '098 963 2147', whatsapp: true, direccion: 'Calle Simón Bolívar 3-27', zona: 'Chordeleg, Azuay', plan: 'Plan 100 Megas', velocidad: '100 / 50 Mbps', estado: 'ACTIVO', fechaRegistro: '01/09/2025', vendedor: 'Carlos Vélez' },
  { codigo: 'CLI-0001243', nombre: 'Gladys Marlene Tenesaca Bermeo', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0106523147', telefono: '099 587 4123', whatsapp: true, direccion: 'Sector Principal, junto al coliseo', zona: 'Chordeleg, Azuay', plan: 'Plan 50 Megas', velocidad: '50 / 25 Mbps', estado: 'PENDIENTE', fechaRegistro: '14/07/2026', vendedor: 'María González' },
  { codigo: 'CLI-0001242', nombre: 'Comercial Andes Net Cía. Ltda.', esEmpresa: true, tipoId: 'RUC', identificacion: '0190847123001', telefono: '072 224 900', whatsapp: false, direccion: 'Calle Sucre y 24 de Mayo, Gualaceo', zona: 'Gualaceo, Azuay', plan: 'Plan 200 Megas', velocidad: '200 / 100 Mbps', estado: 'ACTIVO', fechaRegistro: '18/12/2024', vendedor: 'Sofía Peralta' },
  { codigo: 'CLI-0001241', nombre: 'Diego Fernando Vélez Pesántez', esEmpresa: false, tipoId: 'CÉDULA', identificacion: '0105566778', telefono: '098 887 7665', whatsapp: true, direccion: 'Barrio La Merced, Chordeleg', zona: 'Chordeleg, Azuay', plan: 'Plan 30 Megas', velocidad: '30 / 15 Mbps', estado: 'SUSPENDIDO', fechaRegistro: '05/05/2024', vendedor: 'Carlos Vélez' },
];

export function buscarCliente(codigo: string): ClienteFila | undefined {
  return CLIENTES_LISTA.find((c) => c.codigo === codigo);
}
