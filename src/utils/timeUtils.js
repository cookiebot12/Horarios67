// Todas las horas internamente se manejan en minutos desde medianoche (0–1440)

export function minutesToLabel(totalMinutes, use24h = false) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const mm = String(m).padStart(2, '0')
  if (use24h) {
    return `${String(h).padStart(2, '0')}:${mm}`
  }
  const period = h >= 12 ? 'PM' : 'AM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${mm} ${period}`
}

// Etiqueta de rango que se pinta dentro del bloque. Vive aquí porque el cálculo
// del tamaño de fuente global necesita medir exactamente la misma cadena que
// luego se renderiza.
export function formatTimeRange(startMin, durationMin, use24h = false) {
  return `${minutesToLabel(startMin, use24h)} – ${minutesToLabel(startMin + durationMin, use24h)}`
}

export function timeStringToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTimeInputValue(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Genera los límites de cada franja (slots) entre startMin y endMin según el intervalo
export function generateSlots(startMin, endMin, intervalMin) {
  const slots = []
  for (let t = startMin; t < endMin; t += intervalMin) {
    slots.push(t)
  }
  return slots
}

// Subdivisión de la celda: siempre la mitad del intervalo configurado, para
// permitir que un bloque arranque a mitad de la franja (60 → marca de 30 min,
// 30 → marca de 15 min). Se calcula dinámicamente, nunca con un valor fijo.
export function getSubdivisionMin(intervalMin) {
  return intervalMin / 2
}

// Escalera de duraciones válidas para un bloque: el mínimo de la rejilla y, por
// encima, solo múltiplos de media hora → 15, 30, 60, 90, 120…
// El 45 y el 75 quedan fuera a propósito: no son duraciones de clase reales.
export const DURATION_STEP_MIN = 30

/**
 * Duración válida más cercana a `minutes`. `minDurationMin` es la subdivisión de
 * la rejilla (15 con celdas de 30, 30 con celdas de 60), de modo que el resize
 * nunca crea duraciones más finas de las que se pueden colocar.
 */
export function snapDuration(minutes, minDurationMin) {
  // Punto medio entre el mínimo y el primer escalón de media hora.
  if (minutes < (minDurationMin + DURATION_STEP_MIN) / 2) return minDurationMin
  return Math.max(
    DURATION_STEP_MIN,
    Math.round(minutes / DURATION_STEP_MIN) * DURATION_STEP_MIN
  )
}

/** Mayor duración válida que NO supera `minutes`. Para el auto-ajuste al hueco. */
export function snapDurationDown(minutes, minDurationMin) {
  if (minutes < minDurationMin) return 0
  if (minutes < DURATION_STEP_MIN) return minDurationMin
  return Math.floor(minutes / DURATION_STEP_MIN) * DURATION_STEP_MIN
}

// Ajusta (snap) un valor de minutos al múltiplo de `stepMin` más cercano dentro
// del rango. `stepMin` es la subdivisión (media celda), no el intervalo.
export function snapToGrid(minutes, startMin, endMin, stepMin) {
  const clamped = Math.max(startMin, Math.min(minutes, endMin - stepMin))
  const stepsFromStart = Math.round((clamped - startMin) / stepMin)
  return startMin + stepsFromStart * stepMin
}
