// Formatos de lienzo. `ratio` alimenta el `aspect-ratio` CSS (pantalla y preview)
// y `exportW`/`exportH` fijan el tamaño real del archivo exportado, que ya no
// depende del tamaño en pantalla ni del devicePixelRatio del monitor.
export const ASPECT_OPTIONS = [
  { sub: '16:9', value: '16:9', ratio: '16 / 9', maxWidth: 980, exportW: 1920, exportH: 1080 },
  { sub: '32:15', value: '32:15', ratio: '32 / 15', maxWidth: 1120, exportW: 1920, exportH: 900 },
  {
    sub: '45:47',
    value: '45:47',
    ratio: '1080 / 1128',
    maxWidth: 640,
    exportW: 1080,
    exportH: 1128,
  },
]

export function getAspectOption(value) {
  return ASPECT_OPTIONS.find((o) => o.value === value) || ASPECT_OPTIONS[0]
}

// Altura computada del preview de 16:9 en el diseño original. Se fija como
// constante para los tres presets: cada uno solo controla su ancho (vía
// aspect-ratio) dentro de esta altura común, de modo que las miniaturas no
// cambien de alto al alternar entre formatos.
const PREVIEW_H = 11.5
// Ancho del contenedor = el del preset más panorámico (32:15), para que los
// tres previews queden centrados dentro de una caja idéntica (pillarbox).
const PREVIEW_BOX_W = Math.ceil(PREVIEW_H * (32 / 15))

export default function AspectRatioControl({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
        Formato del lienzo
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {ASPECT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-all duration-150 ${
              value === opt.value
                ? 'border-accent bg-accentSoft text-accent'
                : 'border-hairline bg-surfaceMuted text-inkSoft hover:border-ink/20'
            }`}
          >
            <span
              className="flex items-center justify-center"
              style={{ height: PREVIEW_H, width: PREVIEW_BOX_W }}
            >
              <span
                className={`block rounded-[3px] border-[1.5px] ${
                  value === opt.value ? 'border-accent' : 'border-inkSoft/60'
                }`}
                style={{ height: '100%', aspectRatio: opt.ratio }}
              />
            </span>
            <span className="text-[10.5px] font-medium leading-none">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
