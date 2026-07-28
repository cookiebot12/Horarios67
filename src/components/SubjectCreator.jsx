import { useState } from 'react'
import { Plus, X, GripVertical, ChevronDown } from 'lucide-react'
import ColorPicker from './ColorPicker'
import { PRIMARY_COLORS, getContrastTextColor } from '../utils/colorUtils'

export default function SubjectCreator({ subjects, onAdd, onRemove }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [professorRoom, setProfessorRoom] = useState('')
  const [color, setColor] = useState(PRIMARY_COLORS[0].hex)
  const [recentColors, setRecentColors] = useState([])
  const [showOptional, setShowOptional] = useState(false)

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ name, color, description, professorRoom })
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)]
      return next.slice(0, 6)
    })
    setName('')
    setDescription('')
    setProfessorRoom('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') handleAdd()
  }

  return (
    <div className="space-y-2.5">
      <label className="block text-[11px] font-medium uppercase tracking-wide text-inkSoft">
        Nueva materia
      </label>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre de la materia"
        className="w-full rounded-lg border border-hairline bg-surfaceMuted px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-inkSoft/70 focus:border-accent"
      />

      <button
        type="button"
        onClick={() => setShowOptional((s) => !s)}
        className="flex items-center gap-1 text-[11px] font-medium text-inkSoft hover:text-accent"
      >
        <ChevronDown
          size={12}
          className={`transition-transform ${showOptional ? 'rotate-180' : ''}`}
        />
        Más opciones
      </button>

      {showOptional && (
        <div className="space-y-2 animate-fadeIn">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descripción"
            className="w-full rounded-lg border border-hairline bg-surfaceMuted px-3 py-2 text-xs text-ink outline-none transition-colors placeholder:text-inkSoft/70 focus:border-accent"
          />
          <input
            type="text"
            value={professorRoom}
            onChange={(e) => setProfessorRoom(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Profesor/Salón"
            className="w-full rounded-lg border border-hairline bg-surfaceMuted px-3 py-2 text-xs text-ink outline-none transition-colors placeholder:text-inkSoft/70 focus:border-accent"
          />
        </div>
      )}

      <ColorPicker value={color} onChange={setColor} recentColors={recentColors} />

      <button
        type="button"
        onClick={handleAdd}
        disabled={!name.trim()}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus size={15} strokeWidth={2.5} />
        Agregar materia
      </button>

      {subjects.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-inkSoft">
            Arrastra al horario
          </p>
          <div className="space-y-1.5">
            {subjects.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/subject-id', s.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                className="group flex cursor-grab items-center gap-2 rounded-lg border border-hairline bg-white px-2.5 py-2 shadow-block transition-transform active:cursor-grabbing active:scale-[0.98]"
              >
                <GripVertical size={14} className="shrink-0 text-inkSoft/50" />
                <span
                  className="flex-1 truncate rounded-md px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: s.color, color: getContrastTextColor(s.color) }}
                >
                  {s.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  className="shrink-0 rounded-full p-1 text-inkSoft opacity-0 transition-opacity hover:bg-black/5 hover:text-ink group-hover:opacity-100"
                  aria-label={`Eliminar ${s.name}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
