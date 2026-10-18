import { t } from '@/i18n/zh-TW'

export default function Home() {
  return (
    <>
      <h1 className="text-2xl font-bold">{t.appTitle}</h1>
      <p className="mt-4 text-muted-foreground">{t.home.placeholder}</p>
    </>
  )
}
