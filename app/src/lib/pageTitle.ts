import { t } from '@/i18n/zh-TW'

/** The text of the page <title>: the page parts, then the app title, for
 * example 「#2 找回消失的垃圾桶 · 解法 · 市政議題利害關係人瀏覽器」. Empty parts are left out. */
export function pageTitle(...parts: (string | null | undefined)[]): string {
  return [...parts.filter((p): p is string => !!p), t.appTitle].join(t.titleSeparator)
}
