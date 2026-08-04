import { useState } from 'react'
import { PRIMARY_COLORS, SECONDARY_COLORS } from '../utils/colorUtils'

function Swatch({ hex, name, active, onClick, size = 'h-7 w-7' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-label={name}
      className={`${size} rounded-full transition-transform duration-150 hover:scale-110 ${
        active ? 'ring-2 ring-accent ring-offset-2' : 'ring-1 ring-black/10'
      }`}
      style={{ backgroundColor: hex }}
    />
  )
}

export default function ColorPicker({ value, onChange, recentColors = [] }) {
  const [customOpen, setCustomOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {PRIMARY_COLORS.map((c) => (
          <Swatch
            key={c.hex}
            hex={c.hex}
            name={c.name}
            active={value === c.hex}
            onClick={() => onChange(c.hex)}
          />
        ))}

        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          title="Color personalizado"
          aria-label="Color personalizado"
          className={`h-7 w-7 rounded-full ring-1 ring-black/10 transition-transform duration-150 hover:scale-110 ${
            customOpen ? 'ring-2 ring-accent ring-offset-2' : ''
          }`}
          style={{
            background:
              'conic-gradient(from 180deg, #FF6F61, #FF97D3, #A8E6C1, #8FB4D9, #C7B9E8, #FF6F61)',
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowMore((s) => !s)}
        className="text-[11px] font-medium text-accent hover:underline"
      >
        {showMore ? 'Ocultar colores' : 'Más colores'}
      </button>

      {showMore && (
        <div className="flex flex-wrap gap-2 animate-fadeIn">
          {SECONDARY_COLORS.map((c) => (
            <Swatch
              key={c.hex}
              hex={c.hex}
              name={c.name}
              active={value === c.hex}
              onClick={() => onChange(c.hex)}
            />
          ))}
        </div>
      )}

      {customOpen && (
        <div className="flex items-center gap-2 animate-fadeIn">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded-md border border-hairline bg-transparent p-0"
          />
          <span className="text-xs text-inkSoft">{value.toUpperCase()}</span>
        </div>
      )}

      {recentColors.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-inkSoft">
            Recientes
          </p>
          <div className="flex flex-wrap gap-2">
            {recentColors.map((hex, i) => (
              <Swatch
                key={`${hex}-${i}`}
                hex={hex}
                name={hex}
                active={value === hex}
                onClick={() => onChange(hex)}
                size="h-6 w-6"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
