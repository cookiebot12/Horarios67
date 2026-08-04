// Paleta principal: los seis colores que deben aparecer primero
export const PRIMARY_COLORS = [
  { name: 'Azul cielo', hex: '#56AEFF' },
  { name: 'Rojo carmín', hex: '#DE0F3F' },
  { name: 'Amarillo dorado', hex: '#FFCF60' },
  { name: 'Verde lima', hex: '#9DCD5A' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Morado uva', hex: '#776391' },
]

// Paleta secundaria: colores adicionales, mostrados debajo de los principales
export const SECONDARY_COLORS = [
  { name: 'Azul acero', hex: '#8FB4D9' },
  { name: 'Verde menta', hex: '#A8E6C1' },
  { name: 'Rosa', hex: '#FF97D3' },
  { name: 'Lavanda', hex: '#C7B9E8' },
  { name: 'Durazno', hex: '#F6C89F' },
  { name: 'Gris perla', hex: '#D6D8DB' },
  { name: 'Grafito', hex: '#8E8E93' },
]

// Se mantiene por compatibilidad: lista combinada (principales + secundarios)
export const PRESET_COLORS = [...PRIMARY_COLORS, ...SECONDARY_COLORS]

// Determina si el texto debe ser negro o blanco según la luminancia del fondo.
export function getContrastTextColor(hex) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1D1D1F' : '#FFFFFF'
}

export function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const bigint = parseInt(
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean,
    16
  )
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Borde sutil ligeramente más oscuro que el color base, útil sobre todo para el blanco
export function getBorderShade(hex) {
  if (hex.toUpperCase() === '#FFFFFF') return '#D2D2D7'
  const { r, g, b } = hexToRgb(hex)
  const darken = (v) => Math.max(0, Math.floor(v * 0.82))
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`
}

// Pilas tipográficas: Montserrat por defecto + opciones inspiradas en Apple HIG
export const FONT_OPTIONS = [
  {
    key: 'montserrat',
    label: 'Montserrat',
    stack: '"Montserrat", -apple-system, "SF Pro Text", sans-serif',
  },
  {
    key: 'sf-pro',
    label: 'San Francisco (HIG)',
    stack: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
  },
  {
    key: 'new-york',
    label: 'New York (HIG)',
    stack: 'ui-serif, "New York", Georgia, "Times New Roman", serif',
  },
  {
    key: 'sf-mono',
    label: 'SF Mono (HIG)',
    stack: 'ui-monospace, "SF Mono", "Menlo", "Cascadia Code", monospace',
  },
]

export function getFontStack(key) {
  return FONT_OPTIONS.find((f) => f.key === key)?.stack || FONT_OPTIONS[0].stack
}
