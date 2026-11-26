/**
 * The three steps a first visit shows on the tree. Once dismissed they stay
 * away on this device. This is a setting of the device, like the language:
 * it has its own storage key and is not part of the learner's progress.
 */
import { useState } from 'react'

const STORAGE_KEY = 'deutsch-tree.first-steps-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    // Storage can be switched off. The steps then come back on the next visit.
    return false
  }
}

export function useFirstSteps(): { shown: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(wasDismissed)
  return {
    shown: !dismissed,
    dismiss: () => {
      try {
        localStorage.setItem(STORAGE_KEY, 'yes')
      } catch {
        // See wasDismissed.
      }
      setDismissed(true)
    },
  }
}
