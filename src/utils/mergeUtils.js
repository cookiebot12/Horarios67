// Fusiona bloques contiguos (o superpuestos) de la misma materia en el mismo día,
// para que se vean como un único bloque continuo en el grid.
export function mergeContiguousBlocks(blocks) {
  const groups = new Map()

  blocks.forEach((b) => {
    const key = `${b.dayId}__${b.subjectId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(b)
  })

  const merged = []

  groups.forEach((group) => {
    const sorted = [...group].sort((a, b) => a.startMin - b.startMin)
    let current = null

    sorted.forEach((b) => {
      if (!current) {
        current = { ...b }
        return
      }
      const currentEnd = current.startMin + current.durationMin
      if (b.startMin <= currentEnd) {
        // Se tocan o se superponen: se fusionan en un solo bloque
        const newEnd = Math.max(currentEnd, b.startMin + b.durationMin)
        current.durationMin = newEnd - current.startMin
      } else {
        merged.push(current)
        current = { ...b }
      }
    })

    if (current) merged.push(current)
  })

  return merged
}
