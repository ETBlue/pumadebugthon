// Follow the system color scheme. The shadcn theme tokens in index.css use
// the .dark class on <html>.
export function followSystemTheme(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => document.documentElement.classList.toggle('dark', media.matches)
  apply()
  media.addEventListener('change', apply)
}
