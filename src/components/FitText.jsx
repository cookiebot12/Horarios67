import { useLayoutEffect, useRef, useState } from 'react'

// Componente que ajusta automáticamente el tamaño de fuente de un texto
// para que quepa por completo (en ancho y alto) dentro de su contenedor,
// en vez de cortarlo con "truncate"/ellipsis. Reduce el font-size en
// pequeños pasos hasta que el contenido ya no desborda, permitiendo que
// el texto se reparta en varias líneas (hasta `maxLines`).
//
// Se vuelve a calcular cada vez que cambian el texto o el tamaño del
// contenedor (por ejemplo al cambiar la proporción del horario o al
// agregar/quitar días, lo que reduce el ancho de cada columna).
export default function FitText({
  text,
  maxFontSize,
  minFontSize = 7,
  maxLines = 1,
  weight,
  align = 'center',
  lineHeight = 1.3,
  opacity = 1,
  className = '',
}) {
  const ref = useRef(null)
  const [fontSize, setFontSize] = useState(maxFontSize)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    let cancelled = false

    const fit = () => {
      if (cancelled) return
      let size = maxFontSize
      el.style.fontSize = `${size}px`

      // Reduce en pasos de 0.5px hasta que el texto (con wrap habilitado)
      // quepa dentro del ancho y alto disponibles del contenedor.
      while (
        size > minFontSize &&
        (el.scrollHeight > el.clientHeight + 0.5 || el.scrollWidth > el.clientWidth + 0.5)
      ) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }

      setFontSize(size)
    }

    fit()

    // IMPORTANTE: solo observamos el contenedor padre, nunca `el` mismo.
    // El padre tiene un tamaño estable (ancho de columna / maxHeight fijo
    // por props), mientras que `el` cambia de tamaño cada vez que
    // ajustamos su font-size. Si se observara `el`, cada ajuste de fuente
    // dispararía otra vuelta del observer, que reinicia en maxFontSize y
    // vuelve a encoger: un bucle de retroalimentación que se percibe como
    // parpadeo alternando entre dos tamaños.
    const parent = el.parentElement
    if (!parent) {
      return () => {
        cancelled = true
      }
    }

    const observer = new ResizeObserver(fit)
    observer.observe(parent)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [text, maxFontSize, minFontSize, maxLines])

  return (
    <p
      ref={ref}
      className={className}
      style={{
        fontSize,
        fontWeight: weight,
        textAlign: align,
        lineHeight,
        opacity,
        margin: 0,
        width: '100%',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'normal',
      }}
    >
      {text}
    </p>
  )
}
