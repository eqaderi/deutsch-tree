/**
 * Which milestones the learner has already been told about. A milestone is
 * mentioned once, with the suggestion to back up progress: exporting,
 * importing or answering "Not now" acknowledges every milestone reached so
 * far, and none of them comes up again.
 *
 * What a milestone is, is the learning engine's rule (`milestonesReached`),
 * worked out from the content index. This file only remembers, in this
 * browser, which ones are settled. It is not part of the progress: it says
 * what this device has shown, not what the learner has learned.
 */
import { use, useSyncExternalStore } from 'react'
import { type Milestone, milestonesReached, milestoneToMention, type Progress } from '../learning-engine/index.ts'
import { loadIndex } from './content.ts'
import { useProgress } from './progress.ts'

const STORAGE_KEY = 'deutsch-tree:milestones-acknowledged'

function remembered(): readonly string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
  } catch {
    // Storage is switched off or holds something else. Nothing is acknowledged then.
    return []
  }
}

let acknowledged = remembered()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function acknowledge(milestones: readonly Milestone[]): void {
  const fresh = milestones.map((milestone) => milestone.id).filter((id) => !acknowledged.includes(id))
  if (fresh.length === 0) return
  acknowledged = [...acknowledged, ...fresh]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acknowledged))
  } catch {
    // The answer then lasts until the page is closed.
  }
  for (const listener of listeners) listener()
}

/**
 * Settles every milestone this progress has reached. Call it when the
 * progress has just been exported or imported: a file of it exists.
 */
export function acknowledgeMilestonesOf(progress: Progress): void {
  loadIndex().then(
    ({ nodes }) => acknowledge(milestonesReached(nodes, progress)),
    () => {
      // Without the content the milestones are unknown. The suggestion may then come once more.
    },
  )
}

/**
 * The milestone to mention on this page, if there is a new one, and the
 * function that settles it (the learner's "Not now").
 */
export function useMilestone(): { milestone: Milestone | undefined; dismiss: () => void } {
  const { nodes } = use(loadIndex())
  const progress = useProgress()
  const settled = useSyncExternalStore(subscribe, () => acknowledged)
  const reached = milestonesReached(nodes, progress)
  return { milestone: milestoneToMention(reached, settled), dismiss: () => acknowledge(reached) }
}
