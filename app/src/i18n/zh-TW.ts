// All UI text of the app. Components never contain UI text directly.
// An English file (src/i18n/en.ts) can copy this shape later.
export const t = {
  appTitle: '市政議題利害關係人瀏覽器',
  layout: {
    skipLink: '跳到主要內容',
    footerNav: '專案連結',
    repo: 'GitHub 原始碼',
    method: '如何閱讀議題分析',
  },
  /** Design 3.5: shown on every page. */
  notice: {
    label: '說明',
    personal: '這是一位個人參加者用 AI 協助製作的作品，與主辦單位無關，也不代表主辦單位或市府的立場。',
    aiBefore: '標記',
    aiAfter: '的內容由 AI 推想，不是真實訪談，也不是真實市民的話。',
  },
  /** Tag badges (design 3.5). */
  tags: {
    實證: '實證',
    AI模擬: 'AI模擬',
    pending: '待補',
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
  priorityCounts: {
    separator: ' · ',
    noStories: '沒有故事',
    legend:
      '優先順序（MoSCoW）：必須有、應該有、可以有、這次不做。這是這位利害關係人自己有多需要這則故事，不是利害關係人之間的排名。',
  },
  story: {
    want: '我想要…',
    soThat: '以便…',
    source: '來源',
    priority: '優先順序',
  },
  home: {
    intro: '整理臺北市政議題的利害關係人、使用者故事、衝突與解法，讓你在參與討論前，先看見各方的關注。',
    issuesHeading: '議題',
    stakeholdersHeading: '利害關係人',
    spaceFilter: '依空間類型篩選議題',
    spaceFilterHint: '選了多個空間類型時，列出使用其中任一種的議題。',
    noIssues: '沒有符合的議題。',
  },
  issueCard: {
    numberTitle: (n: number, title: string) => `#${n} ${title}`,
    inProgress: '製作中',
    stakeholders: '利害關係人',
    stakeholdersValue: (o: number, i: number) => `${o + i} 位（組織 ${o}、個人 ${i}）`,
    stories: '使用者故事',
    storiesValue: (n: number) => `${n} 則`,
    conflicts: '衝突',
    solutions: '解法',
    itemsValue: (n: number) => `${n} 個`,
    shared: '跨議題共用的利害關係人',
    sharedValue: (n: number, issues: number[]) =>
      issues.length > 0 ? `${n} 位，也出現在 ${issues.map((i) => `#${i}`).join('、')}` : `${n} 位`,
    evidence: '實證比例',
    evidenceValue: (n: number, total: number) => `我想要… ${n}／${total}`,
    evidenceHint: '「我想要…」有實證標記的故事數／全部故事數',
    updated: '更新日期',
    spaces: '空間類型',
  },
  stakeholderList: {
    filters: '篩選利害關係人',
    crossIssueOnly: '只看跨議題',
    focus: '特別關注',
    countNote: '故事數只表示分析寫了多少，不代表重要程度。',
    organizations: '組織',
    individuals: '個人',
    storyTotal: (n: number) => `${n} 則故事`,
    issueEntry: (n: number) => `#${n}`,
    focusLabel: '特別關注：',
    none: '沒有符合的利害關係人。',
  },
  placeholder: {
    title: '這一頁製作中',
    body: '這一頁還在製作中。請先回到首頁。',
    notFoundTitle: '找不到這一頁',
    notFoundBody: '網址可能打錯了，或這一頁已經移除。',
    backHome: '回到首頁',
  },
} as const
