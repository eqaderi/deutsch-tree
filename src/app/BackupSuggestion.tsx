import { Link } from 'react-router'
import { useLanguage } from '../language/index.tsx'
import { useMilestone } from './milestones.ts'
import { progressProblem } from './progress.ts'

/**
 * After a milestone, one quiet panel that suggests backing up progress,
 * because browser storage can be cleared. It is shown for a milestone once:
 * it goes away for good with an export or with "Not now".
 */
export function BackupSuggestion() {
  const { strings } = useLanguage()
  const { milestone, dismiss } = useMilestone()
  if (!milestone || progressProblem) return null

  return (
    <section className="panel suggestion" aria-labelledby="suggestion-heading">
      <h2 id="suggestion-heading">
        {milestone.kind === 'level'
          ? strings.milestoneLevel(milestone.level)
          : strings.milestoneTopics(milestone.count)}
      </h2>
      <p>{strings.suggestBackup}</p>
      <div className="actions">
        <Link to="/backup" className="btn">
          {strings.backupLink}
        </Link>
        <button type="button" className="btn btn-quiet" onClick={dismiss}>
          {strings.notNow}
        </button>
      </div>
    </section>
  )
}
