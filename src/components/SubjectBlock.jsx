import { useRef } from 'react'
import { X } from 'lucide-react'
import { getContrastTextColor, getBorderShade } from '../utils/colorUtils'
import { minutesToLabel } from '../utils/timeUtils'
import { RESIZE_STEP_MIN } from '../hooks/useSchedule'
import FitText from './FitText'

const ALIGN_TO_ITEMS = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

// Alto aproximado (en px) que ocupa cada línea de texto, incluyendo su
// margen superior. Se usa para decidir cuántas líneas opcionales caben
// realmente dentro del bloque, en vez de mostrarlas todas y dejar que
// el overflow-hidden recorte lo que no entra.
const NAME_LINE_HEIGHT = 20
const DETAIL_LINE_HEIGHT = 15
const VERTICAL_PADDING = 14 // py-1.5 (arriba + abajo), con margen de seguridad

export default function SubjectBlock({
  block,
  subject,
  top,
  height,
  rounded,
  intervalMin,
  onRemove,
  onResize,
  pxPerMinute,
  textAlign = 'center',
  fontWeight = '400',
  use24hFormat = false,
  showTimeInBlock = true,
}) {
  const resizing = useRef(false)
  const startY = useRef(0)
  const startDuration = useRef(block.durationMin)

  if (!subject) return null

  const textColor = getContrastTextColor(subject.color)
  const borderColor = getBorderShade(subject.color)
  const blockHeight = Math.max(height, 26)

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/block-id', block.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleResizeStart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = true
    startY.current = e.clientY
    startDuration.current = block.durationMin

    const handleMove = (moveEvent) => {
      if (!resizing.current) return
      const deltaY = moveEvent.clientY - startY.current
      const deltaMinutes = Math.round(deltaY / pxPerMinute / RESIZE_STEP_MIN) * RESIZE_STEP_MIN
      const newDuration = Math.max(RESIZE_STEP_MIN, startDuration.current + deltaMinutes)
      onResize(block.id, newDuration)
    }
    const handleUp = () => {
      resizing.current = false
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const timeLabel = `${minutesToLabel(block.startMin, use24hFormat)} – ${minutesToLabel(
    block.startMin + block.durationMin,
    use24hFormat
  )}`

  // Líneas opcionales candidatas, en orden de prioridad.
  const candidateLines = [
    subject.description ? { key: 'description', text: subject.description, opacity: 0.85 } : null,
    subject.professorRoom
      ? { key: 'professorRoom', text: subject.professorRoom, opacity: 0.85 }
      : null,
    showTimeInBlock ? { key: 'time', text: timeLabel, opacity: 0.7 } : null,
  ].filter(Boolean)

  // El nombre puede ocupar 2 líneas si el bloque tiene alto suficiente,
  // para evitar cortar el texto en vez de mostrarlo completo. Si no hay
  // espacio para una segunda línea, se queda en 1 (FitText igual reduce
  // el tamaño de fuente para que quepa entero antes de recurrir al
  // recorte con "…").
  const nameMaxLines =
    blockHeight >= NAME_LINE_HEIGHT * 2 + VERTICAL_PADDING ? 2 : 1
  const nameBudget = NAME_LINE_HEIGHT * nameMaxLines

  // Solo se muestran tantas líneas opcionales como quepan realmente en el
  // alto disponible del bloque, para no desbordar el contenido.
  const availableForDetails = blockHeight - nameBudget - VERTICAL_PADDING
  const maxDetailLines = Math.max(0, Math.floor(availableForDetails / DETAIL_LINE_HEIGHT))
  const visibleLines = candidateLines.slice(0, maxDetailLines)

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group absolute inset-x-0 z-10 flex cursor-grab select-none flex-col justify-center overflow-hidden px-2.5 py-1.5 shadow-block transition-shadow active:cursor-grabbing hover:shadow-floating ${
        rounded ? 'rounded-xl' : 'rounded-none'
      }`}
      style={{
        top,
        boxSizing: 'border-box',
        height: blockHeight,
        backgroundColor: subject.color,
        border: `1px solid ${borderColor}`,
        color: textColor,
        alignItems: ALIGN_TO_ITEMS[textAlign] || 'center',
        textAlign,
      }}
      title={`${subject.name} · ${timeLabel}`}
    >
      <button
        type="button"
        onClick={() => onRemove(block.id)}
        className="export-hide absolute right-1 top-1 shrink-0 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100"
        style={{ color: textColor }}
        aria-label="Quitar bloque"
      >
        <X size={12} />
      </button>

      <div
        className="flex w-full min-w-0 flex-col justify-center"
        style={{ alignItems: ALIGN_TO_ITEMS[textAlign] || 'center' }}
      >
        <div className="w-full" style={{ maxHeight: nameBudget }}>
          <FitText
            text={subject.name}
            maxFontSize={12.5}
            minFontSize={7.5}
            maxLines={nameMaxLines}
            weight={Number(fontWeight) >= 700 ? 700 : 500}
            align={textAlign}
            lineHeight={1.3}
          />
        </div>

        {visibleLines.map((line) => (
          <div key={line.key} className="mt-0.5 w-full" style={{ maxHeight: DETAIL_LINE_HEIGHT }}>
            <FitText
              text={line.text}
              maxFontSize={10}
              minFontSize={7}
              maxLines={1}
              align={textAlign}
              lineHeight={1.3}
              opacity={line.opacity}
            />
          </div>
        ))}
      </div>

      <div
        onMouseDown={handleResizeStart}
        className="export-hide absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100"
      >
        <div
          className="mx-auto mt-1 h-[3px] w-8 rounded-full"
          style={{ backgroundColor: textColor, opacity: 0.4 }}
        />
      </div>
    </div>
  )
}