# Design: policy issue browser

Status: approved by ETBlue (2026-10-18).
Source of the idea: [human-inputs.md](human-inputs.md). When the two files differ, `human-inputs.md` is the one that counts.

## 1. Problem

> As a citizen, I want to participate in policy discussions, but I don't know other target audiences' concerns, so my opinions may be limited and useless. I want to be able to get an overview of the whole picture of all possible concerns from all stakeholders around the policy, so that I can improve the quality of my opinions during citizen participation.

The tool shows the issue analysis in `analysis/` in a structured way. It also has an **opinion check**: the citizen picks what they want, and the tool shows who wants the same thing, who may disagree, and who is not mentioned.

**Second audience: civil servants.** If the policy analysis phase uses the same format, the result becomes structured data. Civil servants can then look up the analysis of earlier, related issues (by stakeholder or by space) and reuse it, which can reduce their work in the analysis phase. The shared stakeholder list (global IDs) is the main reusable part. Most content today is `[AI模擬]`, so before any real reuse, the AI content must be replaced with real input.

**Third audience: civic tech communities and companies.** If the stakeholder analysis becomes structured data, the government can release it as open data. Civic tech communities and companies can then reuse it in their own research or feature analysis, when their work has stakeholders or concerns like those of a policy. For example, a taxi dispatch or ride-hailing service could look at the stakeholders around sidewalks to suggest better pickup spots to passengers. This is an idea for later, not a feature of the MVP. The same rule applies: the `[AI模擬]` content must be replaced with real input before the data is released.

Building the tool also tests the analysis format. Parts that are hard to read by code show where the format should change before the other issues are written.

## 2. Decisions

| Topic | Decision |
|---|---|
| Stack | Vite + React + TypeScript. React Router with hash URLs. |
| Styling and UI | Tailwind CSS v4 (Vite plugin). shadcn/ui for the parts that need keyboard and screen reader support: Tabs, Toggle Group (filter chips), Badge, Collapsible (category tree). Only the parts in use are added. |
| Hosting | Static site on GitHub Pages. No server, no login, no stored data. |
| Data | A Python script turns the Markdown into JSON. The app only reads JSON. |
| UI language | zh-TW only in the MVP, but ready for English: all UI strings in `src/i18n/zh-TW.ts`, `lang="zh-TW"` on the page, and real text (no text in images), so browser translation works for foreign readers. |
| First screen of an issue | 總覽 (overview) |
| Opinion check input | Pick from a list, with a plain text search. No AI. No role selection. |
| Voting | Out of scope. It needs login, and many voting tools already exist. |
| Cross-issue view | Yes. Stakeholders use global IDs across all issues. |
| Space types | Each issue and each solution has space type tags (for example 人行道), from a fixed list. Issues and solutions that use the same space can be viewed together. |
| Theme | Design tokens (CSS variables) in `src/index.css`. Solarized Light is the default; Solarized Dark is the other theme. A toggle in the header switches them (section 3.10). Text and UI parts must pass WCAG AA contrast, so some Solarized colors use a darker or lighter shade of the same hue. |
| Names | The app says 「解法」 everywhere, never 「提案」. 「訴求」 is a thing a stakeholder wants: one per W group, plus one per story with no W group (the same items as the opinion check pick list, section 4.1). 「需求」 is the 以便… cell of one story: one per story, with no groups. |

## 3. Screens

### 3.1 Home page

URL: `#/`. The home page is short. It has a hero and three blocks. The full lists are on their own pages (section 3.9).

**Hero.** A full-width band at the top of the page, under the header. It has the app name (h1), the subtitle 「在提案之前，先看見各方利害關係人的關注」, and two short paragraphs: what the app does, and who it is for (citizens, civil servants, civic tech communities). No disclaimer in the hero: it is in the footer (3.8). A short line under the hero says the lists are by date, not ranked by number.

The hero background is made only from colors and a simple pattern, with no photos or image files: a diagonal gradient and a dot pattern (CSS `linear-gradient` and `radial-gradient`, class `.hero-bg` in `index.css`). All colors are tokens, so the hero follows the theme:

| Token | Light | Dark |
|---|---|---|
| `--hero-from` → `--hero-to` (gradient) | base2 `#eee8d5` → base3 `#fdf6e3` | base02 `#073642` → base03 `#002b36` |
| `--hero-pattern` and `--hero-pattern-opacity` (dots) | yellow `#b58900` at 20% | cyan `#2aa198` at 15% |
| `--hero-foreground` (all hero text) | base02 `#073642` | base2 `#eee8d5` |
| Lowest text contrast (on a dot over the gradient end) | 8.89:1, 7.72:1 under the watermark | 8.55:1, 7.26:1 under the watermark |

The page frame is full width only on the home page (the route has `handle: { fullWidth: true }`, read by `isFullWidth` in `src/lib/layout.ts`). The hero text and the blocks use the same centered column as the other pages.

**Three blocks.** Each block is a section with an h2. It shows the 5 most recent items and has a link to its list page on the heading row, right aligned. The link text is 「看全部」; its accessible name is the full name (「看全部議題」, 「看全部利害關係人」, 「看全部解法」), so the three links do not share one name. On large screens (the `lg` breakpoint, 1024 px, and wider) the blocks are 3 columns side by side. Below that (phone and tablet) they are 1 column, in the same order as the keyboard order.

| Block | Items | Date used | Link to |
|---|---|---|---|
| 最近更新的議題 | Analyzed issues | `updated` (the last git commit of the issue folder) | `#/issues` |
| 最近加入分析的族群 | Active stakeholders (moved IDs left out) | `added` (新增日期 in `stakeholders.csv`) | `#/stakeholders` |
| 最近分析出的解法 | Solutions of every analyzed issue | `added` (新增日期 in 6.1) | `#/solutions` |

Each item shows:

| Block | Item |
|---|---|
| 最近更新的議題 | 「#8 無菸城市」 (link to the issue), 更新日期, the space types (links to the space pages) |
| 最近加入分析的族群 | The name (link to the stakeholder page), the ID, the 特別關注 badges, the issues it appears in (links), 加入日期 |
| 最近分析出的解法 | 「#8 E」 and the name with its tag (the code and name are a link to the solution page, 3.12), the one-line summary, 新增日期 |

Sort rule for all three blocks: by date, newest first. Items with the same date are sorted by ID, highest first (issue number; stakeholder ID, the reverse of the usual ID order, so I comes before O and I28 before I27; for solutions the issue number, then the solution letter). **Never sorted by a count.** An item without a date (for example an issue with no git history) goes last. The sort functions are `recentIssues`, `recentStakeholders` and `recentSolutions` in `src/lib/recent.ts`.

Old links to the stakeholder filter on the home page (`#/?cross=1`, shared on Discord) go to `#/stakeholders?cross=1`.

### 3.2 Issue page

Five tabs. 總覽 opens first.

| Tab | Content |
|---|---|
| 總覽 | 「分析摘要」 comes first (decision 29): the 5 topics of the issue file's `## 分析摘要` section, in the fixed order (難以取捨的決定, 可能的爭議, 受影響較大的弱勢族群, 法規上的障礙, 相依事項與現行政策的關係), each as a heading with its items. One line explains the section. Each item shows its 項目, the 說明 with its tag badge (a 【待補】 item in the dashed box), and 「相關：」 with its references as links: a story goes to the opinion check with its pick key (its W group or the story, `storyPickKey`), a W group to the opinion check, a stakeholder to `#/stakeholders/<id>`, a conflict to the 衝突 tab, a solution to `#/issues/<n>/solutions/<code>`. A reference to another issue (「#8 解法 B」) goes to that issue: its solution page, its 衝突 tab, or its overview for a story or a group. Issue links keep the 「只看有資料根據」 filter. A reference that cannot be read stays plain text. The logic is in `src/lib/summary.ts`. Then: title, tag legend. Counts: stakeholders (O and I), stories, conflicts, solutions. Each count links to its tab. 「資料根據」: the same breakdown as on the issue card (3.9), with the full explanation line under it. 「特別關注族群」 (decision 25): one row for each of the 6 groups, always in the fixed order 高齡, 身心障礙, 呼吸道疾病, 兒童與照顧者, 外籍, 經濟弱勢, never by count. A row with stakeholders shows the stakeholders as links (ID and name, to `#/stakeholders/<id>`), the number of their stories in this issue (a story counts once, also when its stakeholder is in two groups, for example I11), a small 資料根據 bar of those stories' cells (the `CellBasis` parts and colors, without the totals and the 實證 percent), and the 說明 cell with its tag when it is not 「—」. A group with no stakeholder shows 「本議題尚未納入」 and its 【待補】 item, in a dashed box: easy to see, but not alarming. One line explains the section: 「列出 6 類特別關注族群在本議題的利害關係人與故事。尚未納入的族群，需要由真人判斷是否應該納入。」 The logic is in `src/lib/focusGroups.ts`. 「使用相同空間的議題」: for each space type of this issue, the other issues that use it, for example 「人行道：#1」, with links. 「待補清單」: every 【待補】 item in the issue, with the section it is in, so readers can see what real input is still missing. |
| 你的意見 | The opinion check (section 4) |
| 利害關係人 | The same list as the stakeholder list page (section 3.9), limited to this issue. Each row links to the stakeholder page (section 3.3). |
| 衝突 | C1, C2… Each shows both sides with their stories, the deliberation method, and the simulated result. |
| 解法 | A, B… Each shows the one-line summary, its space types, and the stories it covers, grouped by priority (必須有 / 應該有 / 可以有). The code and name of each solution are a link to its page (3.12). |

### 3.3 Stakeholder page

URL: `#/stakeholders/<ID>`, for example `#/stakeholders/I06`. This is the only stakeholder detail view.

- Header: name, 分類路徑 (as names), 特別關注, and the issues it appears in.
- One section per issue, each with:
  - 與本題的關係
  - its stories, with tags and priority
  - its W groups, and the other stakeholders in them
  - its conflicts, with the other side
  - the solutions that cover its stories
  - its stories that no solution covers
  - its input sources (1.2)
- A moved ID (for example `#/stakeholders/O02`) sends the reader to the new ID (I12), so old links shared on Discord keep working.

### 3.4 Priority display

The analysis files and the CSV keep the letters M, S, C, W. The app shows zh-TW labels:

| Letter | Label |
|---|---|
| M | 必須有 |
| S | 應該有 |
| C | 可以有 |
| W | 這次不做 |

Rules:
- Priority counts always show their tag, for example 「`[AI模擬]` 必須有 1 · 應該有 1」. When some priorities become `[實證]` or `[AI整理]`, the counts are split by tag, in the order `[實證]`, `[AI整理]`, `[AI模擬]`.
- Counts are per issue, never summed across issues.
- Always in the order 必須有, 應該有, 可以有, 這次不做. Zero values are left out.
- Never sort or color a list by priority counts.
- A legend appears next to the first counts on a page: 「優先順序（MoSCoW）：必須有、應該有、可以有、這次不做。這是這位利害關係人自己有多需要這則故事，不是利害關係人之間的排名。」
- Labels are text, not only color.

### 3.5 Tags

- There are three source tags (see `analysis/method.md`):
  - `[實證]`: a source a person can check, or an `[AI整理]` summary that a person checked.
  - `[AI整理]`: AI summarized it from a real source, and no person has checked it yet. There are two kinds of source:
    - the host's citizen data (the 「市長，你給我聽好了」 data), with counts. Only cells with 10 or more messages get this tag. The counts come from keyword matching, so they are estimates.
    - news reports. The cell says 「新聞報導指出…」 and has a 【待補：查證…】 item in the same cell or row. The outlet name and the link are in the issue's appendix. (Owner decision, 2026-10-18.)
    A person changes the tag to `[實證]` after a spot-check.
  - `[AI模擬]`: AI made it up as a likely view. No data behind it.
- `[實證]`, `[AI整理]`, `[AI模擬]` and 【待補】 each have their own badge style (green, yellow, orange, dashed gray outline). The text is always shown, so the tag does not depend on color. A tag is shown next to the text it belongs to, never only once per page.
- There is no notice box at the top of the pages (removed 2026-10-18, decision 16). The footer disclaimer (3.8) says what `[AI模擬]` and `[AI整理]` mean, on every page. Every cell still shows its own tag badge, so a reader sees the tag next to the content.
- A filter 「只看有資料根據」 hides `[AI模擬]` content in lists. It keeps stories whose 我想要… or 以便… cell is `[實證]` or `[AI整理]`. Each item still shows its own tag. The URL parameter is `?evidence=1`, the name from the time the filter was 「只看 `[實證]`」, so old shared links still work.

### 3.6 Space page

URL: `#/spaces/<code>`, for example `#/spaces/sidewalk`.

City space is limited, so this page shows what competes for the same space:
- the issues that use this space type, as compact `IssueCard`s (3.9): 1 column on a phone, 2 columns from `sm`, 3 from `lg`
- every solution, from every issue, that uses it, with its one-line summary and a link
- the stakeholders of those solutions' stories, with links to their stakeholder pages

For example, under 人行道: #2 解法 A (bins), the #1 solutions about tree pits, and I06 身心障礙者, who needs sidewalk width in both issues.

Space types have no `[實證]` / `[AI整理]` / `[AI模擬]` tag. They are a classification, like 分類路徑.

### 3.7 Header

On every page. A `<header>` landmark with:

- the app name 「提案小幫手」 on the left, a link to the home page
- a `<nav>` with three links, each with a count:

| Link | Count | Goes to |
|---|---|---|
| 議題 | Analyzed issues (`available: true`) | `#/issues` |
| 利害關係人 | Active stakeholders (moved IDs left out) | `#/stakeholders` |
| 解法 | Solutions of every analyzed issue, summed | `#/solutions` |

The header has no 訴求 or 需求 link, and no link to 關於本站 (decision 30). The pages `#/wants` and `#/needs` are removed; their old URLs show the not-found page.

- the theme toggle on the right (section 3.10)

A link looks active (bold and underlined) on its list page and on the pages under it. The pure function `activeNavItem(pathname)` in `src/lib/nav.ts` decides which link is active. It reads the path only, not the query string, and matches whole path segments only (`#/issuesx` is not 議題).

| Page | Active link |
|---|---|
| `#/issues`, `#/issues/<n>`, `#/issues/<n>/<tab>` (also the issue's own 解法 tab `#/issues/<n>/solutions`) | 議題 |
| `#/issues/<n>/solutions/<code>` (one solution's page, 3.12) | 解法 |
| `#/stakeholders`, `#/stakeholders/<id>` | 利害關係人 |
| `#/solutions` and the pages under it | 解法 |
| `#/`, `#/about`, `#/spaces/<code>`, unknown pages (also the old `#/wants` and `#/needs`) | none |

The active link has `aria-current="page"` only on the list page itself. On a page under it, the link has `aria-current="true"`.

The counts come from pure functions in `src/lib/`. A count is a plain number next to its label. It is not a score. While the data loads, the label shows with no number.

On a phone (375 px) the header must not scroll sideways. The app name is on the first row. The three links and the toggle wrap onto the next row. The order on screen is the same as the keyboard order.

### 3.8 Footer

On every page. A `<footer>` landmark with three parts, in this order (`human-inputs.md`, information architecture):

| Part | Content |
|---|---|
| 這是什麼 | One short paragraph on the context of the app: 提案小幫手 is ETBlue's entry for 「市政 debug 松」. It turns the analysis of Taipei city issues into structured data, so readers can see each issue's stakeholders, their concerns and the possible solutions. |
| 免責聲明 | A personal work by one participant, made with AI help. It is not linked to the host or to the Taipei City Government. `[AI模擬]` content is not real interviews or real citizen words. `[AI整理]` content is an AI summary of real data or news reports, not yet checked by a person, and its counts are estimates. This is the only disclaimer on the page (3.5). |
| 關於本站 | A link to `#/about` (3.13), in a small `<nav>` named 「網站資訊」. |

On a wide screen the first two parts are side by side, and the link is on its own row below them. On a phone the three parts stack. The project links, the licenses and the data files moved to the about page (decision 32).

### 3.9 List pages

Each list page has its own URL and an h1. The header links to it.

**`#/issues`: 議題列表.** The issues in `analysis/issues.csv`: the 6 host issues with a topic (#1–#6), and #8 (無菸城市), which a participant added. #7 (自由題) has no topic, so it is not listed. The 來源 column of `issues.csv` (`主辦單位` or `參加者補充`) becomes `source` in `index.json`. A card with `參加者補充` shows the note 「非主辦單位題目，由參加者補充」 under its title. An issue without an analysis shows 「製作中」 with no numbers, and cannot be opened. Each analyzed issue card shows:

| Field | Example (#2) |
|---|---|
| 利害關係人 | 24 位（組織 13、個人 11） |
| 使用者故事 | 45 則 |
| 衝突 | 7 個 |
| 解法 | 4 個 |
| 跨議題共用的利害關係人 | For example 「8 位, shared with #1」 (the real number is known after #1 is written). Links to the stakeholder list page with the 「只看跨議題」 filter on (`#/stakeholders?cross=1`). Shown only when 2 or more issues exist. |
| 資料根據 | 實證 8・AI整理 21・AI模擬 72・待補 1（共 102 格，來自 51 則故事） 實證 8%, and a small stacked bar under it. See below. |
| 尚未納入的特別關注族群 | 呼吸道疾病、外籍 (from `focusGaps`, in the fixed order). When every group is included: 「特別關注族群　都已納入」. Never a count like 「4／6」: it reads like a score (decision 25). |
| 更新日期 | Date of the last git commit that changed the issue folder. Left out if the build has no git history. |
| 空間類型 | The issue's space types, for example 人行道、騎樓. Each one links to its space page (section 3.6). |

A space type filter sits above the issue list.

**資料根據** (issue card and 總覽 tab, decision 20):
- Unit: story cells. Each story has two: 我想要… (`want`) and 以便… (`soThat`). 65 stories have 130 cells. The priority tag and other tables are not counted.
- Parts, in a fixed order: 實證, AI整理, AI模擬, 待補 (a cell with no tag, `tag: null`). The text always lists the first three, also when 0. 待補 is listed only when there is one.
- `build_json.py` counts the cells (`counts.cells` in `index.json`). `src/lib/cellBasis.ts` makes the text parts, the bar and the percent.
- The 實證 percent is shown next to the counts, never alone. It rounds to the nearest whole number, a half up (12.5 → 13). It is at least 1 when there is a 實證 cell, and at most 99 when not every cell is 實證.
- The bar is `aria-hidden`; the text carries the meaning, so color is never the only signal. The segments use the tag badge colors (`--tag-evidence`, `--tag-summary`, `--tag-simulated`; 待補 is `--muted-foreground`). They pass 3:1 on the page backgrounds in both themes (tested).
- One explanation line, once on `#/issues` (not on each card) and on the 總覽 tab: 「這是分析內容的資料來源組成，不代表議題的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。」
- An issue that is 製作中 shows no breakdown.
- Issues are never sorted, ranked or filtered by these numbers. The list keeps issue number order. The home page does not show them.

**`#/stakeholders`: 利害關係人列表.** Every stakeholder in `stakeholders.csv`, across all issues.

| Part | Design |
|---|---|
| Organizations (O) | A tree from 分類路徑, for example 政府 › 地方政府 › 臺北市 › 環保局 › 清潔隊. Each level opens and closes. |
| Individuals (I) | Grouped by 類別 (居民, 用路人, 遊客, 工作者) |
| Each stakeholder row | Name, then one entry per issue with its priority counts (section 3.4), for example 「#2 `[AI模擬]` 必須有 1 · 應該有 1」 |
| Each tree level | Only the total story count of the stakeholders under it, so a closed level still shows that it has content. No priority counts at tree levels. |
| Filters | 「只看跨議題」 (2 or more issues) and the 特別關注 chips |
| Order | Always tree order or ID order. Never sorted by count. |
| Note | 「故事數只表示分析寫了多少，不代表重要程度。」 |

Moved IDs (with 「已改為 …」) are not listed.

The 「只看跨議題」 filter is in the URL (`#/stakeholders?cross=1`), so an issue card can link to it.

**`#/solutions`: 解法列表.** Every solution of every analyzed issue, grouped by issue (an h2 per issue), in issue number order, then letter order. Never sorted by a count.

| Part | Design |
|---|---|
| Each solution | 「#2 A」 and the name with its tag, the one-line summary, space types (links), 新增日期, the number of stories it covers as plain text (for example 「21 則」). The code and name are a link to the solution page (3.12). |
| Filters | Space type and issue, both as toggle chips. Several picked chips in one filter: a solution matches ANY of them. Nothing picked: all. A status line says how many solutions match. |
| Logic | `solutionGroups` and `solutionSpaceOptions` in `src/lib/solutionList.ts` |

The list pages `#/wants` (訴求列表) and `#/needs` (需求列表) were removed (decision 31). Their old URLs show the not-found page. The opinion check pick links they used stay in `src/lib/opinion.ts`: `opinionPickTo` and `storyPickKey` (the old `needPickKey`). The 分析摘要 links (`src/lib/summary.ts`) use them.

**Shared cards.** Every list of 議題 or 解法 uses one of two shared components. Each has two variants, set with the prop `variant: 'detailed' | 'compact'`. The title is a link to the item's own page. A tag badge stays outside the link.

| Card | `detailed` | `compact` |
|---|---|---|
| `IssueCard` (`src/components/IssueCard.tsx`) | `#/issues`: a box with all the fields in the issue table above, with 資料根據 and the 特別關注族群 line. Props: `shared`, `headingLevel`. | Home 「最近更新的議題」 and the space page: the title link, 更新日期 and 空間類型, in a smaller box (decision 26) |
| `SolutionCard` (`src/components/SolutionCard.tsx`) | `#/solutions`: the code and name, the summary, 空間類型, 新增日期 and the story count. Prop: `spaceTypes`. | Home 「最近分析出的解法」, the space page, the stakeholder page and the opinion check result: the code and name, and the one-line summary |

Every card is a box. `detailed` uses `rounded-lg border p-4`. `compact` uses `rounded-md border p-3`, the same box for `IssueCard` and `SolutionCard`, so the home blocks look alike. An issue that is 製作中 has a dashed border in both variants. Compact cards are stacked with a gap (`space-y-3`), not split by lines. Inline issue links inside a sentence or a field are references, not lists, so they stay plain links: the 「議題」 field on the stakeholder page and 「同空間的其他議題」 on the 總覽 tab.

Content that only one page shows is passed to `SolutionCard` as `children`, shown at the end of the card: the 新增日期 on the home page, and the other space types (「也使用：」) on the space page. `showIssue` makes the code 「#2 A」 for lists across issues. The solution link keeps `?evidence=1`. The 解法 tab of an issue page shows much more per solution, so it uses only `SolutionTitleLink`, the title part of `SolutionCard`.

### 3.10 Theme

- Colors are design tokens: CSS variables in `src/index.css`. Components use the tokens (for example `bg-background`, `text-link`), never a fixed color.
- Light theme: Solarized Light (background base3 `#fdf6e3`). Dark theme: Solarized Dark (background base03 `#002b36`).
- App tokens on top of the shadcn tokens: `--link`, `--ring` (focus), one text color per tag badge (`--tag-evidence` 實證 green, `--tag-summary` AI整理 yellow, `--tag-simulated` AI模擬 orange), the hero tokens (3.1) and the watermark tokens (3.11). The badge always shows its text.
- Contrast: WCAG AA. Text 4.5:1, UI borders and the focus ring 3:1, on the page background and the muted background, with and without the watermark on top. Several Solarized accents fail on the light background (for example yellow, green and cyan as text). Where a Solarized color fails, the token uses a darker (light theme) or lighter (dark theme) shade of the same hue. `index.css` says which ones, with the numbers. `src/lib/designTokens.test.ts` reads `index.css` and checks every number, so a token change that fails AA fails the tests.
- The first visit follows the system setting (`prefers-color-scheme`). The toggle saves the choice in `localStorage`. If storage fails, the toggle still works for the current page.
- No flash of the wrong theme: a small script in `index.html` sets the theme class before the app loads.
- The toggle is a button that shows the theme it switches to: a moon and 「深色模式」 in the light theme, a sun and 「淺色模式」 in the dark theme. The text changes, so it has no `aria-pressed`.

### 3.11 Watermark

On every page, the text 「市政 debug 松參加者作品・展示用 MVP」 (`t.watermark`) is repeated over the whole window, light and at an angle (−30°). Any screenshot of any part of a page shows it. It does not use the host's domain.

| Part | Design |
|---|---|
| How | One inline SVG (`src/components/Watermark.tsx`) in a fixed layer the size of the window. A `<pattern>` tile (400 × 130 px) holds two copies of the text, the second moved half a tile, and fills the whole layer. |
| Color | `--watermark` and `--watermark-opacity` tokens. Light: base01 `#586e75` at 8%. Dark: base1 `#93a1a1` at 8%. The watermark text is 1.11:1 on base3 and 1.13:1 on base03: it shows in a screenshot, but it is much lighter than any text. |
| Contrast under it | The worst case of three: the watermark over the background only, over the text only, or over both. Every text token still passes 4.5:1 on base3/base2 (light) and base03/base02 (dark). The lowest values are 4.55:1 (light `--muted-foreground` and `--tag-evidence` on base2; dark `--foreground` and `--destructive` on base02). To get there, some text tokens became a little darker (light) or lighter (dark), with the same hue (3.10). |
| Use | `pointer-events: none`, so links and buttons under it work. `user-select: none`. `aria-hidden="true"`, because the footer says the same thing. |
| Layout | `position: fixed`, `inset: 0`: it never makes the page wider and never moves the layout. |
| Print | Shown when printing (`@media print`, `print-color-adjust: exact`). |

### 3.12 Solution page

URL: `#/issues/<n>/solutions/<code>`, for example `#/issues/2/solutions/A`. One page per solution, because the content of a solution can be long (ETBlue, `human-inputs.md`). Page title: 「#2 A 清潔箱佈建建議地圖 · 解法 · 提案小幫手」.

The page shows, in this order:

| Part | Content | Data |
|---|---|---|
| Breadcrumb | 首頁 › #2 找回消失的垃圾桶 › 解法 › A, in a `<nav>` | |
| h1 | 「#2 A」 and the name with its tag | 6.1 |
| Header | The one-line summary, the space types (links), 新增日期 | 6.1 |
| 涵蓋的使用者故事 | The covered stories, grouped by priority label. The 「只看有資料根據」 toggle works here too (`?evidence=1`). | 6.2 |
| 涵蓋的相同訴求群組 | Each W group with a covered story: 全部 or 部分 (with the covered stories), and the stakeholders of the group as links | Worked out from the stories. `check_analysis.py` already checks that the 6.2 column matches them. |
| 相關的利害關係人 | The stakeholders of the covered stories, in ID order, as links, with the 「也出現在」 mark (4.2) | 6.2 |
| 相關的衝突 | Each conflict with a covered story on either side: the text with its tag and the covered stories. One link to the issue's 衝突 tab. | 5.4 |
| 成效衡量 | Each measure: 指標, 目前數值（基準值） with its tag, 資料來源 | 6.3 (`measures`) |
| 資源、法規、隱私與風險 | The 總覽 row (成本, 可行性, 主要風險, 主責單位, each with the row tag), then the step 7 rows as a definition list | step 7 (`overview`, `detail`) |
| 題目或研究中的構想 | Only when there is one: the idea and how the analysis handles it | 6.1 構想 table (`ideas`) |
| 待補 | The 【待補】 items of the solution, grouped by section | `pending` of the solution |
| 更多 | Links to the issue's 解法 tab and to `#/solutions` | |

Rules:
- Every mention of a solution links to its page: the issue 解法 tab, `#/solutions`, the home block, the opinion result (相關解法), the space page and the stakeholder page. The link text is the code and the name, so each solution has one link and no two links have the same text and different targets. The link keeps `?evidence=1`.
- An unknown issue, an issue with no analysis, or an unknown code shows a short message with links (the issue's 解法 tab, `#/solutions`, the home page).
- The logic is in `src/lib/solutionPage.ts`: `solutionPath`, `findSolution`, `solutionTitle`, `solutionStoryGroups`, `solutionGroupCoverage`, `solutionStakeholders`, `solutionConflicts`. Nothing is sorted by a count.

### 3.13 About page

URL: `#/about`. The h1 and the page title are 「關於本站」 (page title 「關於本站 · 提案小幫手」). The footer links here. The header has no link to it, so no header link is active on this page (3.7). The page is `src/pages/About.tsx`. Each part is an h2:

| Part | Content |
|---|---|
| 專案連結 | 「市政 debug 松活動頁面」 (https://puma.taipei/hackathon, the official event page; opens in a new tab, `rel="noopener noreferrer"`, with 「（在新分頁開啟）」 for screen readers), GitHub source code, and 「如何閱讀議題分析」 (`analysis/method.md`). The disclaimer in the footer is on the same page, so the event link gives the context and does not suggest that the host approved the app. |
| 授權 | Code: MIT, link to `LICENSE` on GitHub. Content made by ETBlue: CC BY 4.0, link to `LICENSE-CONTENT.md` on GitHub. A short note: the host's content follows the host's rules, and open data follows each dataset's license. |
| 下載資料 | The app's own data files, so others can reuse them. This is what `human-inputs.md` means by "the open data used by the app". The JSON the site reads (`data/index.json`, and `data/issues/<folder>.json` for each analyzed issue), as links on the site. The CSV files on GitHub: `analysis/stakeholders.csv`, each analyzed issue's `analysis/<folder>/user-stories.csv`, `space-types.csv`, `path-labels.csv`, `issues.csv`, `open-data.csv`. The list is built from `index.json` (`dataFileLinks` in `src/lib/dataFiles.ts`), so a new issue appears with no code change. One line on the data license: the analysis is CC BY 4.0, with the exceptions in `LICENSE-CONTENT.md` (host content; content made from the host's citizen data is only for this hackathon). |
| 作者的相關文章 | The author's blog posts about this work, newest first, each with its title (a link) and date. Today one post: 「台北市政 debug 松議題的模擬分析」, 2026-10-17. The list is `AUTHOR_POSTS` in `src/components/links.ts`. |

The government open datasets (`openData` in `index.json`) are not on this page. Each issue lists them in its appendix.

## 4. Opinion check

### 4.1 Pick list

- Each W group appears once, using its summary from the 相同訴求群組 table.
- Each story without a W group appears on its own, using its 我想要….
- A search box filters the list by plain text (substring match on 我想要… and the W summary).

### 4.2 Result

The picked item is a set of story IDs (one story, or all stories in the W group).

| Part | Logic |
|---|---|
| 同樣想要的人 | All picked stories, each with its stakeholder, 以便…, priority and tags |
| 可能有不同意見的人 | Every conflict in 5.4 where a picked story is on one side. Show the other side's stories, the deliberation method and the simulated result. |
| 相關解法 | Every solution in 6.2 that lists a picked story |
| 這個意見沒有直接提到的人 | All stakeholders of this issue that are not in the first two parts. Prompt: 「你的意見會影響他們嗎？」 |

For each stakeholder in the result, show a small mark 「也出現在 #1、#5」 when it appears in other issues.
The mark links to the stakeholder page. Many marks on one page have the same text, so the link's accessible name also gives the stakeholder and the issue titles, for example 「I12 清潔隊員 也出現在 #1 把三千棵樹種回來」.

## 5. Changes to the analysis format

### 5.1 Shared stakeholder list

New file `analysis/stakeholders.csv` (UTF-8 with BOM):

| Column | Content |
|---|---|
| 利害關係人編號 | Global ID, for example `O04`, `I06`. The same ID means the same stakeholder in every issue. |
| 利害關係人 | Name |
| 分類路徑 | Category path (5.2) |
| 特別關注 | Zero or more of: 高齡, 身心障礙, 呼吸道疾病, 兒童與照顧者, 外籍, 經濟弱勢. Separated by 「、」. 呼吸道疾病 was added 2026-10-18 (13, item 7). |
| 議題 | Issue numbers, for example `1 2 5`. Filled by a script. |
| 備註 | For a moved ID: 「已改為 I12」 |
| 新增日期 | The date the ID was added to this file, `YYYY-MM-DD`. A new stakeholder gets today's date. The date never changes, also when the row is moved or renamed. Used for the app's "recent" lists. In `index.json` it is `added`. Added 2026-10-18; the first values come from git history (the first commit where the ID is in this file). |

Rules:
- An ID is never reused.
- A new stakeholder gets the next free number in its group (O or I) in this file.
- A move inside a group (for example `mov` → `res`) changes only 分類路徑. The ID stays.
- A move between O and I gives a new ID. The old row stays, with 「已改為 …」 in 備註.
- **O is only for organizations.** A frontline team is the stakeholder, for example 環保局清潔隊. When workers have their own needs (workload, labor conditions), they are a separate I stakeholder with the path `wrk`.

### 5.2 Category paths

Codes are joined with `-`. The app shows the names from `analysis/path-labels.csv`, never the codes.

| Group | First level | Further levels |
|---|---|---|
| O | `gov` 政府 | `central` 中央政府, then agency and unit. `local` 地方政府, then city or county, department, team. Example: `gov-local-taipei-epb-cleaning` (臺北市 › 環保局 › 清潔隊). Councils sit under their level: `gov-local-taipei-council` (臺北市議會), `gov-central-ly` (立法院). |
| O | `soe` 公營事業 | Owner and name, for example `soe-taipei-metro` |
| O | `ind` 產業 | Optional sector |
| O | `acd` 學術 | Optional field |
| O | `edu` 教育機構 | Schools and kindergartens, for example O23 學校與幼兒園 (#8). Added 2026-10-18. |
| O | `ngo` 公民團體 | Registered groups (associations, foundations). Optional focus. |
| O | `cmt` 社群 | Informal groups that are not registered and whose members change over time, for example open-source and civic tech communities, online groups, self-organized local groups. Optional focus. |
| I | `res` 居民 | Affected where they live |
| I | `mov` 用路人 | Affected while moving through the city |
| I | `vis` 遊客 | |
| I | `wrk` 工作者 | Affected while working in public space |

New file `analysis/path-labels.csv`: columns 分類路徑, 名稱. One row for every path prefix, for example `gov` → 政府, `gov-local` → 地方政府, `gov-local-taipei` → 臺北市, `gov-local-taipei-epb` → 環保局.

The path is a field, not the ID. Reasons: story IDs stay short (`O04-US05`), and a rename (for example 環保署 → 環境部 in 2023) changes one field, not the public IDs.

### 5.3 Space types

New file `analysis/space-types.csv`: columns 代碼, 名稱, 分組, 說明. The list is fixed, so the same space is never written two ways. First draft (ETBlue can change it):

| 分組 | 代碼 | 名稱 |
|---|---|---|
| 道路 | `sidewalk` | 人行道 |
| 道路 | `arcade` | 騎樓 |
| 道路 | `bike-lane` | 單車道 |
| 道路 | `scooter-lane` | 機車道 |
| 道路 | `car-lane` | 汽車道 |
| 道路 | `bus-stop` | 公車站與候車亭 |
| 地下 | `sewer` | 下水道 |
| 地下 | `utility` | 地下管線 |
| 公共空間 | `park` | 公園綠地 |
| 公共空間 | `mrt-exit` | 捷運站出口與周邊 |
| 公共空間 | `parking` | 停車場 |
| 建築 | `indoor` | 建築物內（室內） |
| 建築 | `building-shell` | 建築物外牆與結構 |

Two levels of tags:
- **Issue:** a line under the title of each `issue-analysis.md`, using codes: 「空間類型：`sidewalk`、`arcade`、…」.
- **Solution:** 6.1 gets a 空間類型 column, using codes. Each solution lists the spaces it uses.

6.1 also has a 新增日期 column, right after 空間類型: the date the solution was added to 6.1, `YYYY-MM-DD`. A new solution gets today's date. In the issue JSON it is `added`. The 構想 table in 6.1 has no date. Added 2026-10-18; the first values come from git history (the first commit where the code is in 6.1).

Rules:
- Every space type of a solution must also be in its issue's list.
- The Markdown uses codes, never names. A rename changes only `space-types.csv`, not the issue files. The app shows the names.
- A code never changes and is never reused, so shared links such as `#/spaces/sidewalk` keep working.
- Moving a type to another 分組 does not change its code.

### 5.4 Changes in each issue file

- Step 1 (1.1) and 3.7: the 類別 column becomes 分類路徑. Add a 特別關注 column. Names and both fields must match `stakeholders.csv`.
- New section 「編號異動紀錄」 lists moved IDs, for example 「O02 → I12；O02-US01 → I12-US01」.
- Story IDs stay per issue. Across issues, write the issue number first, for example 「#1 I06-US02」.

### 5.5 #2 migration

| Stakeholder | Change |
|---|---|
| O03 清潔隊員 | Rename to 環保局清潔隊. Check each O03 story. A story about a worker's own needs may move to a new I stakeholder 清潔隊員 (`wrk`). ETBlue approves each move first. |
| O05 里長／里辦公處 | Rename to 里辦公處 |
| O13 1999 話務與派工人員 | Rename to 1999 市民熱線 |
| O02 便利商店店員 | Move to I12 (`wrk`). O02 stays in `stakeholders.csv` with 「已改為 I12」. |
| All | Add 分類路徑 and 特別關注 |
| Spaces | Add the issue's 空間類型 line and the 6.1 空間類型 column. First draft for the issue: `sidewalk`, `arcade`, `park`, `mrt-exit` (人行道, 騎樓, 公園綠地, 捷運站出口與周邊). |

#2 is already public on Discord, so every moved ID goes in 「編號異動紀錄」.

### 5.6 Check script

`analysis/check_analysis.py` also checks:
- every step 1 ID exists in `stakeholders.csv`, with the same name, path and 特別關注
- every path prefix has a name in `path-labels.csv`
- the 議題 column matches the issue files
- every space type code is in `space-types.csv`, and each solution's space types are in its issue's list
- 新增日期 exists in `stakeholders.csv` and in 6.1, and each value is a `YYYY-MM-DD` date that is not after today
- each solution in 6.1 has its own step 7 section `### 7.n 解法 X：…` and a 總覽 row (5.8)

### 5.7 Open data list

New file `analysis/open-data.csv` (UTF-8 with BOM), for the links to open data in the page footer. Added 2026-10-18.

| Column | Content |
|---|---|
| 名稱 | Dataset name, as the appendix writes it |
| 網址 | The dataset page on data.gov.tw or data.taipei, the same URL as in the appendix |
| 提供機關 | The agency that provides the dataset |
| 授權 | 政府資料開放授權條款第 1 版, unless the appendix says otherwise |
| 議題 | Numbers of the issues whose appendix cites the dataset, separated by one space, for example `2 8` |

Rules:
- One row per open dataset. News, laws and the host's data are not in this file.
- `check_analysis.py` checks each issue both ways: every data.gov.tw or data.taipei dataset URL in the appendix (`## 附錄`, up to the next `## ` heading) has a row that lists the issue, and every row that lists the issue has its URL in the appendix.
- `build_json.py` writes the rows to `index.json` as `openData`: `name`, `url`, `agency`, `license`, `issues`.

### 5.8 Solution codes

- A solution code (A, B…) is never reused in an issue, also when a solution is removed or merged. So a shared link such as `#/issues/2/solutions/A` keeps working, the same as stakeholder IDs (5.1) and space codes (5.3).
- Each solution in 6.1 has its own step 7 section, `### 7.n 解法 X：…`, with a 項目 | 內容 table, and one row in the 總覽 table (`### 7.n 總覽`). The 總覽 table has the columns 代號, 解法, 成本, 可行性, 主要風險, 主責單位. 代號 is the code only, for example 「A」. 解法 is the row tag and a short name, for example 「`[AI模擬]` 佈建建議地圖」. The row tag is for every cell of the row. `check_analysis.py` checks both.
- A 6.3 row lists one or more codes in its 解法 cell, separated by 「、」, for example `A、D`.
- A row of the 6.1 構想 table belongs to a solution when its 本文件的處理 cell names it as 「解法 X」, for example 「併入解法 B」.

## 6. Build script

`analysis/build_json.py`:
- Reads every issue folder that has an `issue-analysis.md`, plus `stakeholders.csv`, `path-labels.csv`, `space-types.csv` and `open-data.csv`.
- Writes `app/public/data/index.json` (issue list, shared stakeholders, path labels, space types, open datasets as `openData`) and `app/public/data/issues/<folder>.json`.
- Reads these sections: title, 空間類型 line, `## 分析摘要` (its 5 `###` topics), 1.1, 1.2, `### 1.n 特別關注族群檢查`, step 4 stories, 相同訴求群組, 5.4 (split 相關故事 on 「vs」 into two sides), 6.1 (with 空間類型 and 新增日期), 6.2, 6.3, each step 7 section `### 7.n 解法 X：…`, and `### 7.n 總覽`.
- For each solution, also writes the fields of its page (3.12): `measures` (6.3 rows: `metric`, `baseline` Cell, `source`), `detail` (step 7 rows: `item`, `content` Cell), `overview` (`cost`, `feasibility`, `risk`, `owner`, each a Cell with the row tag), `ideas` (構想 rows: `idea`, `handling`, both Cells) and `pending` (the 【待補】 items of its step 7 section and its 6.3 rows; they stay in the issue's `pending` list too).
- Adds per-issue counts for the issue cards (section 3.9), including `cells` for 資料根據 (`evidence`, `aiSummary`, `aiSimulated`, `pending`: the 我想要… and 以便… cells of every story by tag), and the update date from `git log -1 --format=%cs -- <folder>`.
- Writes `focusGroups` to each issue file: `[{ tag, stakeholders: [ids], note: Cell | null }]`, one item per 特別關注 group, in the fixed order of `analysis_common.FOCUS_GROUPS`. `stakeholders` is `[]` for 「（無）」; `note` is null for 「—」. The IDs must be the step 1 stakeholders that have the group in `stakeholders.csv`. `index.json` gets `focusGaps` for each analyzed issue: the groups with no stakeholder, in the same order (`[]` when every group is included, null for an issue without an analysis).
- Writes `summary` to each issue file: `[{ topic, items: [{ item, text: Cell, refs: [string] }] }]`, one item per topic in the fixed order of `analysis_common.SUMMARY_TOPICS`. `refs` are the 相關編號 as written (「C5」, 「解法 A」, 「#8 解法 B」), `[]` for 「—」. Every reference must exist, in this issue or in the other issue. A 【待補】 item that the summary repeats from another section is not added to `pending` again.
- Keeps each tag in its own field, for example `{ "text": "…", "tag": "AI模擬" }`. A 【待補】 cell has `"tag": null` and `"pending": true`.
- Collects every 【待補…】 item in the issue file, including items inside longer text (for example 「【待補：法務確認】」 in step 7), with its section, for the 待補清單.
- Stops with an error that names the issue and the section when a section cannot be read.

## 7. App structure

```
app/
  public/data/          JSON made by build_json.py
  src/
    lib/                pure functions: opinion check, cross-issue lookups, filters
    types.ts            types for the JSON
    i18n/zh-TW.ts       all UI strings. Components never contain UI text directly.
    pages/              Home, Issues, Stakeholders, Solutions (list pages), About, Issue (with the 5 tabs), Stakeholder, Space
    components/         TagBadge, Watermark, StakeholderTree, StoryCard, IssueCard, SolutionCard, ...
    components/ui/      shadcn/ui parts, copied into the repo and editable
```

Accessibility: people with disabilities are stakeholders in the issues, so the app must work with a keyboard and a screen reader. Use the shadcn/ui parts for interactive controls, real headings and lists, and enough color contrast. Tag badges show the tag text, not only a color.

The UI only shows the results of the functions in `src/lib/`.

## 8. Tests

- Python `unittest` for `build_json.py`, using #2: counts, and known links (for example, C6 has I06-US01 on one side).
- Vitest for `src/lib/`, using the #2 JSON: for example, picking W08 shows C6, solution A, and the 3 stakeholders in W08.
- Vitest for the stakeholder lookups: priority counts per issue, stories with no solution, the tree totals, and the redirect from a moved ID.
- Python test: the 待補清單 of #2 includes the items in 6.3 and step 7.
- Vitest for the space lookups: issues and solutions per space type, and 「使用相同空間的議題」.
- Vitest for the 分析摘要 links (`src/lib/summary.ts`): each kind of reference, references to another issue, and that every reference in the fixtures has a link.
- Cross-issue tests start when a second issue exists.

## 9. Deploy

A GitHub Actions workflow checks out the full history (`fetch-depth: 0`, for the update dates), runs `build_json.py` and the tests, builds the app, and publishes it to GitHub Pages. ETBlue turns on Pages in the repo settings once.

## 10. `app/README.md` (zh-TW)

Required by the hackathon rules:
- what the tool does, and the problem it solves
- which data is real and which is AI simulation
- the open-source packages (React, Vite, React Router, Tailwind CSS, shadcn/ui and Radix, Vitest) and AI tools used
- 「如果市府上任 100 天內要落地，需要做什麼」 (suggested by the rules). Include the reuse idea: the city uses this format for a few real issues, keeps the shared stakeholder list as a city-wide asset, and civil servants look up earlier analysis by stakeholder or space. Say in plain words that `[AI模擬]` content must be replaced with real input before reuse.
- how to run it locally

## 11. Out of scope

- dot voting and login
- free-text opinion matching with AI
- an English UI (`src/i18n/en.ts`)
- AI-translated content, as a separate layer with a 「機器翻譯」 mark on every translated cell and the original one click away. A translated `[實證]` quote is no longer the original words, so it needs this mark.

## 12. Order of work

1. Shared files and the #2 migration (section 5). The new format must be fixed before any new issue is written.
2. #1 (trees) as the second issue, so the cross-issue view has real data. It shares sidewalk stakeholders with #2.
3. `build_json.py` and the app. This can start on #2 while step 2 runs.
4. The other issues: first one agent drafts all stakeholder lists and updates `stakeholders.csv` one issue at a time; then the rest of each issue runs in parallel.

## 13. Decided questions

1. The second issue is #1 (trees). (2026-10-18)
2. Councils are included, under their level of government, for example `gov-local-taipei-council`. (2026-10-18)
3. Space types are tagged at two levels: issue and solution. (2026-10-18)
4. Informal groups get their own category `cmt` 社群, separate from `ngo`. (2026-10-18)
5. A third source tag `[AI整理]` marks AI summaries of real data that no person has checked yet. The filter 「只看 `[實證]`」 became 「只看有資料根據」: it keeps `[實證]` and `[AI整理]` and hides only `[AI模擬]`. (ETBlue, 2026-10-18)
6. `edu` 教育機構 is a first level of 分類路徑, for schools and kindergartens (O23 學校與幼兒園 in #8). It is not under `gov`. (ETBlue, 2026-10-18)
7. A new 特別關注 category 呼吸道疾病 is added, after 身心障礙 in the list order. It is used by I27 過敏或呼吸道疾病者 (#8), the exact name in `stakeholders.csv`. (ETBlue, 2026-10-18)
8. 衛生局 (O22) is one organization stakeholder and is not split. A separate I stakeholder for its staff is added only if a story about the staff's own needs (for example workload) is added later, the same rule as 環保局清潔隊 and 清潔隊員 (5.1). (ETBlue, 2026-10-18)
9. Content taken only from news reports is `[AI整理]`, not `[AI模擬]`: AI summarized it from a real source, and no person has checked it yet. The cell says 「新聞報導指出…」 and has a 【待補：查證…】 item; the outlet and the link are in the appendix. AI judgments based on news stay `[AI模擬]` (3.5). (ETBlue, 2026-10-18)
10. Names: the app says 「解法」 everywhere, not 「提案」. 「訴求」 is each W group once, plus each story with no W group: the same items as the opinion check pick list, per issue, summed over the analyzed issues. (ETBlue, 2026-10-18)
11. The home page has a hero and three blocks: 最近更新的議題, 最近加入分析的族群, 最近分析出的解法. Each is sorted by date, newest first, then by ID, highest first. Never by a count. The issue list and the stakeholder list move to their own pages (`#/issues`, `#/stakeholders`), and solutions get a list page (`#/solutions`). (ETBlue, 2026-10-18)
12. The theme is Solarized Light, with Solarized Dark as a toggle. Colors are design tokens. AA contrast comes first: a Solarized color that fails is replaced by a darker or lighter shade of the same hue. (ETBlue, 2026-10-18)
13. The header shows the app name, 議題, 利害關係人, 訴求 and 解法 with counts, and the theme toggle. The footer shows the GitHub link, the licenses, a disclaimer and links to the app's own data files (JSON and CSV). The government open datasets stay in each issue's appendix, not in the footer. (ETBlue, 2026-10-18)
14. 訴求 gets a list page `#/wants`: the opinion check pick items of every analyzed issue, grouped by issue, with search and the 「只看有資料根據」 filter. Each item links to the opinion check with that item picked. The header link 訴求 goes there. (ETBlue, 2026-10-18)
15. The home page hero is full width, with a background of colors and a simple pattern made from the Solarized tokens (no photos or image files). It changes with the theme, and its text passes AA in both themes. The three home blocks are 3 columns from the `lg` breakpoint and 1 column below it (3.1). (ETBlue, 2026-10-18)
16. The notice box at the top of every page is removed. The footer keeps the full disclaimer, and every content cell keeps its tag badge (3.5, 3.8). The footer gets a link 「市政 debug 松活動頁面」 to https://puma.taipei/hackathon in 專案連結, next to the disclaimer (3.8). (ETBlue, 2026-10-18)
17. Every page has a watermark 「市政 debug 松參加者作品・展示用 MVP」: light, at an angle, repeated over the whole window, also when printing. It does not block clicks and is hidden from screen readers. Text under it still passes AA in both themes, so some text tokens became slightly darker (light) or lighter (dark) (3.10, 3.11). (ETBlue, 2026-10-18)
18. Each solution has its own page, `#/issues/<n>/solutions/<code>`, because its content can be long. It shows the covered stories, W groups, stakeholders, conflicts, measures, the step 7 details and the 待補 items of the solution. Every mention of a solution links to it. A solution code is never reused in an issue, so the links keep working (3.12, 5.8). (ETBlue, `human-inputs.md`, 2026-10-18)
19. A header link also looks active on the pages under its list page, for example 議題 on `#/issues/2/overview` and 利害關係人 on `#/stakeholders/I12`. One solution's page `#/issues/<n>/solutions/<code>` makes 解法 active, not 議題. `aria-current` is `page` on the list page and `true` on a page under it (3.7). (2026-10-19)
20. 資料根據 shows each issue's story cells by tag: the 我想要… and the 以便… cell of every story, in the fixed order 實證, AI整理, AI模擬, 待補. It is on the issue card (`#/issues`) and the 總覽 tab, as text with counts, the 實證 percent next to the counts, and a small stacked bar. It replaces the old field that counted only the 我想要… cell. Issues are never sorted, ranked or filtered by it, and the home page does not show it. One explanation line says it is the make-up of the data sources, not the importance or quality of the issue, and that organization stories are `[AI模擬]` until a real interview, so it never reaches 100%. One percent is not shown alone: it looks like a score and can mislead. For example #8 has 39 `[AI整理]` cells that no person has checked yet, so a single number would hide what is behind it (3.9). (ETBlue, 2026-10-19)
21. Every list of 議題 and 解法 uses a shared card: `IssueCard` or `SolutionCard`. Each card has two variants, `detailed` (the list pages `#/issues` and `#/solutions`) and `compact` (the home page, the space page, the stakeholder page and the opinion check). `SolutionSummary` is removed (3.9). (ETBlue, `human-inputs.md`, 2026-10-19)
22. The header gets 需求 with a count, between 訴求 and 解法. A 需求 is the 以便… cell of one story: one per story, with no merging. It gets a list page `#/needs`, built like `#/wants`, with search and the 「只看有資料根據」 filter. On this page the filter looks at the 以便… cell only. 訴求 stays the opinion check pick list (3.7, 3.9). (ETBlue, `human-inputs.md`, 2026-10-19)
23. `[AI整理]` is yellow, not blue, so the three tags follow the color spectrum: 實證 green, AI整理 yellow, AI模擬 orange. The shades are darker (light theme `#765900`) or lighter (dark theme `#d4a300`) than Solarized yellow `#b58900`, to pass AA on the page backgrounds, also under the watermark. This also keeps the tag apart from the blue links. (ETBlue, 2026-10-19)
24. In the light theme, 實證 green is `#2e7000` (was `#5a6800`), so it is easy to tell apart from the AI整理 yellow in the badges and the 資料根據 bar. The contrast stays about the same. (ETBlue, 2026-10-19)
25. Each issue analysis has a 特別關注族群檢查 table in step 1 (`### 1.3`), so a 特別關注 group with no stakeholder is shown, not hidden. Only a person decides that a group does not apply: the AI writes a neutral 【待補】 question, never 「不相關」. The 總覽 tab shows all 6 groups with their stakeholders, stories and 資料根據 (3.2). The detailed issue card shows the groups not included yet, or 「都已納入」 (3.9). There is no count like 「4／6」 anywhere, because it reads like a score. Issues are never sorted, ranked or filtered by these numbers, and the groups are always in the fixed order, never by count. (ETBlue, 2026-10-19)
26. Every list of 議題 uses the card look, also the short lists. The compact `IssueCard` is a box like the compact `SolutionCard` (`rounded-md border p-3`, dashed for 製作中). The home block 「最近更新的議題」 stacks these cards with a gap instead of a line between items. The space page lists its issues with the compact `IssueCard` in a grid (1, 2 or 3 columns by width), not as plain links. Issue links inside a sentence or a field stay plain links, because they are references, not lists (3.6, 3.9). (ETBlue, 2026-10-19)
27. The home block links to the list pages are named 「看全部」 and sit on the heading row, right aligned. Each keeps its full name (for example 「看全部議題」) as its `aria-label` (3.1). (ETBlue, 2026-10-19)
28. The theme button shows the theme it switches to (moon + 深色模式, or sun + 淺色模式), not a fixed 深色模式 with `aria-pressed`. With the fixed text, the only change was a filled moon and a gray background, so readers thought the button did not work (3.10). (ETBlue, 2026-10-19)
29. Each issue analysis has a 「分析摘要」 section near the top, after the intro notes and before 題目原文重點 (ETBlue, `human-inputs.md`). It has 5 topics in a fixed order: 難以取捨的決定, 可能的爭議, 受影響較大的弱勢族群, 法規上的障礙, 相依事項與現行政策的關係. Each item has a tag (mostly `[AI模擬]`, or a 【待補】 item) and lists where it comes from (相關編號). The summary adds no new facts. 受影響較大的弱勢族群 follows the 1.3 order and names the groups not included yet. The wording is neutral: each controversy gives the sides in the same way, and a current policy is described as 「與現行政策的關係」. The app shows the summary first on the 總覽 tab (3.2). The section heading 「分析摘要」 is an h3, like the other sections of the tab, so each topic is an h4. The topics are never sorted by the number of items. (ETBlue, 2026-10-19)
30. The header shows only the app name, 議題, 利害關係人 and 解法 with counts, and the theme button. 訴求 and 需求 are no longer in the header (ETBlue, `human-inputs.md`, information architecture). This replaces the header part of decisions 13 and 22 (3.7). (ETBlue, 2026-10-20)
31. The pages `#/wants` and `#/needs` are removed, with their routes, page files and list code (`src/lib/wants.ts`, `src/lib/needs.ts`). Their old URLs show the not-found page. The pick link helpers move to `src/lib/opinion.ts`. `wantCount` and `needCount` stay in `src/lib/counts.ts` for the planned 訴求 and 需求 tabs. This replaces decisions 14 and 22 (3.9). (ETBlue, `human-inputs.md`, 2026-10-20)
32. The footer has only three parts: a short text on what the app is (who made it, for 市政 debug 松, what it does), the disclaimer, and a link 「關於本站」. A new page `#/about` 關於本站 has the event page link, the GitHub link, the licenses, the data files and the author's related blog posts. These moved from the footer (3.8, 3.13). This replaces the footer part of decisions 13 and 16. (ETBlue, `human-inputs.md`, 2026-10-20)
