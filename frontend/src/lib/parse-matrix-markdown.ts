import type {QuadrantId} from '~/lib/quadrants'

const MAX_TITLE_LENGTH = 200
const MAX_ITEM_COUNT = 200

const HEADING_PATTERN = /^#\s+Q([1-4])(?:[^\d].*)?$/
const NESTED_BULLET_PATTERN = /^[ \t]+-/
const TOP_LEVEL_BULLET_PATTERN = /^-\s*(?:\[[ xX]\]\s*)?(.*)$/

export interface ParsedMatrixItem {
  quadrant: QuadrantId
  title: string
}

export interface ParseMatrixMarkdownWarnings {
  skippedNestedBullets: number
  truncatedTitles: number
}

export interface ParseMatrixMarkdownSuccess {
  ok: true
  items: ParsedMatrixItem[]
  warnings: ParseMatrixMarkdownWarnings
}

export interface ParseMatrixMarkdownFailure {
  ok: false
  reason: string
}

export type ParseMatrixMarkdownResult = ParseMatrixMarkdownSuccess | ParseMatrixMarkdownFailure

const toQuadrantId = (match: RegExpMatchArray): QuadrantId => {
  return Number(match[1]) as QuadrantId
}

const truncateTitle = (title: string): {title: string; wasTruncated: boolean} => {
  const wasTruncated = title.length > MAX_TITLE_LENGTH

  if (!wasTruncated) return {title, wasTruncated}

  return {title: title.slice(0, MAX_TITLE_LENGTH), wasTruncated}
}

export const parseMatrixMarkdown = (markdown: string): ParseMatrixMarkdownResult => {
  const lines = markdown.split(/\r\n|\n/)

  let currentQuadrant: QuadrantId | null = null
  let sawAnyHeading = false
  let skippedNestedBullets = 0
  let truncatedTitles = 0

  const items: ParsedMatrixItem[] = []

  for (const line of lines) {
    const headingMatch = line.match(HEADING_PATTERN)

    if (headingMatch) {
      currentQuadrant = toQuadrantId(headingMatch)
      sawAnyHeading = true
      continue
    }

    if (currentQuadrant === null) continue

    if (NESTED_BULLET_PATTERN.test(line)) {
      skippedNestedBullets += 1
      continue
    }

    const bulletMatch = line.match(TOP_LEVEL_BULLET_PATTERN)

    if (!bulletMatch) continue

    const rawTitle = bulletMatch[1].trim()

    if (rawTitle === '') continue

    const {title, wasTruncated} = truncateTitle(rawTitle)

    if (wasTruncated) truncatedTitles += 1

    items.push({quadrant: currentQuadrant, title})
  }

  if (!sawAnyHeading) {
    return {
      ok: false,
      reason: 'No "# Q1" through "# Q4" headings were found, so nothing could be imported.',
    }
  }

  if (items.length > MAX_ITEM_COUNT) {
    return {
      ok: false,
      reason: `Found ${items.length} items, which is over the limit of ${MAX_ITEM_COUNT}. Nothing was imported.`,
    }
  }

  return {
    ok: true,
    items,
    warnings: {skippedNestedBullets, truncatedTitles},
  }
}
