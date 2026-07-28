import TimeRangeControl from './TimeRangeControl'
import IntervalControl from './IntervalControl'
import SubjectCreator from './SubjectCreator'

export default function Sidebar({ schedule }) {
  const {
    startMin,
    endMin,
    intervalMin,
    updateTimeRange,
    updateInterval,
    subjects,
    addSubject,
    removeSubject,
    sidebarPosition,
  } = schedule

  const borderSide = sidebarPosition === 'right' ? 'border-l' : 'border-r'

  return (
    <aside
      className={`scroll-thin h-full w-[300px] shrink-0 overflow-y-auto ${borderSide} border-hairline bg-white/70 px-5 py-5 backdrop-blur-xl`}
    >
      <h2 className="mb-4 text-[15px] font-semibold text-ink">Configuración</h2>

      <section className="space-y-3.5 border-b border-hairline pb-4">
        <TimeRangeControl startMin={startMin} endMin={endMin} onChange={updateTimeRange} />
        <IntervalControl value={intervalMin} onChange={updateInterval} />
      </section>

      <section className="pt-4">
        <SubjectCreator subjects={subjects} onAdd={addSubject} onRemove={removeSubject} />
      </section>
    </aside>
  )
}
