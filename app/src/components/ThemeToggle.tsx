import { Moon } from 'lucide-react'
import { t } from '@/i18n/zh-TW'
import { nextTheme } from '@/lib/theme'
import { useTheme } from '@/theme'

/** The dark theme switch (design 3.10). A toggle button: pressed = dark. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={() => setTheme(nextTheme(theme))}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm hover:bg-muted aria-pressed:bg-muted ${className}`}
    >
      <Moon aria-hidden="true" className={`size-4 ${dark ? 'fill-current' : ''}`} />
      {t.theme.dark}
    </button>
  )
}
