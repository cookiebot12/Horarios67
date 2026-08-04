// Marca de la app: una "Z" centrada sobre fondo negro.
//
// La "Z" se define como GEOMETRÍA (dos barras horizontales + una diagonal), no
// como un glifo de texto: un favicon SVG se renderiza en un contexto donde las
// fuentes web no cargan, así que un `<text>` saldría con una tipografía distinta
// en cada máquina y distinta de los PNG. Con geometría, este componente,
// `public/favicon.svg` y los rásteres comparten la misma definición de forma.
//
// Coordenadas en un lienzo de 32×32, alineadas con `scripts/generate-icons.mjs`.
export const Z_POLYGONS = [
  '9,9 23,9 23,12.2 9,12.2', // barra superior
  '18.4,9 23,9 13.6,23 9,23', // diagonal
  '9,19.8 23,19.8 23,23 9,23', // barra inferior
]

export default function BrandMark({ size = 32, color = '#FFFFFF', background = null }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Generador de Horarios"
    >
      {background && <rect width="32" height="32" fill={background} />}
      {Z_POLYGONS.map((points) => (
        <polygon key={points} points={points} fill={color} />
      ))}
    </svg>
  )
}
