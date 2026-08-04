import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Palette } from 'lucide-react'
import SubjectBlock, { DETAIL_FONT_RATIO, maxNameSizeWithDetail } from './SubjectBlock'
import ColorPicker from './ColorPicker'
import {
  formatTimeRange,
  generateSlots,
  getSubdivisionMin,
  minutesToLabel,
  snapToGrid,
} from '../utils/timeUtils'
import { getContrastTextColor, getFontStack } from '../utils/colorUtils'
import { buildFont, getCalibration, maxFontSizeForWidth } from '../utils/textMeasure'
import { useFontEpoch } from '../hooks/useFontEpoch'
import { getAspectOption } from './AspectRatioControl'

const HEADER_HEIGHT = 52
const TEXT_LINE_HEIGHT = 1.3

// Geometría del lienzo. Estas constantes alimentan TANTO el JSX como el cálculo
// aritmético del ancho de columna, para que no puedan desincronizarse del CSS.
export const HOUR_COL_W = 72
export const ADD_DAY_COL_W = 40
export const CARD_BORDER = 1
export const BLOCK_BORDER = 1
export const BLOCK_PAD_X = 10
// En columnas muy angostas se recorta el padding horizontal: recupera ~30 % del
// ancho útil justo donde el texto más sufre (formato cuasi-cuadrado, muchos días).
export const COMPACT_PAD_X = 4
const NARROW_COLUMN_W = 90

// Tamaño de fuente global de los bloques (secciones 1.2 y 1.3 del spec).
const ABSOLUTE_MIN_FONT = 11 // piso absoluto: nunca se baja de aquí
const PRACTICAL_MIN_FONT = 12 // piso práctico por defecto
const MAX_FONT = 20
// Por debajo de este ancho útil se considera el caso extremo que permite bajar
// al piso absoluto de 11px (bloques muy angostos).
const NARROW_BLOCK_W = 60

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
    resizeStepMin,
    aspectRatio,
    roundedBlocks,
    textAlign,
    fontFamily,
    fontWeight,
    use24hFormat,
    showTimeInBlock,
  } = schedule

  const slots = useMemo(() => generateSlots(startMin, endMin, intervalMin), [
    startMin,
    endMin,
    intervalMin,
  ])

  // Subdivisión de celda: siempre la mitad del intervalo configurado.
  const subdivisionMin = getSubdivisionMin(intervalMin)

  const bodyRef = useRef(null)
  const [rowHeight, setRowHeight] = useState(48)
  const [dragOverKey, setDragOverKey] = useState(null)
  const [editingDayId, setEditingDayId] = useState(null)
  const [colorPopover, setColorPopover] = useState(null) // {dayId, top, left}
  const popoverRef = useRef(null)

  // El nodo de la tarjeta se comparte con el ref de exportación reenviado.
  const cardRef = useRef(null)
  const setCardRef = useCallback(
    (node) => {
      cardRef.current = node
      if (typeof exportRef === 'function') exportRef(node)
      else if (exportRef) exportRef.current = node
    },
    [exportRef]
  )
  const [cardInnerW, setCardInnerW] = useState(0)

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

  // IMPORTANTE: se mide la TARJETA, nunca una columna de día.
  //
  // El ancho de la tarjeta lo impone su contenedor (`w-full` + maxWidth +
  // aspect-ratio), así que ocultar un descendiente no lo altera. Si en cambio se
  // observara una columna de día, la exportación sería no determinista: al
  // ocultar la columna "agregar día" (`.export-hide`) las columnas se ensanchan,
  // el ResizeObserver dispara un setState y que ese commit de React llegue antes
  // de que html-to-image clone el DOM depende del presupuesto del frame — dos
  // exportaciones seguidas podrían salir con tipografías distintas.
  //
  // Por eso el ancho de columna se deriva por aritmética restando SIEMPRE
  // ADD_DAY_COL_W, esté visible u oculta.
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width - 2 * CARD_BORDER
      // Cuantizar: el observer emite anchos fraccionarios al redimensionar la
      // ventana; sin esto habría un render por subpíxel.
      setCardInnerW(Math.floor(w * 2) / 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [aspectRatio])

  const pxPerMinute = rowHeight / intervalMin

  const subjectById = useMemo(() => {
    const map = {}
    subjects.forEach((s) => (map[s.id] = s))
    return map
  }, [subjects])

  const activeAspect = getAspectOption(aspectRatio)

  // ---------- Tamaño de fuente global y uniforme ----------
  const fontStack = getFontStack(fontFamily)
  const fontEpoch = useFontEpoch(fontStack)
  // Debe coincidir EXACTAMENTE con el peso que aplica SubjectBlock al nombre.
  const nameWeight = Number(fontWeight) >= 700 ? 700 : 500

  const detailWeight = Number(fontWeight)

  const nameFont = useMemo(() => buildFont(nameWeight, fontStack), [nameWeight, fontStack])
  const detailFont = useMemo(() => buildFont(detailWeight, fontStack), [detailWeight, fontStack])

  // Un único reflow por cambio de fuente (no uno por bloque) para corregir la
  // divergencia entre la medición en canvas y el layout real del DOM.
  //
  // Se calcula en un efecto, NO en un useMemo: `getCalibration` inserta y quita
  // un <span> de sondeo del documento, y mutar el DOM durante la fase de render
  // rompe la pureza que React exige (y que StrictMode ejercita al renderizar dos
  // veces). Hasta que el efecto corre se usa 1, un valor neutro.
  const [nameCalibration, setNameCalibration] = useState(1)
  useLayoutEffect(() => {
    setNameCalibration(getCalibration(nameFont))
  }, [nameFont, fontEpoch])

  const [detailCalibration, setDetailCalibration] = useState(1)
  useLayoutEffect(() => {
    setDetailCalibration(getCalibration(detailFont))
  }, [detailFont, fontEpoch])

  const geometry = useMemo(() => {
    if (cardInnerW <= 0 || days.length === 0) {
      return { columnContentW: 0, padX: BLOCK_PAD_X, blockInnerW: 0 }
    }
    // `- days.length` = el borde derecho de 1px de cada columna de día.
    const columnContentW =
      (cardInnerW - HOUR_COL_W - ADD_DAY_COL_W - days.length) / days.length
    const padX = columnContentW < NARROW_COLUMN_W ? COMPACT_PAD_X : BLOCK_PAD_X
    const blockInnerW = Math.max(0, columnContentW - 2 * padX - 2 * BLOCK_BORDER)
    return { columnContentW, padX, blockInnerW }
  }, [cardInnerW, days.length])

  // Tamaño único para TODOS los bloques: el mínimo de los tamaños máximos que
  // cada materia colocada admite para caber en una sola línea.
  const { nameFontSize, detailFontSize } = useMemo(() => {
    const { blockInnerW } = geometry
    const atSize = (size) => ({ nameFontSize: size, detailFontSize: size * DETAIL_FONT_RATIO })

    if (blockInnerW <= 0) return atSize(PRACTICAL_MIN_FONT)

    // Se mide por materia única, no por bloque: `mergeContiguousBlocks` y las
    // colocaciones repetidas hacen que muchos bloques compartan nombre.
    const placedIds = new Set(blocks.map((b) => b.subjectId))
    const names = []
    placedIds.forEach((id) => {
      const subject = subjectById[id]
      if (subject) names.push(subject.name)
    })
    if (names.length === 0) return atSize(MAX_FONT)

    let smallest = Infinity
    for (const name of names) {
      const max = maxFontSizeForWidth(name, blockInnerW, nameFont, fontEpoch, nameCalibration)
      if (max === null) return atSize(PRACTICAL_MIN_FONT) // medición no fiable
      if (max < smallest) smallest = max
    }

    // Techo: con nombres cortos ("MATH") el tamaño podría crecer tanto que el
    // label de hora dejaría de caber y saldría con "…". Como la hora se pinta al
    // 85 % del tamaño global, el tope para el nombre es (máximo de la hora) / 0.85.
    // Solo aplica si la hora está visible; si el usuario la oculta, no hay nada
    // que reservar y el techo vuelve a ser el absoluto.
    let ceiling = MAX_FONT
    if (showTimeInBlock) {
      let widthCap = Infinity
      let heightCap = Infinity
      for (const block of blocks) {
        const label = formatTimeRange(block.startMin, block.durationMin, use24hFormat)
        const max = maxFontSizeForWidth(
          label,
          blockInnerW,
          detailFont,
          fontEpoch,
          detailCalibration
        )
        if (max === null) {
          widthCap = Infinity
          break
        }
        // La hora se pinta al 85 %, así que el tope para el nombre es el
        // máximo de la hora dividido por esa proporción.
        widthCap = Math.min(widthCap, max / DETAIL_FONT_RATIO)

        // Además debe caber en ALTO: de nada sirve reservar el ancho si a ese
        // tamaño la línea de la hora ya no entra en el bloque. Los bloques
        // demasiado bajos para alojarla ni siquiera al piso quedan fuera del
        // cálculo: esos degradan ocultando la hora, como hasta ahora, en vez de
        // arrastrar a todo el horario al mínimo.
        const byHeight = maxNameSizeWithDetail(block.durationMin * pxPerMinute)
        if (byHeight >= PRACTICAL_MIN_FONT) heightCap = Math.min(heightCap, byHeight)
      }
      ceiling = Math.min(MAX_FONT, widthCap, heightCap)
    }

    // Cuantizar HACIA ABAJO (nunca al más cercano): redondear hacia arriba
    // provocaría un "…" espurio justo en el bloque que define el mínimo.
    const raw = Math.floor(smallest * 2) / 2
    const cap = Math.floor(ceiling * 2) / 2
    const floor = blockInnerW < NARROW_BLOCK_W ? ABSOLUTE_MIN_FONT : PRACTICAL_MIN_FONT
    return atSize(Math.max(floor, Math.min(raw, cap)))
  }, [
    geometry,
    blocks,
    subjectById,
    nameFont,
    fontEpoch,
    nameCalibration,
    detailFont,
    detailCalibration,
    showTimeInBlock,
    use24hFormat,
    pxPerMinute,
  ])

  const handleDrop = (e, dayId, candidateStart) => {
    e.preventDefault()
    setDragOverKey(null)
    const subjectId = e.dataTransfer.getData('application/subject-id')
    const blockId = e.dataTransfer.getData('application/block-id')
    const snapped = snapToGrid(candidateStart, startMin, endMin, subdivisionMin)

    if (blockId) {
      moveBlock(blockId, dayId, snapped)
    } else if (subjectId) {
      placeBlock(subjectId, dayId, snapped, intervalMin)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
      <div
        ref={setCardRef}
        className="flex w-full overflow-hidden rounded-3xl border border-hairline bg-white shadow-panel"
        style={{
          aspectRatio: activeAspect.ratio,
          maxHeight: '100%',
          maxWidth: activeAspect.maxWidth,
        }}
      >
        {/* Columna de horas */}
        <div
          className="flex shrink-0 flex-col border-r border-hairline"
          style={{ width: HOUR_COL_W }}
        >
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
            style={{ gridTemplateRows: `repeat(${slots.length}, minmax(0, 1fr))` }}
          >
            {slots.map((slotStart) => (
              <div
                key={slotStart}
                className="flex min-h-0 items-center justify-center overflow-hidden border-b border-hairline/70 px-1"
              >
                {/* whitespace-nowrap evita que "9:00 AM" se parta en dos
                    líneas ("9:00" / "AM") cuando la fila es baja (muchos
                    horarios/días), lo que antes hacía que el texto se
                    superpusiera con la línea divisoria de la fila
                    siguiente. Si la fila es muy baja, se reduce la
                    tipografía en vez de dejar que envuelva. */}
                <span
                  className="whitespace-nowrap font-medium text-inkSoft"
                  style={{
                    lineHeight: 1,
                    fontSize: rowHeight < 26 ? 9 : 10,
                  }}
                >
                  {minutesToLabel(slotStart, use24hFormat)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Columnas de días */}
        {days.map((day) => {
          // El color del día se aplica EXCLUSIVAMENTE al fondo del encabezado.
          // Las celdas de contenido y los bordes de columna son siempre
          // neutros: no heredan ni reaccionan al color del día.
          const headerText = day.color ? getContrastTextColor(day.color) : undefined

          return (
            <div
              key={day.id}
              className="relative flex min-w-0 flex-1 flex-col border-r border-hairline"
            >
              {/* Encabezado del día */}
              <div
                className="group relative flex shrink-0 items-center justify-center border-b border-hairline px-5"
                style={{ height: HEADER_HEIGHT, backgroundColor: day.color || undefined }}
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
                    style={{ lineHeight: TEXT_LINE_HEIGHT, color: headerText }}
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
                  style={{ color: headerText }}
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
                    style={{ color: headerText }}
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
                  style={{ gridTemplateRows: `repeat(${slots.length}, minmax(0, 1fr))` }}
                >
                  {slots.map((slotStart) => (
                    // Cada celda se parte en dos zonas de drop de media altura:
                    // la superior ancla el bloque al inicio de la franja (0 %) y
                    // la inferior a la marca de media celda (50 %).
                    <div
                      key={slotStart}
                      className="grid min-h-0 grid-rows-2 border-b border-hairline/70"
                    >
                      {[0, 1].map((half) => {
                        const key = `${day.id}-${slotStart}-${half}`
                        const candidateStart = slotStart + half * subdivisionMin
                        return (
                          <div
                            key={half}
                            onDragOver={(e) => {
                              e.preventDefault()
                              setDragOverKey(key)
                            }}
                            onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                            onDrop={(e) => handleDrop(e, day.id, candidateStart)}
                            className={`min-h-0 transition-colors ${
                              dragOverKey === key ? 'cell-drag-over' : ''
                            }`}
                          />
                        )
                      })}
                    </div>
                  ))}
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
                      pxPerMinute={pxPerMinute}
                      onRemove={removeBlock}
                      onResize={resizeBlock}
                      textAlign={textAlign}
                      fontWeight={fontWeight}
                      use24hFormat={use24hFormat}
                      showTimeInBlock={showTimeInBlock}
                      nameFontSize={nameFontSize}
                      detailFontSize={detailFontSize}
                      padX={geometry.padX}
                      resizeStepMin={resizeStepMin}
                    />
                  ))}
              </div>
            </div>
          )
        })}

        {/* Botón agregar día */}
        <div
          className="export-hide flex shrink-0 flex-col border-l border-hairline"
          style={{ width: ADD_DAY_COL_W }}
        >
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
                  Color del encabezado
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
