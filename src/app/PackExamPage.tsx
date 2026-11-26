import { use, useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { PackAnswerKey, PackDescription, PackExam, PackModule, PackPart } from '../content-model/pack.ts'
import { useLanguage } from '../language/index.tsx'
import { MAXIMUM_SCORE, type SheetResult, scoreAnswerSheet, scoreModule } from '../learning-engine/index.ts'
import { answersOf, fileOfPack, findPacks, loadAnswerKey, moduleOf } from '../pack-loader/index.ts'
import { AnswerSheet, type SheetMarks, SheetResultView } from './AnswerSheet.tsx'
import { BookPages } from './BookPages.tsx'
import { NotFound } from './NotFound.tsx'
import { BackLink, PageTitle } from './PageTitle.tsx'

/**
 * The private exam view: one module of one exam of a pack
 * (`#/packs/<pack>/<exam>/<module>?part=2`). The chosen part's pages of the
 * book stand beside its answer sheet, with the recordings above the sheet
 * for a listening part. Each part is checked against the book's answer key
 * on its own; the module's score out of 100 follows once every part is.
 *
 * Marks and results are kept while the module is open, also when the
 * learner moves between its parts.
 */
export function PackExamPage() {
  const params = useParams()
  const packs = use(findPacks())
  const pack = packs.find((candidate) => candidate.id === params.pack)
  const description = pack && 'description' in pack ? pack.description : undefined
  const place = description && moduleOf(description, Number(params.exam), params.module ?? '')
  if (!description || !place) return <NotFound />
  return (
    <ModuleView
      key={`${description.id}/${place.exam.number}/${place.module.id}`}
      pack={description}
      exam={place.exam}
      module={place.module}
    />
  )
}

interface ModuleViewProps {
  pack: PackDescription
  exam: PackExam
  module: PackModule
}

function ModuleView({ pack, exam, module }: ModuleViewProps) {
  const { strings } = useLanguage()
  const key = use(loadAnswerKey(pack.id))
  const [search] = useSearchParams()
  const part = module.parts.find((candidate) => String(candidate.number) === search.get('part')) ?? module.parts[0]
  const [marks, setMarks] = useState<Partial<Record<number, SheetMarks>>>({})
  const [results, setResults] = useState<Partial<Record<number, SheetResult>>>({})

  const title = `${pack.name} · ${strings.packExam(exam.number)} · ${module.title}`
  const shown = part ?? module
  return (
    <main className="wrap wrap-wide">
      <PageTitle title={title} />
      <BackLink to="/packs">{strings.packsTitle}</BackLink>
      <header className="page-head">
        <h1>
          <bdi>{pack.name}</bdi> · {strings.packExam(exam.number)} ·{' '}
          <span lang="de" dir="ltr">
            {module.title}
          </span>
        </h1>
      </header>

      {module.parts.length > 1 && (
        <nav className="part-choice" aria-label={strings.parts}>
          {module.parts.map((candidate) => (
            <Link
              key={candidate.number}
              to={`?part=${candidate.number}`}
              replace
              className="pill"
              aria-current={candidate === part ? 'page' : undefined}
            >
              {strings.packPart(candidate.number)}
            </Link>
          ))}
        </nav>
      )}

      <div className="exam-view">
        <BookPages file={fileOfPack(pack.id, exam.pagesFile)} pages={shown.pages} bookPages={shown.sourcePages} />
        <div className="exam-view-side">
          {part ? (
            <PartSheet
              key={part.number}
              packId={pack.id}
              answerKey={key}
              exam={exam}
              module={module}
              part={part}
              marks={marks[part.number] ?? {}}
              onMarks={(next) => setMarks((before) => ({ ...before, [part.number]: next }))}
              result={results[part.number]}
              onResult={(result) => setResults((before) => ({ ...before, [part.number]: result }))}
            />
          ) : (
            <section className="panel message">
              <p>{strings.moduleNotScored}</p>
            </section>
          )}
          {module.parts.length > 0 && <ModuleResult module={module} results={results} />}
        </div>
      </div>
    </main>
  )
}

interface PartSheetProps {
  packId: string
  answerKey: PackAnswerKey | undefined
  exam: PackExam
  module: PackModule
  part: PackPart
  marks: SheetMarks
  onMarks: (marks: SheetMarks) => void
  result: SheetResult | undefined
  /** Undefined takes the result back, to answer the part again. */
  onResult: (result: SheetResult | undefined) => void
}

/** One part: its recordings, then its answer sheet, or its result once it is checked. */
function PartSheet({ packId, answerKey, exam, module, part, marks, onMarks, result, onResult }: PartSheetProps) {
  const { strings } = useLanguage()
  const answers = answerKey && answersOf(answerKey, exam.number, module.id, part)
  const next = module.parts[module.parts.indexOf(part) + 1]

  return (
    <>
      {part.recordings.length > 0 && <Recordings packId={packId} part={part} />}
      {!answers ? (
        <section className="panel message" role="alert">
          <p>{strings.answerKeyUnreadable}</p>
        </section>
      ) : result ? (
        <SheetResultView
          part={part.number}
          result={result}
          next={
            next && (
              <Link to={`?part=${next.number}`} replace className="btn btn-main">
                {strings.nextPart}
              </Link>
            )
          }
          onAnswerAgain={() => {
            onMarks({})
            onResult(undefined)
          }}
        />
      ) : (
        <AnswerSheet
          items={part.items}
          marks={marks}
          onMark={(item, choice) => onMarks({ ...marks, [item]: choice })}
          onCheck={() => onResult(scoreAnswerSheet(answers, marks))}
        />
      )}
    </>
  )
}

/** The recordings of a listening part, in playing order. They load when the learner presses play. */
function Recordings({ packId, part }: { packId: string; part: PackPart }) {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <section className="panel recordings" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {strings.recording}
      </h2>
      {part.recordings.map((recording, index) => (
        <figure key={recording.file} className="recording">
          {part.recordings.length > 1 && (
            <figcaption className="secondary">{strings.recordingOf(index + 1, part.recordings.length)}</figcaption>
          )}
          {/* Loaded only when the learner plays it, like every recording of the app. */}
          {/* biome-ignore lint/a11y/useMediaCaption: a recording from the learner's own book; the book has no captions to give. */}
          <audio controls preload="none" src={fileOfPack(packId, recording.file)} />
        </figure>
      ))}
    </section>
  )
}

/** Every part's result so far, and the module's score out of 100 once all are checked. */
function ModuleResult({ module, results }: { module: PackModule; results: Partial<Record<number, SheetResult>> }) {
  const { strings } = useLanguage()
  const id = useId()
  const checked = module.parts.map((part) => results[part.number])
  const all = checked.every((result) => result !== undefined)
  const total = scoreModule(checked.filter((result) => result !== undefined))

  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {/* The module's German name, kept left to right inside a right-to-left sentence. */}
        {strings.moduleResult(`⁦${module.title}⁩`)}
      </h2>
      {all ? (
        <>
          <p className="score">
            <span className="big-number">{strings.number(total.score)}</span>{' '}
            <span className="secondary">{strings.ofTotal(MAXIMUM_SCORE)}</span>
          </p>
          <p>{strings.rightOfTotal(total.correct, total.total)}</p>
        </>
      ) : (
        <p className="secondary">{strings.moduleScoreLater}</p>
      )}
      <dl className="module-scores part-scores">
        {module.parts.map((part, index) => {
          const result = checked[index]
          return (
            <div key={part.number}>
              <dt>{strings.packPart(part.number)}</dt>
              <dd className={result ? undefined : 'score-none'}>
                {result ? strings.partRight(result.correct, result.total) : strings.partNotChecked}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
