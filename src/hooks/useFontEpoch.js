import { useEffect, useState } from 'react'
import { clearMeasureCache } from '../utils/textMeasure'

/** Extrae la primera familia de una pila CSS: '"Montserrat", …' → 'Montserrat' */
function primaryFamily(stack) {
  const first = String(stack || '').split(',')[0].trim()
  return first.replace(/^["']|["']$/g, '')
}

/**
 * Contador que se incrementa cada vez que las métricas tipográficas pueden
 * haber cambiado (fuente web ya descargada, o cambio de familia).
 *
 * Montserrat llega por `<link>` de Google Fonts: en el primer paint la medición
 * usaría las métricas de la fuente de respaldo (≈4-6 % más angosta), calculando
 * un tamaño demasiado grande que luego se truncaría. Este epoch invalida la
 * caché y fuerza el recálculo cuando la fuente real ya está disponible.
 *
 * Ojo con los pesos: el nombre de las materias se pinta en 500 (o 700), y el
 * navegador descarga cada corte por separado y de forma perezosa, así que hay
 * que pedirlos explícitamente — `document.fonts.ready` puede resolver antes de
 * que el peso 500 exista.
 */
export function useFontEpoch(stack, weights = [400, 500, 700]) {
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return

    let cancelled = false
    const bump = () => {
      if (cancelled) return
      clearMeasureCache()
      setEpoch((e) => e + 1)
    }

    const family = primaryFamily(stack)
    // Para familias que no son webfont (sf-pro, new-york, sf-mono) `load()`
    // resuelve de inmediato: mantiene un único camino de código.
    const loads = family
      ? weights.map((w) => document.fonts.load(`${w} 16px "${family}"`).catch(() => null))
      : []

    Promise.all([...loads, document.fonts.ready]).then(bump, bump)

    // Cubre las llegadas tardías: un corte que se descarga después del primer
    // paint, o una hoja de estilos que resuelve tras `fonts.ready`.
    document.fonts.addEventListener('loadingdone', bump)
    return () => {
      cancelled = true
      document.fonts.removeEventListener('loadingdone', bump)
    }
  }, [stack])

  return epoch
}
