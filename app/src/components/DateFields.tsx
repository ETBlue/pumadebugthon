import { t } from '@/i18n/zh-TW'
import { Field } from './Field'

/** The dates of an item as fields in a <dl> (decision 131). Each date is a
 * <time dateTime>. A missing date (null, undefined or "") is left out, so a
 * field never shows an empty value. */

/** 新增日期 and 更新日期: for the metadata of a detail page. */
export function DateFields({ added, updated }: { added?: string | null; updated?: string | null }) {
  return (
    <>
      {added && <Field label={t.dates.added}><time dateTime={added}>{added}</time></Field>}
      <UpdatedField updated={updated} />
    </>
  )
}

/** Only 更新日期: for a list card. A card never shows 新增日期. */
export function UpdatedField({ updated }: { updated?: string | null }) {
  if (!updated) return null
  return <Field label={t.dates.updated}><time dateTime={updated}>{updated}</time></Field>
}
