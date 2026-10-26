// Datos SIMULADOS: no acreditan una generación real ni persistencia en Spring.
export const solicitudId = '00000000-0000-4000-8000-000000000001'
export const generacionId = '00000000-0000-4000-8000-000000000002'
export const otraGeneracionId = '00000000-0000-4000-8000-000000000003'
export const instante = '2026-10-26T12:00:00Z'
export const etapa = (nombre = 'solicitud', estado = 'completada', mensaje = 'Solicitud registrada', segundo = 0) => ({
  id: '00000000-0000-4000-8000-' + String(segundo + 10).padStart(12, '0'),
  etapa: nombre, estado, mensaje, creado_en: new Date(Date.parse(instante) + segundo * 1000).toISOString(),
})
export const generacion = (cambios = {}) => ({
  id: generacionId, solicitud_id: solicitudId, propuesta_id: '00000000-0000-4000-8000-000000000004', version_propuesta: 2,
  estado: 'pendiente', paquete: null, procedencia: null, ultimo_error: null, creado_en: instante, actualizado_en: instante,
  etapas: [etapa()], ...cambios,
})
export const procedencia = { proveedor: 'proveedor-simulado', modelo: 'modelo-de-prueba', intentos: 3, mapa_base: true }
export const paquete = JSON.stringify({ formato: 'kusi-paquete/0', familia: 'laberinto', retos: [{ id: 'nivel-simulado' }] })
export const juegoListo = (cambios = {}) => generacion({
  estado: 'lista', paquete, procedencia, actualizado_en: '2026-10-26T12:02:00Z',
  etapas: [etapa(), etapa('generacion', 'en_progreso', 'La IA está escribiendo.', 1),
    etapa('generacion', 'completada', 'La IA devolvió un guion.', 20),
    etapa('comprobacion', 'fallida', 'Intento 1: 2 problemas\nPUERTA: La puerta no es alcanzable.\nOBJETOS: Faltan frutas.', 21),
    etapa('correccion', 'en_progreso', 'Intento 2: corregir el guion.', 22),
    etapa('correccion', 'completada', 'Guion corregido.', 50),
    etapa('mapa_base', 'en_progreso', 'Se buscan caminos de respaldo.', 51),
    etapa('mapa_base', 'completada', 'Se usaron los mapas base.', 60),
    etapa('comprobacion', 'completada', 'Pasó todas las comprobaciones.', 61)], ...cambios,
})
export const json = (datos, estado = 200) => new Response(JSON.stringify(datos), { status: estado })
