#!/usr/bin/env node
// Genera todos los assets de marca ("Z" blanca centrada sobre fondo negro)
// usando SOLO builtins de Node: sin dependencias, sin red, reproducible en CI.
//
//   node scripts/generate-icons.mjs
//
// Salidas en public/: favicon.svg, favicon.ico, apple-touch-icon.png,
// icon-192.png, icon-512.png, icon-maskable-512.png
//
// La "Z" se define como geometría (dos barras + una diagonal) y no como un
// glifo de texto, para que el SVG y los rásteres sean exactamente la misma
// forma en cualquier máquina. La misma definición vive en
// src/components/BrandMark.jsx.

import { deflateSync, inflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = join(ROOT, 'public')

const BG = [0, 0, 0] // negro
const FG = [255, 255, 255] // blanco

// Geometría de la "Z" en un lienzo normalizado de 32×32 (idéntica a BrandMark).
// Barras de 3.2 de grosor sobre un cuadro de 14×14; la diagonal es un
// paralelogramo de 4.6 de ancho horizontal (≈3.25 perpendicular a 45°), para
// que su peso visual iguale al de las barras.
const Z_POLYGONS = [
  [[9, 9], [23, 9], [23, 12.2], [9, 12.2]], // barra superior
  [[18.4, 9], [23, 9], [13.6, 23], [9, 23]], // diagonal
  [[9, 19.8], [23, 19.8], [23, 23], [9, 23]], // barra inferior
]
const CANVAS = 32

// ---------------------------------------------------------------------------
// Rasterización
// ---------------------------------------------------------------------------

/** ¿Está el punto dentro del polígono convexo? Signo constante del producto
 *  cruzado contra cada arista. */
function insideConvex(poly, px, py) {
  let sign = 0
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]
    const [bx, by] = poly[(i + 1) % poly.length]
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    if (cross === 0) continue
    const s = cross > 0 ? 1 : -1
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

/**
 * Cobertura [0..1] del píxel (x, y) por la "Z", con 4×4 submuestras.
 * Se calcula analíticamente por píxel en vez de rasterizar a 4× y reducir, para
 * no reservar un buffer 16 veces mayor.
 */
const SUB = 4
function coverage(x, y, size, margin) {
  // El dibujo ocupa `content` px centrados: margin es la zona de seguridad.
  const content = size - 2 * margin
  const scale = content / CANVAS
  let hits = 0
  for (let sy = 0; sy < SUB; sy++) {
    for (let sx = 0; sx < SUB; sx++) {
      // Centro de la submuestra, llevado al espacio 32×32 del diseño.
      const px = (x + (sx + 0.5) / SUB - margin) / scale
      const py = (y + (sy + 0.5) / SUB - margin) / scale
      for (const poly of Z_POLYGONS) {
        if (insideConvex(poly, px, py)) {
          hits++
          break
        }
      }
    }
  }
  return hits / (SUB * SUB)
}

/** Píxeles RGBA (opacos, a sangre) del ícono al tamaño dado. */
function renderRGBA(size, marginRatio = 0) {
  const margin = Math.round(size * marginRatio)
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, size, margin)
      const o = (y * size + x) * 4
      // Fondo opaco en todo el lienzo: los íconos maskable y apple-touch no
      // admiten transparencia. Al ser el fondo opaco, mezclar en espacio
      // directo es correcto (no hay halo por premultiplicado).
      out[o] = Math.round(BG[0] + (FG[0] - BG[0]) * a)
      out[o + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * a)
      out[o + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * a)
      out[o + 3] = 255
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Codificador PNG (RGBA8) — todo BIG-endian
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0) // la longitud NO entra en el CRC
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  // El CRC cubre TIPO + DATOS. `>>> 0` es obligatorio: el valor con signo
  // reventaría writeUInt32BE.
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)) >>> 0, 8 + data.length)
  return out
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function encodePNG(rgba, width, height) {
  // Cada scanline lleva su byte de filtro DENTRO del flujo sin comprimir.
  const stride = width * 4
  const raw = Buffer.alloc(height * (1 + stride))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0 // filtro 0 (None)
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type 6 = RGBA
  ihdr[10] = 0 // compresión
  ihdr[11] = 0 // filtro
  ihdr[12] = 0 // sin entrelazado

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    // deflateSync (zlib RFC1950 con cabecera y Adler-32), NUNCA deflateRawSync:
    // PNG exige el envoltorio zlib y un flujo "raw" sería rechazado.
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Contenedor ICO con payloads PNG — todo LITTLE-endian (al revés que el PNG)
// ---------------------------------------------------------------------------

function encodeICO(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // 1 = icono
  header.writeUInt16LE(images.length, 4)

  const entries = []
  // dwImageOffset es ABSOLUTO desde el byte 0 del archivo.
  let offset = 6 + 16 * images.length
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size // 256 se codifica como 0
    e[1] = size >= 256 ? 0 : size
    e[2] = 0 // paleta
    e[3] = 0 // reservado
    e.writeUInt16LE(1, 4) // planos
    e.writeUInt16LE(32, 6) // bits por píxel
    e.writeUInt32LE(png.length, 8) // dwBytesInRes
    e.writeUInt32LE(offset, 12) // dwImageOffset
    entries.push(e)
    offset += png.length
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

function buildSVG() {
  const polys = Z_POLYGONS.map(
    (p) => `  <polygon points="${p.map(([x, y]) => `${x},${y}`).join(' ')}" fill="#FFFFFF"/>`
  ).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#000000"/>
${polys}
</svg>
`
}

// ---------------------------------------------------------------------------
// Verificación (sin librerías de imagen)
// ---------------------------------------------------------------------------

function verifyPNG(buf, expectedSize, label) {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`${label}: firma PNG inválida`)
  }
  let p = 8
  const types = []
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const stored = buf.readUInt32BE(p + 8 + len)
    const actual = crc32(buf.subarray(p + 4, p + 8 + len))
    if (stored !== actual) throw new Error(`${label}: CRC inválido en el chunk ${type}`)
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len))
    types.push(type)
    p += 12 + len
  }
  if (p !== buf.length) throw new Error(`${label}: bytes sobrantes tras IEND`)
  if (types[0] !== 'IHDR' || types[types.length - 1] !== 'IEND') {
    throw new Error(`${label}: orden de chunks inválido`)
  }

  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  if (width !== expectedSize || height !== expectedSize) {
    throw new Error(`${label}: dimensiones ${width}x${height}, se esperaba ${expectedSize}`)
  }
  if (buf[24] !== 8 || buf[25] !== 6) throw new Error(`${label}: no es RGBA8`)

  // Comprueba que los bytes de filtro están presentes y son válidos.
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  if (raw.length !== height * (1 + stride)) {
    throw new Error(`${label}: tamaño del flujo de píxeles incorrecto`)
  }
  for (let y = 0; y < height; y++) {
    if (raw[y * (1 + stride)] > 4) throw new Error(`${label}: byte de filtro inválido`)
  }
  // Regla de los íconos maskable/apple-touch: totalmente opacos.
  if (raw[4] !== 255) throw new Error(`${label}: la esquina superior izquierda no es opaca`)

  return { width, height }
}

function verifyICO(buf) {
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    throw new Error('favicon.ico: cabecera ICONDIR inválida')
  }
  const count = buf.readUInt16LE(4)
  if (count < 1) throw new Error('favicon.ico: sin imágenes')
  for (let i = 0; i < count; i++) {
    const base = 6 + 16 * i
    const declared = buf[base] === 0 ? 256 : buf[base]
    const bytes = buf.readUInt32LE(base + 8)
    const offset = buf.readUInt32LE(base + 12)
    if (offset + bytes > buf.length) {
      throw new Error(`favicon.ico: la entrada ${i} se sale del archivo`)
    }
    const payload = buf.subarray(offset, offset + bytes)
    // Verificación cruzada: el IHDR del payload debe coincidir con la entrada.
    verifyPNG(payload, declared, `favicon.ico[${i}]`)
  }
  return count
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Zona segura de los íconos maskable: el círculo de radio 2/5 del lado. Un
// margen del 20 % dejaría un cuadrado del 60 % cuya circunferencia circunscrita
// es 0.60*√2 = 84.9 % > 80 %, es decir, las esquinas de la Z quedarían fuera.
// Con el 22 % → 0.56*√2 = 79.2 %, dentro del círculo seguro.
const MASKABLE_MARGIN = 0.22
// Margen suave en los íconos normales para que la Z respire dentro del cuadro.
const STANDARD_MARGIN = 0.12

const targets = [
  { file: 'icon-192.png', size: 192, margin: STANDARD_MARGIN },
  { file: 'icon-512.png', size: 512, margin: STANDARD_MARGIN },
  { file: 'icon-maskable-512.png', size: 512, margin: MASKABLE_MARGIN },
  { file: 'apple-touch-icon.png', size: 180, margin: STANDARD_MARGIN },
]

mkdirSync(PUBLIC_DIR, { recursive: true })

writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), buildSVG(), 'utf8')
console.log('  favicon.svg')

for (const { file, size, margin } of targets) {
  const png = encodePNG(renderRGBA(size, margin), size, size)
  verifyPNG(png, size, file)
  writeFileSync(join(PUBLIC_DIR, file), png)
  console.log(`  ${file} (${size}x${size}, ${png.length} bytes)`)
}

const icoImages = [16, 32, 48].map((size) => ({
  size,
  png: encodePNG(renderRGBA(size, STANDARD_MARGIN), size, size),
}))
const ico = encodeICO(icoImages)
writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), ico)
console.log(`  favicon.ico (16/32/48, ${ico.length} bytes)`)

// Verificación final leyendo de disco, no de memoria.
for (const { file, size } of targets) {
  verifyPNG(readFileSync(join(PUBLIC_DIR, file)), size, file)
}
const icoCount = verifyICO(readFileSync(join(PUBLIC_DIR, 'favicon.ico')))
console.log(`\nOK: ${targets.length} PNG + ICO con ${icoCount} imágenes verificados.`)
