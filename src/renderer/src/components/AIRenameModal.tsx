import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { TaskList, Task } from '../types'

interface RenameProposal {
  taskId: string
  listId: string
  oldTitle: string
  newTitle: string
  oldNotes: string
  newNotes: string
  checked: boolean
}

type State = 'idle' | 'generating' | 'preview' | 'applying' | 'done'

interface AIRenameModalProps {
  taskLists: TaskList[]
  onClose: () => void
  onApplied: () => void
}

export function AIRenameModal({ taskLists, onClose, onApplied }: AIRenameModalProps) {
  const [state, setState] = useState<State>('idle')
  const [selectedLists, setSelectedLists] = useState<Set<string>>(
    new Set(taskLists.map((l) => l.id))
  )
  const [proposals, setProposals] = useState<RenameProposal[]>([])
  const [error, setError] = useState<string | null>(null)
  const [appliedCount, setAppliedCount] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)

  const toggleList = (id: string) => {
    setSelectedLists((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleProposal = (idx: number) => {
    setProposals((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, checked: !p.checked } : p))
    )
  }

  const handleGenerate = async () => {
    setError(null)
    setState('generating')

    try {
      // Fetch tasks from all selected lists
      const allTasks: { id: string; title: string; notes?: string; listId: string }[] = []

      for (const listId of selectedLists) {
        const res = await window.api.getTasks(listId)
        if (res.success && res.data) {
          const flatten = (tasks: Task[]) => {
            for (const t of tasks) {
              if (t.status === 'needsAction') {
                allTasks.push({ id: t.id, title: t.title, notes: t.notes, listId })
              }
              if (t.children) flatten(t.children)
            }
          }
          flatten(res.data)
        }
      }

      if (allTasks.length === 0) {
        setError('No active tasks found in selected lists.')
        setState('idle')
        return
      }

      setTotalTasks(allTasks.length)

      const res = await window.api.aiRenameTasks(
        allTasks.map((t) => ({ id: t.id, title: t.title, notes: t.notes }))
      )

      if (!res.success) {
        setError(res.error || 'AI request failed.')
        setState('idle')
        return
      }

      const renames: { taskId: string; newTitle: string; newNotes: string }[] = res.data || []
      const taskMap = new Map(allTasks.map((t) => [t.id, t]))

      const mapped: RenameProposal[] = renames
        .filter((r) => taskMap.has(r.taskId))
        .map((r) => {
          const orig = taskMap.get(r.taskId)!
          return {
            taskId: r.taskId,
            listId: orig.listId,
            oldTitle: orig.title,
            newTitle: r.newTitle,
            oldNotes: orig.notes || '',
            newNotes: r.newNotes,
            checked: r.newTitle !== orig.title || r.newNotes !== (orig.notes || '')
          }
        })

      setProposals(mapped)
      setState('preview')
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setState('idle')
    }
  }

  const handleApply = async () => {
    const selected = proposals.filter((p) => p.checked)
    if (selected.length === 0) return

    setState('applying')
    let count = 0

    for (const p of selected) {
      const updates: { title?: string; notes?: string } = {}
      if (p.newTitle !== p.oldTitle) updates.title = p.newTitle
      if (p.newNotes !== p.oldNotes) updates.notes = p.newNotes
      if (Object.keys(updates).length > 0) {
        await window.api.updateTask(p.listId, p.taskId, updates)
        count++
      }
    }

    setAppliedCount(count)
    setState('done')
    onApplied()
  }

  const checkedCount = proposals.filter((p) => p.checked).length

  return (
    <div className="plan-confirm-overlay" onClick={onClose}>
      <div className="plan-confirm-card ai-rename-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-rename-header">
          <span>AI Rename Tasks</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {error && <div className="ai-rename-error">{error}</div>}

        {state === 'idle' && (
          <>
            <div className="ai-rename-section-label">Select task lists</div>
            <div className="plan-list-picker">
              {taskLists.map((list) => (
                <label key={list.id} className="plan-list-option">
                  <input
                    type="checkbox"
                    checked={selectedLists.has(list.id)}
                    onChange={() => toggleList(list.id)}
                  />
                  <span className="plan-list-check" />
                  <span className="plan-list-name">{list.title}</span>
                </label>
              ))}
            </div>
            <button
              className="plan-generate-btn"
              onClick={handleGenerate}
              disabled={selectedLists.size === 0}
              style={{ marginTop: 10 }}
            >
              Rename Tasks
            </button>
          </>
        )}

        {state === 'generating' && (
          <div className="ai-rename-status">
            <div className="spinner" />
            <span>Analyzing {totalTasks > 0 ? `${totalTasks} tasks` : 'tasks'}...</span>
          </div>
        )}

        {state === 'preview' && (
          <>
            <div className="ai-rename-preview">
              {proposals.map((p, i) => (
                <label key={p.taskId} className="ai-rename-row">
                  <input
                    type="checkbox"
                    checked={p.checked}
                    onChange={() => toggleProposal(i)}
                  />
                  <span className="plan-list-check" />
                  <div className="ai-rename-diff">
                    <div className="ai-rename-title-diff">
                      <span className="ai-rename-old">{p.oldTitle}</span>
                      <ArrowRight size={10} className="ai-rename-arrow" />
                      <span className="ai-rename-new">{p.newTitle}</span>
                    </div>
                    {(p.newNotes !== p.oldNotes) && (
                      <div className="ai-rename-notes-diff">
                        {p.oldNotes && <span className="ai-rename-old">{p.oldNotes}</span>}
                        {p.oldNotes && <ArrowRight size={8} className="ai-rename-arrow" />}
                        <span className="ai-rename-new">{p.newNotes}</span>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="ai-rename-actions">
              <button className="plan-confirm-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className="plan-confirm-accept"
                onClick={handleApply}
                disabled={checkedCount === 0}
              >
                Apply {checkedCount > 0 ? `(${checkedCount})` : ''}
              </button>
            </div>
          </>
        )}

        {state === 'applying' && (
          <div className="ai-rename-status">
            <div className="spinner" />
            <span>Updating tasks...</span>
          </div>
        )}

        {state === 'done' && (
          <div className="ai-rename-status">
            <span className="ai-rename-done-text">
              {appliedCount} task{appliedCount !== 1 ? 's' : ''} renamed
            </span>
            <button className="plan-generate-btn" onClick={onClose} style={{ marginTop: 10 }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
