import { t } from '@/i18n/zh-TW'
import { TagBadge } from './TagBadge'

/** The notice on every page (design 3.5). */
export function Notice() {
  return (
    <aside aria-label={t.notice.label} className="rounded-md border bg-muted/60 px-4 py-3 text-sm leading-relaxed">
      <p>{t.notice.personal}</p>
      <p className="mt-1">
        {t.notice.aiBefore}
        <TagBadge kind="AI模擬" className="mx-1" />
        {t.notice.aiAfter}
      </p>
      <p className="mt-1">
        {t.notice.summaryBefore}
        <TagBadge kind="AI整理" className="mx-1" />
        {t.notice.summaryAfter}
      </p>
    </aside>
  )
}
