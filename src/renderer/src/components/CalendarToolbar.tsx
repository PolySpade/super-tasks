import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarToolbarProps {
  currentView: string
  onViewChange: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  title: string
}

export function CalendarToolbar({
  currentView,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  title
}: CalendarToolbarProps) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-nav">
        <button className="icon-btn" onClick={onPrev} title="Previous">
          <ChevronLeft size={16} />
        </button>
        <button className="calendar-toolbar-today" onClick={onToday}>
          Today
        </button>
        <button className="icon-btn" onClick={onNext} title="Next">
          <ChevronRight size={16} />
        </button>
        <span className="calendar-toolbar-title">{title}</span>
      </div>

      <div className="settings-toggle-group">
        <button
          className={`settings-toggle-btn ${currentView === 'dayGridMonth' ? 'active' : ''}`}
          onClick={() => onViewChange('dayGridMonth')}
        >
          Month
        </button>
        <button
          className={`settings-toggle-btn ${currentView === 'timeGridWeek' ? 'active' : ''}`}
          onClick={() => onViewChange('timeGridWeek')}
        >
          Week
        </button>
        <button
          className={`settings-toggle-btn ${currentView === 'timeGridDay' ? 'active' : ''}`}
          onClick={() => onViewChange('timeGridDay')}
        >
          Day
        </button>
      </div>
    </div>
  )
}
