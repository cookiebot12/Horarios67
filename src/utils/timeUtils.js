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

// Ajusta (snap) un valor de minutos al múltiplo de intervalo más cercano dentro del rango
export function snapToGrid(minutes, startMin, endMin, intervalMin) {
  const clamped = Math.max(startMin, Math.min(minutes, endMin - intervalMin))
  const stepsFromStart = Math.round((clamped - startMin) / intervalMin)
  return startMin + stepsFromStart * intervalMin
}

export function durationToSlotCount(durationMin, intervalMin) {
  return Math.max(1, Math.round(durationMin / intervalMin))
}
