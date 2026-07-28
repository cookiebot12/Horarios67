import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Palette } from 'lucide-react'
import SubjectBlock from './SubjectBlock'
import ColorPicker from './ColorPicker'
import { generateSlots, minutesToLabel, snapToGrid } from '../utils/timeUtils'
import { ASPECT_OPTIONS } from './AspectRatioControl'

const HEADER_HEIGHT = 52
const DEFAULT_BORDER = '#E5E5EA'
const TEXT_LINE_HEIGHT = 1.3

const ScheduleGrid = forwardRef(function ScheduleGrid({ schedule }, exportRef) {
  const {
    days,
    addDay,
    removeDay,
    renameDay,
    updateDayColor,
    startMin,
    endMin,
    intervalMin,
    subjects,
    blocks,
    placeBlock,
    moveBlock,
    removeBlock,
    resizeBlock,
    aspectRatio,
    roundedBlocks,
    textAlign,
    fontWeight,
    use24hFormat,
    showTimeInBlock,
  } = schedule

  const slots = useMemo(() => generateSlots(startMin, endMin, intervalMin), [
    startMin,
    endMin,
    intervalMin,
  ])

  const bodyRef = useRef(null)
  const [rowHeight, setRowHeight] = useState(48)
  const [dragOverKey, setDragOverKey] = useState(null)
  const [editingDayId, setEditingDayId] = useState(null)
  const [colorPopover, setColorPopover] = useState(null) // {dayId, top, left}
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!colorPopover) return
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setColorPopover(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [colorPopover])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => {
      const h = el.getBoundingClientRect().height
      if (slots.length > 0) setRowHeight(h / slots.length)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [slots.length])

  const pxPerMinute = rowHeight / intervalMin

  const subjectById = useMemo(() => {
    const map = {}
    subjects.forEach((s) => (map[s.id] = s))
    return map
  }, [subjects])

  const activeAspect = ASPECT_OPTIONS.find((o) => o.value === aspectRatio) || ASPECT_OPTIONS[0]

  const handleDrop = (e, dayId, slotStart) => {
    e.preventDefault()
    setDragOverKey(null)
    const subjectId = e.dataTransfer.getData('application/subject-id')
    const blockId = e.dataTransfer.getData('application/block-id')
    const snapped = snapToGrid(slotStart, startMin, endMin, intervalMin)

    if (blockId) {
      moveBlock(blockId, dayId, snapped)
    } else if (subjectId) {
      placeBlock(subjectId, dayId, snapped, intervalMin)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
      <div
        ref={exportRef}
        className="flex w-full overflow-hidden rounded-3xl border border-hairline bg-white shadow-panel"
        style={{
          aspectRatio: activeAspect.ratio,
          maxHeight: '100%',
          maxWidth: activeAspect.maxWidth,
        }}
      >
        {/* Columna de horas */}
        <div className="flex w-[64px] shrink-0 flex-col border-r border-hairline">
          <div
            className="flex shrink-0 items-center justify-center border-b border-hairline bg-surfaceMuted/60"
            style={{ height: HEADER_HEIGHT }}
          >
            <span
              className="text-[10px] font-medium uppercase tracking-wide text-inkSoft"
              style={{ lineHeight: TEXT_LINE_HEIGHT }}
            >
              Hora
            </span>
          </div>
          <div
            ref={bodyRef}
            className="grid flex-1"
            style={{ gridTemplateRows: `repeat(${slots.length}, 1fr)` }}
          >
            {slots.map((slotStart) => (
              <div
                key={slotStart}
                className="flex items-start justify-center border-b border-hairline/70 pt-1"
              >
                <span
                  className="text-[10px] font-medium text-inkSoft"
                  style={{ lineHeight: TEXT_LINE_HEIGHT }}
                >
                  {minutesToLabel(slotStart, use24hFormat)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Columnas de días */}
        {days.map((day) => {
          const frameColor = day.color || DEFAULT_BORDER
          const frameWidth = day.color ? 2 : 1

          return (
            <div
              key={day.id}
              className="relative flex min-w-0 flex-1 flex-col"
              style={{
                borderTop: `${frameWidth}px solid ${frameColor}`,
                borderBottom: `${frameWidth}px solid ${frameColor}`,
                borderRight: `${frameWidth}px solid ${frameColor}`,
                borderLeft: day.color ? `${frameWidth}px solid ${frameColor}` : 'none',
                borderRadius: day.color ? 10 : 0,
                marginLeft: day.color ? -1 : 0,
              }}
            >
              {/* Encabezado del día */}
              <div
                className="group relative flex shrink-0 items-center justify-center border-b border-hairline px-5"
                style={{ height: HEADER_HEIGHT }}
              >
                {editingDayId === day.id ? (
                  <input
                    autoFocus
                    defaultValue={day.name}
                    onBlur={(e) => {
                      renameDay(day.id, e.target.value || day.name)
                      setEditingDayId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur()
                      if (e.key === 'Escape') setEditingDayId(null)
                    }}
                    className="w-full rounded-md border border-accent bg-white px-1 py-0.5 text-center text-[12.5px] font-semibold text-ink outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingDayId(day.id)}
                    className="max-w-full truncate text-[12.5px] font-semibold text-ink hover:text-accent"
                    style={{ lineHeight: TEXT_LINE_HEIGHT }}
                    title="Clic para editar"
                  >
                    {day.name}
                  </button>
                )}

                {/* Botón de color del día: posición absoluta para que el
                    nombre del día quede siempre perfectamente centrado,
                    sin importar si este botón está visible o no. */}
                <button
                  type="button"
                  onClick={(e) => {
                    if (colorPopover?.dayId === day.id) {
                      setColorPopover(null)
                      return
                    }
                    const rect = e.currentTarget.getBoundingClientRect()
                    setColorPopover({
                      dayId: day.id,
                      top: rect.bottom + 8,
                      left: rect.left + rect.width / 2,
                    })
                  }}
                  className="export-hide absolute left-0.5 top-0.5 shrink-0 rounded-full p-0.5 text-inkSoft opacity-0 transition-opacity hover:bg-black/5 hover:text-accent group-hover:opacity-100"
                  aria-label={`Color de ${day.name}`}
                  title="Color del recuadro"
                >
                  <Palette size={12} />
                </button>

                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(day.id)}
                    className="export-hide absolute right-0.5 top-0.5 rounded-full p-0.5 text-inkSoft opacity-0 transition-opacity hover:bg-black/5 hover:text-red-500 group-hover:opacity-100"
                    aria-label={`Eliminar ${day.name}`}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Cuerpo del día: celdas + bloques */}
              <div className="relative flex-1">
                <div
                  className="grid h-full"
                  style={{ gridTemplateRows: `repeat(${slots.length}, 1fr)` }}
                >
                  {slots.map((slotStart) => {
                    const key = `${day.id}-${slotStart}`
                    return (
                      <div
                        key={key}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOverKey(key)
                        }}
                        onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                        onDrop={(e) => handleDrop(e, day.id, slotStart)}
                        className={`border-b border-hairline/70 transition-colors ${
                          dragOverKey === key ? 'cell-drag-over' : ''
                        }`}
                      />
                    )
                  })}
                </div>

                {blocks
                  .filter((b) => b.dayId === day.id)
                  .map((block) => (
                    <SubjectBlock
                      key={block.id}
                      block={block}
                      subject={subjectById[block.subjectId]}
                      top={(block.startMin - startMin) * pxPerMinute}
                      height={block.durationMin * pxPerMinute}
                      rounded={roundedBlocks}
                      intervalMin={intervalMin}
                      pxPerMinute={pxPerMinute}
                      onRemove={removeBlock}
                      onResize={resizeBlock}
                      textAlign={textAlign}
                      fontWeight={fontWeight}
                      use24hFormat={use24hFormat}
                      showTimeInBlock={showTimeInBlock}
                    />
                  ))}
              </div>
            </div>
          )
        })}

        {/* Botón agregar día */}
        <div className="export-hide flex w-10 shrink-0 flex-col border-l border-hairline">
          <button
            type="button"
            onClick={() => addDay(`Día ${days.length + 1}`)}
            className="flex flex-1 items-center justify-center text-inkSoft transition-colors hover:bg-black/5 hover:text-accent"
            aria-label="Agregar día"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Popover de color de día, en un portal: así nunca queda recortado
          por el overflow-hidden de la tarjeta ni oculto detrás del grid. */}
      {colorPopover &&
        createPortal(
          (() => {
            const day = days.find((d) => d.id === colorPopover.dayId)
            if (!day) return null
            return (
              <div
                ref={popoverRef}
                className="fixed z-50 w-56 -translate-x-1/2 animate-popIn rounded-2xl border border-hairline bg-white/95 p-3 shadow-floating backdrop-blur-xl"
                style={{ top: colorPopover.top, left: colorPopover.left }}
              >
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-inkSoft">
                  Color del recuadro
                </p>
                <ColorPicker
                  value={day.color || '#FFFFFF'}
                  onChange={(hex) => {
                    updateDayColor(day.id, hex)
                    setColorPopover(null)
                  }}
                />
                {day.color && (
                  <button
                    type="button"
                    onClick={() => {
                      updateDayColor(day.id, null)
                      setColorPopover(null)
                    }}
                    className="mt-2 text-[11px] font-medium text-inkSoft hover:text-accent"
                  >
                    Restablecer color
                  </button>
                )}
              </div>
            )
          })(),
          document.body
        )}
    </div>
  )
})

export default ScheduleGrid
