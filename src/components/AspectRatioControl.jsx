export const ASPECT_OPTIONS = [
  { label: 'Escritorio', sub: '16:9', value: '16:9', ratio: '16 / 9', maxWidth: 980 },
  { label: 'Celular', sub: '9:16', value: '9:16', ratio: '9 / 16', maxWidth: 420 },
  { label: 'Estándar', sub: '4:3', value: '4:3', ratio: '4 / 3', maxWidth: 900 },
  { label: 'Panorámico', sub: '16:7', value: '16:7', ratio: '500 / 225', maxWidth: 700 },
]

export default function AspectRatioControl({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
        Formato del lienzo
      </label>
      <div className="grid grid-cols-4 gap-1.5">
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
              className={`block rounded-[3px] border-[1.5px] ${
                value === opt.value ? 'border-accent' : 'border-inkSoft/60'
              }`}
              style={{
                width: opt.value === '9:16' ? 12 : opt.value === '16:7' ? 22 : 20,
                height:
                  opt.value === '9:16'
                    ? 20
                    : opt.value === '4:3'
                    ? 15
                    : opt.value === '16:7'
                    ? 10
                    : 11.5,
              }}
            />
            <span className="text-[10.5px] font-medium leading-none">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
