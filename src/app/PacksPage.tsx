import { use, useId } from 'react'
import { Link } from 'react-router'
import type { PackDescription } from '../content-model/pack.ts'
import { useLanguage } from '../language/index.tsx'
import { findPacks, findPhoneAddress } from '../pack-loader/index.ts'
import { German } from './German.tsx'
import { BackToTree } from './NotFound.tsx'

/** The address of one module of one exam of a pack, in the private exam view. */
export function packModuleAddress(packId: string, exam: number, module: string): string {
  return `/packs/${packId}/${exam}/${module}`
}

/**
 * The learner's own exam books: the packs the pack loader found in the
 * private folder, each exam with its modules. With none, as on the public
 * site, the page explains where to put one. When a start file runs the app,
 * the page also gives the address a phone on the same Wi-Fi opens.
 */
export function PacksPage() {
  const { strings } = useLanguage()
  const packs = use(findPacks())
  const phone = use(findPhoneAddress())

  return (
    <main className="wrap">
      <title>{`${strings.packsTitle} · ${strings.appName}`}</title>
      <BackToTree />
      <header className="page-head">
        <h1>{strings.packsTitle}</h1>
        <p>{strings.packsIntro}</p>
      </header>

      {packs.length === 0 && <NoPack />}
      {packs.map((pack) =>
        'description' in pack ? (
          <PackCard key={pack.id} pack={pack.description} />
        ) : (
          <section key={pack.id} className="panel message" role="alert">
            <p>{strings.packUnreadable(pack.id)}</p>
          </section>
        ),
      )}
      {phone && <PhoneAddress address={phone} />}
    </main>
  )
}

/** The address of the app on the home network, for a phone or tablet. */
function PhoneAddress({ address }: { address: string }) {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <section className="panel message" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {strings.phoneTitle}
      </h2>
      <p>{strings.phoneIntro}</p>
      <p className="phone-address">
        <bdi dir="ltr">{address}</bdi>
      </p>
      <p className="secondary">{strings.phoneProgress}</p>
    </section>
  )
}

/** Where to put a pack, said when the loader found none. */
function NoPack() {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <section className="panel message" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {strings.noPackTitle}
      </h2>
      {strings.noPackSteps.map((step) => (
        <p key={step}>{step}</p>
      ))}
    </section>
  )
}

function PackCard({ pack }: { pack: PackDescription }) {
  const { strings } = useLanguage()
  const id = useId()
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="pack-name">
        <bdi>{pack.name}</bdi>
      </h2>
      <p className="secondary">{strings.examCount(pack.exams.length)}</p>
      <ul className="pack-exams">
        {pack.exams.map((exam) => (
          <li key={exam.number} className="pack-exam">
            <span className="pack-exam-name">{strings.packExam(exam.number)}</span>
            <span className="pack-modules">
              {exam.modules.map((module) => (
                <Link key={module.id} to={packModuleAddress(pack.id, exam.number, module.id)} className="pill">
                  <German>{module.title}</German>
                </Link>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
