/** One place where a profile's pattern matches the text of a page. */
export interface Match {
  index: number
  end: number
  /** The numbered groups, from group 1. */
  groups: Array<string | undefined>
  named: Record<string, string | undefined>
}

/** Every match of a profile pattern in a text. `^` and `$` stand for the start and end of a line. */
export function matches(source: string, text: string): Match[] {
  return [...text.matchAll(new RegExp(source, 'gmu'))].map((match) => ({
    index: match.index,
    end: match.index + match[0].length,
    groups: match.slice(1),
    named: { ...match.groups },
  }))
}
