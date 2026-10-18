import { Moon, Sun } from 'lucide-react'
import { t } from '@/i18n/zh-TW'
import { nextTheme } from '@/lib/theme'
import { useTheme } from '@/theme'

/** The theme switch (design 3.10). The button shows the theme it switches
 * to: a moon and 深色模式 in the light theme, a sun and 淺色模式 in the dark
 * theme. The text changes, so the button has no aria-pressed. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme()
  const next = nextTheme(theme)
  const Icon = next === 'dark' ? Moon : Sun
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm hover:bg-muted ${className}`}
    >
      <Icon aria-hidden="true" className="size-4" />
      {t.theme[next]}
    </button>
  )
}
