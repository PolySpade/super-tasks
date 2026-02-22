import { useState } from 'react'
import { Plus, Flame, Trash2, Repeat } from 'lucide-react'
import { useHabits } from '../hooks/useHabits'
import { HabitFormModal } from './HabitFormModal'
import { TaskList } from '../types'

interface HabitSectionProps {
  taskLists: TaskList[]
}

export function HabitSection({ taskLists }: HabitSectionProps) {
  const { todaysHabits, streaks, create, complete, uncomplete, remove } = useHabits()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="habit-section">
      <div className="habit-section-header">
        <div className="habit-section-title">
          <Repeat size={14} />
          <span>Habits</span>
          {todaysHabits.length > 0 && (
            <span className="habit-count">
              {todaysHabits.filter((h) => h.completed).length}/{todaysHabits.length}
            </span>
          )}
        </div>
        <button className="icon-btn" onClick={() => setShowForm(true)} title="Add habit">
          <Plus size={14} />
        </button>
      </div>

      {todaysHabits.length === 0 ? (
        <div className="habit-empty">
          <span>No habits for today</span>
          <button className="habit-add-btn" onClick={() => setShowForm(true)}>
            <Plus size={12} />
            Add a habit
          </button>
        </div>
      ) : (
        <div className="habit-list">
          {todaysHabits.map((habit) => (
            <div key={habit.id} className={`habit-item ${habit.completed ? 'completed' : ''}`}>
              <label className="task-checkbox">
                <input
                  type="checkbox"
                  checked={habit.completed}
                  onChange={() => {
                    if (habit.completed) {
                      uncomplete(habit.id)
                    } else {
                      complete(habit.id, habit.taskId)
                    }
                  }}
                />
                <span className="checkmark" />
              </label>
              <span className="habit-title">{habit.title}</span>
              {(streaks[habit.id] ?? 0) > 0 && (
                <div className="habit-streak">
                  <Flame size={12} />
                  <span>{streaks[habit.id]}</span>
                </div>
              )}
              <button
                className="icon-btn habit-delete-btn"
                onClick={() => remove(habit.id)}
                title="Delete habit"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <HabitFormModal
          taskLists={taskLists}
          onClose={() => setShowForm(false)}
          onSubmit={create}
        />
      )}
    </div>
  )
}
