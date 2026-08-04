import { useEffect, useRef, useState } from 'react'
import { Settings, ChevronDown, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import StyleToggle from './StyleToggle'
import AspectRatioControl from './AspectRatioControl'
import { FONT_OPTIONS } from '../utils/colorUtils'

const ALIGN_OPTIONS = [
  { value: 'left', icon: AlignLeft, label: 'Izquierda' },
  { value: 'center', icon: AlignCenter, label: 'Centro' },
  { value: 'right', icon: AlignRight, label: 'Derecha' },
]

export default function SettingsMenu({ schedule }) {
  const {
    roundedBlocks,
    setRoundedBlocks,
    textAlign,
    setTextAlign,
    fontFamily,
    setFontFamily,
    fontWeight,
    setFontWeight,
    sidebarPosition,
    setSidebarPosition,
    use24hFormat,
    setUse24hFormat,
    showTimeInBlock,
    setShowTimeInBlock,
    aspectRatio,
    setAspectRatio,
  } = schedule

  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-block transition-transform active:scale-95"
      >
        <Settings size={15} strokeWidth={2.25} />
        Ajustes
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="scroll-thin absolute right-0 top-[calc(100%+8px)] z-50 max-h-[80vh] w-80 animate-popIn origin-top-right space-y-5 overflow-y-auto rounded-2xl border border-hairline bg-white/95 p-4 shadow-floating backdrop-blur-xl">
          {/* Hora en el bloque */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-inkSoft">
                Hora en el bloque
              </p>
              <p className="text-xs text-ink">
                {showTimeInBlock ? 'Se muestra' : 'Oculta'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showTimeInBlock}
              onClick={() => setShowTimeInBlock(!showTimeInBlock)}
              className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                showTimeInBlock ? 'bg-accent' : 'bg-[#D2D2D7]'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-block transition-transform duration-200 ${
                  showTimeInBlock ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Bordes */}
          <StyleToggle rounded={roundedBlocks} onChange={setRoundedBlocks} />

          <div className="border-t border-hairline" />

          {/* Alineación de texto */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
              Alineación del texto
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-surfaceMuted p-1">
              {ALIGN_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTextAlign(opt.value)}
                    title={opt.label}
                    className={`flex items-center justify-center rounded-md py-1.5 transition-all duration-150 ${
                      textAlign === opt.value
                        ? 'bg-white text-ink shadow-block'
                        : 'text-inkSoft hover:text-ink'
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tipografía */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
              Tipografía
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surfaceMuted px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>

            <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-surfaceMuted p-1">
              <button
                type="button"
                onClick={() => setFontWeight('400')}
                className={`rounded-md py-1.5 text-xs font-normal transition-all duration-150 ${
                  fontWeight === '400'
                    ? 'bg-white text-ink shadow-block'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                Regular
              </button>
              <button
                type="button"
                onClick={() => setFontWeight('700')}
                className={`rounded-md py-1.5 text-xs font-bold transition-all duration-150 ${
                  fontWeight === '700'
                    ? 'bg-white text-ink shadow-block'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                Negrita
              </button>
            </div>
          </div>

          <div className="border-t border-hairline" />

          {/* Posición del panel lateral */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
              Panel lateral
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surfaceMuted p-1">
              <button
                type="button"
                onClick={() => setSidebarPosition('left')}
                className={`rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
                  sidebarPosition === 'left'
                    ? 'bg-white text-ink shadow-block'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                Izquierda
              </button>
              <button
                type="button"
                onClick={() => setSidebarPosition('right')}
                className={`rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
                  sidebarPosition === 'right'
                    ? 'bg-white text-ink shadow-block'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                Derecha
              </button>
            </div>
          </div>

          <div className="border-t border-hairline" />

          {/* Proporción del lienzo */}
          <AspectRatioControl value={aspectRatio} onChange={setAspectRatio} />

          {/* Formato de hora */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
              Formato de hora
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surfaceMuted p-1">
              <button
                type="button"
                onClick={() => setUse24hFormat(false)}
                className={`rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
                  !use24hFormat
                    ? 'bg-white text-ink shadow-block'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                Normal (AM/PM)
              </button>
              <button
                type="button"
                onClick={() => setUse24hFormat(true)}
                className={`rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
                  use24hFormat
                    ? 'bg-white text-ink shadow-block'
                    : 'text-inkSoft hover:text-ink'
                }`}
              >
                Militar (24h)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
