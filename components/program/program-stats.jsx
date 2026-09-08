import { CalendarDays, Building, List } from "lucide-react"

export default function ProgramStats({ daysCount, sessionCount, hallsCount }) {
  return (
    <div className="program-stats" aria-label="Program summary">
      <span>
        <CalendarDays size={16} />
        <strong>{daysCount || 0}</strong> days
      </span>
      <span>
        <List size={16} />
        <strong>{sessionCount || 0}</strong> sessions
      </span>
      <span>
        <Building size={16} />
        <strong>{hallsCount || 0}</strong> halls
      </span>
    </div>
  )
}
