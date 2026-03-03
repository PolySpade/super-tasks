import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { TaskList, Task } from '../types'
import { parseMetaTag, appendMetaTag } from '../utils/task-meta'

interface MoveProposal {
  taskId: string
  taskTitle: string
  notes?: string
  due?: string
  sourceListId: string
  sourceListName: string
  targetListId: string
  targetListName: string
  reason: string
  checked: boolean
}

type State = 'idle' | 'generating' | 'preview' | 'applying' | 'done'

interface AIListSortModalProps {
  taskLists: TaskList[]
  onClose: () => void
  onApplied: () => void
}

export function AIListSortModal({ taskLists, onClose, onApplied }: AIListSortModalProps) {
  const [state, setState] = useState<State>('idle')
  const [selectedLists, setSelectedLists] = useState<Set<string>>(
    new Set(taskLists.map((l) => l.id))
  )
  const [proposals, setProposals] = useState<MoveProposal[]>([])
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
      const listNameMap = new Map(taskLists.map((l) => [l.id, l.title]))

      // Fetch tasks from selected lists, skip subtasks (tasks with parent)
      const allTasks: { id: string; title: string; notes?: string; due?: string; currentListId: string; currentListName: string; rawNotes?: string }[] = []

      for (const listId of selectedLists) {
        const res = await window.api.getTasks(listId)
        if (res.success && res.data) {
          const listName = listNameMap.get(listId) || ''
          for (const t of res.data as Task[]) {
            // Skip subtasks to avoid orphaning
            if (t.parent) continue
            if (t.status === 'needsAction') {
              const { cleanNotes } = parseMetaTag(t.notes || '')
              allTasks.push({
                id: t.id,
                title: t.title,
                notes: cleanNotes,
                due: t.due,
                currentListId: listId,
                currentListName: listName,
                rawNotes: t.notes
              })
            }
          }
        }
      }

      if (allTasks.length === 0) {
        setError('No active top-level tasks found in selected lists.')
        setState('idle')
        return
      }

      setTotalTasks(allTasks.length)

      // Pass ALL lists so AI knows every available target
      const allLists = taskLists.map((l) => ({ id: l.id, title: l.title }))

      const res = await window.api.aiSortToLists(
        allTasks.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          due: t.due,
          currentListId: t.currentListId,
          currentListName: t.currentListName
        })),
        allLists
      )

      if (!res.success) {
        setError(res.error || 'AI request failed.')
        setState('idle')
        return
      }

      const moves: { taskId: string; targetListId: string; reason: string }[] = res.data || []
      const taskMap = new Map(allTasks.map((t) => [t.id, t]))

      const mapped: MoveProposal[] = moves
        .filter((m) => {
          const task = taskMap.get(m.taskId)
          // Only include if task exists and target is different from source
          return task && m.targetListId !== task.currentListId
        })
        .map((m) => {
          const task = taskMap.get(m.taskId)!
          return {
            taskId: m.taskId,
            taskTitle: task.title,
            notes: task.rawNotes,
            due: task.due,
            sourceListId: task.currentListId,
            sourceListName: task.currentListName,
            targetListId: m.targetListId,
            targetListName: listNameMap.get(m.targetListId) || m.targetListId,
            reason: m.reason,
            checked: true
          }
        })

      if (mapped.length === 0) {
        setError('All tasks appear to be in the correct lists already.')
        setState('idle')
        return
      }

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
      // Create task in target list first (safe: worst case is duplication)
      const createRes = await window.api.createTask(p.targetListId, p.taskTitle, p.notes, p.due)
      if (createRes.success) {
        // Then delete from source list
        await window.api.deleteTask(p.sourceListId, p.taskId)
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
          <span>AI Sort to Lists</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {error && <div className="ai-rename-error">{error}</div>}

        {state === 'idle' && (
          <>
            <div className="ai-rename-section-label">Select lists to analyze</div>
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
              Sort Tasks
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
                      <span className="ai-rename-new">{p.taskTitle}</span>
                    </div>
                    <div className="ai-rename-title-diff">
                      <span className="ai-rename-old">{p.sourceListName}</span>
                      <ArrowRight size={10} className="ai-rename-arrow" />
                      <span className="ai-rename-new">{p.targetListName}</span>
                    </div>
                    <div className="ai-sort-reason">{p.reason}</div>
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
                Move {checkedCount > 0 ? `(${checkedCount})` : ''}
              </button>
            </div>
          </>
        )}

        {state === 'applying' && (
          <div className="ai-rename-status">
            <div className="spinner" />
            <span>Moving tasks...</span>
          </div>
        )}

        {state === 'done' && (
          <div className="ai-rename-status">
            <span className="ai-rename-done-text">
              {appliedCount} task{appliedCount !== 1 ? 's' : ''} moved
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
