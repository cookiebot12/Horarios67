import { toCanvas } from 'html-to-image'

// NOTA: se usa `toCanvas` + `canvas.toBlob` manual, y NO el `toBlob` que
// exporta la librería. En html-to-image@1.11.x, `toBlob(node, options)`
// no reenvía `options.type`/`options.quality` al paso final de
// codificación (ver canvasToBlob en su código fuente): siempre generaría
// PNG sin importar el formato pedido. Convertir el canvas nosotros mismos
// evita ese bug.

const MIME_BY_FORMAT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  avif: 'image/avif',
}

// Cualquier nodo con esta clase (o descendiente de uno) queda fuera de la
// captura: botones de agregar/eliminar día, paleta de color, handle de
// resize, etc. Antes esta clase existía en el JSX pero no tenía ningún
// efecto real durante la exportación.
const EXPORT_HIDE_SELECTOR = '.export-hide'

function shouldIncludeNode(domNode) {
  // html-to-image llama a filter() para cada nodo del árbol, incluyendo
  // nodos de texto y comentarios (sin matches). Solo los Element tienen
  // matches().
  if (domNode.nodeType !== Node.ELEMENT_NODE) return true
  return !domNode.matches?.(EXPORT_HIDE_SELECTOR)
}

/** Oculta controles de UI solo durante la captura para que el layout refluya. */
function hideExportControls(node) {
  const hidden = []
  node.querySelectorAll(EXPORT_HIDE_SELECTOR).forEach((el) => {
    hidden.push({ el, display: el.style.display })
    el.style.display = 'none'
  })
  return hidden
}

function restoreExportControls(hidden) {
  hidden.forEach(({ el, display }) => {
    el.style.display = display
  })
}

function waitForLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

/**
 * Renderiza el nodo dado a una imagen de alta resolución y la descarga
 * en el formato solicitado. Si el navegador no soporta la codificación
 * AVIF vía canvas.toBlob, cae automáticamente a PNG y lo informa.
 */
export async function exportNodeAsImage(node, format = 'png', filename = 'horario') {
  if (!node) throw new Error('No se encontró el elemento a exportar')

  // Evita capturar con métricas de una fuente de fallback si el navegador
  // todavía no terminó de descargar/aplicar Inter, Montserrat, etc.
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const mime = MIME_BY_FORMAT[format] || 'image/png'
  const quality = format === 'jpg' ? 0.95 : format === 'avif' ? 0.85 : undefined

  // Ocultar controles de edición antes de capturar: el filter() de
  // html-to-image los excluye del dibujo pero no del cálculo flex, lo que
  // dejaba ~40px vacíos (columna "agregar día") y anchos de celda distintos
  // al layout en pantalla.
  const hiddenControls = hideExportControls(node)
  await waitForLayout()

  let canvas
  try {
    canvas = await toCanvas(node, {
      backgroundColor: '#FFFFFF',
      pixelRatio: Math.min(3, window.devicePixelRatio * 2 || 2),
      filter: shouldIncludeNode,
      cacheBust: true,
    })
  } finally {
    restoreExportControls(hiddenControls)
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality))

  // Fallback: algunos navegadores no soportan codificar a AVIF (u otro
  // formato) desde canvas. En ese caso el blob viene vacío o en PNG.
  let finalBlob = blob
  let finalExt = format
  if (!blob || blob.type !== mime) {
    const fallback = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    finalBlob = fallback
    finalExt = 'png'
  }

  if (!finalBlob) throw new Error('No se pudo generar la imagen')

  const url = URL.createObjectURL(finalBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.${finalExt}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return { usedFormat: finalExt, requestedFormat: format }
}
