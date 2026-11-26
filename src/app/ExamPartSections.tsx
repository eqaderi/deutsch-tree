import type { ExamPartContent } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { RichText } from './German.tsx'
import { Panel } from './Panel.tsx'

/**
 * What every exam-part page begins with, whatever the module: what the part
 * asks, how it is scored and how to approach it, in this fixed order. What a
 * learner then does with the part (a scored practice task for Lesen and
 * Hören) comes after these panels.
 */
export function ExamPartSections({ content }: { content: Pick<ExamPartContent, 'explanations'> }) {
  const { language, strings } = useLanguage()
  const explanation = content.explanations[language]
  return (
    <>
      <Panel id="section-exam-task" heading={strings.examTask}>
        <p className="rule">
          <RichText parts={explanation.task} />
        </p>
      </Panel>

      <Panel id="section-exam-scoring" heading={strings.examScoring}>
        <p>
          <RichText parts={explanation.scoring} />
        </p>
      </Panel>

      <Panel id="section-exam-approach" heading={strings.examApproach}>
        <ol className="steps" aria-labelledby="section-exam-approach">
          {explanation.approach.map((step, index) => (
            <li key={index}>
              <RichText parts={step} />
            </li>
          ))}
        </ol>
      </Panel>
    </>
  )
}
