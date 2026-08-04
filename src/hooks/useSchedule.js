import { useCallback, useMemo, useState } from 'react'
import { generateId } from '../utils/id'
import { PRIMARY_COLORS } from '../utils/colorUtils'
import { getSubdivisionMin, timeStringToMinutes } from '../utils/timeUtils'
import { mergeContiguousBlocks } from '../utils/mergeUtils'

const DEFAULT_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((name) => ({
  id: generateId('day'),
  name,
  color: null, // null = usa el borde neutro por defecto
}))

const DEFAULT_START = timeStringToMinutes('06:00')
const DEFAULT_END = timeStringToMinutes('15:00')
const DEFAULT_INTERVAL = 60

// Función pura: calcula si un rango candidato se superpone con algún bloque
// existente en la lista dada. Se usa SIEMPRE contra el estado más reciente
// (el `prev` dentro de cada actualización), nunca contra un closure viejo,
// para evitar condiciones de carrera que permitían bloques encimados.
function checkOverlap(blocksList, dayId, candidateStart, durationMin, ignoreBlockId = null) {
  const candidateEnd = candidateStart + durationMin
  return blocksList.some((b) => {
    if (b.dayId !== dayId) return false
    if (ignoreBlockId && b.id === ignoreBlockId) return false
    const bEnd = b.startMin + b.durationMin
    return candidateStart < bEnd && b.startMin < candidateEnd
  })
}

// Minutos libres desde `from` hasta el siguiente bloque del día o el fin del
// rango visible. Solo mira bloques que empiezan en `from` o después: los que
// ya cubren `from` se descartan antes con checkOverlap.
function freeSpaceFrom(blocksList, dayId, from, rangeEnd) {
  let limit = rangeEnd
  blocksList.forEach((b) => {
    if (b.dayId !== dayId) return
    if (b.startMin >= from && b.startMin < limit) limit = b.startMin
  })
  return limit - from
}

export function useSchedule() {
  const [days, setDays] = useState(DEFAULT_DAYS)
  const [startMin, setStartMin] = useState(DEFAULT_START)
  const [endMin, setEndMin] = useState(DEFAULT_END)
  const [intervalMin, setIntervalMin] = useState(DEFAULT_INTERVAL)
  const [subjects, setSubjects] = useState([])
  // Subdivisión de celda: media celda. Es a la vez el paso de arrastre, la
  // duración mínima de un bloque y el paso de redimensionado.
  const resizeStepMin = getSubdivisionMin(intervalMin)
  const [blocks, setBlocks] = useState([]) // {id, subjectId, dayId, startMin, durationMin}

  // ---------- Ajustes generales (menú de settings) ----------
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [roundedBlocks, setRoundedBlocks] = useState(false)
  const [textAlign, setTextAlign] = useState('center') // left | center | right
  const [fontFamily, setFontFamily] = useState('montserrat')
  const [fontWeight, setFontWeight] = useState('400') // 400 (regular) | 700 (negrita)
  const [sidebarPosition, setSidebarPosition] = useState('left') // left | right
  const [use24hFormat, setUse24hFormat] = useState(false)
  const [showTimeInBlock, setShowTimeInBlock] = useState(true)

  // ---------- Días ----------
  const addDay = useCallback((name = 'Nuevo día') => {
    setDays((prev) => [...prev, { id: generateId('day'), name, color: null }])
  }, [])

  const removeDay = useCallback((dayId) => {
    setDays((prev) => prev.filter((d) => d.id !== dayId))
    setBlocks((prev) => prev.filter((b) => b.dayId !== dayId))
  }, [])

  const renameDay = useCallback((dayId, newName) => {
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, name: newName } : d)))
  }, [])

  const updateDayColor = useCallback((dayId, color) => {
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, color } : d)))
  }, [])

  // ---------- Franja horaria e intervalos ----------
  const updateTimeRange = useCallback((newStart, newEnd) => {
    if (newEnd - newStart < 30) return // rango mínimo de 30 min
    setStartMin(newStart)
    setEndMin(newEnd)
  }, [])

  const updateInterval = useCallback((newInterval) => {
    setIntervalMin(newInterval)
  }, [])

  // ---------- Materias ----------
  const addSubject = useCallback((data) => {
    const subject = {
      id: generateId('subj'),
      name: data.name?.trim() || 'Materia',
      color: data.color || PRIMARY_COLORS[0].hex,
      description: data.description?.trim() || '',
      professorRoom: data.professorRoom?.trim() || '',
    }
    setSubjects((prev) => [...prev, subject])
    return subject
  }, [])

  const removeSubject = useCallback((subjectId) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
    setBlocks((prev) => prev.filter((b) => b.subjectId !== subjectId))
  }, [])

  // Utilidad de solo lectura para consumidores externos (no se usa para
  // validar escrituras; cada escritura valida contra `prev` internamente).
  const isOverlapping = useCallback(
    (dayId, candidateStart, durationMin, ignoreBlockId = null) =>
      checkOverlap(blocks, dayId, candidateStart, durationMin, ignoreBlockId),
    [blocks]
  )

  // ---------- Bloques colocados en el grid ----------
  const placeBlock = useCallback(
    (subjectId, dayId, snappedStart, durationMin = intervalMin) => {
      let result = { success: false }
      const step = getSubdivisionMin(intervalMin)
      setBlocks((prev) => {
        if (snappedStart < startMin || snappedStart >= endMin) {
          result = { success: false, reason: 'out-of-range' }
          return prev
        }
        // Si el punto de inicio ya está ocupado no hay nada que ajustar.
        if (checkOverlap(prev, dayId, snappedStart, step)) {
          result = { success: false, reason: 'overlap' }
          return prev
        }
        // El bloque se recorta a lo que realmente quepa: si solo queda media
        // celda libre, se coloca con media celda de duración en vez de
        // rechazarse por no caber entero.
        const free = freeSpaceFrom(prev, dayId, snappedStart, endMin)
        const fitted = Math.floor(Math.min(durationMin, free) / step) * step
        if (fitted < step) {
          result = { success: false, reason: 'no-space' }
          return prev
        }
        const block = {
          id: generateId('block'),
          subjectId,
          dayId,
          startMin: snappedStart,
          durationMin: fitted,
        }
        result = { success: true, block }
        return mergeContiguousBlocks([...prev, block])
      })
      return result
    },
    [intervalMin, startMin, endMin]
  )

  const moveBlock = useCallback(
    (blockId, newDayId, newStart) => {
      setBlocks((prev) => {
        const target = prev.find((b) => b.id === blockId)
        if (!target) return prev
        if (checkOverlap(prev, newDayId, newStart, target.durationMin, blockId)) return prev
        if (newStart < startMin || newStart + target.durationMin > endMin) return prev
        const updated = prev.map((b) =>
          b.id === blockId ? { ...b, dayId: newDayId, startMin: newStart } : b
        )
        return mergeContiguousBlocks(updated)
      })
    },
    [startMin, endMin]
  )

  const removeBlock = useCallback((blockId) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }, [])

  const resizeBlock = useCallback(
    (blockId, newDurationMin) => {
      setBlocks((prev) => {
        const target = prev.find((b) => b.id === blockId)
        if (!target) return prev
        // La granularidad de resize es la misma subdivisión que la del grid, para
        // que se pueda encoger un bloque hasta el tamaño mínimo que `placeBlock`
        // es capaz de crear (media celda).
        const clampedDuration = Math.max(resizeStepMin, newDurationMin)
        if (checkOverlap(prev, target.dayId, target.startMin, clampedDuration, blockId)) {
          return prev
        }
        if (target.startMin + clampedDuration > endMin) return prev
        const updated = prev.map((b) =>
          b.id === blockId ? { ...b, durationMin: clampedDuration } : b
        )
        return mergeContiguousBlocks(updated)
      })
    },
    [endMin, resizeStepMin]
  )

  const value = useMemo(
    () => ({
      days,
      addDay,
      removeDay,
      renameDay,
      updateDayColor,
      startMin,
      endMin,
      intervalMin,
      resizeStepMin,
      updateTimeRange,
      updateInterval,
      subjects,
      addSubject,
      removeSubject,
      blocks,
      placeBlock,
      moveBlock,
      removeBlock,
      resizeBlock,
      isOverlapping,
      aspectRatio,
      setAspectRatio,
      roundedBlocks,
      setRoundedBlocks,
      textAlign,
      setTextAlign,
      fontFamily,
      setFontFamily,
      fontWeight,
      setFontWeight,
      sidebarPosition,
      setSidebarPosition,
      use24hFormat,
      setUse24hFormat,
      showTimeInBlock,
      setShowTimeInBlock,
    }),
    [
      days,
      addDay,
      removeDay,
      renameDay,
      updateDayColor,
      startMin,
      endMin,
      intervalMin,
      resizeStepMin,
      updateTimeRange,
      updateInterval,
      subjects,
      addSubject,
      removeSubject,
      blocks,
      placeBlock,
      moveBlock,
      removeBlock,
      resizeBlock,
      isOverlapping,
      aspectRatio,
      roundedBlocks,
      textAlign,
      fontFamily,
      fontWeight,
      sidebarPosition,
      use24hFormat,
      showTimeInBlock,
    ]
  )

  return value
}
