import { minutesToTimeInputValue, timeStringToMinutes, minutesToLabel } from '../utils/timeUtils'

export default function TimeRangeControl({ startMin, endMin, onChange }) {
  const handleStart = (e) => {
    const newStart = timeStringToMinutes(e.target.value)
    onChange(newStart, endMin)
  }
  const handleEnd = (e) => {
    const newEnd = timeStringToMinutes(e.target.value)
    onChange(startMin, newEnd)
  }

  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
        Franja horaria
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="time"
            value={minutesToTimeInputValue(startMin)}
            onChange={handleStart}
            className="w-full rounded-lg border border-hairline bg-surfaceMuted px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
        <span className="text-xs text-inkSoft">a</span>
        <div className="flex-1">
          <input
            type="time"
            value={minutesToTimeInputValue(endMin)}
            onChange={handleEnd}
            className="w-full rounded-lg border border-hairline bg-surfaceMuted px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-inkSoft">
        {minutesToLabel(startMin)} — {minutesToLabel(endMin)}
      </p>
    </div>
  )
}
