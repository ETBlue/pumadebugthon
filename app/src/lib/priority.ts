// Priority labels and counts (design 3.4).
import { t } from '@/i18n/zh-TW'
import type { Priority, PriorityTag, Story } from '@/types'

/** Display order of priorities. */
export const PRIORITIES: readonly Priority[] = ['M', 'S', 'C', 'W']

/** Display order of priority tags: 實證, AI整理, AI模擬. */
export const PRIORITY_TAGS: readonly PriorityTag[] = ['實證', 'AI整理', 'AI模擬']

export interface PriorityCount {
  priority: Priority
  n: number
}

export interface TagPriorityCounts {
  tag: PriorityTag
  counts: PriorityCount[]
}

/** The zh-TW label of a MoSCoW letter, for example 'M' -> 必須有. */
export function priorityLabel(p: Priority): string {
  return t.priority[p]
}

/** Counts per priority tag. One entry per tag that the stories use (in the
 * order of PRIORITY_TAGS). Counts are in the order M, S, C, W. Zero values are left out. */
export function priorityCounts(stories: readonly Pick<Story, 'priority' | 'priorityTag'>[]): TagPriorityCounts[] {
  const result: TagPriorityCounts[] = []
  for (const tag of PRIORITY_TAGS) {
    const ofTag = stories.filter((s) => s.priorityTag === tag)
    if (ofTag.length === 0) continue
    const counts = PRIORITIES.map((priority) => ({ priority, n: ofTag.filter((s) => s.priority === priority).length }))
    result.push({ tag, counts: counts.filter((c) => c.n > 0) })
  }
  return result
}
