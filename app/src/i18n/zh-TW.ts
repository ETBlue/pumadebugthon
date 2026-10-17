// All UI text of the app. Components never contain UI text directly.
// An English file (src/i18n/en.ts) can copy this shape later.
export const t = {
  appTitle: '市政議題利害關係人瀏覽器',
  home: {
    placeholder: '議題列表與利害關係人列表製作中。',
  },
  data: {
    loading: '資料載入中…',
    loadError: '資料載入失敗，請重新整理頁面再試一次。',
  },
  /** MoSCoW labels (design 3.4). */
  priority: {
    M: '必須有',
    S: '應該有',
    C: '可以有',
    W: '這次不做',
  },
} as const
