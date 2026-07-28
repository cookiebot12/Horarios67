import { useCallback, useMemo, useState } from 'react'
import { generateId } from '../utils/id'
import { PRIMARY_COLORS } from '../utils/colorUtils'
import { timeStringToMinutes } from '../utils/timeUtils'
import { mergeContiguousBlocks } from '../utils/mergeUtils'

const DEFAULT_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((name) => ({
  id: generateId('day'),
  name,
  color: null, // null = usa el borde neutro por defecto
}))

const DEFAULT_START = timeStringToMinutes('06:00')
const DEFAULT_END = timeStringToMinutes('15:00')
const DEFAULT_INTERVAL = 60

// Granularidad mínima para estirar/contraer un bloque, independiente del
// intervalo del grid (el usuario pidió poder llegar hasta bloques de 30 min).
export const RESIZE_STEP_MIN = 30

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

export function useSchedule() {
  const [days, setDays] = useState(DEFAULT_DAYS)
  const [startMin, setStartMin] = useState(DEFAULT_START)
  const [endMin, setEndMin] = useState(DEFAULT_END)
  const [intervalMin, setIntervalMin] = useState(DEFAULT_INTERVAL)
  const [subjects, setSubjects] = useState([])
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
      setBlocks((prev) => {
        if (checkOverlap(prev, dayId, snappedStart, durationMin)) {
          result = { success: false, reason: 'overlap' }
          return prev
        }
        if (snappedStart < startMin || snappedStart + durationMin > endMin) {
          result = { success: false, reason: 'out-of-range' }
          return prev
        }
        const block = {
          id: generateId('block'),
          subjectId,
          dayId,
          startMin: snappedStart,
          durationMin,
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
        // Granularidad mínima de 30 min, sin importar el intervalo del grid.
        const clampedDuration = Math.max(RESIZE_STEP_MIN, newDurationMin)
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
    [endMin]
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
