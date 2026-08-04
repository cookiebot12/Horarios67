import { useRef } from 'react'
import { X } from 'lucide-react'
import { getContrastTextColor, getBorderShade } from '../utils/colorUtils'
import { formatTimeRange, snapDuration } from '../utils/timeUtils'

const ALIGN_TO_ITEMS = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

const LINE_HEIGHT = 1.3
const DETAIL_GAP = 2 // separación entre líneas de detalle
const NORMAL_PAD_Y = 6
const COMPACT_PAD_Y = 1
const BORDER_TOTAL = 2 // 1px arriba + 1px abajo

// Las líneas de detalle (incluido el label de hora) se pintan al 85 % del
// tamaño global del nombre.
export const DETAIL_FONT_RATIO = 0.85

/**
 * Mayor tamaño de nombre con el que un bloque de `blockHeight` px todavía puede
 * mostrar el nombre MÁS una línea de detalle (la hora). Es la inversa de la
 * maquetación de este componente, y vive aquí para que ScheduleGrid no tenga
 * que duplicar las constantes de alto de línea y padding.
 */
export function maxNameSizeWithDetail(blockHeight) {
  const innerH = blockHeight - 2 * NORMAL_PAD_Y - BORDER_TOTAL
  // nombre = s*LH, detalle = s*RATIO*LH + DETAIL_GAP. Se restan 2px extra para
  // absorber el redondeo hacia arriba de los dos Math.ceil.
  return (innerH - DETAIL_GAP - 2) / (LINE_HEIGHT * (1 + DETAIL_FONT_RATIO))
}

export default function SubjectBlock({
  block,
  subject,
  top,
  height,
  rounded,
  onRemove,
  onResize,
  pxPerMinute,
  textAlign = 'center',
  fontWeight = '400',
  use24hFormat = false,
  showTimeInBlock = true,
  nameFontSize,
  detailFontSize,
  padX,
  minDurationMin,
}) {
  const resizing = useRef(false)
  const startY = useRef(0)
  const startDuration = useRef(block.durationMin)

  if (!subject) return null

  const textColor = getContrastTextColor(subject.color)
  const borderColor = getBorderShade(subject.color)

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
      // Se snapea la duración RESULTANTE, no el incremento: sumar múltiplos de
      // la subdivisión a la duración de partida heredaba su desalineación y
      // permitía llegar a valores como 45 min.
      const rawDuration = startDuration.current + deltaY / pxPerMinute
      onResize(block.id, snapDuration(rawDuration, minDurationMin))
    }
    const handleUp = () => {
      resizing.current = false
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const timeLabel = formatTimeRange(block.startMin, block.durationMin, use24hFormat)

  // Alturas derivadas del tamaño de fuente global. El alto mínimo del bloque se
  // calcula a partir de la línea del nombre en vez de un valor fijo: con el piso
  // de 11px una línea ocupa 14.3px y el antiguo mínimo de 26px recortaba el
  // texto verticalmente.
  const nameLineH = Math.ceil(nameFontSize * LINE_HEIGHT)
  const detailLineH = Math.ceil(detailFontSize * LINE_HEIGHT) + DETAIL_GAP
  const compact = height < nameLineH + 2 * NORMAL_PAD_Y + BORDER_TOTAL
  const padY = compact ? COMPACT_PAD_Y : NORMAL_PAD_Y
  const blockHeight = Math.max(height, nameLineH + 2 * padY + BORDER_TOTAL)
  const innerH = blockHeight - 2 * padY - BORDER_TOTAL

  // Líneas opcionales candidatas, en orden de prioridad. El descarte es solo por
  // ALTO (no caben más líneas en el bloque); por ancho nunca se descartan, ya
  // que el espacio del label de hora se preserva siempre (spec 1.3) y el texto
  // que no entra se recorta con elipsis como el resto.
  const candidateLines = [
    subject.description ? { key: 'description', text: subject.description, opacity: 0.85 } : null,
    subject.professorRoom
      ? { key: 'professorRoom', text: subject.professorRoom, opacity: 0.85 }
      : null,
    showTimeInBlock ? { key: 'time', text: timeLabel, opacity: 0.7 } : null,
  ].filter(Boolean)

  const maxDetailLines = Math.max(0, Math.floor((innerH - nameLineH) / detailLineH))
  const visibleLines = candidateLines.slice(0, maxDetailLines)

  // Una sola línea con recorte por elipsis. `width: 100%` y `minWidth: 0` son
  // obligatorios, no decorativos: como flex-item de un contenedor en columna con
  // `alignItems` distinto de `stretch`, el ancho sería `fit-content` y
  // `text-overflow` no se aplicaría nunca.
  const singleLine = {
    margin: 0,
    width: '100%',
    minWidth: 0,
    lineHeight: LINE_HEIGHT,
    textAlign,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group absolute inset-x-0 z-10 flex cursor-grab select-none flex-col justify-center overflow-hidden shadow-block transition-shadow active:cursor-grabbing hover:shadow-floating ${
        rounded ? 'rounded-xl' : 'rounded-none'
      }`}
      style={{
        top,
        boxSizing: 'border-box',
        height: blockHeight,
        paddingLeft: padX,
        paddingRight: padX,
        paddingTop: padY,
        paddingBottom: padY,
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
        <p style={{ ...singleLine, fontSize: nameFontSize, fontWeight: nameWeightOf(fontWeight) }}>
          {subject.name}
        </p>

        {visibleLines.map((line) => (
          <p
            key={line.key}
            style={{
              ...singleLine,
              marginTop: DETAIL_GAP,
              fontSize: detailFontSize,
              fontWeight: Number(fontWeight),
              opacity: line.opacity,
            }}
          >
            {line.text}
          </p>
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

/** Debe coincidir EXACTAMENTE con el peso usado al medir en ScheduleGrid. */
function nameWeightOf(fontWeight) {
  return Number(fontWeight) >= 700 ? 700 : 500
}
