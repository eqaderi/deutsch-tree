import type { Language } from '../content-model/index.ts'
import { languageNames, useLanguage } from '../language/index.tsx'

/**
 * The language choice, on every page. Each language is named in itself, so a
 * learner finds their own whatever the page is showing.
 */
export function LanguageSwitch() {
  const { language, strings, setLanguage } = useLanguage()
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset cannot be laid out as one pill in every browser
    <div role="group" aria-label={strings.language} className="language-switch">
      {(Object.keys(languageNames) as Language[]).map((choice) => (
        <button
          key={choice}
          type="button"
          lang={choice}
          aria-pressed={choice === language}
          onClick={() => setLanguage(choice)}
        >
          <span>{languageNames[choice]}</span>
        </button>
      ))}
    </div>
  )
}
