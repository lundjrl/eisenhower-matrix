export type QuadrantId = 1 | 2 | 3 | 4

export interface QuadrantConfig {
  id: QuadrantId
  title: string
  subtitle: string
  gridArea: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  colorVar: string
}

export const QUADRANTS: QuadrantConfig[] = [
  {
    id: 1,
    title: 'Do First',
    subtitle: 'Important & Urgent',
    gridArea: 'top-left',
    colorVar: '--quadrant-1-color',
  },
  {
    id: 2,
    title: 'Schedule',
    subtitle: 'Important & Not Urgent',
    gridArea: 'top-right',
    colorVar: '--quadrant-2-color',
  },
  {
    id: 3,
    title: 'Delegate',
    subtitle: 'Urgent & Not Important',
    gridArea: 'bottom-left',
    colorVar: '--quadrant-3-color',
  },
  {
    id: 4,
    title: 'Eliminate',
    subtitle: 'Neither Urgent Nor Important',
    gridArea: 'bottom-right',
    colorVar: '--quadrant-4-color',
  },
]
