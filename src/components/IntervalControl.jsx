// Solo intervalos cuya mitad cae en minutos enteros: la subdivisión de celda es
// siempre `intervalo / 2` (30 → 15 min, 60 → 30 min).
const OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
]

export default function IntervalControl({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
        Intervalo de bloques
      </label>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surfaceMuted p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
              value === opt.value
                ? 'bg-white text-ink shadow-block'
                : 'text-inkSoft hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
