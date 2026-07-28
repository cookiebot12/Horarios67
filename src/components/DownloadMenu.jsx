import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import { exportNodeAsImage } from '../utils/exportUtils'

const FORMATS = [
  { key: 'png', label: 'PNG', hint: 'Máxima calidad, con transparencia' },
  { key: 'jpg', label: 'JPG', hint: 'Menor tamaño de archivo' },
  { key: 'avif', label: 'AVIF', hint: 'Formato moderno y comprimido' },
]

export default function DownloadMenu({ targetRef }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(null) // { format, ok, note }
  const [loadingFormat, setLoadingFormat] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (format) => {
    setLoadingFormat(format)
    try {
      const result = await exportNodeAsImage(targetRef.current, format, 'horario')
      setStatus({
        format,
        ok: true,
        note:
          result.usedFormat !== format
            ? `Tu navegador no admite ${format.toUpperCase()}; se descargó en PNG`
            : null,
      })
    } catch (err) {
      // Siempre se registra en consola: sin esto es imposible diagnosticar
      // por qué falló una exportación específica.
      console.error('[DownloadMenu] Falló la exportación:', err)
      setStatus({
        format,
        ok: false,
        note: err?.message || 'No se pudo exportar la imagen',
      })
    } finally {
      setLoadingFormat(null)
      setOpen(false)
      setTimeout(() => setStatus(null), 5000)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-block transition-transform active:scale-95"
      >
        <Download size={15} strokeWidth={2.25} />
        Descargar
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 animate-popIn origin-top-right overflow-hidden rounded-2xl border border-hairline bg-white/90 shadow-floating backdrop-blur-xl">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => handleExport(f.key)}
              disabled={loadingFormat !== null}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.03] disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-medium text-ink">.{f.label.toLowerCase()}</p>
                <p className="text-xs text-inkSoft">{f.hint}</p>
              </div>
              {loadingFormat === f.key && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              )}
            </button>
          ))}
        </div>
      )}

      {status && (
        <div
          className={`absolute right-0 top-[calc(100%+8px)] z-40 flex items-start gap-2 rounded-xl px-3.5 py-2 text-xs font-medium shadow-floating animate-fadeIn ${
            status.ok ? 'bg-ink text-white' : 'bg-red-500 text-white'
          }`}
          style={{ width: 260 }}
        >
          {status.ok ? (
            <Check size={13} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          )}
          <span>
            {status.ok
              ? status.note || `Horario descargado en ${status.format.toUpperCase()}`
              : status.note}
          </span>
        </div>
      )}
    </div>
  )
}
