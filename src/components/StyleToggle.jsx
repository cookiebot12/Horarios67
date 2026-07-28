export default function StyleToggle({ rounded, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-inkSoft">
          Bordes de bloques
        </p>
        <p className="text-xs text-ink">{rounded ? 'Redondeados' : 'Rectos'}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={rounded}
        onClick={() => onChange(!rounded)}
        className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
          rounded ? 'bg-accent' : 'bg-[#D2D2D7]'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-block transition-transform duration-200 ${
            rounded ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
