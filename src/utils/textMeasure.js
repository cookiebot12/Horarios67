// Medición de texto para el cálculo del tamaño de fuente global de los bloques.
//
// El ancho de avance de un texto es LINEAL respecto al font-size, así que basta
// medir una vez a un tamaño de referencia y escalar:
//
//   ancho(size) = ancho(REF_SIZE) * size / REF_SIZE
//   =>  sizeMáximoQueCabe = REF_SIZE * anchoDisponible / ancho(REF_SIZE)
//
// Esto sustituye al bucle por bloque del antiguo componente de autoajuste (que
// bajaba el font-size de 0.5 en 0.5 releyendo `scrollWidth`, forzando un reflow
// síncrono por paso y por bloque) con una única medición O(1) por materia.

export const REF_SIZE = 100

// El canvas no reproduce exactamente el layout del DOM. `SAFETY_RATIO` absorbe
// esa divergencia y `SAFETY_PX` el redondeo subpíxel: sin margen, un error de
// 0.2px provocaría un "…" espurio justo en el bloque que define el mínimo.
const SAFETY_RATIO = 0.98
const SAFETY_PX = 1

let ctx = null

// Caché anidada: fuente -> (texto -> ancho). Evita tener que concatenar clave y
// texto con un separador, que nunca sería 100 % seguro frente a nombres de
// materia arbitrarios.
let cache = new Map()

function getContext() {
  if (ctx !== null) return ctx
  if (typeof document === 'undefined') return null
  ctx = document.createElement('canvas').getContext('2d')
  return ctx
}

function cacheFor(fontKey) {
  let entry = cache.get(fontKey)
  if (!entry) {
    entry = new Map()
    cache.set(fontKey, entry)
  }
  return entry
}

/** Normaliza el string tal y como lo renderiza el DOM: `white-space: nowrap`
 *  sigue colapsando las secuencias de espacios, y los nombres de materia vienen
 *  de un input de texto libre. */
export function normalizeText(text) {
  return String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function buildFont(weight, stack) {
  return `${weight} ${REF_SIZE}px ${stack}`
}

export function clearMeasureCache() {
  cache = new Map()
}

/**
 * Ancho del texto medido a REF_SIZE px. Devuelve `null` si la medición no es
 * fiable, para que el llamador caiga al piso de fuente en vez de calcular con
 * un valor inventado.
 */
export function measureAtRef(text, font, epoch = 0) {
  const normalized = normalizeText(text)
  if (!normalized) return 0

  const entry = cacheFor(`${epoch} ${font}`)
  const cached = entry.get(normalized)
  if (cached !== undefined) return cached

  const context = getContext()
  if (!context) return null

  // El setter de `ctx.font` ignora EN SILENCIO cualquier valor que no logre
  // parsear, dejando el anterior (por defecto "10px sans-serif"). Hay que
  // releerlo para saber si la asignación surtió efecto.
  context.font = font
  if (!context.font.includes(`${REF_SIZE}px`)) return null

  const width = context.measureText(normalized).width
  if (!Number.isFinite(width) || width <= 0) return null

  entry.set(normalized, width)
  return width
}

/**
 * Factor de corrección canvas → DOM para una pila tipográfica y un peso dados.
 * Se calcula una sola vez por cambio de fuente (un reflow, no uno por bloque) y
 * absorbe cualquier divergencia del motor, incluido un `letter-spacing` futuro.
 */
export function getCalibration(font) {
  const context = getContext()
  if (!context || typeof document === 'undefined') return 1

  context.font = font
  if (!context.font.includes(`${REF_SIZE}px`)) return 1

  const sample = 'MMMMWWWWiiiillaeoy 0123456789'
  const canvasWidth = context.measureText(sample).width
  if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) return 1

  const span = document.createElement('span')
  span.style.cssText =
    'position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden;' +
    `font:${font};line-height:1`
  span.textContent = sample
  document.body.appendChild(span)
  const domWidth = span.getBoundingClientRect().width
  document.body.removeChild(span)

  if (!Number.isFinite(domWidth) || domWidth <= 0) return 1
  return domWidth / canvasWidth
}

/**
 * Mayor font-size (px) al que `text` cabe entero en una sola línea dentro de
 * `availableWidth`. Devuelve `null` si el texto no se pudo medir.
 */
export function maxFontSizeForWidth(text, availableWidth, font, epoch = 0, calibration = 1) {
  const refWidth = measureAtRef(text, font, epoch)
  if (refWidth === null) return null
  if (refWidth === 0) return Infinity

  const usable = Math.max(0, availableWidth - SAFETY_PX) * SAFETY_RATIO
  return (REF_SIZE * usable) / (refWidth * calibration)
}
