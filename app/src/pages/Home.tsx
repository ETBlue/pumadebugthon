import { t } from '@/i18n/zh-TW'

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">{t.appTitle}</h1>
      <p className="mt-4 text-muted-foreground">{t.home.placeholder}</p>
    </main>
  )
}
