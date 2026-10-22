// All UI text of the app. Components never contain UI text directly.
// An English file (src/i18n/en.ts) can copy this shape later.
import type { TabLabel } from '@/lib/tabLabel'

export const t = {
  appTitle: '市政提案小幫手',
  /** Shown under the h1 on the home page, and in the index.html meta description. */
  appSubtitle: '在提案之前，先看見各方利害關係人的關注',
  /** Between the parts of the page <title>. */
  titleSeparator: ' · ',
  /** Between the items of a short inline list, for example 「#1、#2、#8」. */
  listSeparator: '、',
  layout: {
    skipLink: '跳到主要內容',
    /** For screen readers, after a link that opens a new tab. */
    newTab: '（在新分頁開啟）',
  },
  /** The header links with counts (design 3.7). */
  header: {
    nav: '主要導覽',
    issues: '議題',
    stakeholders: '利害關係人',
    spaces: '空間',
    solutions: '解法',
  },
  /** The page footer (design 3.8). */
  footer: {
    contextHeading: '這是什麼',
    context: '市政提案小幫手是 ETBlue 為「市政 debug 松」製作的參加作品。它把臺北市政議題的分析整理成結構化資料，讓你看見每個議題的利害關係人、他們的關注和可能的解法。',
    disclaimerHeading: '免責聲明',
    personal: '這是一位參加者個人用 AI 協助製作的作品，與主辦單位和臺北市政府沒有關係，也不代表他們的立場。',
    simulated: '的內容由 AI 推想，不是真實訪談，也不是真實市民的話。',
    summary: '的內容由 AI 從真實資料或新聞報導整理，還沒有經過真人查核。資料的件數是估計。',
    nav: '網站資訊',
    about: '關於本站',
  },
  /** The about page #/about (design 3.13). */
  about: {
    title: '關於本站',
    intro: '市政提案小幫手的活動、原始碼、授權、資料檔案和相關文章。',
    linksHeading: '專案連結',
    repo: 'GitHub 原始碼',
    method: '如何閱讀議題分析',
    /** The official event page of the hackathon. */
    event: '市政 debug 松活動頁面',
    licenseHeading: '授權',
    code: '程式碼：',
    mit: 'MIT 授權',
    content: '作者製作的內容：',
    ccBy: '創用 CC 姓名標示 4.0（CC BY 4.0）',
    exceptions: '主辦單位的內容依主辦單位的規定使用。開放資料依各資料集的授權使用。',
    dataHeading: '下載資料',
    dataIntro: '本站使用的資料，歡迎在授權範圍內再利用。',
    json: 'JSON（本站讀取的檔案）',
    csv: 'CSV（GitHub 上的分析檔案）',
    issueFile: (n: number, file: string) => `#${n} ${file}`,
    dataLicense: '分析內容採用 CC BY 4.0 授權，例外見 ',
    contentLicenseFile: 'LICENSE-CONTENT.md',
    dataLicenseEnd: '：主辦單位的內容依主辦單位的規定使用；從主辦單位的市民資料整理出的內容，只限於這次黑客松使用。',
    postsHeading: '作者的相關文章',
  },
  /** The list pages (design 3.9). */
  lists: {
    issuesTitle: '議題',
    stakeholdersTitle: '利害關係人',
    solutionsTitle: '解法',
    solutionSpaces: '空間類型',
    /** The number of needs a solution covers, as plain text (decision 54). */
    solutionNeeds: (n: number) => `涵蓋 ${n} 個需求`,
  },
  /** The theme toggle in the header (design 3.10). A toggle button: the
   * name stays the same, and aria-pressed says if dark is on. */
  /** The theme button shows the theme it switches to. */
  theme: {
    dark: '深色模式',
    light: '淺色模式',
  },
  /** The watermark over every page (design 3.11). */
  watermark: '市政 debug 松參加者作品・展示用 MVP',
  /** Tag badges (design 3.5). */
  tags: {
    實證: '實證',
    AI整理: 'AI整理',
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
  /** One story in a short list (StoryLines, the cards of the issue's
   * 利害關係人 tab, decision 116): 「我想要 …，以便 …」. */
  storyLine: {
    want: '我想要',
    soThat: '，以便',
    priority: '優先順序：',
    /** The name of the list of one stakeholder's stories. */
    listLabel: (name: string) => `${name}的故事`,
  },
  story: {
    want: '我想要…',
    soThat: '以便…',
    source: '來源',
    priority: '優先順序',
    /** The links of a StoryCard to its want and its need on the issue tabs
     * (decision 57), for example 「訴求 W08」 and 「需求 N07」. */
    wantLink: (key: string) => `訴求 ${key}`,
    needLink: (key: string) => `需求 ${key}`,
  },
  /** 「#2 A」: a solution in a list across issues. */
  solutionId: (issueNumber: number, id: string) => `#${issueNumber} ${id}`,
  /** The home page (design 3.1): the hero and three blocks. */
  home: {
    intro: '這個網站整理臺北市政議題的分析：每個議題有哪些利害關係人、他們想要什麼、彼此有哪些衝突，以及可能的解法。',
    audience: '想參與政策討論的市民，可以在提出意見之前，先看見其他人的關注。公務員和公民科技社群，也可以依利害關係人或空間，查找以前的分析再利用。',
    issuesHeading: '最近更新的議題',
    /** The visible text of the 3 links next to the block headings. */
    all: '看全部',
    issuesAll: '看全部議題',
    issuesNone: '目前沒有已完成分析的議題。',
    stakeholdersHeading: '最近加入分析的族群',
    stakeholdersAll: '看全部利害關係人',
    stakeholdersNone: '目前沒有利害關係人。',
    solutionsHeading: '最近分析出的解法',
    solutionsAll: '看全部解法',
    solutionsNone: '目前沒有解法。',
    added: '加入日期',
    solutionAdded: '新增日期',
    issues: '出現的議題',
    /** The issue of a solution card: 「議題 #2 找回消失的垃圾桶」 (decision 112). */
    solutionIssue: '議題',
  },
  issueCard: {
    numberTitle: (n: number, title: string) => `#${n} ${title}`,
    inProgress: '製作中',
    participantNote: '非主辦單位題目，由參加者補充',
    stakeholders: '利害關係人',
    stakeholdersValue: (o: number, i: number) => `${o + i} 位（組織 ${o}、個人 ${i}）`,
    stories: '使用者故事',
    storiesValue: (n: number) => `${n} 則`,
    conflicts: '衝突',
    solutions: '解法',
    itemsValue: (n: number) => `${n} 個`,
    shared: '跨議題共用的利害關係人',
    /** titles: 「#1 把三千棵樹種回來」 (decision 112). */
    sharedValue: (n: number, titles: string[]) =>
      titles.length > 0 ? `${n} 位，也出現在 ${titles.join('、')}` : `${n} 位`,
    /** 新增日期 on the detailed card (design 3.23.9). */
    added: '新增日期',
    updated: '更新日期',
    spaces: '空間類型',
    /** 特別關注族群 (design 3.9). Never a count like 「4／6」: it reads like a score. */
    focusGaps: '尚未納入的特別關注族群',
    focusGapsValue: (groups: string[]) => groups.join('、'),
    focusAll: '特別關注族群',
    focusAllValue: '都已納入',
  },
  stakeholderList: {
    /** The name of the menu box at the top of the 利害關係人 tab (decision 115). */
    menu: '篩選與展開',
    /** The labels of the groups in the menu bar (decision 116). 特別關注 is
     * the label of its own group (focus). */
    filterGroup: '篩選',
    levelGroup: '分類層級',
    expandAll: '全部展開',
    collapseAll: '全部收合',
    crossIssueOnly: '只看跨議題',
    focus: '特別關注',
    countNote: '故事數只表示分析寫了多少，不代表重要程度。',
    /** Added to the count note while 只看有資料根據 is on (decision 116). */
    countNoteDataBased: '目前只算標記 [實證] 或 [AI整理] 的故事。',
    organizations: '組織',
    individuals: '個人',
    storyTotal: (n: number) => `${n} 則故事`,
    none: '沒有符合的利害關係人。',
  },
  /** StakeholderCard (design 3.9). */
  stakeholderCard: {
    focusLabel: '特別關注：',
  },
  issue: {
    notFoundTitle: '找不到這個議題',
    notFoundBody: '網址裡的議題編號可能打錯了。',
    unavailableBody: '這個議題的分析還在製作中，目前還不能打開。',
    tabNotFound: '找不到這個分頁。',
    tabsLabel: '議題內容',
    spaces: '空間類型',
    updated: '更新日期',
    backHome: '回到首頁',
    goToOverview: '回到總覽',
    /** The tab names, also for the page title (design 3.2). */
    tabs: {
      overview: '總覽',
      wants: '訴求',
      needs: '需求',
      solutions: '解法',
      // The 分析摘要 topics (decision 102), with short names so the tab list
      // is shorter on a phone (ETBlue, 2026-10-22). The full names are in
      // summaryHeadings.
      decisions: '難以取捨',
      controversies: '可能爭議',
      // The stakeholders and the 受影響較大的弱勢族群 rows (decision 109).
      stakeholders: '利害關係人',
      legal: '法規障礙',
      dependencies: '相關解法與政策',
    },
    /** The full names of the 分析摘要 topics, for the hidden h2 of each topic
     * tab (decision 102). The tab list and the page title use the short names. */
    summaryHeadings: {
      decisions: '難以取捨的決定',
      controversies: '可能的爭議',
      legal: '法規上的障礙',
      dependencies: '相依事項與現行政策的關係',
    },
    /** The tab labels with the counts of the issue (issueTabCounts and
     * summaryTabCounts). A count is a plain number, not a score. */
    tabLabels: {
      wants: (wants: number, conflicts: number): TabLabel => ({ main: `訴求 ${wants}`, sep: '・', sub: `衝突 ${conflicts}` }),
      needs: (n: number): TabLabel => ({ main: `需求 ${n}` }),
      solutions: (n: number): TabLabel => ({ main: `解法 ${n}` }),
      /** 「利害關係人 28・弱勢 4」 (decision 109): the stakeholders of the
       * issue and the filled rows of 受影響較大的弱勢族群. */
      stakeholders: (n: number, disadvantaged: number): TabLabel => ({
        main: `利害關係人 ${n}`, sep: '・', sub: `弱勢 ${disadvantaged}`,
      }),
      /** A 分析摘要 topic tab, for example 「可能的爭議 5」. */
      summary: (name: string, n: number): TabLabel => ({ main: `${name} ${n}` }),
    },
    /** The 分析摘要 topic tabs (design 3.2, decision 102). */
    summaryTab: {
      /** One short line at the top of each topic tab. */
      intro: '分析摘要不加入新的事實，每一項都列出它來自哪些故事、衝突或解法。大部分是 AI 的判斷。',
      none: '這個議題的這一項還沒有內容。',
      /** The end of the filter status line (decision 108). */
      shown: (n: number) => `顯示 ${n} 項。`,
      /** When 「只看有資料根據」 hides every row (decision 108). */
      dataEmpty: '這裡沒有說明標記 [實證] 或 [AI整理] 的項目。',
    },
    /** The 利害關係人 tab (design 3.2, decision 115). */
    stakeholdersTab: {
      /** The groups that the issue has not included yet, in the fixed order. */
      notIncluded: (groups: string[]) => `本議題尚未納入：${groups.join('、')}`,
      /** When the issue has included every group. */
      allIncluded: '本議題已納入所有特別關注族群',
    },
  },
  overview: {
    /** 分析摘要 (design 3.2, decision 29): the refs line of a row. The rows
     * are on the topic tabs now (decision 102). */
    summaryRefs: '相關：',
    legendHeading: '標記說明',
    legend: {
      實證: '有來源連結或可查證的出處，或 AI 整理的內容已經由真人查核。',
      AI整理: '由 AI 從真實資料（附有件數）或新聞報導（附有來源）整理，還沒有經過真人查核。件數是估計。',
      AI模擬: '由 AI 推想，背後沒有資料。不是真實訪談，也不是真實市民的話，需要真人確認。',
      pending: '需要真人提供的資訊。括號內寫缺少什麼。',
    },
    methodLink: '完整說明：如何閱讀議題分析',
    sameSpaceHeading: '使用相同空間的議題',
    sameSpaceNone: '目前沒有其他議題使用相同的空間類型。',
    sameSpaceSeparator: '：',
    pendingHeading: '待補清單',
    pendingIntro: '這些地方還需要真人提供資訊。',
    pendingNone: '這個議題沒有待補的項目。',
    noSection: '其他',
  },
  /** 資料根據 (design 3.2, 3.9): the story cells (我想要… and 以便…) by tag. */
  basis: {
    label: '資料根據',
    parts: { evidence: '實證', aiSummary: 'AI整理', aiSimulated: 'AI模擬', pending: '待補' },
    separator: '・',
    totals: (cells: number, stories: number) => `（共 ${cells} 格，來自 ${stories} 則故事）`,
    evidencePercent: (p: number) => `實證 ${p}%`,
    /** Shown once on the overview tab. */
    note: '這是分析內容的資料來源組成，不代表議題的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。',
    /** Shown once on a list page, not on each card. subject: what the list
     * shows. The home page, the space page and #/issues list issues
     * (議題); #/stakeholders and #/solutions name their own items
     * (decision 100). */
    listNote: (subject: '議題' | '利害關係人' | '解法') =>
      `「資料根據」是分析內容的資料來源組成，不代表${subject}的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。`,
  },
  /** The 「只看有資料根據」 filter (design 3.5). It keeps [實證] and [AI整理]. */
  dataBasisFilter: {
    label: '只看有資料根據',
    hint: '顯示標記 [實證] 或 [AI整理] 的內容。',
    empty: '這裡沒有標記 [實證] 或 [AI整理] 的故事。',
    pickEmpty: '沒有標記 [實證] 或 [AI整理] 的項目。',
    /** Shown in a pick item: 「其中 3 則有資料根據」. */
    countInItem: (n: number) => `其中 ${n} 則有資料根據`,
  },
  /** The 訴求 tab of the issue page (WantsTab, design 3.2 and section 4). */
  wantsTab: {
    checkHeading: '訴求與意見健檢',
    intro: '訴求是利害關係人心中的解法，還沒有評估。選一個和你的想法相近的訴求，看看誰也想要、誰可能有不同意見。',
    searchLabel: '搜尋訴求',
    listLabel: '選一個和你的想法相近的訴求',
    /** The list is empty because of the stakeholder filter. */
    noWants: '這位利害關係人在這個議題沒有訴求。',
    /** With a 特別關注 chip on (decision 75). */
    noWantsFiltered: '沒有符合目前篩選的訴求。',
    conflictsHeading: '衝突',
    conflictsNone: '這個議題沒有列出衝突。',
    /** No conflict has a story of the picked stakeholder on a side. */
    conflictsNoneFiltered: '這位利害關係人沒有出現在衝突的任何一方。',
    /** With a 特別關注 chip on (decision 75). */
    conflictsNoneSpecial: '沒有符合目前篩選的衝突。',
  },
  /** The issue page's 解法 tab (design 3.2). */
  solutionsTab: {
    spaces: '空間類型',
    needs: '涵蓋的需求',
    /** The two parts of step 6.2. */
    must: '必須有',
    shouldCould: '應該有、可以有',
    needsNone: '分析裡沒有列出這個解法涵蓋的需求。',
    /** The stakeholders of a need, as plain IDs. */
    needStakeholders: '利害關係人：',
    wayOut: '解開的衝突',
    /** With a stakeholder picked: a link to the solution's 需求 tab. */
    otherNeeds: (n: number) => `這個解法還涵蓋其他 ${n} 個需求`,
    none: '這個議題沒有列出解法。',
    /** With 只看有資料根據 on and no stakeholder or group picked: every
     * solution is hidden (decision 77). */
    noneData: '沒有解法涵蓋標記 [實證] 或 [AI整理] 的需求。',
    /** With a 特別關注 chip on (decision 75). */
    noneFiltered: '沒有符合目前篩選的解法。',
    noneForStakeholder: '沒有解法涵蓋這位利害關係人的需求。',
    /** With 只看有資料根據 on and a stakeholder picked (decision 74). */
    noneForStakeholderData: '沒有解法涵蓋這位利害關係人標記 [實證] 或 [AI整理] 的需求。',
  },
  /** The issue page's 需求 tab (design 3.2). */
  needsTab: {
    intro: '需求是利害關係人得到的好處（以便…）。需求之間不會衝突。優先順序（MoSCoW）是這些利害關係人有多需要它，不是利害關係人之間的排名。',
    /** Decision 52: an issue in the old format has no needs list. */
    oldFormat: '本議題使用舊格式，沒有需求列表',
    none: '這個議題沒有列出需求。',
    noneForStakeholder: '這位利害關係人在本議題沒有需求。',
    /** With a 特別關注 chip on (decision 75). */
    noneFiltered: '沒有符合目前篩選的需求。',
    dataEmpty: '這裡沒有以便… 標記 [實證] 或 [AI整理] 的需求。',
  },
  opinion: {
    searchHint: '輸入文字，篩選下面的清單。',
    matchCount: (n: number, total: number) => `符合 ${n} 項（共 ${total} 項）`,
    noMatch: '沒有符合的項目。請換一個詞再試。',
    unknownPick: '找不到網址裡選的項目。請從清單重新選一次。',
    resultHeading: '結果',
    picked: '你選的是：',
    sameHeading: '同樣想要的人',
    sameNone: '沒有找到。',
    otherHeading: '可能有不同意見的人',
    otherNone: '分析裡沒有和這個意見衝突的故事。',
    otherStories: '另一方的故事',
    method: '可能的審議方法',
    result: '模擬結果',
    solutionsHeading: '相關解法',
    solutionsNone: '分析裡沒有解法涵蓋這個意見。',
    notMentionedHeading: '這個意見沒有直接提到的人',
    notMentionedPrompt: '你的意見會影響他們嗎？',
    notMentionedNone: '這個議題的利害關係人都已經在上面出現。',
    /** titles: 「#1 把三千棵樹種回來」 (decision 112). */
    alsoIn: (titles: string[]) => `也出現在 ${titles.join('、')}`,
    /** Accessible name of the 「也出現在」 link. The visible text is the same
     * for many stakeholders, so the name adds who it is and the issue titles.
     * Each item of issues is 「#1 把三千棵樹種回來」. */
    alsoInLabel: (id: string, name: string, issues: string[]) => `${id} ${name} 也出現在 ${issues.join('、')}`,
  },
  stakeholderPage: {
    notFoundTitle: '找不到這位利害關係人',
    notFoundBody: (id: string) => `沒有編號 ${id} 的利害關係人。網址裡的編號可能打錯了。`,
    backHome: '回到首頁',
    movedNote: (from: string, to: string) => `${from} 已改為 ${to}`,
    /** The link on the not-found page of a moved ID (decision 113). */
    movedLink: (to: string) => `這個編號已改為 ${to}`,
    id: '編號',
    path: '分類路徑',
    focus: '特別關注',
    issues: '出現的議題',
    noIssues: '這位利害關係人目前沒有出現在已完成分析的議題。',
    /** The page of a stakeholder with no issue and no move target (decision 78). */
    noIssueNote: '這位利害關係人目前沒有出現在任何議題中。',
    relation: '與本題的關係',
    relationNone: '分析裡沒有寫這位利害關係人與本題的關係。',
    priorityCounts: '優先順序',
    stories: '使用者故事',
    storiesNone: '這個議題沒有這位利害關係人的故事。',
    /** 訴求 tab (design 3.3). */
    wantsHeading: '訴求',
    wantsNone: '這個議題沒有這位利害關係人的訴求。',
    conflicts: '衝突',
    conflictsNone: '分析裡沒有和這位利害關係人的故事衝突的項目。',
    /** 需求 tab (design 3.3). */
    needsNone: '這個議題沒有這位利害關係人的需求。',
    /** 解法 tab (design 3.3). */
    solutionsHeading: '涵蓋這些需求的解法',
    solutionsNone: '還沒有解法涵蓋這位利害關係人的需求。',
    /** No issue solution covers its needs in this issue, but a cross-issue
     * solution covers some of them (decision 124). */
    solutionsNoneCrossOnly: '這個議題的解法沒有涵蓋這位利害關係人的需求。有些需求由下方的跨議題解法涵蓋。',
    coveredNeeds: '涵蓋的需求：',
    uncoveredNeeds: '尚未有解法涵蓋的需求',
    uncoveredNeedsNone: '這位利害關係人的需求都有解法涵蓋。',
    /** The cross-issue part of the 解法 tab, after the issues (decision 119). */
    crossSolutionsHeading: '跨議題解法',
    crossSolutionsIntro: '這些跨議題解法涵蓋這位利害關係人在上面議題裡的需求。',
    inputSources: '可能的輸入來源',
    inputSourcesNone: '分析裡沒有為這位利害關係人列出輸入來源。',
    inputFit: '適合的利害關係人：',
    inputNote: '注意事項：',
    /** The tabs (design 3.3). The names are also for the page title. */
    tabsLabel: '利害關係人內容',
    tabs: {
      overview: '總覽',
      wants: '訴求',
      needs: '需求',
      solutions: '解法',
    },
    /** The tab labels with the counts summed over the issues (decision 48). */
    tabLabels: {
      wants: (wants: number, conflicts: number): TabLabel => ({ main: `訴求 ${wants}`, sep: '・', sub: `衝突 ${conflicts}` }),
      needs: (n: number): TabLabel => ({ main: `需求 ${n}` }),
      solutions: (n: number): TabLabel => ({ main: `解法 ${n}` }),
    },
    tabNotFound: '找不到這個分頁。',
    goToOverview: '回到總覽',
  },
  /** The breadcrumb of the story page (design 3.15, decisions 99 and 111). */
  breadcrumb: {
    /** The aria-label of the nav. */
    label: '頁面位置',
    home: '首頁',
    stakeholders: '利害關係人',
  },
  /** The back button in the band of the detail pages (decision 111). */
  backLink: {
    issues: '回到議題列表',
    stakeholders: '回到利害關係人列表',
    solutions: '回到解法列表',
    spaces: '回到空間列表',
    /** The story page: the visible text 「回到 I06」. */
    stakeholderShort: (id: string) => `回到 ${id}`,
    /** The story page: the accessible name, which starts with the visible text. */
    stakeholder: (id: string, name: string) => `回到 ${id} ${name}`,
  },
  /** The story page #/stakeholders/:id/stories/:number/:storyId (design 3.15). */
  storyPage: {
    /** The h1 and the last breadcrumb item: 「#2 I06-US01」. */
    title: (n: number, storyId: string) => `#${n} ${storyId}`,
    notFoundTitle: '找不到這則使用者故事',
    notFoundBody: (n: string, storyId: string) => `#${n} 沒有編號 ${storyId} 的使用者故事。網址可能打錯了，或這個議題的分析還在製作中。`,
    stakeholderLink: (id: string, name: string) => `看 ${id} ${name} 的頁面`,
    issueLink: (title: string) => `看 ${title}`,
    backHome: '回到首頁',
    /** The story itself: three labeled lines (design 3.15). */
    storyHeading: '故事內容',
    asA: '身為',
    want: '我想要…',
    soThat: '以便…',
    /** The fields under the story. */
    source: '來源',
    priority: '優先順序',
    priorityNote: '這是這則故事的需求的優先順序。',
    issue: '議題',
    /** 訴求 and 需求 (design 3.15, 3.16). */
    wantHeading: '訴求',
    wantLink: (n: number, key: string) => `在 #${n} 的訴求分頁看 ${key}`,
    wantGroup: (id: string) => `相同訴求群組 ${id}：`,
    wantOthers: '同樣想要的人',
    wantOthersNone: '沒有其他利害關係人有這個訴求。',
    wantNoGroup: '這則故事不在任何相同訴求群組裡。',
    needHeading: '需求',
    needLink: (n: number, key: string) => `在 #${n} 的需求分頁看 ${key}`,
    needGroup: (id: string) => `相同需求群組 ${id}：`,
    needOthers: '同樣需要的人',
    needOthersNone: '沒有其他利害關係人有這個需求。',
    needNoGroup: '這則故事不在任何相同需求群組裡。',
    conflictsHeading: '衝突',
    conflictsNone: '這則故事沒有出現在衝突裡。',
    solutionsHeading: '解法',
    solutionsIntro: '涵蓋這則故事的需求的解法：',
    solutionsNone: '尚未有解法涵蓋這則故事的需求。',
    solutionsWontDo: '這則故事的需求這次不做，所以沒有解法涵蓋。',
    moreHeading: '更多',
    pickLink: (n: number) => `到 #${n} 做意見健檢`,
  },
  /** The solution page #/solutions/<n>-<code> (design 3.12). */
  solutionPage: {
    /** The tabs (design 3.12, decision 103). The names are also for the page title. */
    tabsLabel: '解法內容',
    tabs: {
      overview: '總覽',
      needs: '需求',
      wants: '訴求',
      stakeholders: '利害關係人',
      conflicts: '衝突',
      measures: '成效衡量',
      policies: '相關政策',
    },
    /** The tab labels with the counts (solutionTabCounts). Plain numbers:
     * no percent, no bar. */
    tabLabels: {
      needs: (covered: number, notCovered: number): TabLabel => ({
        main: '需求', sep: '　', sub: `涵蓋 ${covered}・未涵蓋 ${notCovered}`,
      }),
      wants: (covered: number, notCovered: number): TabLabel => ({
        main: '訴求', sep: '　', sub: `涵蓋 ${covered}・未涵蓋 ${notCovered}`,
      }),
      stakeholders: (covered: number, notCovered: number): TabLabel => ({
        main: '利害關係人', sep: '　', sub: `涵蓋 ${covered}・未涵蓋 ${notCovered}`,
      }),
      conflicts: (wayOut: number, related: number): TabLabel => ({
        main: '衝突', sep: '　', sub: `解開 ${wayOut}・相關 ${related}`,
      }),
      measures: (n: number): TabLabel => ({ main: `成效衡量 ${n}` }),
      policies: (domestic: number, foreign: number): TabLabel => ({
        main: '相關政策', sep: '　', sub: `國內 ${domestic}・國外 ${foreign}`,
      }),
    },
    tabNotFound: '找不到這個分頁。',
    goToOverview: '回到總覽',
    slugNotFoundBody: (slug: string) => `沒有代號為 ${slug} 的解法。網址可能打錯了。`,
    /** The second part of the page title: 「#2 A 名稱 · 解法 · 市政提案小幫手」. */
    titlePart: '解法',
    issueNotFoundTitle: '找不到這個議題',
    issueNotFoundBody: '網址裡的議題編號可能打錯了，或這個議題的分析還在製作中。',
    notFoundTitle: '找不到這個解法',
    notFoundBody: (n: number, code: string) => `#${n} 沒有代號為 ${code} 的解法。網址可能打錯了。`,
    issueSolutionsLink: (n: number) => `看 #${n} 的所有解法`,
    allSolutionsLink: '看全部議題的解法',
    issuesLink: '看全部議題',
    backHome: '回到首頁',
    spaces: '空間類型',
    added: '新增日期',
    /** The line under the h1 (design 3.12): 「議題：#2 找回消失的垃圾桶」. */
    issueLine: '議題：',
    groupsHeading: '涵蓋的相同訴求群組',
    groupsIntro: '「全部」表示群組裡每一則故事都被這個解法涵蓋；「部分」表示只涵蓋其中幾則。',
    groupsNone: '這個解法沒有涵蓋相同訴求群組。',
    groupFull: '全部',
    groupPartial: '部分',
    groupCovered: (ids: string[]) => `涵蓋：${ids.join('、')}`,
    groupMembers: '群組裡的利害關係人：',
    /** 解開的衝突 on the 總覽 tab: the conflicts whose way out lists the solution. */
    wayOutHeading: '解開的衝突',
    wayOutIntro: '這些衝突的「以需求為本的解方」用到這個解法。',
    wayOutNone: '沒有衝突的「以需求為本的解方」用到這個解法。',
    wayOutLink: (n: number, id: string) => `到 #${n} 的訴求分頁看 ${id}`,
    conflictsHeading: '相關的衝突',
    conflictsIntro: '衝突的一方或另一方，有這個解法涵蓋的故事，但衝突的解方沒有用到這個解法。',
    conflictsNone: '沒有其他和這個解法涵蓋的故事有關的衝突。',
    conflictCovered: (ids: string[]) => `這個解法涵蓋的故事：${ids.join('、')}`,
    conflictsLink: (n: number) => `到 #${n} 的訴求分頁看所有衝突`,
    /** The 需求 tab. */
    coveredNeedsHeading: '涵蓋的需求',
    coveredNeedsNone: '這個解法沒有列出涵蓋的需求。',
    notCoveredNeedsHeading: '未涵蓋的需求',
    notCoveredNeedsIntro: '一個解法不需要涵蓋所有需求。未涵蓋的需求，可能由其他解法涵蓋。',
    notCoveredNeedsNone: '這個議題的需求都被這個解法涵蓋。',
    needsFilteredNone: '這裡沒有以便…標記 [實證] 或 [AI整理] 的需求。',
    /** The 利害關係人 tab. */
    coveredStakeholdersHeading: '涵蓋的利害關係人',
    coveredStakeholdersIntro: '這些利害關係人至少有一個需求被這個解法涵蓋。',
    coveredStakeholdersNone: '這個解法沒有涵蓋任何利害關係人的需求。',
    notCoveredStakeholdersHeading: '未涵蓋的利害關係人',
    notCoveredStakeholdersIntro: '這些利害關係人的需求都沒有被這個解法涵蓋。下面列出可能涵蓋它們的其他解法。',
    notCoveredStakeholdersNone: '這個議題的利害關係人都有需求被這個解法涵蓋。',
    stakeholderCovered: '涵蓋的需求',
    stakeholderNotCovered: '未涵蓋的需求',
    otherSolutions: '由其他解法涵蓋：',
    otherSolutionsNone: '沒有任何解法涵蓋',
    /** The 訴求 tab (decision 103). One want is the 我想要… cell of one story. */
    wantsIntro: '每一則故事的「我想要…」是一個訴求。這個解法涵蓋了故事的需求（以便…），這個訴求就算被涵蓋。',
    coveredWantsHeading: '涵蓋的訴求',
    coveredWantsNone: '這個解法沒有涵蓋任何訴求。',
    notCoveredWantsHeading: '未涵蓋的訴求',
    notCoveredWantsIntro: '一個解法不需要涵蓋所有訴求。未涵蓋的訴求，可能由其他解法涵蓋。',
    notCoveredWantsNone: '這個議題的訴求都被這個解法涵蓋。',
    wantsFilteredNone: '這裡沒有我想要…標記 [實證] 或 [AI整理] 的訴求。',
    measuresHeading: '成效衡量',
    measuresNone: '分析裡沒有這個解法的成效指標。',
    baseline: '目前數值（基準值）',
    source: '資料來源',
    detailHeading: '資源、法規、隱私與風險',
    detailIntro: '這部分由 AI 整理，可以作為討論的起點。成本與法條適用需由專業人士確認。',
    /** A step 7 cell whose parts are all hidden by 「只看有資料根據」 (decision 105). */
    detailFilteredNone: '這一格只有標記 [AI模擬] 的內容。',
    /** The 相關政策 tab (decisions 103 and 104). */
    policiesHeading: '相關或類似的政策與做法',
    policiesIntro: '國內與國外和這個解法相關或類似的政策與做法。',
    policiesNone: '分析裡沒有和這個解法相關或類似的政策與做法。',
    policiesDomestic: '國內',
    policiesForeign: '國外',
    policiesDomesticNone: '沒有國內的項目。',
    policiesForeignNone: '沒有國外的項目。',
    practiceUse: '本文件怎麼用',
    /** Where a practice row comes from: the practice table of step 6.1. */
    practiceSource: (n: number) => `來源：#${n} 議題分析步驟 6.1 的相關做法表。`,
    practiceNote: '標記「相關做法」的項目來自議題分析步驟 6.1。其他地方的做法只是參考，不代表台北一定適用。「本文件怎麼用」是 AI 的想法。',
    /** The kind of an item: a row of a 6.1 practice table, or a dependency row. */
    practiceKind: '相關做法',
    dependencyKind: '相依與現行政策',
    /** Where a dependency row comes from: the 分析摘要 topic of the issue. */
    dependencySource: '來源：分析摘要的「相依事項與現行政策的關係」',
    dependencyLink: (n: number) => `到 #${n} 的相關解法與政策分頁`,
    /** A cross-issue solution: the topic is in the cross-issue file, which has no page. */
    crossDependencySource: '來源：跨議題分析的分析摘要「相依事項與現行政策的關係」。',
    overviewHeading: '總覽',
    cost: '成本',
    feasibility: '可行性',
    risk: '主要風險',
    owner: '主責單位',
    ideasHeading: '題目或研究中的構想',
    ideasIntro: '題目頁或研究資料提到的構想，以及本分析怎麼處理它。',
    idea: '構想',
    handling: '本分析的處理',
    pendingHeading: '待補',
    pendingIntro: '這個解法還需要真人提供這些資訊。',
    pendingNone: '這個解法沒有待補的項目。',
    moreHeading: '更多',
  },
  spacePage: {
    notFoundTitle: '找不到這個空間類型',
    notFoundBody: (code: string) => `沒有代碼為 ${code} 的空間類型。網址可能打錯了。`,
    backHome: '回到首頁',
    group: '分組',
    description: '說明',
    intro: '城市的空間有限，同一個空間常常有好幾個議題、好幾種解法都想使用。這一頁列出會用到這個空間的議題、解法和利害關係人。',
    issuesHeading: '使用這個空間的議題',
    issuesNone: '目前沒有已完成分析的議題使用這個空間類型。',
    solutionsHeading: '使用這個空間的解法',
    solutionsNone: '目前沒有解法使用這個空間類型。',
    otherSpaces: '也使用：',
    stakeholdersHeading: '相關的利害關係人',
    stakeholdersIntro: '這些利害關係人的故事，被使用這個空間的解法涵蓋。',
    stakeholdersNone: '目前沒有相關的利害關係人。',
    sharedHeading: '在多個議題都出現的利害關係人',
    sharedIntro: '同樣的人會同時受到好幾個議題影響。',
    sharedNone: '目前沒有在多個議題都出現的利害關係人。',
    /** The issues of a stakeholder in 「在多個議題都出現的利害關係人」. */
    sharedIssues: '出現的議題',
    byIssueHeading: '各議題的利害關係人',
  },
  /** #/spaces (design 3.9, decision 120). */
  spacesList: {
    /** The hidden h1 and the page title. */
    title: '空間',
    issues: '議題',
    stakeholders: '利害關係人',
    solutions: '解法',
    issuesValue: (n: number) => `${n} 個`,
    stakeholdersValue: (n: number) => `${n} 位`,
    solutionsValue: (n: number) => `${n} 個`,
    /** A space type that no analyzed issue uses yet. */
    noIssues: '尚無議題',
    /** The filter labels in the bar and in the result line (decision 122). */
    groupFilter: '空間分類',
    issueFilter: '議題',
    /** One choice of the 議題 filter: 「#1 把三千棵樹種回來」. */
    issueOption: (n: number, title: string) => `#${n} ${title}`,
    /** One picked issue in the result line: 「#1」. */
    issueShort: (n: number) => `#${n}`,
    /** The noun in the empty states with a search. */
    noun: '空間',
    /** The empty state with filters and no search. */
    noMatchFilters: '沒有符合目前篩選的空間。',
    /** The link that removes only the search. */
    clearSearch: '清除搜尋',
  },
  /** The page shown when a page breaks (the errorElement of the root route). */
  routeError: {
    title: '頁面出了問題',
    body: '頁面出了問題，請重新整理再試一次。',
    backHome: '回到首頁',
  },
  placeholder: {
    notFoundTitle: '找不到這一頁',
    notFoundBody: '網址可能打錯了，或這一頁已經移除。',
    backHome: '回到首頁',
  },
  /** The stakeholder filter of the issue tabs (the picker and the menu bar,
   * decision 116; before, the side menu, design 3.21) and the filter status
   * line (FilterStatus, decision 68). */
  sideMenu: {
    /** The name of the menu bar of the 訴求, 需求, 解法 and 分析摘要 tabs
     * (IssueMenuBar, decision 116). */
    filters: '篩選',
    special: '特別關注',
    /** The first item in filter mode. It has no count. */
    all: '全部利害關係人',
    roots: {
      O: '組織',
      I: '個人',
    },
    /** One item: 「I06 身心障礙者（視障、輪椅使用者）」. */
    item: (id: string, name: string) => `${id} ${name}`,
    /** What the number next to each stakeholder means, in the 「瀏覽」 dialog
     * of the stakeholder picker on the issue tabs (decision 116). */
    countLine: {
      'issue-wants': '數字：在本議題的訴求數',
      'issue-needs': '數字：在本議題的需求數',
      'issue-solutions': '數字：在本議題的解法數',
    },
    /** Hidden text before a count, for screen readers. The link name is then
     * 「I06 身心障礙者（視障、輪椅使用者），訴求 2」. */
    countUnit: {
      'issue-wants': '，訴求 ',
      'issue-needs': '，需求 ',
      'issue-solutions': '，解法 ',
    },
    /** Hidden text before the number of stakeholders of a group: 「臺北市，利害關係人 12」. */
    groupUnit: '，利害關係人 ',
    /** The filter status line: 「篩選：I06 名稱、只看有資料根據。」 The page adds
     * what it shows (shown…). */
    status: (parts: string[]) => `篩選：${parts.join('、')}。`,
    statusStakeholder: (id: string, name: string) => `${id} ${name}`,
    statusDataBased: '只看有資料根據',
    statusSpecial: (groups: string[]) => `特別關注：${groups.join('、')}`,
    shownWants: (wants: number, conflicts: number) => `顯示 ${wants} 個訴求、${conflicts} 個衝突。`,
    shownNeeds: (n: number) => `顯示 ${n} 個需求。`,
    shownSolutions: (n: number) => `顯示 ${n} 個解法。`,
    /** 只看跨議題 in the status line of the 利害關係人 tab (decision 121). */
    statusCrossIssue: '只看跨議題',
    /** The end of the status line of the 利害關係人 tab (decision 121). */
    shownStakeholders: (n: number) => `顯示 ${n} 位利害關係人。`,
    clear: '清除篩選',
  },
  /** The sort and filter bar of the list pages (ListBar, design 3.23.2) and
   * the result line (ResultLine, design 3.23.6). */
  listBar: {
    sortLabel: '排序',
    /** The sort options (design 3.23.3). Short, so they fit in the
     * <select> on a 360 px phone (decision 100). The sort note says what
     * each share counts. */
    sorts: {
      updated: '最近更新',
      added: '最近新增',
      evidence: '資料根據比例',
      solutions: '解法涵蓋比例',
    },
    /** The note under the bar while a share sort is on (design 3.23.3). */
    sortNotes: {
      evidence: '這個順序只表示分析內容的資料來源組成（標記 [實證] 或 [AI整理] 的格子比例），不代表重要性或好壞。',
      solutions: '這個順序只表示有多少需求已有解法涵蓋，不代表重要性或好壞，也不代表解法是否足夠。',
    },
    /** Next to the disabled sort in tree view (design 3.23.11). */
    treeSortNote: '樹狀檢視依分類排列',
    /** The popover button of a multi-choice filter: 「空間類型」, 「空間類型：2」,
     * or 「議題：全部」 when the filter gives a text for no pick. */
    choicesButton: (label: string, picked: number, none?: string) =>
      picked > 0 ? `${label}：${picked}` : none ? `${label}：${none}` : label,
    /** The text for no pick in the 議題 filter (design 3.23.5). */
    all: '全部',
    /** The phone button that opens the sheet, and its accessible name. The
     * search is not counted (design 3.23.2). */
    filtersButton: (on: number) => (on > 0 ? `篩選（${on}）` : '篩選'),
    filtersButtonName: (on: number) => (on > 0 ? `篩選，已套用 ${on} 個` : '篩選'),
    /** The title of the phone sheet (the dialog's name). */
    sheetTitle: '篩選',
    done: '完成',
    close: '關閉',
    clear: '清除篩選',
    /** The view switch on #/stakeholders (design 3.23.11). */
    view: '檢視方式',
    views: { cards: '卡片', tree: '樹狀' },
    /** The hidden names of the view icon buttons below md. */
    viewNames: { cards: '卡片檢視', tree: '樹狀檢視' },
    /** The first part of the result line. n: shown, total: the whole list. */
    shown: {
      issues: (n: number, total: number) => `顯示 ${n} 個議題，共 ${total} 個。`,
      stakeholders: (n: number, total: number) => `顯示 ${n} 位利害關係人，共 ${total} 位。`,
      solutions: (n: number, total: number) => `顯示 ${n} 個解法，共 ${total} 個。`,
      spaces: (n: number, total: number) => `顯示 ${n} 個空間，共 ${total} 個。`,
    },
    /** The filters that are on: 「篩選：搜尋「無菸」；空間類型：人行道、騎樓。」 */
    status: (parts: string[]) => `篩選：${parts.join('；')}。`,
    /** One filter in the result line: 「空間類型：人行道、騎樓」. */
    filterPart: (label: string, values: string[]) => `${label}：${values.join('、')}`,
  },
  /** The search box of the list pages (ListSearchBox, design 3.23.13). */
  listSearch: {
    label: '搜尋',
    /** Hidden after the label, so the full label is 「搜尋議題」. */
    labelHidden: { issues: '議題', stakeholders: '利害關係人', solutions: '解法', spaces: '空間' },
    placeholder: { issues: '輸入編號或標題', stakeholders: '輸入編號或名稱', solutions: '輸入代號或名稱', spaces: '輸入代號或名稱' },
    clear: '清除搜尋',
    /** The search in the result line, before the filters. */
    statusPart: (q: string) => `搜尋「${q}」`,
    /** The empty states with a search on. noun: 議題, 利害關係人 or 解法. */
    noMatch: (q: string, noun: string) => `找不到符合「${q}」的${noun}。`,
    noMatchFiltered: (q: string, noun: string) => `找不到符合「${q}」和目前篩選的${noun}。`,
    /** The name of the bar (<section aria-label>). */
    barLabel: '搜尋、排序與篩選',
  },
  /** #/issues with the search, sort and filter bar (design 3.23, Task L5). */
  issuesPage: {
    /** The filter labels in the bar and in the result line. */
    spaceFilter: '空間類型',
    whoFilter: '利害關係人',
    /** The noun in the empty states with a search. */
    noun: '議題',
    /** The empty state with filters and no search (design 3.23.6). */
    noMatchFilters: '沒有符合目前篩選的議題。',
    /** The link that removes only the search (design 3.23.13). */
    clearSearch: '清除搜尋',
    /** The share on a card while the 資料根據比例 sort is on (design 3.23.9). */
    sharePercent: (p: number) => `實證＋AI整理 ${p}%`,
  },
  /** One need (需求) in a list (NeedItem, design 3.2, 3.3). */
  need: {
    priority: '優先順序',
    reason: '理由',
    who: '誰需要',
    others: '同樣需要的人',
    othersNone: '沒有其他利害關係人有這個需求。',
    ownStories: '自己的說法（以便…）',
    stories: (n: number) => `相關故事（${n} 則）`,
    solutions: '涵蓋的解法',
    solutionsNone: '尚未有解法涵蓋',
    solutionsWontDo: '這次不做，所以沒有解法涵蓋',
    /** The label before a cross-issue solution in the list (decision 126). */
    crossSolution: '跨議題解法',
    /** On a solution page: the other solutions that cover a need. */
    otherSolutions: '由其他解法涵蓋',
    otherSolutionsNone: '沒有其他解法涵蓋',
    conflicts: '出現在衝突',
  },
  /** One want (訴求) in a list (WantItem, design 3.2, 3.3). */
  want: {
    who: '誰想要',
    others: '同樣想要的人',
    othersNone: '沒有其他利害關係人有這個訴求。',
    conflicts: '有衝突',
    storyCount: (n: number) => `${n} 則故事`,
    pickLink: (n: number) => `到 #${n} 做意見健檢`,
  },
  /** Cross-issue solutions (design 3.18): the page #/solutions/X-A and the
   * other places that show them. */
  crossIssue: {
    notFoundBody: (code: string) => `沒有代號為 ${code} 的跨議題解法。網址可能打錯了。`,
    /** The line under the h1: 「跨議題解法・議題：#1、#2、#8」. */
    issueLine: '跨議題解法・議題：',
    issueLink: (n: number) => `#${n}`,
    /** The issues on a card. */
    cardIssues: '議題',
    /** The box on the issue's 解法 tab. */
    issueBoxHeading: '本議題也在跨議題解法中',
    issueBoxParts: (codes: string[]) => `合併了本議題的解法 ${codes.join('、')}`,
    /** The part on the 總覽 tab of an issue solution. */
    solutionPartHeading: '跨議題解法',
    solutionPartIntro: '這個解法也是這些跨議題解法的一部分。',
    /** The 總覽 tab of a cross-issue solution. */
    partsHeading: '合併的解法',
    partsIntro: '這個跨議題解法合併了下面各議題的解法。',
    wayOutIntro: '這些跨議題衝突的「以需求為本的解方」用到這個解法。',
    wayOutSolutions: '相關的跨議題解法',
    issueConflicts: '各議題的衝突',
    focusHeading: '特別關注族群',
    focusNone: '分析裡沒有針對這個解法的特別關注族群說明。',
    measureFrom: '來自',
    measureNew: '新指標',
    detailHeading: '主責單位、法規、隱私與風險',
    owner: '主責單位',
    laws: '法規',
    privacy: '隱私',
    risks: '風險',
    /** The 需求 tab. */
    groupsHeading: '跨議題的共同需求',
    groupsIntro: '同一個需求出現在幾個議題。這個解法涵蓋這些群組，所以群組裡各議題的需求都算被涵蓋。',
    groupsNone: '這個解法沒有涵蓋跨議題的共同需求群組。',
    groupPriority: '優先順序',
    prioritiesDiffer: '各議題的優先順序不同',
    groupReason: '理由',
    groupNeeds: '各議題的需求',
    /** Above the needs of an issue that is not in parts (design 3.18). */
    notInPartsNote: '這個議題沒有解法被合併進來。這裡只列出透過「跨議題的共同需求」涵蓋的需求。',
    /** The same note on the 訴求 tab (decision 103). */
    wantsNotInPartsNote: '這個議題沒有解法被合併進來。這裡只列出透過「跨議題的共同需求」涵蓋的訴求。',
    /** 相關的衝突 of a cross-issue solution (decision 103). */
    relatedConflictsIntro: '跨議題衝突的一方或另一方，有這個解法涵蓋的故事，但衝突的解方沒有用到這個解法。',
    relatedConflictsNone: '沒有其他和這個解法涵蓋的故事有關的跨議題衝突。',
  },
  /** One conflict (ConflictView, design 3.2). */
  conflict: {
    sideA: '一方',
    sideB: '另一方',
    otherSide: '另一方的故事',
    needs: '雙方的需求',
    needsA: '一方的需求',
    needsB: '另一方的需求',
    needsNone: '分析裡沒有列出這一方的需求。',
    wayOut: '以需求為本的解方',
    wayOutSolutions: '相關解法',
    /** The method heading when a way out exists: the method is only for
     * places where the way out does not work (analysis/docs/method.md). */
    methodFallback: '備案：審議方法',
    method: '審議方法',
    result: '模擬結果',
  },
  /** The stakeholder picker of the list pages (design 3.23.7, decision 86). */
  stakeholderPicker: {
    /** The visible label of the box. */
    label: '利害關係人',
    placeholder: '輸入編號或名稱',
    /** One line in the list when nothing matches. It is not an option. */
    noMatch: '找不到符合的利害關係人',
    /** The hidden live count after typing. */
    found: (n: number) => `找到 ${n} 位`,
    /** The name of the clear button (×). */
    clear: '清除利害關係人篩選',
    /** The button that opens the tree dialog, and its accessible name. */
    browse: '瀏覽',
    browseName: '瀏覽全部利害關係人',
    dialogTitle: '選擇利害關係人',
    dialogIntro: '依分類瀏覽，選一位利害關係人來篩選。',
    /** The close button of the dialog. */
    close: '關閉',
    /** The <nav> name of the tree in the dialog. */
    treeLabel: '利害關係人分類',
  },
  /** #/solutions with the search, sort and filter bar (design 3.23, Task L7). */
  solutionsList: {
    /** The noun of the search empty states: 「找不到符合「火箭」的解法。」 */
    noun: '解法',
    /** The empty state with filters and no search (design 3.23.6). */
    none: '沒有符合目前篩選的解法。',
    /** The 議題 filter: 「跨議題解法」 first, then one choice per issue. */
    issueFilter: '議題',
    crossChoice: '跨議題解法',
    issueOption: (n: number, title: string) => `#${n} ${title}`,
    /** 議題 in the result line: 「#1」. */
    issueShort: (n: number) => `#${n}`,
    spaceFilter: '空間類型',
    whoFilter: '利害關係人',
    /** The fields of the cards (design 3.23.9). */
    issue: '議題',
    issueValue: (n: number, title: string) => `#${n} ${title}`,
    crossBadge: '跨議題解法',
    /** A cross-issue solution that also covers needs of issues outside its
     * parts (X-E): 「也涵蓋 #1 的需求」. */
    alsoCovers: (titles: string[]) => `也涵蓋 ${titles.join('、')} 的需求`,
    basis: '涵蓋需求的資料根據',
    basisNone: '沒有涵蓋的需求',
    /** Next to the counts while 資料根據比例 is on. */
    sharePercent: (p: number) => `實證＋AI整理 ${p}%`,
    added: '新增日期',
    updated: '更新日期',
  },
  /** #/stakeholders with the search, sort and filter bar, card view and
   * tree view (design 3.23, Task L6). */
  stakeholdersList: {
    /** The noun of the search empty states: 「找不到符合「身心」的利害關係人。」 */
    noun: '利害關係人',
    /** The empty state with filters and no search (design 3.23.6). */
    none: '沒有符合目前篩選的利害關係人。',
    /** The link that removes only the search (design 3.23.13). */
    clearSearch: '清除搜尋',
    /** The 議題 filter: 「跨議題」 first, then one choice per issue (design 3.23.5). */
    issueFilter: '議題',
    crossChoice: '跨議題（出現在 2 個以上議題）',
    /** 「跨議題」 in the result line. */
    crossShort: '跨議題',
    issueOption: (n: number, title: string) => `#${n} ${title}`,
    /** 議題 in the result line: 「#1」. */
    issueShort: (n: number) => `#${n}`,
    /** The toggle, and its text in the result line. */
    specialOnly: '只看特別關注族群',
    /** The fields of the cards (design 3.23.9). */
    path: '分類路徑',
    issues: '出現的議題',
    basis: '資料根據（各議題合計）',
    /** Next to the counts while 資料根據比例 is on. */
    evidencePercent: (p: number) => `實證＋AI整理 ${p}%`,
    coverage: '解法涵蓋',
    coverageValue: (total: number, covered: number) =>
      covered === total
        ? `需求 ${total} 個：有解法涵蓋 ${covered} 個`
        : `需求 ${total} 個：有解法涵蓋 ${covered} 個、尚未涵蓋 ${total - covered} 個`,
    /** After the coverage while 解法涵蓋比例 is on. */
    coveragePercent: (p: number) => `（${p}%）`,
    noNeeds: '沒有需求',
    added: '新增日期',
    updated: '更新日期',
    /** The name of the tree in tree view. */
    treeLabel: '利害關係人分類',
    /** The counts after a stakeholder in tree view (decision 117):
     * 「議題 2・解法 3」. solutions is null while the issue files load, so
     * only 「議題 2」 shows, never a wrong 0. */
    treeCounts: (issues: number, solutions: number | null) =>
      solutions === null ? `議題 ${issues}` : `議題 ${issues}・解法 ${solutions}`,
  },
} as const
