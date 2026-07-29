import { useRef } from 'react'
import { CalendarClock } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ScheduleGrid from './components/ScheduleGrid'
import DownloadMenu from './components/DownloadMenu'
import SettingsMenu from './components/SettingsMenu'
import { useSchedule } from './hooks/useSchedule'
import { getFontStack } from './utils/colorUtils'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

export default function App() {
  const schedule = useSchedule()
  const exportRef = useRef(null)
  const fontStack = getFontStack(schedule.fontFamily)
  const isSidebarRight = schedule.sidebarPosition === 'right'

  return (
    <div
      className="flex h-screen w-screen flex-col bg-canvas"
      style={{ fontFamily: fontStack, fontWeight: Number(schedule.fontWeight) }}
    >
      {/* Barra superior */}
      <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-white/70 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
            <CalendarClock size={17} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold leading-none text-ink">
              Generador de horarios
            </h1>
            <p className="mt-1 text-[11px] leading-none text-inkSoft">Arrastra tus materias</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SettingsMenu schedule={schedule} />
          <DownloadMenu targetRef={exportRef} />
        </div>
      </header>

      {/* Cuerpo: panel lateral + grid (posición configurable) */}
      <div className={`flex min-h-0 flex-1 ${isSidebarRight ? 'flex-row-reverse' : ''}`}>
        <Sidebar schedule={schedule} />
        <main className="min-w-0 flex-1 bg-canvas">
          <ScheduleGrid schedule={schedule} ref={exportRef} />
        </main>
      </div>
    </div>
  )
}
