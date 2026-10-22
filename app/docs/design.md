# Design: policy issue browser

Status: approved by ETBlue (2026-10-18). Updated 2026-10-20 for the needs-based pages: sections 3.2, 3.3, 3.12 and the new sections 3.14–3.19, decisions 34–42. Updated again 2026-10-20 with ETBlue's answers to the open questions: decisions 43–57 (no want page and no need page; solutions get their own path `#/solutions/<n>-<code>`). Section 14 has no open questions now. Updated 2026-10-21 again with ETBlue's notes: the 特別關注 chips on the issue page (decision 75), the 「全部利害關係人」 item on the stakeholder pages (decision 76) and the data filter on the 解法 tab with no stakeholder picked (decision 77).
Updated 2026-10-20 (Phase S) with ETBlue's new notes in `human-inputs.md` (commits 487bac6 and 8c4bd4b): the stakeholder side menu, the new `#/stakeholders` page, the stakeholder page layout, wide screens up to 1440 px and the compact issue card. New sections 3.20–3.22, decisions 61–73. Updated 2026-10-21 with ETBlue's answers to Q14–Q19: Q17 changed decision 69 (on a phone the side bar is closed by default on every page). Section 14 has no open questions now. Updated 2026-10-21 again with ETBlue's notes: the 特別關注 chips on the issue page (decision 75), the 「全部利害關係人」 item on the stakeholder pages (decision 76) and the data filter on the 解法 tab with no stakeholder picked (decision 77).
Updated 2026-10-22 (Phase L, draft) with ETBlue's notes in `human-inputs.md` (commits ef77fec and a325fcb: 「including cross-issue」 and the card view / tree view toggle) and ETBlue's decisions of 2026-10-22: the sort and filter bar on the three list pages, count-based sorts as a reader's choice, `#/stakeholders` without the side bar and with a card view and a tree view, and new dates. New section 3.23, decisions 79–93, open questions Q21–Q24 (section 14), decision 94 (Q20 answered).
Updated 2026-10-22 again with ETBlue's answers to Q21–Q24 and ETBlue's notes in `human-inputs.md` (commit e879ba7): decisions 83, 84, 88 and 90 are final, decision 82 has no 依編號 sort now (Q24), the search box on the three list pages (new section 3.23.13, decisions 95–98) and the breadcrumb on the issue page (decision 99). Section 14 has no open questions now.
Updated 2026-10-22 again with ETBlue's answer about the breadcrumb (ETBlue, 2026-10-22): an item that names an issue, a stakeholder or a solution shows the ID and the name, for example 首頁 › 議題 › #8 無菸城市, on every page (3.2, 3.12, 3.15, 3.18, 3.23.10, decisions 94 and 99).
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
| Names | The app says 「解法」 everywhere, never 「提案」. 「訴求」 is a thing a stakeholder wants: one per W group, plus one per story with no W group (the same items as the opinion check pick list, section 4.1). 「需求」 is what a stakeholder gets (the 以便… cell). In an issue it is one per N group (相同需求群組), plus one per story with no N group: the rows of step 5.2 (`needs` in the issue JSON). This changed on 2026-10-20 (decision 43); before, it was one per story. |

## 3. Screens

### 3.1 Home page

URL: `#/`. The home page is short. It has a hero and three blocks. The full lists are on their own pages (section 3.9).

**Hero.** A full-width band at the top of the page, under the header. It has the app name (h1), the subtitle 「在提案之前，先看見各方利害關係人的關注」, and two short paragraphs: what the app does, and who it is for (citizens, civil servants, civic tech communities). No disclaimer in the hero: it is in the footer (3.8).

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
| 最近加入分析的族群 | Active stakeholders (moved IDs left out) | `added` (新增日期 in `stakeholders.csv`) | `#/stakeholders?sort=added` (Phase L, decision 91; was `#/stakeholders`) |
| 最近分析出的解法 | Solutions of every analyzed issue | `added` (新增日期 in 6.1) | `#/solutions?sort=added` (Phase L, decision 91; was `#/solutions`) |

Each item shows:

| Block | Item |
|---|---|
| 最近更新的議題 | A compact `IssueCard`: 「#8 無菸城市」 (link to the issue), 跨議題共用的利害關係人, 資料根據 (counts and bar), 更新日期, the space types (links to the space pages). Since Phase S (decision 72); before, only the title, the date and the space types. The 資料根據 explanation line (3.9) is shown once, under the block's list. |
| 最近加入分析的族群 | The name (link to the stakeholder page), the ID, the 特別關注 badges, the issues it appears in (links), 資料根據 (counts and bar, the same as on the issue cards; decision 107), 加入日期. The 資料根據 explanation line (3.9, with the noun 利害關係人) is shown once, under the block's list. |
| 最近分析出的解法 | 「#8 E」 and the name with its tag (the code and name are a link to the solution page, 3.12), the one-line summary, 新增日期 |

Sort rule for all three blocks: by date, newest first. Items with the same date are sorted by ID, highest first (issue number; stakeholder ID, the reverse of the usual ID order, so I comes before O and I28 before I27; for solutions the issue number, then the solution letter). **Never sorted by a count** (this still holds for the home blocks after Phase L; decision 81). An item without a date (for example an issue with no git history) goes last. The sort functions are `recentIssues`, `recentStakeholders` and `recentSolutions` in `src/lib/recent.ts`. The page does not show a line about this sort, and the three blocks have no line above them (ETBlue, 2026-10-22). 資料根據 on the issue and stakeholder cards is only the counts and the bar, with no share, so a card does not read like a score (decision 107).

Old links to the stakeholder filter on the home page (`#/?cross=1`, shared on Discord) go to `#/stakeholders?issue=X`, the stakeholders in 2 or more issues (Phase L, decision 91). Before Phase L they went to `#/stakeholders?cross=1`.

### 3.2 Issue page

URL: `#/issues/<n>` (the 總覽 tab) and `#/issues/<n>/<tab>`. The issue page has nine tabs, in this order. 總覽 opens first. (ETBlue, 2026-10-20, decisions 34 and 38; the five 分析摘要 tabs: ETBlue, 2026-10-22, decision 102.)

| Tab | URL | Tab label (example #2) |
|---|---|---|
| 總覽 | `#/issues/2` | 總覽 |
| 訴求 | `#/issues/2/wants` | 訴求 39・衝突 9 |
| 需求 | `#/issues/2/needs` | 需求 21 |
| 解法 | `#/issues/2/solutions` | 解法 5 |
| 難以取捨 | `#/issues/2/decisions` | 難以取捨 4 |
| 可能爭議 | `#/issues/2/controversies` | 可能爭議 5 |
| 影響到弱勢 | `#/issues/2/disadvantaged` | 影響到弱勢 5 |
| 法規障礙 | `#/issues/2/legal` | 法規障礙 4 |
| 相關解法與政策 | `#/issues/2/dependencies` | 相關解法與政策 5 |

Rules for the tab labels:
- The counts come from `issueTabCounts` in `src/lib/tabCounts.ts`. 訴求 is `wantCount` (the opinion check pick items, 4.1). 衝突 is the number of conflicts (C1, C2…). 需求 is `needCount` (the rows of step 5.2, `needs` in the issue JSON; decision 43). 解法 is the number of solutions.
- The five 分析摘要 tabs count the rows of their topic (`summaryTabCounts` in `src/lib/summary.ts`). On 影響到弱勢 (受影響較大的弱勢族群) only the filled rows count: a row whose 說明 is 【待補】 (for example 「呼吸道疾病（尚未納入）」) is shown in the tab but not counted (decision 102). The count does not change when 「只看有資料根據」 hides rows (decision 108).
- A count is a plain number, also in the accessible name (「訴求 39・衝突 9」). It is not a score.
- The counts are the totals of the issue. They do not change when a filter is on (3.14, decision 49).
- Below `md` the issue tab list is one row that scrolls sideways inside itself (`PageTabs` with `scrollOnPhone`). The page itself has no sideways scroll. When the current tab is outside the visible part, the list scrolls to put it in the middle. From `md` the list wraps (one row at 1280 px, two rows at 768 px). The stakeholder page and the solution page keep the old rule: on a phone the tab list wraps onto two rows and never scrolls sideways (decision 102).
- A label with counts has two parts (`TabLabel` in `src/lib/tabLabel.ts`): the name and the counts. Below `md` the second part is on its own line under the first, in smaller text, for example 「訴求 39」 over 「衝突 9」, and 「需求」 over 「涵蓋 9・未涵蓋 12」 on the solution page. Neither part breaks inside. From `md` the label is one line. The tab's `aria-label` is the one-line text, so every count stays in the accessible name. (Review of N4–N9, 2026-10-20: the one-part label broke onto 3 lines at 360 px.)

Above the tabs: the breadcrumb, the h1 (「#2 找回消失的垃圾桶」), the space types and the update date, as before.

**Breadcrumb (decision 99).** `human-inputs.md` asks for a breadcrumb on the issue page, the stakeholder page and the solution page. The issue page gets the same breadcrumb as the solution page (3.12) and the story page (3.15):

| Part | Design |
|---|---|
| Items | 首頁 › 議題 › #8 無菸城市. 首頁 links to `#/`. 議題 links to `#/issues`. The last item is the issue number and the title. |
| ID and name | One rule on every page: an item that names an issue, a stakeholder or a solution shows the ID and then the name. The ID is in `font-mono`. The name is plain text. An item with no name keeps its ID only. A story has no title in the data (only 我想要… and 以便…), so a story item is its ID only, for example 「#2 I06-US01」. A name with Markdown or a tag is shown as plain text, with no tag badge. (ETBlue, 2026-10-22: "the ID plus the name") |
| All breadcrumbs | Issue page: 首頁 › 議題 › #8 無菸城市. Solution page: 首頁 › 解法 › #2 A 清潔箱佈建建議地圖. Cross-issue solution page: 首頁 › 解法 › X-A 同一段人行道的共同參與式選址. Stakeholder page: 首頁 › 利害關係人 › I06 身心障礙者（視障、輪椅使用者）. Story page: 首頁 › 利害關係人 › I06 身心障礙者（視障、輪椅使用者） › #2 I06-US01. |
| Long names | A long name wraps inside its item, between characters or words. The separators stay between the items. A 360 px screen has no sideways scroll. |
| Current item | The last item is plain text with `aria-current="page"`. It is not a link. |
| Markup | `<nav aria-label="頁面位置">` with an `<ol>`. Each separator 「›」 is its own `<li aria-hidden="true">` in muted text. The links use `targetLinkClass` (24 × 24 px targets). This is what `Solution.tsx` and `StakeholderStory.tsx` do today. |
| Tabs | The same breadcrumb on every tab. It does not name the tab, because the tab list shows it. |
| Links | 議題 goes to `#/issues` with no params. The back button still returns to the list with its sort, filters and search, because they are in the URL (3.23.5). |
| Where | At the top of the page, above the h1, also on the page of a 製作中 issue. The "not found" message has no breadcrumb, as on the solution page. |
| Keyboard order | The breadcrumb links, the h1 and the metadata links, the tab list, then the tab content. |

**Shared component.** Today `Solution.tsx` (twice) and `StakeholderStory.tsx` each write the breadcrumb markup themselves. A new component `Breadcrumb` (`src/components/Breadcrumb.tsx`) takes `items: { id?, name?, to? }[]` and writes the markup above: the ID in `font-mono`, a space, then the name. The last item is the current one. The issue page, the solution page, the cross-issue solution page, the story page and the stakeholder page (decision 94) all use it. The solution breadcrumbs now also show the solution name. The story breadcrumb now uses `targetLinkClass`, like the others. Nothing else in their look changes. The strings 「頁面位置」 and 「首頁」 move to one shared block `breadcrumb` in `src/i18n/zh-TW.ts` (today they are in `storyPage` and `solutionPage`); 「議題」 is new there.

**總覽.** The same content as before (title, tag legend, counts, 資料根據, 特別關注族群, 使用相同空間的議題, 待補清單), plus one new section at the end. The 分析摘要 is no longer on 總覽: each topic has its own tab (decision 102, below).
- 「利害關係人」 (h3, element ID `focus-stakeholders`): the stakeholder list of this issue, the content of the old 利害關係人 tab (`StakeholderList` with detailed `StakeholderCard`s, 3.9). (Decision 38.)
- The counts row: 利害關係人 links to the section above (`?focus=stakeholders`), 訴求 to the 訴求 tab, 衝突 to `#/issues/<n>/wants?focus=conflicts`, 需求 to the 需求 tab, 解法 to the 解法 tab. 使用者故事 has no tab, so its count is plain text.
**分析摘要 tabs (decision 102).** The tab names are short (ETBlue, 2026-10-22): 難以取捨 (the topic 難以取捨的決定), 可能爭議 (可能的爭議), 影響到弱勢 (受影響較大的弱勢族群), 法規障礙 (法規上的障礙) and 相關解法與政策 (相依事項與現行政策的關係). The hidden h2 of each tab is the full topic name. Each tab (`SummaryTab` in `src/components/issue/SummaryTab.tsx`) shows:
- one short line: 「分析摘要不加入新的事實，每一項都列出它來自哪些故事、衝突或解法。大部分是 AI 的判斷。」 The old intro of 分析摘要 on 總覽 also listed the five topics. The tab list shows them now, so that part is dropped.
- the 「只看有資料根據」 toggle (`DataBasisToggle`, the same label, hint and `?evidence=1` as the toggle in the side bar), then the filter status line (`FilterStatus`: 「篩選：只看有資料根據。顯示 N 項。」 and 「清除篩選」) while the filter is on (decision 108).
- the rows of the topic, in file order: 項目, 說明 with its tag, and 「相關：」 with the reference links. A 【待補】 row has a dashed border. With the filter on, only the rows whose 說明 is tagged `[實證]` or `[AI整理]` are shown (`summaryItemsShown` in `src/lib/summary.ts`); the `[AI模擬]` rows and the 【待補】 rows are hidden. When no row is left, the tab says 「這裡沒有說明標記 [實證] 或 [AI整理] 的項目。」 The reference links keep `?evidence=1`.
- no side bar (the side bar is only on 訴求, 需求 and 解法).

The 分析摘要 links (`summaryRefTo` in `src/lib/summary.ts`):

| Reference | Link |
|---|---|
| Story (`I01-US09`) | The story page (3.15). The stakeholder is the part of the ID before 「-」. |
| W group (`W08`) | The 訴求 tab with the item picked in the opinion check: `#/issues/2/wants?pick=W08` |
| N group (`N01`) | The 需求 tab, scrolled to the need: `#/issues/2/needs?focus=N01` |
| Stakeholder (`I05`) | The stakeholder page |
| Conflict (`C9`) | The 訴求 tab, scrolled to the conflict: `#/issues/2/wants?focus=C9` |
| Solution (`解法 E`) | The solution page (`#/solutions/2-E`, 3.12) |
| Another issue (`#8 解法 B`, `#1 C7`, `#1 N03`, `#8 I06-US01`) | The same kind of target in that issue. The other issue's file is not needed, because every target is built from the IDs. |

Issue links keep the 「只看有資料根據」 filter (`?evidence=1`). A reference that cannot be read stays plain text.

**訴求** (decision 38: 衝突 and the opinion check are in this tab). From top to bottom:
1. The stakeholder filter menu (3.14) and the 「只看有資料根據」 toggle.
2. 「訴求與意見健檢」 (h3). One line: 「訴求是利害關係人心中的解法，還沒有評估。選一個和你的想法相近的訴求，看看誰也想要、誰可能有不同意見。」 Then the opinion check (section 4): the search box, the pick list and the result. The pick list is the list of wants of the issue. Each item has the element ID `focus-<want key>` (3.16), so a link can point to it. Each item now also shows:
   - the stakeholders of its stories, in ID order, as links to each stakeholder's 訴求 tab (`#/stakeholders/<id>/wants`). There is no want page (decision 45).
   - 「有衝突：C1、C6」 when a story of the item is on a side of a conflict. Each code links to `?focus=C1`.
3. 「衝突」 (h3, element ID `focus-conflicts`). Each conflict (element ID `focus-C1`), in file order:
   - the conflict text with its tag
   - 「一方」 and 「另一方」: the stories of each side (`sideA`, `sideB`), each with its stakeholder; the story ID links to the story page
   - 「雙方的需求」: the needs of each side (`needsA`, `needsB`): the summary, the priority label with its tag, and a link to `?focus=<need>` on the 需求 tab
   - 「以需求為本的解方」: the `wayOut` cell with its tag, and the solutions in `wayOutSolutions` as links. When the list is empty, the cell says why (「未找到…」).
   - the deliberation method and the simulated result. When a way out exists, the method is shown under the heading 「備案：審議方法」, because it is only for places where the way out does not work (`analysis/docs/method.md`). Otherwise the heading is 「審議方法」.

With a stakeholder picked in the menu, the tab shows only the wants with a story of that stakeholder, and only the conflicts with a story of that stakeholder on either side. The search and the data filter work on top of it.

**需求.** From top to bottom:
1. The stakeholder filter menu and the 「只看有資料根據」 toggle. On this tab the data filter keeps a need when at least one of its stories has a `[實證]` or `[AI整理]` 以便… cell (the same rule as the old `#/needs` page, decision 22).
2. One line: 「需求是利害關係人得到的好處（以便…）。需求之間不會衝突。優先順序（MoSCoW）是這些利害關係人有多需要它，不是利害關係人之間的排名。」
3. The needs, grouped by priority in the fixed order 必須有, 應該有, 可以有, 這次不做 (an h3 per group, empty groups left out). Inside a group: the order of step 5.2 (file order). Never sorted by a count. Each need (element ID `focus-<need key>`, 3.16) shows:
   - the summary with its tag. An N group uses the group's summary and tag (`needGroups`). A need with no group uses the 以便… cell of its story.
   - the need ID in small text (「N01」 or 「I24-US01」)
   - the priority label with its tag, and 「理由」 (`reason`) with its tag
   - 「誰需要」: the stakeholders of its stories, in ID order, as links to each stakeholder's 需求 tab (`#/stakeholders/<id>/needs`). There is no need page (decision 45).
   - 「相關故事（9 則）」: a Collapsible with the stories (story ID link, stakeholder, 我想要… with its tag)
   - 「涵蓋的解法」: the solutions whose `needs.must` or `needs.shouldCould` lists the need, as links. When none: 「尚未有解法涵蓋」 (for a 這次不做 need: 「這次不做，所以沒有解法涵蓋」).
   - 「出現在衝突」: the conflicts that list the need in `needsA` or `needsB`, as links to the 訴求 tab (`?focus=C1`)

With a stakeholder picked, the tab shows only the needs with a story of that stakeholder. 「出現在衝突」 then lists only the conflicts that the 訴求 tab shows with the same stakeholder (a story of that stakeholder on either side), because the links keep `?stakeholder=` and a hidden conflict would be a link to nothing. The 「有衝突」 list of a want follows the same rule.

**解法.** The stakeholder filter menu and the data toggle, then each solution in letter order:
- the title link, the summary and the space types (as before)
- 「涵蓋的需求」, in two parts as in step 6.2: 「必須有」 (`needs.must`) and 「應該有、可以有」 (`needs.shouldCould`). Each need shows its summary with its tag and its stakeholders as plain IDs. The summary links to the need on the 需求 tab (`?focus=`).
- 「解開的衝突」: the conflicts whose `wayOutSolutions` lists this solution, as links to `?focus=C1` on the 訴求 tab. Left out when there are none.
- the cross-issue box (3.18) when the solution is part of a cross-issue solution

With a stakeholder picked, the tab shows only the solutions that cover at least one need of that stakeholder. In each solution, the needs list shows only that stakeholder's needs, with one line 「這個解法還涵蓋其他 6 個需求」 that links to the solution's 需求 tab. 「解開的衝突」 shows only the conflicts with a story of that stakeholder on either side (the ones the 訴求 tab shows with the same filter). The need links and the conflict links keep `?stakeholder=` and `?evidence=1` (3.14).

With 「只看有資料根據」 on, each solution shows only the needs with a data basis (`dataBasedNeeds`). With a stakeholder picked, a solution is listed only when at least one of that stakeholder's needs in it is still shown. A solution whose needs of that stakeholder are all hidden is not listed and not counted in the side menu, the same rule as the stakeholder page (decisions 59 and 74). When the list is then empty, the tab says 「沒有解法涵蓋這位利害關係人標記 [實證] 或 [AI整理] 的需求。」. With no stakeholder picked, the same rule applies to all the needs of the solution (decision 77): a solution whose needs are all hidden is not listed. A solution that lists no need at all stays. When no solution is left, the tab says 「沒有解法涵蓋標記 [實證] 或 [AI整理] 的需求。」. The old note 「這個解法涵蓋的需求，都沒有標記 [實證] 或 [AI整理]。」 is removed. The tab label stays the total (decision 49).

**Old tab URLs** (shared on Discord) redirect with `replace`, so the back button does not loop. The logic is `legacyIssueTab` in `src/lib/issuePage.ts`.

| Old URL | Goes to |
|---|---|
| `#/issues/<n>/opinion` (with any query, for example `?pick=W08`) | `#/issues/<n>/wants` with the same query |
| `#/issues/<n>/conflicts` | `#/issues/<n>/wants?focus=conflicts` |
| `#/issues/<n>/stakeholders` | `#/issues/<n>?focus=stakeholders` |

**The `?focus=` parameter** (decision 53). Hash URLs use the `#` for the route, so a page cannot use a second `#` to jump to a part of the page. Instead, `?focus=<value>` names the part. After the tab content has loaded, the page scrolls to the element `focus-<value>` and moves keyboard focus to it (the element has `tabIndex={-1}` and a visible focus outline). An unknown value does nothing. The values are checked by `focusElementId` in `src/lib/focus.ts`: `conflicts`, `stakeholders`, a conflict ID (`C1`), a W group (`W08`, a want on the 訴求 tab), an N group (`N01`, a need on the 需求 tab) or a story ID (a want or a need with no group). A link to one want or one need uses this parameter (decision 57).

**Side bar (Phase S, decisions 66–70).** The stakeholder menu of the 訴求, 需求 and 解法 tabs becomes the side menu of 3.21: a tree, with a count next to each stakeholder (decision 66). The 「只看有資料根據」 toggle moves from the top of the tab content into the side bar, above the tree (decision 67). The filter status line and 「清除篩選」 move from the menu to the top of the tab content (decision 68). The menu stays inside the tab content, after the tab list, and the 總覽 tab has no side bar (decision 58 is kept, decision 70). The five 分析摘要 tabs have no side bar either (decision 102). So item 1 of the 訴求 and 需求 lists above, and 「The stakeholder filter menu and the data toggle」 of the 解法 tab, now mean the side bar.

**特別關注 chips (decision 75).** The side bar of the 訴求, 需求 and 解法 tabs also has the 特別關注 chips, below 「只看有資料根據」. It shows only the groups that at least one stakeholder of the issue has, in `FOCUS_ORDER`. In the analyzed issues: #1 高齡, 身心障礙, 兒童與照顧者, 經濟弱勢; #2 the same plus 外籍; #8 and #9 all six groups. A chip is in the URL as `special=<group>`. The chips work in two places:
- The menu lists only the stakeholders of the issue with one of the picked groups. The picked stakeholder (`?stakeholder=`) always stays in the menu.
- The tab content shows only what belongs to those stakeholders:

| Tab | With a chip on |
|---|---|
| 訴求 | The wants (W groups) with a story of a stakeholder in a picked group. The conflicts with such a story on either side, the same rule as `?stakeholder=` (decision 59). A want lists only the conflicts that are shown. |
| 需求 | The needs with a story of a stakeholder in a picked group. A need lists only the conflicts that the 訴求 tab shows with the same filters. |
| 解法 | The solutions that cover such a need. Each solution lists only those needs, with 「這個解法還涵蓋其他 N 個需求」 for the rest. 解開的衝突 lists only the conflicts that the 訴求 tab shows. |

The chips work together with 「只看有資料根據」 (both apply). With `?stakeholder=` set too, the stakeholder filter applies on top: an item must have a story of that stakeholder and a story of a stakeholder in a picked group. The menu counts use the same filters, so a count is still the length of the list after a click (decision 66). The tab labels stay the totals (decision 49). The filter status line names the chips (「特別關注：高齡」) and says what is shown. When nothing is left, the tab says 「沒有符合目前篩選的訴求。」 (or 衝突, 需求, 解法). 「清除篩選」 removes the chips. Tab changes and every side bar link keep them. 只看跨議題 is not on the issue page.

**Kept across tabs:** the tab change keeps `?evidence=1` and `?stakeholder=` (`keptSearch` in `src/lib/stakeholderFilter.ts`). It drops `pick` and `focus`.

### 3.3 Stakeholder page

URL: `#/stakeholders/<id>` (the 總覽 tab) and `#/stakeholders/<id>/<tab>`, for example `#/stakeholders/I06/needs`. The stakeholder is the main entity of the app (decision 35), so its page has the same tabs as the issue page (decision 34):

| Tab | URL | Tab label (example I06) |
|---|---|---|
| 總覽 | `#/stakeholders/I06` | 總覽 |
| 訴求 | `#/stakeholders/I06/wants` | 訴求 5・衝突 4 |
| 需求 | `#/stakeholders/I06/needs` | 需求 4 |
| 解法 | `#/stakeholders/I06/solutions` | 解法 4 |

The page covers every analyzed issue the stakeholder is in. Each tab has one h2 per issue (「#2 找回消失的垃圾桶」, a link to the issue), in issue number order.

Rules for the tab labels:
- The counts come from `stakeholderTabCounts` in `src/lib/tabCounts.ts`. They are summed over the issues, because they count items (wants, conflicts, needs, solutions), not priorities (decision 48). The rule 「never summed across issues」 in 3.4 is about priority counts, and it still holds.
- 訴求: the different want keys of its stories (3.16), per issue. 衝突: the conflicts with one of its stories on a side. 需求: the different need keys of its stories (3.16). 解法: the solutions that cover at least one of its needs.
- Example I06: #1 has wants W06, W08, need N08, conflicts C1, C7, solution D. #2 has W08, W11, needs N07, N08, conflict C6, solutions A, C. #8 has W07, need I06-US01, conflict C3, solution A. So: 訴求 5・衝突 4, 需求 4, 解法 4. Since #9 was added (2026-10-20), I06 is also in #9, with the want key I06-US01 (no W group), need N06 and solution E. So the page now shows 訴求 6・衝突 4, 需求 5, 解法 5. The tests still use the example above, on the fixtures of #1, #2 and #8.

*Phase L (decision 94): the stakeholder page has no side bar now. See 3.23.10 for the new layout. The text below is the Phase S design.* Layout (Phase S, decision 64, section 3.21): the page has two parts. The **side bar** is the stakeholder side menu with the filters (3.21). The **main block** has, from top to bottom: the note 「O02 已改為 I12」 after a redirect, the h1 (the name), the metadata (the ID, 分類路徑 as names, 特別關注, the issues it appears in as links), then the tab list and the tab content. From `lg` the side bar is a left column next to the whole main block, so it starts at the same height as the h1. Below `lg` the side bar is a closed Collapsible above the main block (3.21). The page shares one layout route with `#/stakeholders` (3.20), so the side bar keeps its open and closed groups and its scroll position when the reader picks another stakeholder.

*Replaced by Phase S:* the menu was on the left of the tabs only, and the h1 and the metadata were above both columns (decision 58).

**總覽.** Per issue:
- 與本題的關係 (with its tag)
- the priority counts of its stories, with the legend (3.4)
- its input sources (1.2)
- 「使用者故事」: its stories as `StoryCard`s. The story ID links to the story page (3.15). Each card also has the links 「訴求」 and 「需求」 to its want and its need on the issue's tabs (`#/issues/<n>/wants?focus=<want key>`, `#/issues/<n>/needs?focus=<need key>`, decision 57).

**訴求.** Per issue:
- its wants, in the order of the issue's pick list. Each shows the want text with its tag (a link to the want on the issue's 訴求 tab, `?focus=<want key>`), 「同樣想要的人」 (the other stakeholders of the W group, links to their stakeholder page's 訴求 tab), 「有衝突：C6」, and a link 「到 #2 做意見健檢」 (`#/issues/2/wants?pick=<key>`).
- 「衝突」 (h3): its conflicts, each with the other side's stories, 雙方的需求, 以需求為本的解方 and the method, as on the issue's 訴求 tab (3.2).

**需求.** Per issue: its needs, grouped by priority (必須有, 應該有, 可以有, 這次不做). Each shows the summary with its tag (a link to the need on the issue's 需求 tab, `?focus=<need key>`), its own 以便… texts when they differ from the group summary, 「同樣需要的人」 (the other stakeholders of the N group, links to their stakeholder page's 需求 tab), and the solutions that cover it, or 「尚未有解法涵蓋」.

**解法.** Per issue:
- the solutions that cover at least one of its needs, as compact `SolutionCard`s, each with 「涵蓋的需求：」 and the stakeholder's needs it covers
- 「尚未有解法涵蓋的需求」: its needs that no solution covers. This replaces 「沒有解法涵蓋的故事」.
- With 「只看有資料根據」 on, a need with no data basis (`dataBasedNeeds`) is hidden, and a solution with no need left is hidden too (decision 59).

**Moved IDs.** A moved ID (for example `#/stakeholders/O02`, also with a tab or a story page) redirects to the new ID with the rest of the path kept, plus `?from=O02` for the note. On a story sub-page, a story ID that starts with the old ID gets the new ID (`O02-US01` → `I12-US01`). Any other story ID is kept, and the page shows "not found" when it does not exist.

The 「只看有資料根據」 toggle works on every tab, with the same rules as the issue page. Since Phase S it is in the side bar, not above the tab content (decision 67). *Since Phase L it is in the filter row at the top of the tab content (decision 94, 3.23.10).* The filter status line and 「清除篩選」 are at the top of the tab content (decision 68).

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

- There are three source tags (see `analysis/docs/method.md`):
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
- the issues that use this space type, as compact `IssueCard`s (3.9): 1 column on a phone, 2 columns from `sm`, 3 from `lg`. Since Phase S each card also shows 跨議題共用的利害關係人 and 資料根據 (decision 72), and the 資料根據 explanation line (3.9) is shown once, under the h2 of this list.
- every solution, from every issue, that uses it, with its one-line summary and a link
- the stakeholders of those solutions' stories, with links to their stakeholder pages

For example, under 人行道: #2 解法 A (bins), the #1 solutions about tree pits, and I06 身心障礙者, who needs sidewalk width in both issues.

Space types have no `[實證]` / `[AI整理]` / `[AI模擬]` tag. They are a classification, like 分類路徑.

### 3.7 Header

On every page. A `<header>` landmark with:

- the app name 「市政提案小幫手」 on the left, a link to the home page
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
| `#/stakeholders`, `#/stakeholders/<id>`, its tabs and its story pages (`#/stakeholders/<id>/stories/…`, 3.15) | 利害關係人 |
| `#/solutions` and the solution pages under it: `#/solutions/2-A`, `#/solutions/X-A` and their tabs (3.12, 3.18). Also the old `#/issues/<n>/solutions/<code>…`, which redirects there. | 解法 |
| `#/`, `#/about`, `#/spaces/<code>`, unknown pages (also the old `#/wants` and `#/needs`) | none |

Solution pages are under 解法, not 議題, because a solution path is under `#/solutions` now (decision 56).

The active link has `aria-current="page"` only on the list page itself. On a page under it, the link has `aria-current="true"`.

The counts come from pure functions in `src/lib/`. A count is a plain number next to its label. It is not a score. While the data loads, the label shows with no number.

On a phone (375 px, and also 360 px) the header must not scroll sideways. The longer app name 「市政提案小幫手」 (decision 42) must fit on the first row at 360 px. The app name is on the first row. The three links and the toggle wrap onto the next row. The order on screen is the same as the keyboard order.

### 3.8 Footer

On every page. A `<footer>` landmark with three parts, in this order (`human-inputs.md`, information architecture):

| Part | Content |
|---|---|
| 這是什麼 | One short paragraph on the context of the app: 市政提案小幫手 is ETBlue's entry for 「市政 debug 松」. It turns the analysis of Taipei city issues into structured data, so readers can see each issue's stakeholders, their concerns and the possible solutions. |
| 免責聲明 | A personal work by one participant, made with AI help. It is not linked to the host or to the Taipei City Government. `[AI模擬]` content is not real interviews or real citizen words. `[AI整理]` content is an AI summary of real data or news reports, not yet checked by a person, and its counts are estimates. This is the only disclaimer on the page (3.5). |
| 關於本站 | A link to `#/about` (3.13), in a small `<nav>` named 「網站資訊」. |

On a wide screen the first two parts are side by side, and the link is on its own row below them. On a phone the three parts stack. The project links, the licenses and the data files moved to the about page (decision 32).

### 3.9 List pages

*Phase L (2026-10-22) changes the three list pages: section 3.23 has the new page frame, the sort and filter bar, the sorts, the filters and the card fields. The h1 is now visually hidden (decision 79). The fixed orders and the never-sort-by-count rules below are replaced only for the sorts the reader picks on these three pages (decision 81). The card tables below still hold, with the fields added in 3.23.9.*

Each list page has its own URL and an h1. The header links to it.

**`#/issues`: 議題列表.** The issues in `analysis/data/issues.csv`: the 6 host issues with a topic (#1–#6), and #8 (無菸城市), which a participant added. #7 (自由題) has no topic, so it is not listed. The 來源 column of `issues.csv` (`主辦單位` or `參加者補充`) becomes `source` in `index.json`. A card with `參加者補充` shows the note 「非主辦單位題目，由參加者補充」 under its title. An issue without an analysis shows 「製作中」 with no numbers, and cannot be opened. Each analyzed issue card shows:

| Field | Example (#2) |
|---|---|
| 利害關係人 | 24 位（組織 13、個人 11） |
| 使用者故事 | 45 則 |
| 衝突 | 7 個 |
| 解法 | 4 個 |
| 跨議題共用的利害關係人 | For example 「8 位, shared with #1」 (the real number is known after #1 is written). Links to the stakeholder list page with the 「只看跨議題」 filter on (`#/stakeholders?cross=1`; Phase L: `#/stakeholders?issue=X`, decision 91). Shown only when 2 or more issues exist. |
| 資料根據 | 實證 8・AI整理 21・AI模擬 72・待補 1（共 102 格，來自 51 則故事） 實證 8%, and a small stacked bar under it. See below. |
| 尚未納入的特別關注族群 | 呼吸道疾病、外籍 (from `focusGaps`, in the fixed order). When every group is included: 「特別關注族群　都已納入」. Never a count like 「4／6」: it reads like a score (decision 25). |
| 更新日期 | Date of the last git commit that changed the issue folder. Left out if the build has no git history. |
| 空間類型 | The issue's space types, for example 人行道、騎樓. Each one links to its space page (section 3.6). |

A space type filter sits above the issue list. *Replaced by the bar of 3.23 (decision 85): the filters are in the URL now.*

**資料根據** (issue card and 總覽 tab, decision 20):
- Unit: story cells. Each story has two: 我想要… (`want`) and 以便… (`soThat`). 65 stories have 130 cells. The priority tag and other tables are not counted.
- Parts, in a fixed order: 實證, AI整理, AI模擬, 待補 (a cell with no tag, `tag: null`). The text always lists the first three, also when 0. 待補 is listed only when there is one.
- `build_json.py` counts the cells (`counts.cells` in `index.json`). `src/lib/cellBasis.ts` makes the text parts, the bar and the percent.
- The 實證 percent is shown next to the counts, never alone. It rounds to the nearest whole number, a half up (12.5 → 13). It is at least 1 when there is a 實證 cell, and at most 99 when not every cell is 實證.
- The bar is `aria-hidden`; the text carries the meaning, so color is never the only signal. The segments use the tag badge colors (`--tag-evidence`, `--tag-summary`, `--tag-simulated`; 待補 is `--muted-foreground`). They pass 3:1 on the page backgrounds in both themes (tested).
- One explanation line, once on `#/issues` (not on each card) and on the 總覽 tab: 「這是分析內容的資料來源組成，不代表議題的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。」
- An issue that is 製作中 shows no breakdown.
- Issues are never sorted, ranked or filtered by these numbers. The list keeps issue number order. *Replaced on `#/issues` only by the reader-picked sort 資料根據比例 (decision 81, 3.23.3). The default order is by date (decision 82). Everywhere else this rule holds.* ~~The home page does not show them.~~ Since Phase S the compact `IssueCard` shows them too, on the home page and the space page, without the totals and without the 實證 percent (decision 72). The explanation line is shown once per list.

**`#/stakeholders`: 利害關係人列表.** *Replaced by section 3.20 in Phase S (decision 62), and again by section 3.23 in Phase L (decision 87): a list of `StakeholderCard`s with the sort and filter bar.* In Phase S the page was the side menu and a statistics block; Phase L removes both (decisions 87 and 88). The text below is the old design. The tree with detailed `StakeholderCard`s stays only in the 「利害關係人」 section of the issue's 總覽 tab.

Every stakeholder in `stakeholders.csv`, across all issues.

| Part | Design |
|---|---|
| Organizations (O) | A tree from 分類路徑, for example 政府 › 地方政府 › 臺北市 › 環保局 › 清潔隊. Each level opens and closes. |
| Individuals (I) | Grouped by 類別 (居民, 用路人, 遊客, 工作者) |
| Each stakeholder row | Name, then one entry per issue with its priority counts (section 3.4), for example 「#2 `[AI模擬]` 必須有 1 · 應該有 1」 |
| Each tree level | Only the total story count of the stakeholders under it, so a closed level still shows that it has content. No priority counts at tree levels. |
| Filters | 「只看跨議題」 (2 or more issues) and the 特別關注 chips |
| Order | Always tree order or ID order. Never sorted by count. *(Old design. Phase L: see 3.23.3.)* |
| Note | 「故事數只表示分析寫了多少，不代表重要程度。」 |

Moved IDs (with 「已改為 …」) are not listed.

The 「只看跨議題」 filter is in the URL (`#/stakeholders?cross=1`), so an issue card can link to it. *(Phase L: the issue card links to `#/stakeholders?issue=X`, and `?cross=1` redirects there, 3.23.5.)*

**`#/solutions`: 解法列表.** Every solution of every analyzed issue, grouped by issue (an h2 per issue), in issue number order, then letter order. Never sorted by a count. *Replaced by 3.23 (decisions 81, 85, 89): one flat list with the cross-issue solutions, sorted by the reader's pick (default 最近更新), with the filters in the URL.*

| Part | Design |
|---|---|
| Each solution | 「#2 A」 and the name with its tag, the one-line summary, space types (links), 新增日期, the number of needs it covers as plain text (for example 「涵蓋 9 個需求」; decision 54, before 2026-10-20 it was the number of stories). The code and name are a link to the solution page (3.12). |
| Filters | Space type and issue, both as toggle chips. Several picked chips in one filter: a solution matches ANY of them. Nothing picked: all. A status line says how many solutions match. |
| Logic | `solutionGroups` and `solutionSpaceOptions` in `src/lib/solutionList.ts` |

The list pages `#/wants` (訴求列表) and `#/needs` (需求列表) were removed (decision 31). Their old URLs show the not-found page. The opinion check pick links they used stay in `src/lib/opinion.ts`: `opinionPickTo` and `storyPickKey` (the old `needPickKey`). The 分析摘要 links (`src/lib/summary.ts`) use them.

**Shared cards.** Every list of 議題, 利害關係人 or 解法 uses one of three shared components. Each has two variants, set with the prop `variant: 'detailed' | 'compact'`. The title is a link to the item's own page. A tag badge stays outside the link.

| Card | `detailed` | `compact` |
|---|---|---|
| `IssueCard` (`src/components/IssueCard.tsx`) | `#/issues`: a box with all the fields in the issue table above, with 資料根據 and the 特別關注族群 line. Props: `shared`, `headingLevel`. | Home 「最近更新的議題」 and the space page: the title link, 跨議題共用的利害關係人 (prop `shared`, the same text and link as `detailed`), 資料根據 (`CellBasis` with `compact`: the label, the counts and the bar, no totals, no 實證 percent), 更新日期 and 空間類型, in a smaller box (decisions 26 and 72) |
| `SolutionCard` (`src/components/SolutionCard.tsx`) | `#/solutions`: the code and name, the summary, 空間類型, 新增日期 and the number of covered needs (「涵蓋 9 個需求」, decision 54). Props: `spaceTypes`, `coveredNeeds` (from `coveredNeedCount` in `src/lib/solutionList.ts`). | Home 「最近分析出的解法」, the space page, the stakeholder page and the opinion check result: the code and name, and the one-line summary |
| `StakeholderCard` (`src/components/StakeholderCard.tsx`) | The 「利害關係人」 section of the issue's 總覽 tab (and `#/stakeholders` before Phase S, decision 62): the name link, the ID, the 特別關注 badges, then one line per issue with the story counts by priority. Prop: `entries` (from `storyCountsByStakeholder`). | Home 「最近加入分析的族群」 (with 出現的議題 and 加入日期 as `children`), the solution page's 利害關係人 tab, the stakeholder page's 訴求 and 需求 tabs (「同樣想要的人」, 「同樣需要的人」), the space page (both lists) and the opinion check 「這個意見沒有直接提到的人」: the name link, the ID and the 特別關注 badges. `children` add 「也出現在 #1」 (`AlsoInLine`) or, on the space page's shared list, the issue numbers. |

Every card is a box. `detailed` uses `rounded-lg border p-4` (`StakeholderCard` uses `p-3` on a phone, because the tree has many cards). `compact` uses `rounded-md border p-3`, the same box for all three cards, so the home blocks look alike. An issue that is 製作中 has a dashed border in both variants. Compact cards are stacked with a gap (`space-y-3`), not split by lines. Inline issue links inside a sentence or a field are references, not lists, so they stay plain links: the 「議題」 field on the stakeholder page and 「同空間的其他議題」 on the 總覽 tab. The same rule applies to stakeholders: the members of a W group (solution page, stakeholder page) and the 特別關注族群 rows on the 總覽 tab stay plain links.

The stakeholder list (`StakeholderList`, on `#/stakeholders` and the 「利害關係人」 section of the issue's 總覽 tab) keeps its category tree: the 組織 tree (collapsible levels by 分類路徑) and the 個人 groups. Only the leaves changed: each stakeholder is a detailed `StakeholderCard`, stacked with a gap. A stakeholder ID that is not in `index.json` still gets a card, with the ID as its name (`findStakeholder` in `src/lib/stakeholders.ts`).

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

URL: `#/solutions/<n>-<code>` (the 總覽 tab) and `#/solutions/<n>-<code>/<tab>`, for example `#/solutions/2-A/needs` (ETBlue, 2026-10-20, decision 56). Solutions have their own path, not a path under the issue, because solutions and issues are many-to-many: a cross-issue solution combines solutions of several issues. A cross-issue solution uses the same path format and the same page: `#/solutions/X-A` (3.18). One page per solution, because the content of a solution can be long (ETBlue, `human-inputs.md`). Page title: 「#2 A 清潔箱佈建建議地圖 · 解法 · 市政提案小幫手」; on another tab the tab name comes after the solution: 「#2 A 清潔箱佈建建議地圖 · 衝突 · 解法 · 市政提案小幫手」. The page has seven tabs (ETBlue, 2026-10-22, decision 103; before: three tabs, decision 36). The labels are from the fixture data of #2 A:

| Tab | URL | Tab label (example #2 A) |
|---|---|---|
| 總覽 | `#/solutions/2-A` | 總覽 |
| 需求 | `#/solutions/2-A/needs` | 需求　涵蓋 9・未涵蓋 13 |
| 訴求 | `#/solutions/2-A/wants` | 訴求　涵蓋 28・未涵蓋 25 |
| 利害關係人 | `#/solutions/2-A/stakeholders` | 利害關係人　涵蓋 14・未涵蓋 13 |
| 衝突 | `#/solutions/2-A/conflicts` | 衝突　解開 5・相關 3 |
| 成效衡量 | `#/solutions/2-A/measures` | 成效衡量 4 |
| 相關政策 | `#/solutions/2-A/policies` | 相關政策　國內 2・國外 2 |

Below `md` the tab list is one row that scrolls sideways, as on the issue page (`scrollOnPhone`, decision 102). The page itself does not scroll sideways.

**The path segment** (`parseSolutionSlug` in `src/lib/entityPaths.ts`):
- `<issue number>-<code>`, for example `2-A`: the solution A of issue #2. The code is the solution code of 6.1 (letters only).
- `X-<letter>`, for example `X-A`: a cross-issue solution. `X-A` is the code as `cross-issue.json` writes it.
- Anything else shows the "not found" message.

**Old URLs.** `#/issues/<n>/solutions/<code>` and `#/issues/<n>/solutions/<code>/<tab>` (shared on Discord) redirect with `replace` to `#/solutions/<n>-<code>` and `#/solutions/<n>-<code>/<tab>`. The query (for example `?evidence=1`) is kept. The issue's own 解法 tab `#/issues/<n>/solutions` does not change.

Definitions (`solutionTabCounts` in `src/lib/tabCounts.ts`, decision 50):
- A need is **covered** when its ID is in `needs.must` or `needs.shouldCould` of the solution (step 6.2). Every other need of the issue (`needs` in the issue JSON) is **not covered**, also a 這次不做 need.
- A stakeholder of the issue is **covered** when at least one of its needs is covered. Every other stakeholder of the issue (step 1) is **not covered**.
- A **want** is the 我想要… cell of one story, so one want is one story. A want is **covered** when the solution covers the need of its story (decision 103). The covered wants are the stories of 6.2.
- 衝突: 解開 is the number of conflicts whose `wayOutSolutions` lists the solution. 相關 is the number of the other conflicts with a covered story on either side.
- 成效衡量: the number of 6.3 rows of the solution. 相關政策: the number of `practices` items with `domestic: true` (國內) and with `domestic: false` (國外) (decision 104).
- The counts are plain numbers. There is no percent and no bar, because a ratio would look like a score. A solution does not need to cover every need. The counts do not change when the filter is on (decision 49).

Above the tabs, on every tab: the breadcrumb (首頁 › 解法 › #2 A 清潔箱佈建建議地圖, in a `<nav>`; 解法 links to `#/solutions`; decision 99), the h1 (「#2 A」 and the name with its tag), the line 「議題：#2 找回消失的垃圾桶」 (a link to the issue), the one-line summary, the space types (links) and 新增日期.

**總覽**, in this order (decision 103 moved 解開的衝突 and 相關的衝突 to 衝突, 涵蓋的相同訴求群組 to 訴求, and 成效衡量 to its own tab):

| Part | Content | Data |
|---|---|---|
| 資源、法規、隱私與風險 | The 「只看有資料根據」 toggle, the step 7 總覽 row (成本, 可行性, 主要風險, 主責單位) and the step 7 rows. Each cell follows the filter (decision 105). | step 7 |
| 題目或研究中的構想 | As before | 6.1 構想 table |
| 跨議題解法 | Only when the solution is in the `parts` of a cross-issue solution (3.18): its code and name as a link (`#/solutions/X-A`) | `cross-issue.json` |
| 待補 | As before | `pending` |
| 更多 | Links to the issue's 解法 tab and to `#/solutions` | |

The old part 「涵蓋的使用者故事」 moves into the 需求 tab, under each need.

**需求.** The 「只看有資料根據」 toggle, then two h3 parts:
- 「涵蓋的需求」: grouped by the need's priority (必須有, 應該有, 可以有). Each need shows its summary with its tag, its ID (a link to the need on the issue's 需求 tab, `?focus=<need key>`), its stakeholders (links to their stakeholder page's 需求 tab) and, in a Collapsible, its stories (story ID links).
- 「未涵蓋的需求」: grouped by priority (必須有, 應該有, 可以有, 這次不做). Each need also shows 「由其他解法涵蓋：B、C」 (links) or 「沒有任何解法涵蓋」. One line under the heading: 「一個解法不需要涵蓋所有需求。未涵蓋的需求，可能由其他解法涵蓋。」

**訴求** (decision 103). The 「只看有資料根據」 toggle, one line on what a want is, then three h3 parts:
- 「涵蓋的相同訴求群組」 (moved from 總覽): each W group with a covered story, 全部 or 部分, with its stakeholders. The filter does not change it.
- 「涵蓋的訴求」 and 「未涵蓋的訴求」: one item per story, in the order of the issue file: the story ID (a link to the story page), the stakeholder (a link to its 訴求 tab) and the 我想要… cell with its tag. With the filter on, only the stories whose 我想要… cell is `[實證]` or `[AI整理]` show (`dataBasedWants`), the same way the 需求 tab looks only at the 以便… cell. When the filter hides every item: 「這裡沒有我想要…標記 [實證] 或 [AI整理] 的訴求。」

**利害關係人.** Two h3 parts, each in ID order, never by count:
- 「涵蓋的利害關係人」: a compact `StakeholderCard` per stakeholder (with the 「也出現在」 mark, 4.2). Under it: 「涵蓋的需求」 and, when there are any, 「未涵蓋的需求」 of that stakeholder (the summary links to the need on the issue's 需求 tab, `?focus=<need key>`).
- 「未涵蓋的利害關係人」: a compact `StakeholderCard` per stakeholder, with its needs and the other solutions that cover each one.

**衝突** (decision 103). The 「只看有資料根據」 toggle, then two h3 parts, both moved from 總覽:
- 「解開的衝突」: each conflict whose `wayOutSolutions` lists this solution: the conflict text, the two sides, 雙方的需求 and the 以需求為本的解方 cell, with a link to `?focus=C1` on the issue's 訴求 tab. The filter hides the stories with no data basis in the sides, as before. When there is none: 「沒有衝突的「以需求為本的解方」用到這個解法。」
- 「相關的衝突」: the other conflicts with a covered story on either side, as before.

**成效衡量** (decision 103). The 6.3 rows of the solution, as before: the indicator (h3), the baseline with its tag and the source. The filter does not change it (it did not on 總覽 either).

**相關政策** (decisions 103 and 104). The hidden h2 is the full name 「相關或類似的政策與做法」. One intro line, and a note when there is a practice row: the 相關做法 items come from step 6.1, other places' practices are only for reference, and 本文件怎麼用 is the AI's idea (the words of the analysis). Then two h3 parts, 「國內 N」 and 「國外 M」, each in file order. Each item shows a small label (「相關做法」 or 「相依與現行政策」), the place and the name, the content with its tag badge, 本文件怎麼用 when present, and a source line: 「來源：#2 議題分析步驟 6.1 的相關做法表。」 for a practice row, or 「來源：分析摘要的「相依事項與現行政策的關係」」 with a link to `#/issues/<n>/dependencies` (the issue tab 相關解法與政策) for a dependency row. An empty group says so. With no item at all (#8 E, #9 E): 「分析裡沒有和這個解法相關或類似的政策與做法。」 The filter does not change this tab, the same as the issue's 相依與現行政策 tab (decision 102).

Rules:
- Every mention of a solution links to its page (as before). The link text is the code and the name. The link keeps `?evidence=1`.
- A tab change keeps `?evidence=1`.
- An unknown path segment, an unknown issue, an issue with no analysis, an unknown code or an unknown tab shows a short message with links (the issue's 解法 tab when the issue is known, `#/solutions`, the home page).
- The logic is in `src/lib/solutionPage.ts`: the existing functions, plus `solutionNeedCoverage`, `solutionStakeholderCoverage`, `solutionWayOutConflicts`, `solutionWantCoverage`, `practiceSides`. The counts and the labels are in `src/lib/tabCounts.ts` (`solutionTabCounts`, `solutionTabLabel`). The paths are in `src/lib/entityPaths.ts`: `parseSolutionSlug`, `parseSolutionTab`, `solutionPath`, `crossSolutionPath`, `legacySolutionPath`. Nothing is sorted by a count.

### 3.13 About page

URL: `#/about`. The h1 and the page title are 「關於本站」 (page title 「關於本站 · 市政提案小幫手」). The footer links here. The header has no link to it, so no header link is active on this page (3.7). The page is `src/pages/About.tsx`. Each part is an h2:

| Part | Content |
|---|---|
| 專案連結 | 「市政 debug 松活動頁面」 (https://puma.taipei/hackathon, the official event page; opens in a new tab, `rel="noopener noreferrer"`, with 「（在新分頁開啟）」 for screen readers), GitHub source code, and 「如何閱讀議題分析」 (`analysis/docs/method.md`). The disclaimer in the footer is on the same page, so the event link gives the context and does not suggest that the host approved the app. |
| 授權 | Code: MIT, link to `LICENSE` on GitHub. Content made by ETBlue: CC BY 4.0, link to `LICENSE-CONTENT.md` on GitHub. A short note: the host's content follows the host's rules, and open data follows each dataset's license. |
| 下載資料 | The app's own data files, so others can reuse them. This is what `human-inputs.md` means by "the open data used by the app". The JSON the site reads (`data/index.json`, and `data/issues/<folder>.json` for each analyzed issue), as links on the site. The CSV files on GitHub: `analysis/data/stakeholders.csv`, each analyzed issue's `analysis/<folder>/user-stories.csv`, `space-types.csv`, `path-labels.csv`, `issues.csv`, `open-data.csv`. The list is built from `index.json` (`dataFileLinks` in `src/lib/dataFiles.ts`), so a new issue appears with no code change. One line on the data license: the analysis is CC BY 4.0, with the exceptions in `LICENSE-CONTENT.md` (host content; content made from the host's citizen data is only for this hackathon). |
| 作者的相關文章 | The author's blog posts about this work, newest first, each with its title (a link) and date. Today one post: 「台北市政 debug 松議題的模擬分析」, 2026-10-17. The list is `AUTHOR_POSTS` in `src/components/links.ts`. |

The government open datasets (`openData` in `index.json`) are not on this page. Each issue lists them in its appendix.

### 3.14 Stakeholder menu

*Phase S changes this section. Section 3.21 is the new design of the menu. These rules below are replaced: 「Two groups … in ID order」 (now a tree, decision 65), 「The menu shows no counts」 (now a count per item, decision 66), the status line in the menu (now in the main block, decision 68), and the layout rules (3.21). The other rules stay. Phase L: the 「Stakeholder page」 column below no longer applies. The stakeholder page has no menu now (decision 94). The menu is only on the issue page's 訴求, 需求 and 解法 tabs.*

The full stakeholder list is a menu next to the content of the issue page and the stakeholder page (ETBlue, 2026-10-20, decision 35). The stakeholder is the main entity: the menu filters the stories, wants and needs by stakeholder. The component is `StakeholderMenu` (`src/components/StakeholderMenu.tsx`). The logic is in `src/lib/stakeholderFilter.ts`.

| | Issue page | Stakeholder page |
|---|---|---|
| Shown on | The 訴求, 需求 and 解法 tabs (the 總覽 tab already lists the stakeholders). The menu is part of the tab content, after the tab list (decision 58). | Every tab. The menu is before the tab list. |
| Items | 「全部利害關係人」, then the stakeholders of this issue | Every active stakeholder of the analyzed issues (51 today) |
| A click | Sets `?stakeholder=<id>` on the same tab (「全部」 removes it). Keeps `?evidence=1`. | Goes to the same tab of that stakeholder's page. Keeps `?evidence=1`. |
| Current item | `aria-current="true"` | `aria-current="page"` |
| Landmark | `<nav aria-label="依利害關係人篩選">` | `<nav aria-label="切換利害關係人">` |

Rules:
- One stakeholder at a time (decision 47). The items are links, not toggle buttons, so each filter has a URL that can be shared, and the back button works.
- Two groups with a visible label: 組織 (O) and 個人 (I). Each group is a list in ID order (`compareIds`). Never sorted by a count. The menu shows no counts.
- Each item: the ID and the name, for example 「I06 身心障礙者（視障、輪椅使用者）」. Long names wrap.
- The current item is bold, with a bar on the left. It does not depend on color only.
- An unknown or moved ID in `?stakeholder=` is resolved with `resolveId` (a moved ID becomes the new ID). An ID that is not in the issue is ignored, and the filter is off.
- With a filter on, a status line above the list says what is shown, for example 「篩選：I06 身心障礙者（視障、輪椅使用者）。顯示 2 個訴求、1 個衝突。」, with a link 「清除篩選」. It has `role="status"`.
- Layout from `lg` (1024 px): a left column, 16rem wide, sticky at the top, with its own scroll when it is taller than the window. The tabs and the content are on the right.
- Layout below `lg`: a Collapsible button, closed by default (on the issue page it is under the tab list, at the top of the tab content; on the stakeholder page it is above the tabs): 「利害關係人：全部」 or 「利害關係人：I06 身心障礙者（視障、輪椅使用者）」. Open, it shows the same list. No sideways scroll at 360 px.
- Keyboard order (decision 58): on the issue page, the tab list, then the menu, then the tab content. On the stakeholder page, the menu, then the tab list, then the tab content. Both in both layouts.
- Links in a filtered list keep the filter. For example a conflict link (「有衝突：C6」) goes to `#/issues/<n>/wants?focus=C6` and keeps `?stakeholder=` and `?evidence=1` (decision 59).

### 3.15 Story page

URL: `#/stakeholders/<id>/stories/<n>/<storyId>`, for example `#/stakeholders/I06/stories/2/I06-US01` (ETBlue, 2026-10-20, decisions 37 and 46). Story IDs are only unique inside one issue, so the URL keeps the issue number. Page title: 「#2 I06-US01 · 身心障礙者（視障、輪椅使用者） · 市政提案小幫手」.

| Part | Content |
|---|---|
| Breadcrumb | 首頁 › 利害關係人 › I06 身心障礙者（視障、輪椅使用者） › #2 I06-US01, in a `<nav>`. The story item is the ID only, because a story has no title (decision 99). |
| h1 | 「#2 I06-US01」 |
| The story | 身為 <stakeholder name>（link），我想要…（with its tag），以便…（with its tag）, as three labeled lines, so each tag stays next to its text |
| Fields | 來源, 優先順序 (the priority of its need, with its tag and the legend, 3.4), the issue (link) |
| 訴求 | A link to its want on the issue's 訴求 tab (`#/issues/2/wants?focus=<want key>`). When the story is in a W group: 「相同訴求群組 W08：<summary>」 and the other stakeholders (links to their stakeholder page's 訴求 tab) |
| 需求 | A link to its need on the issue's 需求 tab (`#/issues/2/needs?focus=<need key>`). When the story is in an N group: 「相同需求群組 N07：<summary>」 and the other stakeholders (links to their stakeholder page's 需求 tab) |
| 衝突 | The conflicts with this story on a side: the other side's stories, 雙方的需求, 以需求為本的解方 |
| 解法 | The solutions that cover its need, as compact `SolutionCard`s |
| 更多 | 「到 #2 做意見健檢」 (`#/issues/2/wants?pick=<want key>`) and the stakeholder page |

Rules:
- Every story ID shown in the app links to its story page (decision 55): in `StoryCard`, in the conflict sides, in the need lists and in the opinion check result.
- When the story belongs to another stakeholder (the part of the ID before 「-」), the page redirects to the right stakeholder.
- An unknown issue, an issue with no analysis, or an unknown story shows a short message with links to the stakeholder page and the issue.
- The logic is `findStory` and `storyView` in `src/lib/storyPage.ts`. The paths are in `src/lib/entityPaths.ts`.

### 3.16 Wants and needs: keys and links (no own pages)

Wants and needs have no page of their own (ETBlue, 2026-10-20, decision 45). ETBlue removed them from the list of entities with unique URLs in `human-inputs.md`. The list is now: issue; stakeholder → user story; solution. Wants show inside the 訴求 tabs, and needs show inside the 需求 tabs, of the issue page (3.2) and the stakeholder page (3.3).

**The keys.** The tabs still need one key per want and per need, to group the stories, to count them, and for the stakeholder filter:

| | Key | Example |
|---|---|---|
| Want (訴求) | The W group ID when the story is in a W group, else the story ID. The same key as the opinion check pick list (4.1, `storyPickKey`). | `W08`, `I24-US01` |
| Need (需求) | The N group ID (`needGroup` of the story) when the story is in an N group, else the story ID. The same ID as the row of step 5.2 (`needs[].id`). | `N01`, `I06-US01` |

Several stories of one stakeholder with the same key are one want or one need. For example I01 has 5 stories in #2 N01, so N01 counts once for I01.

**Links** (decision 57). A link to one want or one need goes to the issue's tab, with `?focus=<key>`:
- a want: `#/issues/<n>/wants?focus=<want key>`, for example `#/issues/2/wants?focus=W08`
- a need: `#/issues/<n>/needs?focus=<need key>`, for example `#/issues/2/needs?focus=N07`

The tab scrolls to the item and moves keyboard focus to it (3.2). A link to a stakeholder in a want or need list (「同樣想要的人」, 「誰需要」) goes to that stakeholder's page, on the same tab (`#/stakeholders/I06/wants` or `…/needs`). The links are made by `wantFocusPath` and `needFocusPath` in `src/lib/entityPaths.ts`.

The draft URLs `#/stakeholders/<id>/wants/<n>/<key>` and `#/stakeholders/<id>/needs/<n>/<key>` were never published. They have no route, so they show the not-found page.

### 3.17 (Removed: need page)

The need page was removed on 2026-10-20 (decision 45). See 3.16.

### 3.18 Cross-issue solutions

ETBlue wants the cross-issue solutions in the app (`human-inputs.md`, decision 39). A cross-issue solution combines solutions of several issues. It has the same page shape and the same URL format as an issue solution (3.12, decision 56): `#/solutions/X-A`, `#/solutions/X-A/needs`, `#/solutions/X-A/stakeholders`, and the other tabs of decision 103.

**Data.** The source is `analysis/cross-issue/cross-issue-analysis.md`. `analysis/scripts/build_json.py` reads it (with the rules of `check_cross_issue.py`) and writes `cross-issue.json` next to `index.json` (`app/public/data/cross-issue.json`). Without the Markdown file, there is no JSON file. The full field list is in the docstring of `build_json.py`. A reference to an ID of one issue is `{ "issue": n, "id": "…" }`; `issue` is null for the file's own `X-N` IDs. The fields the app uses:

```
{ "title": string, "updated": "2026-10-20", "issues": [1, 2, 8], "spaces": [code],
  "needGroups": [ { "id": "X-N01", "tag", "summary": string,
                    "needs": [ { "issue": 1, "id": "N05", "priority": "M" } ],
                    "stories": [ { "issue", "id" } ], "stakeholders": [id],
                    "priority": "M" | null, "priorityTag", "prioritiesDiffer": bool, "reason": Cell } ],
  "conflicts": [ { "id": "X-C1", "text": Cell, "issueConflicts": [ { "issue", "id": "C7" } ],
                   "sideA", "sideB": [ { "issue", "id": story ID } ],
                   "needsA", "needsB": [ { "issue" | null, "id" } ],
                   "wayOut": Cell, "wayOutSolutions": ["X-B"], "method": Cell, "result": Cell } ],
  "solutions": [ { "code": "X-A", "name": string, "tag", "summary": string,
                   "parts": [ { "issue": 1, "code": "C" } ], "spaces": [code], "added": "2026-10-20",
                   "needs": { "must": [ { "issue", "id" } ], "shouldCould": [ { "issue", "id" } ],
                              "crossIssue": ["X-N01"] },
                   "measures": [ { "indicator", "baseline": Cell, "source", "from": [ { "issue", "code" } ], "isNew": bool } ],
                   "detail": { "owner", "laws", "privacy", "risks": Cell } } ],
  "solutionFocus": [ { "tag": "高齡", "solutions": ["X-A"], "note": Cell } ],
  "pending": [ { "text", "section" } ] }
```

Today the file has 5 solutions (X-A to X-E), 7 X-N groups and 2 conflicts (X-C1, X-C2), over issues #1, #2 and #8. `name` and `tag` are two fields; the app shows them as one Cell. The other fields (`summary` of the file, `sharedStakeholders`, `repeatedNeeds`, `focusGroups`) are not shown in this phase.

**The page.** The same frame as 3.12. The differences:

| Part | Cross-issue solution |
|---|---|
| Breadcrumb, h1, title | 首頁 › 解法 › X-A 同一段人行道的共同參與式選址 (decision 99). The h1 is 「X-A」 and the name with its tag. Page title: 「X-A <name> · 解法 · 市政提案小幫手」. |
| Line under the h1 | 「跨議題解法・議題：#1、#2、#8」, each issue a link. The issues are the ones in `parts`. Then the summary, the space types and 新增日期. |
| Covered needs | An issue need is covered when it is in `needs.must` or `needs.shouldCould`, or in an X-N group listed in `needs.crossIssue` (decision 60). This can be a need of an issue that is not in `parts`. For example X-E has parts in #2 and #8, but its group X-N03 has #1 N15, so #1 N15 is covered. |
| Not covered needs | Every other need of the issues in `parts`. An issue that is not in `parts` has no not covered need. |
| Covered stakeholders | A stakeholder with at least one covered need, in any of these issues (also an issue that is not in `parts`). Each stakeholder is listed once, in ID order. |
| Tab counts | The same rules as 3.12, summed over the issues. They count needs and stakeholders, not priorities (decision 48). |
| 需求 tab | One h3 per issue (「#2 找回消失的垃圾桶」, in issue number order), then the covered and the not covered needs of that issue as in 3.12. An issue that is not in `parts` shows only its covered needs, under the note 「這個議題沒有解法被合併進來。這裡只列出透過「跨議題的共同需求」涵蓋的需求。」. Before them, 「跨議題的共同需求」: each X-N group in `needs.crossIssue`, with its summary and tag, its priority (or 「各議題的優先順序不同」 when `prioritiesDiffer`), its reason, and its issue needs as links (`#/issues/<n>/needs?focus=<id>`). An X-N group has no page and no link. |
| 利害關係人 tab | As in 3.12. Under each stakeholder, its needs are split by issue. For an issue that is not in `parts`, only the covered needs show, and only the stakeholders of those needs are added. |
| 總覽 | 合併的解法 (each item of `parts`, as a link `#/solutions/<n>-<code>` with the issue and the name), 特別關注族群 (each `solutionFocus` item that lists this code: the group and its note), 主責單位、法規、隱私與風險 (`detail`, with the 「只看有資料根據」 toggle; each cell follows the filter as a step 7 cell does, decision 105), and 更多 (link to `#/solutions`). |
| 訴求 tab (decision 103) | One h3 per issue, as on the 需求 tab: the stories of the covered and the not covered needs (`crossWantCoverage`). An issue that is not in `parts` shows only its covered wants, with the note 「這個議題沒有解法被合併進來。這裡只列出透過「跨議題的共同需求」涵蓋的訴求。」. There is no 涵蓋的相同訴求群組: the cross-issue file has no W groups. |
| 衝突 tab (decision 103) | 解開的衝突 (moved from 總覽: each cross-issue conflict whose `wayOutSolutions` lists this code: the text, the two sides with story links, 雙方的需求, 以需求為本的解方, and the issue conflicts in `issueConflicts` as links `#/issues/<n>/wants?focus=C7`), and 相關的衝突: the other cross-issue conflicts with a covered story on either side (`crossRelatedConflicts`). A cross-issue conflict has no page, so its ID is plain text. The conflicts of each issue are not listed here. |
| 成效衡量 tab (decision 103) | `measures` (moved from 總覽): the indicator, the baseline with its tag, the source, the issue solutions in `from` as links, and 「新指標」 when `isNew`. |
| 相關政策 tab (decision 103) | `practices`: only dependency rows, all 國內. The source line says 「來源：跨議題分析的分析摘要「相依事項與現行政策的關係」。」 with no link, because no page shows the cross-issue 分析摘要 (decision 102). |
| 待補 | No own list. The `pending` list of the file is per section, not per solution. The 【待補】 text shows inside each cell. |

The page needs the issue files of the issues in `parts`, plus the issues of every need it covers (`needs.must`, `needs.shouldCould` and the X-N groups in `needs.crossIssue`). It loads them like the issue page does.

**Where else they show:**

| Place | What |
|---|---|
| `#/solutions` | *Phase L: replaced by decision 89 (3.23.9): one flat list, the cross-issue cards have the badge 「跨議題解法」, and the 議題 filter also matches the issues of the needs they cover.* Before: a first group 「跨議題解法」 (h2), before the per-issue groups (decision 51). Each card shows the code and name, the summary, and the issues (「#1、#2、#8」). The issue filter matches a cross-issue solution when one of its issues is picked. |
| Issue 解法 tab | A box 「本議題也在跨議題解法中」 with links to each cross-issue solution that has the issue in `parts`, and the issue's solutions that it combines. The box is at the top of the tab content in the main block, after the filter status line. (Since Phase S the 「只看有資料根據」 toggle is in the side bar, decision 67.) |
| Solution page 總覽 | 「跨議題解法」 with a link, when the solution is in `parts` (3.12) |
| Home block 「最近分析出的解法」 | Included, because each item has `added` (decision 51). On the same date, the cross-issue solutions come before the issue solutions. |
| Header count 解法 | Includes the cross-issue solutions, because the header link goes to the list that shows them (decision 51) |

When the file does not exist, all these parts are hidden and nothing breaks. `useCrossIssue()` in `src/data.ts` returns null for a missing file. `#/solutions/X-A` then shows the "not found" message. The about page lists `cross-issue.json` with the other JSON files when it exists. `vite.config.ts` checks at build time if `public/data/cross-issue.json` exists (CI builds the data before the app). Without the file, the app does not ask for it, so the browser console shows no 404. If the file is missing on the server anyway, a 404 also counts as no file.

### 3.19 Routes

Every page and its tabs (decisions 45, 46, 56).

| URL | Page | Tabs |
|---|---|---|
| `#/` | Home (3.1) | — |
| `#/issues` | Issue list (3.9) | — |
| `#/issues/<n>`, `#/issues/<n>/<tab>` | Issue (3.2) | 總覽 · 訴求 · 需求 · 解法 · 難以取捨 · 可能爭議 · 影響到弱勢 · 法規障礙 · 相關解法與政策 (`wants`, `needs`, `solutions`, `decisions`, `controversies`, `disadvantaged`, `legal`, `dependencies`) |
| `#/stakeholders` | Stakeholder list: the sort and filter bar and the cards (3.23, Phase L; before: side menu and statistics, 3.20) | — |
| `#/stakeholders/<id>`, `#/stakeholders/<id>/<tab>` | Stakeholder (3.3) | 總覽 · 訴求 · 需求 · 解法 (`wants`, `needs`, `solutions`) |
| `#/stakeholders/<id>/stories/<n>/<storyId>` | Story (3.15) | — |
| `#/solutions` | Solution list (3.9) | — |
| `#/solutions/<n>-<code>`, `…/<tab>` (for example `#/solutions/2-A`) | Solution (3.12) | 總覽 · 需求 · 訴求 · 利害關係人 · 衝突 · 成效衡量 · 相關政策 (`needs`, `wants`, `stakeholders`, `conflicts`, `measures`, `policies`; decision 103) |
| `#/solutions/X-<letter>`, `…/<tab>` (for example `#/solutions/X-A`) | Cross-issue solution (3.12, 3.18) | The same seven tabs |
| `#/spaces/<code>` | Space (3.6) | — |
| `#/about` | About (3.13) | — |

Query parameters: `evidence=1` (3.5; the issue 訴求, 需求 and 解法 tabs, the stakeholder page and the solution page), `stakeholder=<id>` and `special=<特別關注 group>` (the side bar filters of the issue 訴求, 需求 and 解法 tabs, 3.21), `pick=<key>` (4), `focus=<value>` (3.2, 3.16), `from=<old id>` (3.3). Phase L (3.23.5, 3.23.13): on the three list pages `sort=<updated|added|evidence|solutions>`, `issue=<n>` and `issue=X`, `space=<code>`, `who=<id>`, `specialonly=1`, `view=tree` and `q=<search text>`. There is no `sort=id` (Q24): an old link with it is handled like any unknown value, so the param is dropped with `replace`. On `#/stakeholders` the old `cross=1` and `special=<group>` redirect (3.23.5). On the stakeholder page `cross` and `special` are dropped with `replace` (decision 94).

Old URLs:

| Old URL | Now |
|---|---|
| `#/issues/<n>/opinion`, `…/conflicts`, `…/stakeholders` | Redirect (3.2) |
| `#/issues/<n>/solutions/<code>`, `#/issues/<n>/solutions/<code>/<tab>` | Redirect to `#/solutions/<n>-<code>` and `#/solutions/<n>-<code>/<tab>`, query kept (3.12) |
| `#/stakeholders/<moved id>/…` | Redirect to the new ID, rest of the path kept (3.3) |
| `#/?cross=1` | `#/stakeholders?issue=X` (3.1, decision 91) |
| `#/wants`, `#/needs` | Not found (decisions 31, 40) |
| `#/stakeholders/<id>/wants/<n>/<key>`, `…/needs/<n>/<key>`, `#/solutions/cross/<code>` | Not found. These were draft URLs and were never published (decisions 45, 56). |

Under a stakeholder, the segment `stories` is only a sub-page name. `#/stakeholders/I06/stories` (no tab with this name) shows the "tab not found" message. `#/stakeholders/I06/wants` and `…/needs` are tabs.

### 3.20 Stakeholders page (Phase S)

*Replaced by section 3.23 in Phase L (decisions 87 and 88): `#/stakeholders` has no side bar and no statistics now (Q22; ETBlue, 2026-10-22). This section is the old design.*

URL: `#/stakeholders`. ETBlue, `human-inputs.md` (2026-10-20), decisions 62 and 63. This replaces the 利害關係人列表 of 3.9.

The page has the same two parts as the stakeholder page (3.3):

| Part | Content |
|---|---|
| Side bar | The stakeholder side menu with the filters (3.21). It lists every active stakeholder of the analyzed issues. A click on a stakeholder goes to its page, `#/stakeholders/<id>` (the 總覽 tab). The link keeps the side bar filters (`evidence`, `cross`, `special`). The first item is 「全部利害關係人」, the current item on this page (decision 76). |
| Main block | The h1 「利害關係人」, one intro line 「選一位利害關係人，看他在各議題的訴求、需求和解法。」, the note on counts, the filter status line (3.21), then the statistics below. |

**Statistics.** They describe the stakeholders that the side menu lists, so the menu and the main block always agree. With 只看跨議題 or a 特別關注 chip on, the numbers change with the menu. Each part is an h2. All numbers are plain counts. No percent, no bar, no chart, no rank. Every list is in a fixed order, never sorted by a count.

| Part | Content | Order |
|---|---|---|
| 總數 | 利害關係人 51 位（組織 30、個人 21）. 出現在 2 個以上議題：18 位, a link that turns on 只看跨議題 (`?cross=1`), shown only with 2 or more analyzed issues. 使用者故事 N 則, across the analyzed issues. (The numbers here are only examples.) | — |
| 依分類 | A table. One row per first level of 分類路徑: 政府, 公營事業, 產業, 學術, 教育機構, 公民團體, 社群 under 組織; 居民, 用路人, 遊客, 工作者 under 個人. Columns: 利害關係人 (number of stakeholders) and 使用者故事 (number of their stories). A row with 0 stakeholders is left out. | The tree order of the side menu (`FIRST_LEVEL_ORDER` in `src/lib/stakeholders.ts`) |
| 特別關注族群 | One row per group: the group name, the number of stakeholders with it, and those stakeholders as links (ID and name, in ID order). A group with no stakeholder shows 「目前沒有利害關係人」. | The fixed order `FOCUS_ORDER` (高齡, 身心障礙, 呼吸道疾病, 兒童與照顧者, 外籍, 經濟弱勢) |
| 各議題 | One row per analyzed issue: 「#2 找回消失的垃圾桶」 (a link to `#/issues/2?focus=stakeholders`) and 利害關係人 24 位（組織 13、個人 11）. | Issue number order |

The note on counts, shown once under the intro line: 「這些數字只表示分析寫了多少，不代表重要程度或優先順序。」

With 只看有資料根據 on, 使用者故事 counts only the stories with a `[實證]` or `[AI整理]` 我想要… or 以便… cell (3.5). The number of stakeholders does not change with this filter.

The logic is a pure function `stakeholderStats(stakeholders, issues, filters)` in a new file `src/lib/stakeholderStats.ts`, with tests. The UI text is in a new block `stakeholderStats` in `src/i18n/zh-TW.ts`.

Old links: `#/stakeholders?cross=1` (from the issue cards, and shared on Discord) still works. It turns on 只看跨議題 in the side bar.

### 3.21 Stakeholder side menu (Phase S)

ETBlue, `human-inputs.md` (2026-10-20), decisions 64–71. This is the new design of the menu in 3.14. The component replaces `StakeholderMenu` (it can keep the name). The logic is in `src/lib/stakeholderFilter.ts` and a new file `src/lib/sideMenu.ts`.

**Where it shows** (decisions 70 and 71):

| Page | Side bar | A click on a stakeholder |
|---|---|---|
| `#/stakeholders` | *Phase L: no (decision 87).* Before: yes, next to the statistics (3.20) | Opens the stakeholder page. 「全部利害關係人」 is the current item (decision 76). |
| `#/stakeholders/<id>`, every tab | *Phase L: no (decision 94, 3.23.10).* Before: yes, next to the whole main block (h1, metadata, tabs). | Opens the same tab of that stakeholder (as before). 「全部利害關係人」 goes to `#/stakeholders` (decision 76). |
| `#/issues/<n>/wants`, `…/needs`, `…/solutions` | Yes, inside the tab content, after the tab list (decision 58 kept) | Sets `?stakeholder=<id>` on the same tab (as before) |
| `#/issues/<n>` (總覽) | No | — |
| Solution pages, story pages, other pages | No | — |

**Tree** (decision 65). The menu is a tree, not two flat lists:
- Two roots: 組織 (O) and 個人 (I).
- Under 組織: the levels of 分類路徑, with the names from `path-labels.csv`, for example 政府 › 地方政府 › 臺北市 › 環保局 › 清潔隊. Under 個人: 居民, 用路人, 遊客, 工作者.
- A stakeholder sits under the level of its full path. Inside a level: first its stakeholders in ID order (`compareIds`), then its child levels. The first levels follow `FIRST_LEVEL_ORDER`; the deeper levels follow the order of `buildTree` (the same as the old 3.9 tree). Never sorted by a count.
- A stakeholder with no path is listed directly under its root.
- A level with no stakeholder under it is left out. On the issue page only the stakeholders of the issue are in the tree, so most levels are left out.
- Each root and each level is a group with a button to open and close it. Every group is open when the page loads. The groups above the current item are always open.
- A group button shows its name and the number of stakeholders under it (all levels below), for example 「臺北市　12」. This number is the same on every page. It is not a sum of the item counts, because one want or one need can belong to several stakeholders.
- 「全部利害關係人」 is the first item, above the roots, with no count, on every page with the side bar (decision 76). *Phase L: only the issue page has the side bar now (decisions 87 and 94), so only the first case below is left.*
  - Issue page: it removes `?stakeholder=` and keeps the other filters. It is current (`aria-current="true"`) when no stakeholder is picked.
  - `#/stakeholders`: it links to `#/stakeholders` and is the current item (`aria-current="page"`).
  - A stakeholder page: it links to `#/stakeholders`. It is not current.
  - The link keeps `evidence`, `cross` and `special` (`allStakeholdersTarget`).
- Each step down the tree is indented 0.75rem. Long names wrap. The count stays on the right of the first line.

**Count next to each stakeholder** (decision 66). *Phase L: only the `#/issues/<n>/…` rows of the table below are left. The `#/stakeholders` and `#/stakeholders/<id>` rows are removed with the side bar of those pages (decisions 87 and 94).* The count depends on the page. The rule: **the count is the number of items the main block shows after a click on that item, with the same filters.** So the count says what the reader will see. It is not a score.

| Page | Count | Logic (existing functions) |
|---|---|---|
| `#/stakeholders` | Its stories, over the analyzed issues | `storyCountsByStakeholder` |
| `#/stakeholders/<id>` 總覽 | Its stories, over the analyzed issues | `storyCountsByStakeholder` |
| `#/stakeholders/<id>/wants` | Its wants, summed over the issues | `stakeholderTabCounts(...).wants` |
| `#/stakeholders/<id>/needs` | Its needs, summed over the issues | `stakeholderTabCounts(...).needs` |
| `#/stakeholders/<id>/solutions` | The solutions that cover one of its needs, summed over the issues | `stakeholderTabCounts(...).solutions` |
| `#/issues/<n>/wants` | Its wants in this issue | `wantsTabView` with the stakeholder |
| `#/issues/<n>/needs` | Its needs in this issue | `needsTabView` with the stakeholder |
| `#/issues/<n>/solutions` | The solutions of this issue that cover one of its needs (with 只看有資料根據: one of its shown needs, decision 74) | the 解法 tab view with the stakeholder |

Rules:
- With 只看有資料根據 on, the counts follow the filter, with the same rules as the lists (3.5, decision 59). The tab labels do not change (decision 49).
- A count of 0 is shown as 「0」 in muted text. The item stays, and it is still a link.
- The menu is never sorted by these counts. The counts have no color scale and no bar.
- One visible line above the tree says what the number means, for example 「數字：在本議題的訴求數」, 「數字：各議題的需求數合計」, 「數字：使用者故事數」. The text for each page is in `src/i18n/zh-TW.ts`.
- Each count also has hidden text for screen readers, so the link name is, for example, 「I06 身心障礙者（視障、輪椅使用者），訴求 2」.
- The logic is one pure function `sideMenuCounts(context, …)` in `src/lib/sideMenu.ts`, with tests. It calls the same view functions as the tabs, so the count and the list cannot differ.

**Filters in the side bar** (decision 67). Every filter of the page moves into the side bar, above the tree, in this order: 只看有資料根據, 只看跨議題, 特別關注. *Phase L: filters are in a side bar only on a page that has a side bar. That is only the issue page's 訴求, 需求 and 解法 tabs now. So only the last column of the table below is left. `#/stakeholders` has its filters in the bar of 3.23 (decision 87). The stakeholder page has 只看有資料根據 in the filter row at the top of the tab content, and no 只看跨議題 or 特別關注 (decision 94).*

| Filter | URL | `#/stakeholders` | `#/stakeholders/<id>` | Issue 訴求, 需求, 解法 tabs |
|---|---|---|---|---|
| 只看有資料根據 | `evidence=1` | Yes. Changes the story counts in the menu and in the statistics. | Yes. Changes the tab content and the menu counts. | Yes. Changes the tab content and the menu counts. |
| 只看跨議題 | `cross=1` | Yes. The menu lists only the stakeholders in 2 or more issues. Shown only with 2 or more analyzed issues. | Yes, the same rule. It changes only the menu. | No |
| 特別關注 chips | `special=<group>`, once per picked group | Yes. A stakeholder matches when it has one of the picked groups (the same rule as the old 3.9 chips). | Yes, the same rule. It changes only the menu. | Yes (decision 75). Only the groups of the issue's stakeholders. It changes the menu and the tab content (3.2). |

- The filters are in the URL now. Before, the 特別關注 chips were only in the page state. With the URL, the filters stay when the reader goes from `#/stakeholders` to a stakeholder page and back, and a link can share them. The parameter name `special` is new, because `focus` is already used by `?focus=` (3.2).
- Every link in the side bar keeps `evidence`, `cross` and `special`. The tab change on the stakeholder page keeps them too (`keptSearch` adds `cross` and `special`).
- On a stakeholder page, the current stakeholder is always in the menu, also when the filters do not match it. On the issue page, the picked stakeholder (`?stakeholder=`) is always in the menu too.
- Where a filter changes the content (decision 75): 只看有資料根據 changes the content on every side bar page. On the issue page the 特別關注 chips filter the tab content too. On `#/stakeholders` the statistics follow every filter (decision 63). On a stakeholder page the content is about one stakeholder, so 只看跨議題 and 特別關注 change only the menu, and the status line says 「選單顯示 N 位利害關係人。」.
- The opinion check search box on the issue 訴求 tab is not a side bar filter. It is the input of the opinion check (section 4), so it stays in the main block.
- The filters of `#/issues` and `#/solutions` do not change. Those pages have no side bar. *Replaced by decision 85 (Phase L): those pages get the sort and filter bar of 3.23. They still have no side bar.*
- The 「利害關係人」 section of the issue's 總覽 tab keeps its own 只看跨議題 toggle and 特別關注 chips, because that tab has no side bar.

**Filter status line and 「清除篩選」 in the main block** (decision 68).
- The line moves out of the menu into the main block: at the top of the tab content on the issue page and on the stakeholder page, and under the intro line on `#/stakeholders` (*Phase L: on `#/stakeholders` the result line of 3.23.6 replaces it, decision 87*). So the reader sees it also when the side bar is closed on a phone.
- It lists every filter that is on, then what is shown. For example: 「篩選：I06 身心障礙者（視障、輪椅使用者）、只看有資料根據。顯示 2 個訴求、1 個衝突。」, or 「篩選：只看跨議題、特別關注：高齡。選單顯示 12 位利害關係人。」
- 「清除篩選」 is a link. It removes every side bar filter of that page (`stakeholder`, `evidence`, `cross`, `special`) and keeps the page and the tab. On a stakeholder page the stakeholder itself is not a filter, so it stays.
- The element with `role="status"` is always in the page. It is empty when no filter is on.

**Layout from `lg` (1024 px)** (decision 69). As before: a left column, sticky at the top, with its own scroll when it is taller than the window. It is 16rem wide, and 18rem from `xl` (1280 px). A 「跳過利害關係人選單」 link at the top of the side bar (shown on keyboard focus) moves focus to the main block, because the menu has more than 50 links.

**Layout below `lg`** (decision 69). The whole side bar (filters and tree) is one Collapsible above the main block.
- Closed by default on every page, also on `#/stakeholders` (Q17; ETBlue, 2026-10-21). *Phase L: only the issue tabs have the side bar now (decisions 87 and 94).* Then the statistics are the first content on a phone. An open default on `#/stakeholders` can be added later if needed.
- The button says the current choice: 「利害關係人與篩選：I06 身心障礙者（視障、輪椅使用者）」 or 「利害關係人與篩選：全部」. The filter status line in the main block shows the filters, so the button does not list them.
- Open, it shows the filters, the count line and the tree, with every group open. It closes after a pick (as before).
- No sideways scroll at 360 px. The tree indent is small (0.75rem per step), so a 5-level path still fits. Each item and each group button is at least 24 × 24 px (WCAG 2.2 AA target size).

**Keyboard and screen reader.**
- Keyboard order: on the issue page, the tab list, the side bar (skip link, filters, tree), then the tab content (decision 58). *Before Phase L, the stakeholder pages had the side bar first, then the main block. Those pages have no side bar now (decisions 87 and 94).*
- The tree is nested lists (`<ul>`) in a `<nav>`, with a button per group (`aria-expanded`, from the shadcn Collapsible) and a link per stakeholder. It does not use the ARIA `tree` role. That role needs arrow-key focus handling, and plain lists of buttons and links already work with Tab and with screen readers.
- The current item has `aria-current="true"` on the issue page, as before. (On the stakeholder page it was `page`, before Phase L removed that side bar.) It is bold and has a bar on the left.
- The filters are in a group with the name 「篩選」.
- axe (WCAG AA) passes, as in Task N12.

### 3.22 Wide screens up to 1440 px (Phase S)

ETBlue, `human-inputs.md` (2026-10-20), decision 61. Before, the page column was at most 1024 px wide (`max-w-5xl` in `containerClass`).

| Part | Design |
|---|---|
| Page column | At most 1440 px wide (`max-w-[90rem]`), centered. The header, the main block and the footer use it (`containerClass` in `src/components/styles.ts`). On a window wider than 1440 px, the column stays 1440 px and the background fills the window. |
| Side gutter | 16 px below `md` (as before), 32 px from `md`. |
| Text width | Long text (intro lines, paragraphs, the 分析摘要 items, story text) stays at most 48rem wide (`max-w-3xl`), so a line is not too long to read. Cards, tables and grids use the full width. |
| Grids | `#/issues`: 2 columns from `md`, 3 from `xl`. `#/solutions`: 2 from `md`, 3 from `xl`. The home blocks stay 3 columns from `lg`. The space page stays 3 columns from `lg`. |
| Side bar | 16rem from `lg`, 18rem from `xl` (3.21). At 1440 px the main block next to it is about 1090 px wide. |
| Hero | The background is full width (as before). The text uses the page column. |
| Watermark | No change. It is fixed to the window. |
| Checks | The N12 checks also run at 1440 px and 1920 px: no sideways scroll, and the column is centered at 1920 px. |

### 3.23 List pages: sort and filter bar (Phase L)

ETBlue, `human-inputs.md` (commits ef77fec and a325fcb; a325fcb adds 「including cross-issue」 to the issue filters and the card view / tree view toggle) and ETBlue's decisions of 2026-10-22. Decisions 79–98. Commit e879ba7 adds 「search … by title or number」 to all three pages (3.23.13). This section replaces the page parts of 3.9 for `#/issues`, `#/stakeholders` and `#/solutions`, and section 3.20. The shared cards of 3.9 stay, with the new fields below.

**Status:** ETBlue answered Q20–Q24 on 2026-10-22 (decisions 82, 83, 84, 85, 88, 90 and 94). No part waits for an answer now. A few small details are still marked *(proposal)*: they are the coordinator's choices, and ETBlue can change them in review.

#### 3.23.1 The page frame

The three list pages have the same frame, from top to bottom:

| Part | Design |
|---|---|
| h1 | Kept, but visually hidden (`sr-only`), so screen readers still get the page heading (decision 79). The text stays: 「議題」, 「利害關係人」, 「解法」. The highlighted header link (3.7, `aria-current="page"`) is the visible title. The page `<title>` does not change (「議題 · 市政提案小幫手」). |
| Search, sort and filter bar | Right under the header, as the first visible part of `<main>`, with no space between them (3.23.2, decisions 80 and 106). It has the search box (3.23.13), the sort and the filters. |
| Result line | Under the bar: what is shown, the filters that are on and 「清除篩選」 (3.23.6). |
| Notes | The short notes the page needs, under the result line: the sort note when a share sort is on (3.23.3), and the 資料根據 line of 3.9 (`t.basis.listNote`). On `#/issues` the 資料根據 line is always shown. On `#/stakeholders` and `#/solutions` it is shown only with 資料根據比例, as part of the sort note (3.23.9). Each page names its own items in it (decision 100). |
| Cards | One list of cards (`<ul>`), 1 column on a phone, 2 from `md`, 3 from `xl` (3.22). |

The old intro lines (`issuesIntro`, `stakeholdersIntro`, `stakeholdersCountNote`, `solutionsIntro`) are removed. They described the old fixed orders, so they are wrong now. *(Proposal.)*

#### 3.23.2 The bar

One component, `ListBar` (`src/components/ListBar.tsx`). Each page gives it its sort options and its filters. All state is in the URL (3.23.5). The bar does not stick to the top when the page scrolls. *(Proposal: sticky can be added later.)* The bar has the search box first, then the sort, then the filters (3.23.13).

Look: a full-width band (edge to edge of the window), right under the header with no space between them, with the muted background (`bg-muted`) and a bottom border. The controls inside the band use the page column (`containerClass`), so they line up with the header content and have the same side gutter (16 px below `md`, 32 px from `md`). The band looks the same on all three pages: no rounded corners and no side border. It uses only tokens, so it works in both themes (decision 106).

**From `md` (768 px).** One row of controls. It wraps onto a second row when it is too long. The order on screen is the keyboard order:

1. The search box (3.23.13): the visible label 「搜尋」 and a search box, 16rem wide.
2. 「排序」 and a native `<select>` with the sort options of the page (3.23.3). A native select works well with the keyboard, screen readers and phones.
3. The filters of the page, in the order of the table in 3.23.5:
   - A filter with many choices (空間類型, 議題) is a button, for example 「空間類型 ▾」, or 「空間類型：2 ▾」 when 2 are picked. It opens a popover (shadcn Popover, Radix) with one checkbox per choice. The popover moves focus to the first checkbox. Escape and a click outside close it and return focus to the button.
   - 利害關係人 is the stakeholder picker (3.23.7): a search box with a list, and a button 「瀏覽」 that opens the tree dialog.
   - A filter with one on/off state (特別關注族群) is a toggle button with `aria-pressed` and the check mark of `ToggleCheck`, the same look as the chips today.
4. On `#/stakeholders` only, at the end of the row: the view switch 「卡片」 / 「樹狀」 (3.23.11).

**Below `md` (phone, 360 px and up).** First a full-width row with the search box (3.23.13). It is not in the sheet, so the reader can search and see the cards at the same time. Then one row with two controls (three on `#/stakeholders`), so nothing scrolls sideways at 360 px with the 16 px gutter (328 px of space):
- 「排序」 and the native `<select>`, which takes the free width.
- On `#/stakeholders`: the view switch, as two icon buttons (32 × 32 px each) with the hidden names 「卡片檢視」 and 「樹狀檢視」.
- A button 「篩選」. When filters are on, it says 「篩選（2）」: the number of filters that are on. Its accessible name is 「篩選，已套用 2 個」. The search does not count here, because the search box is outside the sheet and shows its text.

The 「篩選」 button opens a sheet: a shadcn Dialog (Radix) shown as a bottom sheet, full width, at most 85% of the window high, with its own scroll. In the sheet:
- the title 「篩選」 (the dialog's name)
- each filter of the page, stacked, with its label. The multi-choice filters show their checkboxes directly (no popover inside the sheet). The stakeholder picker shows its list inline, under the search box, not as a floating list.
- at the bottom: the result line (`role="status"`, so a screen reader hears the new number after each change), 「清除篩選」 and a 「完成」 button that closes the sheet.

A change in the sheet updates the URL and the list at once. There is no 「套用」 step. Escape, 「完成」 and the close button close the sheet, and focus goes back to the 「篩選」 button. Focus stays inside the sheet while it is open (Radix focus trap).

Every control is at least 24 × 24 px (WCAG 2.2 target size, as in Task S7).

**Keyboard and screen reader.**
- The bar is a `<section aria-label="搜尋、排序與篩選">` (was 「排序與篩選」 before the search box was added).
- Keyboard order: header, the bar (search box, sort, then filters), the result line links, then the cards.
- Each control has a visible label. The popover buttons have `aria-expanded` and `aria-controls` (from Radix). The checkboxes are real checkboxes in a `<fieldset>` with a `<legend>` (「空間類型」).
- The result line has `role="status"`. It is always in the page, so a change is read out.

#### 3.23.3 Sorts

ETBlue's decision 1 (2026-10-22): count-based sorts are allowed as **option A**. That means:
- The reader picks the sort. The default sort is by date.
- The label only says what the data is, for example 「資料根據比例」. The label is short, so it fits in the `<select>` on a 360 px phone. The note under the bar says what the share counts (decision 100).
- A short note under the bar says the order is not about importance.
- No scores, weights or formulas. The only number is the plain share (part ÷ total).

This is allowed **only** for these reader-picked sorts on these three list pages (decision 81). Everywhere else the old rule stays: never sort by a count. This means the side menu, the tab contents, the priority groups (3.2), the solution page (3.12), the home blocks (3.1), the space page, the stakeholder tree on the issue's 總覽 tab and the priority counts (3.4).

**Sort options** (decision 82):

| `sort=` | Label | `#/issues` | `#/stakeholders` | `#/solutions` | Order |
|---|---|---|---|---|---|
| (none) or `updated` | 最近更新 | Yes (default) | Yes (default) | Yes (default) | Newest first |
| `added` | 最近新增 | Yes | Yes | Yes | Newest first |
| `evidence` | 資料根據比例 | Yes | Yes | Yes | Highest share first |
| `solutions` | 解法涵蓋比例 | No | Yes | No | Highest share first |

There is no 依編號 sort (Q24; ETBlue, 2026-10-22). The fixed ID order (below) is still used: it breaks the ties of the share sorts, it orders the items with no value, and it is the order where no sort applies (for example the tree view, 3.23.11). An old link with `sort=id` is handled like any unknown sort value: the param is dropped with `replace`, so the page shows 最近更新 (3.23.5).

The dates (3.23.8):

| Page | 最近更新 uses | 最近新增 uses |
|---|---|---|
| `#/issues` | `updated` (the last git commit of the issue folder, as today) | `added` (new: 新增日期 in `issues.csv`) |
| `#/stakeholders` | `updated` (new) | `added` (新增日期 in `stakeholders.csv`) |
| `#/solutions` | `updated` (new) | `added` (新增日期 in 6.1, or in `cross-issue.json`) |

**Ties and missing values** (decision 82):

| Sort | Same value | No value |
|---|---|---|
| 最近更新, 最近新增 | ID, highest first: the same rule as the home blocks (3.1), so the first 5 items are the same as on the home page. For solutions: the cross-issue solutions first, then the issue number, then the solution letter, as `recentSolutionItems`. | Last, in the fixed ID order. For example the 製作中 issues #3–#6 have no dates, so they are last, as #3, #4, #5, #6. |
| 資料根據比例, 解法涵蓋比例 | The fixed ID order (below) | An item with 0 cells (or 0 needs) has no share. It is last, after the items with a share of 0, in the fixed ID order. A share of 0 is a real value (for example #9: 6 of 82 cells is not 0, but a stakeholder with only `[AI模擬]` cells has 0). |

The fixed ID order: issues by number. Stakeholders by `compareIds` (O before I, then the number). Solutions: the cross-issue solutions first (X-A, X-B…), then by issue number, then by letter. This is the order of `#/solutions` today (decision 51). No sort option shows this order on its own (Q24).

The shares are compared exactly (by cross-multiplying the counts), not by the rounded percent. So 1 of 3 and 33 of 100 are not a tie.

The labels were 「依資料根據比例（實證＋AI整理）」 and 「依解法涵蓋比例」 before decision 100. At 360 px the long one was cut in the `<select>` (on `#/stakeholders` the select is about 130 px wide). The 「（實證＋AI整理）」 part is not lost: the note below names [實證] and [AI整理], and the cards show 「實證＋AI整理 30%」.

**The note** under the bar, only while a share sort is on (decision 81):
- 資料根據比例: 「這個順序只表示分析內容的資料來源組成（標記 [實證] 或 [AI整理] 的格子比例），不代表重要性或好壞。」
- 解法涵蓋比例: 「這個順序只表示有多少需求已有解法涵蓋，不代表重要性或好壞，也不代表解法是否足夠。」

The `<select>` has `aria-describedby` pointing to the note when it is shown.

**The share on the cards.** While a share sort is on, each card shows the share as a percent next to the counts it comes from, never alone (as the rule for the 實證 percent in 3.9). With a date sort, the percent is not shown. The counts stay (3.23.9). The percent uses the same rounding as `evidencePercent` (a half rounds up; at least 1 when the part is not 0; at most 99 when the part is not the whole).

#### 3.23.4 Coverage: what the shares mean

ETBlue's decision 2 (2026-10-22). Decision 83.

**Evidence coverage (資料根據比例).** The share of story cells tagged `[實證]` or `[AI整理]`. A story has two cells: 我想要… (`want`) and 以便… (`soThat`). This is the same unit as the 資料根據 bar (3.9, decision 20): part = 實證 + AI整理, total = all cells (實證 + AI整理 + AI模擬 + 待補).

| Item | The cells counted | Example |
|---|---|---|
| Issue | The cells of all its stories: `counts.cells` in `index.json`, the same numbers as its 資料根據 bar | #1: 12 + 29 of 136 = 30%. #2: 9 + 24 of 106 = 31%. #8: 5 + 39 of 92 = 48%. #9: 6 + 0 of 82 = 7%. So 資料根據比例 gives #8, #2, #1, #9, then #3–#6 (製作中, no cells). |
| Stakeholder | The cells of all its stories, in every analyzed issue | I06: 1 of 12 cells |
| Solution (Q23 (a); ETBlue, 2026-10-22) | The cells of the stories of the needs it covers. A need is covered as in 3.12 and 3.18: in `needs.must` or `needs.shouldCould`, and for a cross-issue solution also through an X-N group in `needs.crossIssue` (decision 60). Each story is counted once, also when two covered needs share it. | — |

The solution's own text (its name, summary and step 7 cells) is not counted. It is the analysis's own idea, mostly `[AI模擬]`, and it would hide what the solution is based on. The share is about the needs it answers.

A filter does not change the share. For example with `#/stakeholders?issue=2`, the share of I06 still counts its cells in every analyzed issue. *(Proposal.)* The card says 「各議題合計」 next to the counts, so this is clear.

**Solution coverage (解法涵蓋比例)**, only for stakeholders (decision 84). The share of the stakeholder's needs that at least one solution covers.
- The needs: its different need keys per issue (3.16), summed over the analyzed issues. This is the 需求 count of its tab label (`stakeholderTabCounts(...).needs`). I06 has 5.
- Covered: a solution of that issue lists the need in `needs.must` or `needs.shouldCould`, or a cross-issue solution covers it (decision 60). I06: 5 of 5.
- 這次不做 needs are in the total, as on the solution page (decision 50). They are not covered on purpose, so they lower the share. (Q23 (b); ETBlue, 2026-10-22.)
- A stakeholder with 0 needs has no share (it is last).

The logic is in `src/lib/coverage.ts`: `evidenceShare(cells)` → `{ part, total } | null`, `stakeholderCells(issues, id)`, `solutionCells(issue, solution)`, `crossSolutionCells(cross, solution, issues)`, `stakeholderSolutionCoverage(issues, cross, id)` → `{ covered, total }`, `sharePercent({ part, total })` and `compareShares(a, b)`. Tests first.

#### 3.23.5 Filters and the URL

Decision 85.

| Filter | Control | `#/issues` | `#/stakeholders` | `#/solutions` | URL |
|---|---|---|---|---|---|
| 搜尋 | Search box (3.23.13). Not counted as a filter on the phone 「篩選」 button. | Yes | Yes | Yes | `q=<text>` |
| 議題 | Popover with checkboxes: first 「跨議題」, then the analyzed issues in number order | — | Yes | Yes | `issue=<n>`, once per picked issue; `issue=X` for 「跨議題」 |
| 空間類型 | Popover with checkboxes, the used space types in the order of `space-types.csv` | Yes | — | Yes | `space=<code>`, once per picked space |
| 利害關係人 | The stakeholder picker (3.23.7) | Yes | — | Yes | `who=<id>`, one ID |
| 特別關注族群 | Toggle 「只看特別關注族群」 | — | Yes | — | `specialonly=1` |
| Sort | `<select>` | Yes | Yes | Yes | `sort=<value>` (3.23.3) |
| View | Two toggle buttons 「卡片」 and 「樹狀」 (3.23.11). Not a filter. | — | Yes | — | `view=tree` (no param: cards) |

The new names do not reuse `stakeholder`, `evidence`, `cross`, `special`, `focus`, `pick` or `from`, because those mean other things on other pages (3.19). The old `cross=1` on `#/stakeholders` redirects to `issue=X` (below).

**The 「跨議題」 choice** (ETBlue: 「filter … by issue (including cross-issue)」). It is one more checkbox in the 議題 filter, before the issues. (ETBlue confirmed this reading on 2026-10-22.)
- On `#/stakeholders`: 「跨議題（出現在 2 個以上議題）」. It keeps the stakeholders in 2 or more analyzed issues: the old 只看跨議題 (`cross=1`).
- On `#/solutions`: 「跨議題解法」. It keeps the cross-issue solutions (`cross-issue.json`). It is shown only when that file exists. A single issue choice (for example #1) keeps the issue solutions of #1 and every cross-issue solution that has #1 in its `parts` or covers a need of #1.

The exact UI: the 「議題」 popover button opens a `<fieldset>` with the legend 「議題」 and these checkboxes, in this order: 「跨議題」 (or 「跨議題解法」), then one per analyzed issue (「#1 把三千棵樹種回來」…). Nothing checked means 全部議題, and the button says 「議題：全部」. With picks it says 「議題：2」. The URL has `issue=X` for 「跨議題」 and `issue=<n>` for each issue, for example `#/solutions?issue=X&issue=2`. Checkboxes, not a single `<select>`, because `#/solutions` already lets the reader pick several issues today, and the 空間類型 filter works the same way. *(The other choice: one `<select>` with 全部議題, 跨議題 and each issue, one pick only. It is simpler on a phone but drops the several-issue pick.)*

**What each filter keeps:**

| Filter | An item is kept when |
|---|---|
| 議題 on `#/stakeholders` | The stakeholder is in one of the picked issues (`issues` in `index.json`), or 「跨議題」 is picked and it is in 2 or more analyzed issues |
| 議題 on `#/solutions` | An issue solution: its issue is picked. A cross-issue solution: 「跨議題解法」 is picked, or a picked issue is one of the issues in its `parts`, or one of the issues of the needs it covers (`crossCoverageIssueNumbers`). For example X-E has parts in #2 and #8, but it covers #1 N15 through X-N03, so `issue=1` keeps X-E. *(Proposal.)* Before, only the issues in `parts` counted (3.18). |
| 空間類型 on `#/issues` | The issue uses one of the picked spaces (as today) |
| 空間類型 on `#/solutions` | The solution (issue or cross-issue) lists one of the picked spaces (as today) |
| 利害關係人 on `#/issues` | The stakeholder is in the issue (its `issues` list) |
| 利害關係人 on `#/solutions` | The solution covers at least one need of the stakeholder: the same rule as the issue's 解法 tab (3.2) and the stakeholder's 解法 tab. For a cross-issue solution: one of the stakeholder's needs, in any issue, is covered (decision 60). |
| 只看特別關注族群 | The stakeholder has at least one 特別關注 group |
| 搜尋 (`q`) | The number or the title matches the search text (3.23.13, decision 95) |

**How filters combine:** inside one multi-choice filter, an item matches ANY of the picked values (as today). Between different filters, an item must match ALL of them. The search counts as one more filter here: an item must match the search AND every filter (decision 96). Nothing picked in a filter means no limit. The sort works on the filtered list.

**Rules for the URL:**
- A change of the sort or a filter updates the URL with a new history entry, so the back button undoes the last change. This is the same as the side menu links (decision 47). The search box has its own rule, so typing does not fill the history: one new entry per search, then `replace` while typing (3.23.13, decision 97).
- No `sort` param means 最近更新. The bar does not write `sort=updated`.
- Unknown values are dropped: a sort the page does not have (also the old `sort=id`, Q24), a space code that is not used, an issue that has no analysis, an unknown stakeholder ID. The page then replaces the URL without them (`replace`, so the back button does not loop).
- A moved stakeholder ID in `who` becomes the new ID (`resolveId`, as 3.14).
- 「清除篩選」 removes every filter param of the page, and `q` too, and keeps `sort` and `view` (decision 97).
- The card links do not carry the list params. The solution card link keeps `?evidence=1` as before, but these pages never set it.
- Links to the list pages from other pages (the breadcrumbs, 「看全部議題的解法」 on the solution page) do not carry `?evidence=1`, because the list pages do not read it. The links are built with `listPath` and `HOME_ALL_PATHS` in `src/lib/listParams.ts` where they have params.
- The old `evidence` param is dropped with `replace` on all three pages. On `#/stakeholders` the old `cross` and `special` are changed too (the table 「Old links」 below). The code is `legacyListRedirect(page, search)` in `src/lib/listParams.ts`, the same function for all three pages (decision 100).
- The logic is pure functions in `src/lib/listParams.ts`: `listParamsOf(page, params, index)` → `{ sort, issues, crossChoice, spaces, who, specialOnly, view, q }` (cleaned), `listUrlSearch(page, state)` → the URL search string, and `clearListFilters(params)`. Tests first. (The URL function was called `listSearch` in the first draft. It is renamed, so the name does not mix with the text search of 3.23.13, which is in `src/lib/listSearch.ts`.)

**Old links** (decision 91):

| Old link | Now |
|---|---|
| `#/stakeholders?cross=1` (issue cards, Discord) | Redirect with `replace` to `?issue=X`, other params kept |
| `#/stakeholders?special=<group>` (Phase S side bar) | Redirect with `replace` to `?specialonly=1`, other params kept |
| `#/stakeholders?evidence=1` | The page has no data filter now. The param is dropped with `replace`, other params kept. |
| `#/issues?evidence=1`, `#/solutions?evidence=1` | The same: the param is dropped with `replace`, other params kept (decision 100). Before, these pages did not use it but left it in the URL. |
| `#/?cross=1` | `#/stakeholders?issue=X` in one step, with `replace` (3.1) |

The 跨議題共用的利害關係人 link on the issue cards (3.9, decision 72) changes from `#/stakeholders?cross=1` to `#/stakeholders?issue=X`. The old link still works through the redirect.

#### 3.23.6 The result line and empty states

The result line is under the bar, `role="status"`, always in the page:
- 「顯示 3 個議題，共 8 個。」, 「顯示 12 位利害關係人，共 65 位。」, 「顯示 7 個解法，共 25 個。」 (20 issue solutions and 5 cross-issue solutions today). The total is the page's whole list with no filter.
- When filters are on, it also lists them: 「篩選：空間類型：人行道、騎樓；利害關係人：I06 身心障礙者（視障、輪椅使用者）。」, then the link 「清除篩選」. A search is listed first: 「篩選：搜尋「無菸」；空間類型：人行道。」 (3.23.13).
- The sort is not in this line. The `<select>` shows it.

Empty states, in the card area:

| Page | Text |
|---|---|
| `#/issues` | 「沒有符合目前篩選的議題。」 and 「清除篩選」 |
| `#/stakeholders` | 「沒有符合目前篩選的利害關係人。」 and 「清除篩選」 |
| `#/solutions` | 「沒有符合目前篩選的解法。」 and 「清除篩選」 |

With a search on, the empty state names the search text instead (3.23.13).

While the data loads, the bar shows with its controls, and the card area shows `LoadState`. When `cross-issue.json` does not exist, `#/solutions` has no cross-issue cards and nothing breaks (3.18).

A 製作中 issue has no spaces and no stakeholders, so any filter on `#/issues` hides it. With no filter, it is listed (3.23.3 says where).

#### 3.23.7 The stakeholder picker

ETBlue's decision 6 (2026-10-22). Decision 86. On `#/issues` and `#/solutions`. The component is `StakeholderPicker` (`src/components/StakeholderPicker.tsx`). The logic is in `src/lib/stakeholderPicker.ts`.

**The search box with a list** (the ARIA 1.2 combobox pattern, "list autocomplete"):

| Part | Design |
|---|---|
| Label | A visible `<label>` 「利害關係人」 |
| Box | `<input role="combobox" aria-autocomplete="list" aria-expanded aria-controls aria-activedescendant>`. The placeholder is 「輸入編號或名稱」. |
| List | `role="listbox"`, with two groups (`role="group"` with a label): 組織 and 個人. Inside each group: ID order (`compareIds`). Each option is `role="option"`: 「I06 身心障礙者（視障、輪椅使用者）」. Never sorted by a count. |
| Options | Every listed stakeholder (`isListed`, decision 78) |
| Match | The typed text is in the ID (any case) or in the name. Empty text shows the whole list. |
| No match | One line in the list (not an option): 「找不到符合的利害關係人」 |
| Live count | A hidden `role="status"` says 「找到 3 位」 after typing |
| Picked | The box shows the ID and the name. A clear button (×) with the name 「清除利害關係人篩選」 removes `who`. |
| Size | At most 8 options high, then the list scrolls. From `md` it floats under the box (at most 24rem wide). In the phone sheet it is inline under the box. |

Keys: Down and Up move the active option (Down opens the list). Enter picks the active option and closes the list. Escape closes the list, or, when the list is closed, clears the typed text. Tab leaves the box and closes the list without a pick. A click picks an option. `aria-selected="true"` is on the active option.

The pure parts are tested first: `pickerOptions(stakeholders, query)` → the two groups in ID order, and `pickerKey(state, key)` → the next state (open, active option, picked ID).

**The tree dialog.** A button next to the box: 「瀏覽」, with the accessible name 「瀏覽全部利害關係人」. It opens a shadcn Dialog (Radix):
- Title 「選擇利害關係人」, and one line 「依分類瀏覽，選一位利害關係人來篩選。」.
- The tree of `sideMenuTree` with every listed stakeholder (decision 65): the same look as the side menu (3.21), with a button per group to open and close it, all open at the start. The tree part of `StakeholderMenu` is moved into a shared component `StakeholderTree`, which the side menu and the dialog both use.
- 「全部利害關係人」 is the first item. It removes `who`.
- Each stakeholder is a link to the same page with `who=<id>` and the other params kept, as in the side menu (decision 47). A pick closes the dialog. The current one has `aria-current="true"`, bold text and the bar on the left.
- No counts in the dialog, so there is no count line. *(Proposal: counts with the rule of decision 66 can be added later.)*
- Focus: on open, focus goes to the current item, or to 「全部利害關係人」. Focus stays in the dialog. Escape and the close button 「關閉」 close it. After a close or a pick, focus goes back to the 「瀏覽」 button.
- Below `md` the dialog is full screen. In the phone sheet, it opens on top of the sheet (Radix supports a dialog in a dialog). After it closes, focus is back on 「瀏覽」 inside the sheet.

#### 3.23.8 Dates

ETBlue's decision 5 (2026-10-22). Decision 90. ETBlue chose way C (Q21, 2026-10-22). Before Phase L:

| Item | 新增日期 (`added`) | 更新日期 (`updated`) |
|---|---|---|
| Issue | None | The last git commit of the issue folder (`git_updated` in `build_json.py`) |
| Stakeholder | 新增日期 in `stakeholders.csv` | None |
| Solution | 新增日期 in 6.1 | None |
| Cross-issue solution | `added` in `cross-issue-analysis.md` | None (only the file has `updated`) |

**What "updated" means:**
- **Stakeholder:** the last day when its own content changed: its row in `stakeholders.csv` (名稱, 分類路徑, 特別關注, 議題, 備註), or any of its stories in any issue (我想要…, 以便…, their tags, 來源, 優先順序 and its tag, 相同訴求編號, 相同需求編號). A story added or removed counts too. A change to other parts (a W group summary, a conflict, a solution that covers its need) does not count, because it is not the stakeholder's own content.
- **Solution:** the last day when its own content changed: its 6.1 row (name, tag, summary, 空間類型), its 6.2 needs (`needs.must`, `needs.shouldCould`), its 6.3 rows, its step 7 section and its 總覽 row, and its 構想 rows.
- **Cross-issue solution:** the last day when its part of `cross-issue-analysis.md` changed: name, tag, summary, `parts`, spaces, needs (with `crossIssue`), measures and detail.
- A change of format only (a column renamed, a table moved) is not an update.

**Three ways to get the dates:**

| | A. Hand-kept columns | B. Computed from git in `build_json.py` | C. Kept by a script, checked by a fingerprint (**chosen**, Q21) |
|---|---|---|---|
| How | A person or agent writes 更新日期 in `stakeholders.csv` and 6.1 | `build_json.py` walks the git history of `stakeholders.csv`, each `user-stories.csv` and each `issue-analysis.md`, and finds the last commit that changed each item | `update_dates.py` computes a fingerprint (a short hash) of each item's own content. When the fingerprint changed, it sets 更新日期 to today. The dates and fingerprints are in a new file `analysis/data/updated-dates.csv`. |
| Can a change be forgotten? | Yes. A check can only test the format and that 更新日期 ≥ 新增日期. | No | No. `check_analysis.py` fails when a fingerprint does not match the content, with the message 「請執行 update_dates.py」. |
| Format changes | Not counted | Counted: a commit that changes the format (like the 2026-10-18 and 2026-10-20 format changes) marks every item as updated on that day. Old Markdown versions also need the old parser to read a solution. | Not counted: the fingerprint uses the parsed content (text and tag), not the file text. |
| Needs git history in CI | No | Yes (`fetch-depth: 0`, already set in `.github/workflows/pages.yml`). A zip download or a shallow clone gives no dates. | No |
| Work | Small | Large and slow (about 250 commits × many files) | Medium: one new script, one new file, new checks |

The Pages workflow already checks out the full history (`fetch-depth: 0` in `.github/workflows/pages.yml`, for the issue `updated` date). So B would work in CI. But B still counts format changes, and it needs old parsers for solutions. So C was recommended, and ETBlue chose it.

**Way C, in detail:**
- **Issue 新增日期:** a new column 新增日期 in `issues.csv`, kept by hand, like the other 新增日期 columns. It is the day the issue's `issue-analysis.md` was first committed. It never changes. An issue with no analysis leaves it empty. First values from git (`git log --diff-filter=A --follow`): #1 2026-10-18, #2 2026-10-16, #8 2026-10-18, #9 2026-10-20. In `index.json` it is `added`.
- **Issue 更新日期:** no change. It stays the git date of the folder.
- **`analysis/data/updated-dates.csv`** (UTF-8 with BOM), columns: 類型 (利害關係人, 解法, 跨議題解法), 編號 (`I06`, `2-A`, `X-A`), 更新日期 (`YYYY-MM-DD`), 內容指紋 (the first 12 hex characters of SHA-256 of the item's content as canonical JSON). One row per stakeholder that is not a moved ID, one per issue solution, one per cross-issue solution. Rows are in the fixed ID order.
- **`analysis/scripts/update_dates.py`:** reads the same data as `build_json.py` (it imports its parser), computes the fingerprints, and writes the file. A new item gets 更新日期 = its 新增日期. A changed fingerprint gets 更新日期 = today. A removed item loses its row. It runs in `build_all.sh` after `sync_stakeholders.py` and `build_csv.py`. With `CI=true`, it fails when the file would change (the same rule as the other generated files), so CI never writes a date.
- **`build_json.py`:** writes `updated` on each stakeholder in `index.json`, on each solution in the issue JSON, and on each cross-issue solution in `cross-issue.json`. It writes `added` on each analyzed issue in `index.json`.
- **First values** (one time, before the script is used): from git history, as well as possible, by a one-time script in the scratchpad (not in the repo). For a stakeholder: the last commit that changed its row in `stakeholders.csv` or its rows in a `user-stories.csv`, comparing only the columns that exist in both versions. For a solution: the last commit that changed its 6.1 row or its step 7 section (`git log -L`). Never earlier than 新增日期. ETBlue checks the values in the diff.

**Checks** (`check_analysis.py`, with tests first):
- `issues.csv`: an issue with an analysis has 新增日期. It is a `YYYY-MM-DD` date, not after today.
- `updated-dates.csv`: every non-moved stakeholder and every solution has exactly one row, and there are no other rows. Each 更新日期 is a `YYYY-MM-DD` date, not after today, and not before the item's 新增日期. Each 內容指紋 matches the current content.

**Rule text for `analysis/docs/method.md`** (Task L2 puts it in place of the section 「新增日期」):

> ## 新增日期與更新日期
>
> - [issues.csv](../data/issues.csv) 的「新增日期」欄，是這個議題的分析（issue-analysis.md）第一次加入 repo 的日期。還沒有分析的議題留空。
> - [stakeholders.csv](../data/stakeholders.csv) 的「新增日期」欄，是這位利害關係人加入清單的日期。
> - 步驟 6.1 解法表的「新增日期」欄（在「空間類型」之後），是這個解法加入 6.1 的日期。6.1 的構想表沒有日期。
> - 新增日期的格式是 `YYYY-MM-DD`，不能晚於今天。新增議題分析、利害關係人或解法時，填當天的日期。之後不再改，改名或移動時也一樣。
> - [updated-dates.csv](../data/updated-dates.csv) 記錄每位利害關係人、每個解法與每個跨議題解法的「更新日期」。這個檔案由 `update_dates.py` 產生，不要手改。
>   - 利害關係人的更新：stakeholders.csv 中這一列（名稱、分類路徑、特別關注、議題、備註），或它在任何議題的使用者故事（我想要…、以便…、標記、來源、優先順序、相同訴求編號、相同需求編號）有改變。新增或刪除故事也算。
>   - 解法的更新：6.1 這一列、6.2 涵蓋的需求、6.3 的指標、步驟 7 的這一節與總覽列，或構想表中屬於它的列有改變。
>   - 跨議題解法的更新：cross-issue-analysis.md 中這個解法的內容有改變。
>   - 只改格式、不改內容，不算更新。
> - 修改議題分析後的順序：`build_csv.py`、`sync_stakeholders.py`、`update_dates.py`，最後 `check_analysis.py`。內容改了卻沒有執行 `update_dates.py`，檢查會失敗。
> - 網站用這些日期排列首頁的「最近」清單，以及列表頁的「最近更新」「最近新增」排序。
> - 2026-10-18 以前的新增日期，與 2026-10-22 以前的更新日期，是依 git 紀錄填的。

#### 3.23.9 The cards on the list pages

Decision 92. The cards keep the variants of 3.9. On these pages they also show the data that the sorts use, so the reader can see why the order is what it is.

**`#/issues`: detailed `IssueCard`.** As in 3.9, plus 新增日期 (new `added`) next to 更新日期. With 資料根據比例 on, the 資料根據 field adds 「實證＋AI整理 30%」 next to the counts. The 實證 percent stays as it is.

**`#/stakeholders`: `StakeholderCard`.** A list of cards, not the tree (decision 87). The card uses the `detailed` box with a new prop `listFields` instead of `entries` (the story counts by priority stay only on the issue's 總覽 tab):

| Field | Example (I06) |
|---|---|
| Name (link to `#/stakeholders/I06`), ID, 特別關注 badges | As today |
| 分類路徑 | The names, 「個人 › 用路人」 |
| 出現的議題 | 「#1、#2、#8、#9」, each a link to the issue's 總覽 tab with `?focus=stakeholders` |
| 資料根據（各議題合計） | `CellBasis compact`: 「實證 1・AI整理 0・AI模擬 11」 and the bar. With 資料根據比例 on: 「實證＋AI整理 8%」 next to it. |
| 解法涵蓋 | 「需求 5 個：有解法涵蓋 5 個」, or 「需求 5 個：有解法涵蓋 3 個、尚未涵蓋 2 個」. With 解法涵蓋比例 on: 「（60%）」 at the end. |
| 新增日期, 更新日期 | 「2026-10-18」, 「2026-10-21」 |

The 資料根據 explanation line of 3.9 is shown once under the bar, when 資料根據比例 is on, as part of the sort note. It names the stakeholders, not the issues: 「「資料根據」是分析內容的資料來源組成，不代表利害關係人的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。」 (decision 100).

**`#/solutions`: detailed `SolutionCard` and `CrossSolutionCard`.** One flat list (decision 89). There are no groups by issue now, because a sort by date or share mixes the issues. Each card shows:
- the code and the name (「#2 A」, 「X-A」), the summary, 空間類型, 新增日期 and the new 更新日期, and 「涵蓋 9 個需求」 (decision 54)
- the issue: 「議題：#2 找回消失的垃圾桶」 (a link). A cross-issue card shows the badge 「跨議題解法」 and 「議題：#1、#2、#8」 (the `parts`). When it also covers needs of other issues, it adds 「也涵蓋 #1 的需求」 (X-E).
- 「涵蓋需求的資料根據」: `CellBasis compact` with the cells of 3.23.4. With 資料根據比例 on, the percent next to it. A solution that covers no need shows 「沒有涵蓋的需求」 and no bar.

As on `#/stakeholders`, the 資料根據 explanation line is shown once under the bar when 資料根據比例 is on, as part of the sort note. It names the solutions: 「…不代表解法的重要性或好壞。…」 (decision 100). On `#/issues`, the home page and the space page the line lists issues, so it keeps 「不代表議題的重要性或好壞」. The text is `t.basis.listNote(subject)`, with subject 議題, 利害關係人 or 解法.

The 「跨議題解法」 heading and intro line of 3.18 are removed from this page. In the fixed ID order (used for ties and for items with no value, 3.23.3), the cross-issue solutions still come first.

#### 3.23.10 The stakeholders page has no side bar

ETBlue's decision 3 (2026-10-22). Decision 87.

`#/stakeholders` is now an extended view of the home block 「最近加入分析的族群」: the bar and a list of `StakeholderCard`s, or the tree view (3.23.11). The side bar (3.21) is removed from this page. ETBlue: the tree side menu is good for filtering items by stakeholder, but not for listing stakeholders.

**The statistics (decision 63)** are removed from the page (decision 88; Q22, ETBlue, 2026-10-22), with `src/lib/stakeholderStats.ts`, its test and the `stakeholderStats` UI block. The reasons:
- `human-inputs.md` now asks for the bar and the cards only.
- The useful parts are still there in another form: the total is in the result line (「共 65 位」), 各議題 is the 議題 filter, 特別關注族群 is the toggle, and the cards show 分類路徑.
- Two lists of the same stakeholders on one page (statistics and cards) would be long on a phone.

`human-inputs.md` no longer asks for the statistics (the old block was removed).

**The stakeholder page `#/stakeholders/<id>` has no side bar either** (decision 94; Q20, ETBlue, 2026-10-22: "there's no need jumping quickly between stakeholders"). The side bar stays only on the issue page's 訴求, 需求 and 解法 tabs, where it filters the items by stakeholder (3.2, 3.21).

| Part | Design |
|---|---|
| Breadcrumb | 首頁 › 利害關係人 › I06 身心障礙者（視障、輪椅使用者）, with the shared `Breadcrumb` component (decision 99, 3.2): `<nav aria-label="頁面位置">`, the same look as the solution page (3.12). The last item is the ID and the name, as on the other pages (ETBlue, 2026-10-22). 利害關係人 links to `#/stakeholders`. The browser back button goes back to the list with its sort and filters, because they are in the URL. |
| Main block | The full page column. From top to bottom: the moved note 「O02 已改為 I12」 after a redirect, the breadcrumb, the h1, the metadata, the tab list, then the filter row and the tab content. |
| Filter row | At the top of the tab content, on every tab: the 「只看有資料根據」 toggle (`evidence=1`), then `FilterStatus` (the status line and 「清除篩選」). This is the same place as the filter status on the issue page tabs (decision 68). It is a row, so it does not need its own Collapsible on a phone. |
| 只看跨議題, 特別關注 | Removed from this page. They only changed which stakeholders the side menu listed. A link with `cross=1` or `special=` still opens the page; the params are ignored and dropped with `replace`. |
| Tab links | Keep only `evidence=1` (the stakeholder page's own filter). |
| Keyboard order | Breadcrumb, h1 and metadata links, the tab list, the filter row, the tab content. |
| Stakeholder with no issue (decision 78) | The same page with no tabs and no side menu. |
| Layout route | `StakeholdersLayout` (decision 64) is removed. `#/stakeholders` and `#/stakeholders/:id/:tab?` are plain routes again. The story page does not change. |
| Side menu code | The side menu contexts `stakeholders`, `stakeholder-overview`, `stakeholder-wants`, `stakeholder-needs` and `stakeholder-solutions` of `sideMenuCounts` (3.21) are no longer used. They are removed, with their tests. The `switch` and `link` modes of `StakeholderMenu` go too. Only the `issue-*` contexts and the filter mode stay. |

#### 3.23.11 Card view and tree view on `#/stakeholders`

ETBlue, `human-inputs.md` commit a325fcb (2026-10-22): 「toggle card view / tree view」. Card view: like the issue and solution lists. Tree view: like the stakeholder side bar, but with 組織 and 個人 in two columns. Decision 93.

| Part | Design |
|---|---|
| Switch | A shadcn Toggle Group with one choice (`type="single"`), `aria-label="檢視方式"`: 「卡片」 and 「樹狀」. Card view is the default. Tree view is `view=tree` in the URL. |
| Card view | 3.23.9 |
| Tree view | The tree of `sideMenuTree` (decision 65), in the shared `StakeholderTree` component (3.23.7). Two columns from `md`: 組織 on the left, 個人 on the right. Below `md`: one column, 組織 first. Each root is an h2 (「組織」, 「個人」). Each level has a button to open and close it, all open at the start, with the number of stakeholders under it (as in the side menu). Each stakeholder is a link to its page: the ID and the name, and the 特別關注 badges. |
| Filters and search | They work in both views. In tree view a level with no matching stakeholder is left out (as in the side menu). The result line counts the same. With a search, the tree shows the matching stakeholders and the groups above them (decision 96, 3.23.13). |
| Sort | The tree has its own fixed order (decision 65), so the sort does not apply. In tree view the `<select>` is disabled, and a line next to it says 「樹狀檢視依分類排列」. The `sort` param stays in the URL, so the card view gets it back. |
| Counts | No count next to each stakeholder in tree view *(proposal)*. The side menu counts (decision 66) depend on a page context, and this page has none. |
| Keyboard | As in the side menu: nested lists, a button per level with `aria-expanded`, a link per stakeholder. No ARIA `tree` role (3.21). |

This tree view replaces the old tree of detailed `StakeholderCard`s of 3.9 (decision 62). It uses the side menu tree instead, as ETBlue asked.

#### 3.23.12 Links from the home page

The 「看全部」 links of the home blocks (3.1, decision 27) go to the list sorted the same way as the block, so the first 5 cards are the 5 items of the block (decision 91):

| Block | Sort of the block | 「看全部」 goes to |
|---|---|---|
| 最近更新的議題 | `updated` | `#/issues` (the default sort) |
| 最近加入分析的族群 | `added` | `#/stakeholders?sort=added` |
| 最近分析出的解法 | `added` | `#/solutions?sort=added` |

The header links stay `#/issues`, `#/stakeholders` and `#/solutions` (the default sort, 最近更新).

#### 3.23.13 Search on the list pages

ETBlue, `human-inputs.md` commit e879ba7: 「search issue / stakeholder / solution by title or number」, and ETBlue's rules S1–S6 (2026-10-22). Decisions 95–98.

**What a search matches** (decision 95). An item matches when its number matches OR its title matches.

| Page | Number (S1) | Title (S2) |
|---|---|---|
| `#/issues` | The issue number. `8` and `#8` find #8. A leading zero is ignored (`08`). | The issue title, for example 「無菸」 finds #8 無菸城市. |
| `#/stakeholders` | The ID: `I06`, `i6` and `I 06` find I06; `O12` finds O12. The letter must be the same, and the number must be the same (leading zeros are ignored). | The name, for example 「身心」 finds I06 身心障礙者（視障、輪椅使用者）. |
| `#/solutions` | The code. A letter alone (`A`) finds every solution with that letter: #1 A, #2 A, #8 A, #9 A and X-A. `X-A` (or `XA`) finds only X-A. `2-A`, `2A` and `#2 A` find only #2 A. | The name, for example 「建議地圖」 finds #2 A 清潔箱佈建建議地圖, and 「清潔箱」 finds #2 A and the cross-issue solution 「清潔箱與吸菸區分開設置、一起清運」. |

Rules for the text:
- Case does not matter (`i6` is `I6`).
- Full-width letters and digits count as half-width ones (Unicode NFKC), so 「８」 and 「Ｉ０６」 typed with a Chinese input method work too.
- For the number, spaces, 「#」 and 「-」 are ignored, so `# 8`, `X-A` and `XA` work.
- For the title, the search text is trimmed at both ends. Any part of the title matches (a substring). Spaces inside the text are kept.
- The number must match the whole number or code, not a part of it. So `1` finds #1, not a future #10, and `I1` does not find I12. (A title can still contain the text.)
- A number alone does not find the solutions of an issue (`2` does not find #2 A to #2 E). The 議題 filter does that.
- Only the number and the title are searched. Not the summary, not the 分類路徑, not the space types. The other fields have their own filters.
- An empty search, or a search of only spaces and 「#」, finds every item.

**How the search works with the rest** (decision 96):
- S3: an item must match the search AND every filter that is on (3.23.5).
- S4: the results keep the sort the reader picked. There is no "best match" order. That would need a match score, and the project does not use scores (decision 81).
- S6: in the tree view of `#/stakeholders` (3.23.11), the tree shows the matching stakeholders and the groups above them. A group with no match under it is left out, as with the filters. The number next to a group is the number of stakeholders shown under it (`sideMenuTree` already counts the IDs it gets). While a search is on, every group in the tree is open, so every match is visible.
- On `#/issues` and `#/solutions` the search box does not replace the 利害關係人 filter (`who`, 3.23.7). The search box looks only at the issue or solution itself. To see the issues or solutions of one stakeholder, the reader uses the stakeholder picker. Both can be on at the same time.

**The URL** (decision 97). S5: the search is in the URL as `q=<text>`, so a search can be shared and survives a reload.
- The box keeps its own text while the reader types. The URL is updated 300 ms after the last key press, or at once on Enter.
- The first URL update after the box gets focus adds a new history entry (`push`). Every later update until the box loses focus uses `replace`. So one search is one step in the history, and the back button goes back to the list before the search, not to each letter.
- When the box is empty, `q` is removed from the URL. The text in the URL is trimmed and cut at 100 characters.
- `listParamsOf` (3.23.5) returns `q` with the other params. A `q` that is empty after trimming is dropped with `replace`.
- 「清除篩選」 removes `q` too, and empties the box. The reason: the result line lists the search as one of the things that limit the list (below), so the link next to it gives back the whole list. A reader who wants to remove only the search uses the clear button in the box.
- The card links do not carry `q`, as the other list params (3.23.5).

**The box** (decision 98):

| Part | Design |
|---|---|
| Place from `md` | The first control of the bar, before 「排序」 (3.23.2). 16rem wide. |
| Place below `md` | Its own full-width row at the top of the bar, above the 「排序」 row. It is **not** in the 「篩選」 sheet, so the reader sees the cards change while typing. The sheet does not show it again. |
| Markup | `<div role="search">` (a search landmark) with a visible `<label>` and `<input type="search" enterkeyhint="search">`. Not a combobox: the results are the cards, not a list under the box. |
| Label | Visible 「搜尋」, with the page name as hidden text, so the full label is 「搜尋議題」, 「搜尋利害關係人」 or 「搜尋解法」. The accessible name starts with the visible text (WCAG 2.5.3). |
| Placeholder | 「輸入編號或標題」 (`#/issues`), 「輸入編號或名稱」 (`#/stakeholders`), 「輸入代號或名稱」 (`#/solutions`). The placeholder is only a hint. The label is always there. |
| Clear button | A button 「×」 inside the box, shown when the box has text. Accessible name 「清除搜尋」. At least 24 × 24 px. It removes `q` and keeps the focus in the box. Escape in the box does the same. |
| Result count | The result line (3.23.6, `role="status"`, always in the page) gives the new number after each URL update, so a screen reader hears it. The box has no live region of its own. |
| Two boxes on one page | `#/issues` and `#/solutions` also have the stakeholder picker box (3.23.7). The two have different labels (「搜尋議題」 and 「利害關係人」) and different placeholders, so a reader can tell them apart. |

The result line names the search first: 「篩選：搜尋「無菸」；空間類型：人行道。」. The search text is shown as typed (trimmed).

Empty results with a search on, in the card area:

| Page | Search only | Search and filters |
|---|---|---|
| `#/issues` | 「找不到符合「無菸」的議題。」 and 「清除搜尋」 | 「找不到符合「無菸」和目前篩選的議題。」, 「清除搜尋」 and 「清除篩選」 |
| `#/stakeholders` | 「找不到符合「身心」的利害關係人。」 and 「清除搜尋」 | 「找不到符合「身心」和目前篩選的利害關係人。」, 「清除搜尋」 and 「清除篩選」 |
| `#/solutions` | 「找不到符合「火箭」的解法。」 and 「清除搜尋」 | 「找不到符合「火箭」和目前篩選的解法。」, 「清除搜尋」 and 「清除篩選」 |

The strings (`src/i18n/zh-TW.ts`, block `listSearch`):

| Key | Text |
|---|---|
| `label` | 「搜尋」 |
| `labelHidden` | `{ issues: '議題', stakeholders: '利害關係人', solutions: '解法' }` |
| `placeholder` | `{ issues: '輸入編號或標題', stakeholders: '輸入編號或名稱', solutions: '輸入代號或名稱' }` |
| `clear` | 「清除搜尋」 |
| `statusPart` | `(q) => 搜尋「${q}」` |
| `noMatch` | `(q, noun) => 找不到符合「${q}」的${noun}。` |
| `noMatchFiltered` | `(q, noun) => 找不到符合「${q}」和目前篩選的${noun}。` |
| `barLabel` | 「搜尋、排序與篩選」 (replaces 「排序與篩選」 of the bar) |

**The logic** is in a new file `src/lib/listSearch.ts`, pure functions with tests first:
- `parseListQuery(q)` → `{ text, key } | null`: `text` is NFKC, lower case and trimmed (for the title); `key` is `text` without spaces, 「#」 and 「-」 (for the number). Null when both are empty.
- `issueMatches(issue, query)`, `stakeholderMatches(stakeholder, query)`, `solutionMatches(item, query)`. Each is true when the query is null, or the number matches, or the title contains `text`.
- Tests: `8`, `#8`, `＃８`, `08` find #8; 「無菸」 finds #8; `1` does not find a #10 (a test item); `i6`, `I06`, `I 06` find I06; `I1` does not find I12; `A` finds every solution A and X-A; `X-A` and `xa` find only X-A; `2-A`, `2A`, `#2 A` find only #2 A; 「建議地圖」 finds only #2 A; an empty query and `#` alone find every item; the search with a filter keeps only the items that match both; the result order is the order of the sort (the search does not change it).

## 4. Opinion check

The opinion check is part of the 訴求 tab of the issue page (decision 38, 3.2). The picked item is in the URL: `#/issues/<n>/wants?pick=W08`. The old URL `#/issues/<n>/opinion?pick=W08` redirects there. Each story ID in the result links to its story page (3.15). 相關解法 are the solutions that cover the need of a picked story.

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

New file `analysis/data/stakeholders.csv` (UTF-8 with BOM):

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

Codes are joined with `-`. The app shows the names from `analysis/data/path-labels.csv`, never the codes.

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

New file `analysis/data/path-labels.csv`: columns 分類路徑, 名稱. One row for every path prefix, for example `gov` → 政府, `gov-local` → 地方政府, `gov-local-taipei` → 臺北市, `gov-local-taipei-epb` → 環保局.

The path is a field, not the ID. Reasons: story IDs stay short (`O04-US05`), and a rename (for example 環保署 → 環境部 in 2023) changes one field, not the public IDs.

### 5.3 Space types

New file `analysis/data/space-types.csv`: columns 代碼, 名稱, 分組, 說明. The list is fixed, so the same space is never written two ways. First draft (ETBlue can change it):

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

`analysis/scripts/check_analysis.py` also checks:
- every step 1 ID exists in `stakeholders.csv`, with the same name, path and 特別關注
- every path prefix has a name in `path-labels.csv`
- the 議題 column matches the issue files
- every space type code is in `space-types.csv`, and each solution's space types are in its issue's list
- 新增日期 exists in `stakeholders.csv` and in 6.1, and each value is a `YYYY-MM-DD` date that is not after today
- each solution in 6.1 has its own step 7 section `### 7.n 解法 X：…` and a 總覽 row (5.8)

### 5.7 Open data list

New file `analysis/data/open-data.csv` (UTF-8 with BOM), for the links to open data in the page footer. Added 2026-10-18.

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

- A solution code (A, B…) is never reused in an issue, also when a solution is removed or merged. So a shared link such as `#/solutions/2-A` (and the old `#/issues/2/solutions/A`, which redirects) keeps working, the same as stakeholder IDs (5.1) and space codes (5.3).
- Each solution in 6.1 has its own step 7 section, `### 7.n 解法 X：…`, with a 項目 | 內容 table, and one row in the 總覽 table (`### 7.n 總覽`). The 總覽 table has the columns 代號, 解法, 成本, 可行性, 主要風險, 主責單位. 代號 is the code only, for example 「A」. 解法 is the row tag and a short name, for example 「`[AI模擬]` 佈建建議地圖」. The row tag is for every cell of the row. `check_analysis.py` checks both.
- A 6.3 row lists one or more codes in its 解法 cell, separated by 「、」, for example `A、D`.
- A row of the 6.1 構想 table belongs to a solution when its 本文件的處理 cell names it as 「解法 X」, for example 「併入解法 B」.

## 6. Build script

`analysis/scripts/build_json.py`:
- Reads every issue folder that has an `issue-analysis.md`, plus `stakeholders.csv`, `path-labels.csv`, `space-types.csv` and `open-data.csv`.
- Writes `app/public/data/index.json` (issue list, shared stakeholders, path labels, space types, open datasets as `openData`) and `app/public/data/issues/<folder>.json`.
- Reads these sections: title, 空間類型 line, `## 分析摘要` (its 5 `###` topics), 1.1, 1.2, `### 1.n 特別關注族群檢查`, step 4 stories, 相同訴求群組, 5.4 (split 相關故事 on 「vs」 into two sides), 6.1 (with 空間類型 and 新增日期), 6.2, 6.3, each step 7 section `### 7.n 解法 X：…`, and `### 7.n 總覽`.
- For each solution, also writes the fields of its page (3.12): `measures` (6.3 rows: `metric`, `baseline` Cell, `source`), `detail` (step 7 rows: `item`, `content` Cell[]: the parts of the cell, one Cell per tag, decision 101), `overview` (`cost`, `feasibility`, `risk`, `owner`, each a Cell with the row tag), `ideas` (構想 rows: `idea`, `handling`, both Cells), `practices` (see below) and `pending` (the 【待補】 items of its step 7 section and its 6.3 rows; they stay in the issue's `pending` list too).
- Adds per-issue counts for the issue cards (section 3.9), including `cells` for 資料根據 (`evidence`, `aiSummary`, `aiSimulated`, `pending`: the 我想要… and 以便… cells of every story by tag), and the update date from `git log -1 --format=%cs -- <folder>`.
- Writes `focusGroups` to each issue file: `[{ tag, stakeholders: [ids], note: Cell | null }]`, one item per 特別關注 group, in the fixed order of `analysis_common.FOCUS_GROUPS`. `stakeholders` is `[]` for 「（無）」; `note` is null for 「—」. The IDs must be the step 1 stakeholders that have the group in `stakeholders.csv`. `index.json` gets `focusGaps` for each analyzed issue: the groups with no stakeholder, in the same order (`[]` when every group is included, null for an issue without an analysis).
- Writes `summary` to each issue file: `[{ topic, items: [{ item, text: Cell, refs: [string] }] }]`, one item per topic in the fixed order of `analysis_common.SUMMARY_TOPICS`. `refs` are the 相關編號 as written (「C5」, 「解法 A」, 「#8 解法 B」), `[]` for 「—」. Every reference must exist, in this issue or in the other issue. A 【待補】 item that the summary repeats from another section is not added to `pending` again.
- Writes `practices` to each solution (decision 104): `[{ name: string, place: string | null, domestic: boolean, content: Cell, use: Cell | null, source: "practice" | "dependency" }]`, in file order: first the rows of the 6.1 practice tables that name the solution, then the 相依事項與現行政策的關係 rows of the 分析摘要 that name it. For a practice row, `name` is the 做法 cell after 「<place>：」, `place` is the text before 「：」 (「美國紐約」, 「臺灣臺北市」), `domestic` is true when `place` starts with 「臺灣」, `content` is the 內容 Cell and `use` the 本文件怎麼用 Cell. For a dependency row, `name` is the 項目 cell, `place` is null, `domestic` is true, `content` is the 說明 Cell and `use` is null. `[]` when nothing names the solution. `cross-issue.json` gives each combined solution the same field, with dependency rows only (the 相關編號 names 「解法 X-A」). A 做法 cell without a place, an unknown solution code, or a 「7.n」 that is not the section of a solution stops the build. `update_dates.py` counts a non-empty `practices` list as content of the solution.
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
    pages/              Home, Issues, Stakeholders, Solutions (list pages), About, Issue (4 tabs), Stakeholder (4 tabs), Solution (3 tabs, for issue and cross-issue solutions), StakeholderStory, Space
    components/         TagBadge, Watermark, StakeholderList, StoryCard, IssueCard, SolutionCard, StakeholderCard, ...
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
- Vitest for the 分析摘要 tabs (decision 102): the tab order, the URLs, the counts of each tab on the #1, #2, #8 and #9 fixtures (a 【待補】 row of 受影響較大的弱勢族群 is not counted), and the issue page rendered with mocked data (`src/pages/Issue.test.tsx`): the labels, the page title, no side bar on the new tabs, `?evidence=1` on the links, no 分析摘要 on 總覽, the unknown tab, and the scroll classes of the tab list.
- Cross-issue tests start when a second issue exists.
- Vitest for Phase S (2026-10-20), on the fixtures: the side menu tree (roots, levels left out when empty, order), the side menu counts for each page context (with and without 只看有資料根據; the count equals the list length of the tab view), the side bar filters in the URL (`cross`, `special`, `evidence`) and 「清除篩選」, and `stakeholderStats` (fixed orders, the filters, no sorting by count). Decision 74 (2026-10-21): #2 I06 has 2 solutions without the data filter and 0 with it, and the issue page and the stakeholder page give the same 解法 count for each stakeholder in each issue. Decisions 75–77 (2026-10-21): the chips of each issue (`issueSpecialOptions`), the menu with the chips (`menuIdsFor`, the picked stakeholder kept), the three tab views with `special` (alone, with the data filter, with a stakeholder on top), the menu count equals the list length with each chip on #1, #2, #8 and #9 (evidence on and off), the 「全部利害關係人」 link (`allStakeholdersTarget`), and the solutions that the data filter hides with no stakeholder picked.
- Vitest for the needs-based pages (2026-10-20), on the #1, #2 and #8 fixtures: the tab counts (#2: 訴求 39, 衝突 9, 需求 21, 解法 5; I06: 訴求 5, 衝突 4, 需求 4, 解法 4; #2 A: needs 9 / 12, stakeholders 14 / 13), the want and need keys, the stakeholder filter, the old tab redirects, the solution paths (`#/solutions/2-A`, `#/solutions/X-A`) and the old solution redirects, `?focus=` values, and every 分析摘要 reference (also N groups) has a link.
- Vitest for Phase L (2026-10-22), on the fixtures: the shares and their exact compare (`coverage.ts`), the sorts and their ties (no `id` sort; `sort=id` is dropped), the filters and the URL params (`listParams.ts`, also `q`), and the text search (`listSearch.ts`, the cases in 3.23.13). The `stakeholderStats` tests are removed with the statistics (decision 88).

## 9. Deploy

A GitHub Actions workflow checks out the full history (`fetch-depth: 0`, for the issue update dates; the new dates of Phase L do not need it, because ETBlue chose way C for Q21, 3.23.8), runs `build_json.py` and the tests, builds the app, and publishes it to GitHub Pages. ETBlue turns on Pages in the repo settings once.

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
18. Each solution has its own page, `#/issues/<n>/solutions/<code>`, because its content can be long. It shows the covered stories, W groups, stakeholders, conflicts, measures, the step 7 details and the 待補 items of the solution. Every mention of a solution links to it. A solution code is never reused in an issue, so the links keep working (3.12, 5.8). (ETBlue, `human-inputs.md`, 2026-10-18) The URL is now `#/solutions/<n>-<code>` (decision 56); the old URL redirects.
19. A header link also looks active on the pages under its list page, for example 議題 on `#/issues/2/overview` and 利害關係人 on `#/stakeholders/I12`. One solution's page `#/issues/<n>/solutions/<code>` makes 解法 active, not 議題. `aria-current` is `page` on the list page and `true` on a page under it (3.7). (2026-10-19) The solution page is now under `#/solutions` (decision 56).
20. 資料根據 shows each issue's story cells by tag: the 我想要… and the 以便… cell of every story, in the fixed order 實證, AI整理, AI模擬, 待補. It is on the issue card (`#/issues`) and the 總覽 tab, as text with counts, the 實證 percent next to the counts, and a small stacked bar. It replaces the old field that counted only the 我想要… cell. Issues are never sorted, ranked or filtered by it, and the home page does not show it. One explanation line says it is the make-up of the data sources, not the importance or quality of the issue, and that organization stories are `[AI模擬]` until a real interview, so it never reaches 100%. One percent is not shown alone: it looks like a score and can mislead. For example #8 has 39 `[AI整理]` cells that no person has checked yet, so a single number would hide what is behind it (3.9). (ETBlue, 2026-10-19) **Partly replaced by decision 72 (Phase S):** the compact `IssueCard` on the home page and the space page now shows 資料根據 too (counts and bar, no totals, no percent). **Partly replaced by decision 81 (Phase L):** on `#/issues` the reader can pick the sort 資料根據比例.
21. Every list of 議題 and 解法 uses a shared card: `IssueCard` or `SolutionCard`. Each card has two variants, `detailed` (the list pages `#/issues` and `#/solutions`) and `compact` (the home page, the space page, the stakeholder page and the opinion check). `SolutionSummary` is removed (3.9). (ETBlue, `human-inputs.md`, 2026-10-19)
22. The header gets 需求 with a count, between 訴求 and 解法. A 需求 is the 以便… cell of one story: one per story, with no merging. It gets a list page `#/needs`, built like `#/wants`, with search and the 「只看有資料根據」 filter. On this page the filter looks at the 以便… cell only. 訴求 stays the opinion check pick list (3.7, 3.9). (ETBlue, `human-inputs.md`, 2026-10-19)
23. `[AI整理]` is yellow, not blue, so the three tags follow the color spectrum: 實證 green, AI整理 yellow, AI模擬 orange. The shades are darker (light theme `#765900`) or lighter (dark theme `#d4a300`) than Solarized yellow `#b58900`, to pass AA on the page backgrounds, also under the watermark. This also keeps the tag apart from the blue links. (ETBlue, 2026-10-19)
24. In the light theme, 實證 green is `#2e7000` (was `#5a6800`), so it is easy to tell apart from the AI整理 yellow in the badges and the 資料根據 bar. The contrast stays about the same. (ETBlue, 2026-10-19)
25. Each issue analysis has a 特別關注族群檢查 table in step 1 (`### 1.3`), so a 特別關注 group with no stakeholder is shown, not hidden. Only a person decides that a group does not apply: the AI writes a neutral 【待補】 question, never 「不相關」. The 總覽 tab shows all 6 groups with their stakeholders, stories and 資料根據 (3.2). The detailed issue card shows the groups not included yet, or 「都已納入」 (3.9). There is no count like 「4／6」 anywhere, because it reads like a score. Issues are never sorted, ranked or filtered by these numbers, and the groups are always in the fixed order, never by count. (ETBlue, 2026-10-19)
26. Every list of 議題 uses the card look, also the short lists. The compact `IssueCard` is a box like the compact `SolutionCard` (`rounded-md border p-3`, dashed for 製作中). The home block 「最近更新的議題」 stacks these cards with a gap instead of a line between items. The space page lists its issues with the compact `IssueCard` in a grid (1, 2 or 3 columns by width), not as plain links. Issue links inside a sentence or a field stay plain links, because they are references, not lists (3.6, 3.9). (ETBlue, 2026-10-19) **Extended by decision 72 (Phase S):** the compact card also shows 跨議題共用的利害關係人 and 資料根據.
27. The home block links to the list pages are named 「看全部」 and sit on the heading row, right aligned. Each keeps its full name (for example 「看全部議題」) as its `aria-label` (3.1). (ETBlue, 2026-10-19)
28. The theme button shows the theme it switches to (moon + 深色模式, or sun + 淺色模式), not a fixed 深色模式 with `aria-pressed`. With the fixed text, the only change was a filled moon and a gray background, so readers thought the button did not work (3.10). (ETBlue, 2026-10-19)
29. Each issue analysis has a 「分析摘要」 section near the top, after the intro notes and before 題目原文重點 (ETBlue, `human-inputs.md`). It has 5 topics in a fixed order: 難以取捨的決定, 可能的爭議, 受影響較大的弱勢族群, 法規上的障礙, 相依事項與現行政策的關係. Each item has a tag (mostly `[AI模擬]`, or a 【待補】 item) and lists where it comes from (相關編號). The summary adds no new facts. 受影響較大的弱勢族群 follows the 1.3 order and names the groups not included yet. The wording is neutral: each controversy gives the sides in the same way, and a current policy is described as 「與現行政策的關係」. The app showed the summary first on the 總覽 tab (3.2); since decision 102 each topic has its own tab. The topics are never sorted by the number of items. (ETBlue, 2026-10-19)
30. The header shows only the app name, 議題, 利害關係人 and 解法 with counts, and the theme button. 訴求 and 需求 are no longer in the header (ETBlue, `human-inputs.md`, information architecture). This replaces the header part of decisions 13 and 22 (3.7). (ETBlue, 2026-10-20)
31. The pages `#/wants` and `#/needs` are removed, with their routes, page files and list code (`src/lib/wants.ts`, `src/lib/needs.ts`). Their old URLs show the not-found page. The pick link helpers move to `src/lib/opinion.ts`. `wantCount` and `needCount` stay in `src/lib/counts.ts` for the planned 訴求 and 需求 tabs. This replaces decisions 14 and 22 (3.9). (ETBlue, `human-inputs.md`, 2026-10-20)
32. The footer has only three parts: a short text on what the app is (who made it, for 市政 debug 松, what it does), the disclaimer, and a link 「關於本站」. A new page `#/about` 關於本站 has the event page link, the GitHub link, the licenses, the data files and the author's related blog posts. These moved from the footer (3.8, 3.13). This replaces the footer part of decisions 13 and 16. (ETBlue, `human-inputs.md`, 2026-10-20)
33. Every list of 利害關係人 uses a shared card `StakeholderCard` with the variants `detailed` (`#/stakeholders` and the issue's 利害關係人 tab, with the story counts per issue) and `compact` (the home page, the solution page, the space page and the opinion check). The home block 「最近加入分析的族群」 is boxed like the other two blocks. The stakeholder tree keeps its structure, with the cards as its leaves. The compact card always shows the ID and the 特別關注 badges, so the space page and the opinion check now show them too (3.9). (ETBlue, `human-inputs.md`, 2026-10-20) **Partly replaced by decision 62 (Phase S):** `#/stakeholders` no longer shows the tree of detailed cards. The detailed card stays in the issue's 總覽 tab. **Extended by decision 92 (Phase L):** `#/stakeholders` shows a list of cards again, with the new `listFields`, not as a tree.
34. The issue page and the stakeholder page have the same four tabs: 總覽, 訴求 (with the count of wants and the count of conflicts), 需求 (with a count) and 解法 (with a count). The old issue tabs 你的意見, 利害關係人 and 衝突 are removed, and their old URLs redirect (3.2, 3.3). (ETBlue, `human-inputs.md`, 2026-10-20)
35. The stakeholder is the main entity. On the issue page and the stakeholder page, the full stakeholder list is a menu that filters the stories, wants and needs by stakeholder (3.14). (ETBlue, 2026-10-20)
36. The solution page has three tabs: 總覽, 需求 (covered and not covered count) and 利害關係人 (covered and not covered count) (3.12). (ETBlue, `human-inputs.md`, 2026-10-20)
37. A story, a want (訴求, 我想要…) and a need (需求, 以便…) each have their own URL, under the stakeholder: `#/stakeholders/<id>/stories/…`, `…/wants/…`, `…/needs/…` (3.15–3.17, 3.19). (ETBlue, `human-inputs.md`, 2026-10-20) Decision 45 replaces the want and need parts: only the story keeps its own URL.
38. 衝突 and the opinion check (意見健檢) are in the 訴求 tab, because conflicts happen between wants. The stakeholder list of an issue is in the 總覽 tab (3.2). (ETBlue, 2026-10-20)
39. Cross-issue solutions are shown in the app: on `#/solutions`, on their own page, and next to the issues and solutions they combine. The data comes from `analysis/cross-issue/` (3.18). (ETBlue, `human-inputs.md`, 2026-10-20) The draft URL `#/solutions/cross/<code>` is replaced by `#/solutions/X-A` (decision 56).
40. The pages `#/wants` and `#/needs` stay removed (decision 31). `wantCount` and `needCount` in `src/lib/counts.ts` are used for the 訴求 and 需求 tab labels (3.2). (ETBlue, 2026-10-20)
41. The app's test fixtures are refreshed from the new needs-based JSON before any page work. The tests that fail after the refresh are fixed first, and `summaryRefTo` links N group references (and W group references) in the 分析摘要 (3.2, `plan.md` Task N1). (ETBlue, 2026-10-20)
42. The app is renamed from 「提案小幫手」 to 「市政提案小幫手」. The name is in the header, the footer text and every page title. It must still fit in the header at 360 px wide (3.7). (ETBlue, `human-inputs.md`, 2026-10-20)

43. The 需求 count counts the rows of step 5.2 (`needs` in the issue JSON): each N group once, plus each story with no N group. #2 has 21. This is how 訴求 counts W groups, and it is the list the 需求 tab shows. `needCount` changes with it (2, 3.2). (Q1; ETBlue, 2026-10-20)
44. The 「衝突」 count in the 訴求 tab label is the number of conflicts (C1, C2…), because the tab lists them. On the stakeholder page it is the number of conflicts with one of its stories on a side (3.2, 3.3). (Q2; ETBlue, 2026-10-20)
45. Wants and needs have no page of their own. ETBlue removed them from the entities with unique URLs in `human-inputs.md` (now: issue; stakeholder → user story; solution). They show only inside the 訴求 and 需求 tabs of the issue page and the stakeholder page. The want key and the need key stay, for grouping, for the counts and for the stakeholder filter. The draft sections 3.16 (want page) and 3.17 (need page), their routes and `findWant` / `findNeed` / `wantView` / `needView` are removed. This replaces the want and need parts of decision 37 (3.16). (Q3; ETBlue, 2026-10-20)
46. The story URL keeps the issue number: `#/stakeholders/<id>/stories/<n>/<storyId>`, because story IDs are unique only inside one issue (3.15). (Q4; ETBlue, 2026-10-20)
47. The stakeholder menu has single choice, with links (`?stakeholder=I06`), so links can be shared and work with the back button. On the issue page it shows on 訴求, 需求 and 解法. On the stakeholder page it lists all active stakeholders and switches the page (3.14). (Q5; ETBlue, 2026-10-20)
48. The tab counts of the stakeholder page are summed over the issues, because they count items, not priorities. Inside each tab, the content is split by issue (3.3). (Q6; ETBlue, 2026-10-20)
49. The tab counts do not change when a filter is on. They are the totals. A status line says what the filter shows (3.2, 3.14). (Q7; ETBlue, 2026-10-20)
50. On the solution page, 「not covered」 means every other need of the issue, also 這次不做 needs, grouped by priority, each with the other solutions that cover it. A stakeholder is covered when at least one of its needs is covered (3.12). (Q8; ETBlue, 2026-10-20)
51. Cross-issue solutions are the first group on `#/solutions`. They are included in the header 解法 count, and in the home block 「最近分析出的解法」 because they have a date. Their URL is in decision 56 (3.18). (Q9; ETBlue, 2026-10-20) **The 「first group」 part is replaced by decision 89 (Phase L):** `#/solutions` is one flat list. The header count and the home block do not change.
52. Issues in the old format (`format: "stories"`, no `needs`): no issue uses it now. The app keeps the type, and the 需求 tab shows a short note 「本議題使用舊格式，沒有需求列表」 instead of a fallback (3.2). (Q10; ETBlue, 2026-10-20)
53. A link to a part of a tab uses `?focus=<value>`, because the hash router uses the `#`. The page scrolls to the part and moves keyboard focus to it (3.2). (Q11; ETBlue, 2026-10-20)
54. `#/solutions` shows the number of covered needs (「涵蓋 9 個需求」), not the number of covered stories, because step 6.2 now maps solutions to needs (3.9). (Q12; ETBlue, 2026-10-20)
55. Every story ID in the app links to its story page, like solutions (3.15). (Q13; ETBlue, 2026-10-20)
56. Solutions get their own path, because solutions and issues are many-to-many: a cross-issue solution combines several issues. An issue solution is `#/solutions/<n>-<code>` (for example `#/solutions/2-A`). A cross-issue solution uses the same format with its own code (for example `#/solutions/X-A`) and the same page shape. Tabs are `#/solutions/2-A/<tab>`. The old URLs `#/issues/<n>/solutions/<code>[/<tab>]` redirect to the new ones, with the tab and the query kept. The draft `#/solutions/cross/<code>` is not used. Solution pages are under the header link 解法, not 議題. This replaces the URL part of decisions 18, 19 and 39 (3.7, 3.12, 3.18, 3.19). (ETBlue, 2026-10-20)
57. A link to one want or one need goes to the issue's 訴求 or 需求 tab with `?focus=<key>` (for example `#/issues/2/wants?focus=W08`, `#/issues/2/needs?focus=N07`). A link to a stakeholder in a want or need list goes to that stakeholder's page on the same tab (`#/stakeholders/I06/wants`). This is the simplest rule: it uses the `?focus=` parameter that already exists, and needs no new page (3.16). (ETBlue, 2026-10-20)
58. On the issue page, the stakeholder menu is inside the content of the 訴求, 需求 and 解法 tabs, after the tab list. The keyboard order is: tabs, then the menu, then the content. The reason: the 總覽 tab has no menu, and a wrapper around the tabs would build the tabs again on each tab change, so the keyboard focus would be lost. On the stakeholder page the menu is on every tab, so it stays before the tabs (3.3, 3.14). (Coordinator, after the N4 review, 2026-10-20) **The stakeholder page part is replaced by decision 64 (Phase S):** the side bar is next to the whole main block (h1, metadata, tabs). **Decision 94 (Phase L) removes that side bar.** The issue page part is kept (decision 70).
59. On the stakeholder page's 解法 tab, the 「只看有資料根據」 filter hides a need with no data basis (`dataBasedNeeds`), and hides a solution that has no need left. A conflict link in a filtered list keeps `?stakeholder=` and `?evidence=1` (3.3, 3.14). (Coordinator, after the N4 review, 2026-10-20)
60. On a cross-issue solution page, an issue need is covered when it is in `needs.must` or `needs.shouldCould`, or in an X-N group listed in `needs.crossIssue`. A need of an issue that is not in `parts` is covered too when it is in such a group (for example #1 N15 for X-E, through X-N03), and the page loads that issue for it. 「Not covered」 means every other need of the issues in `parts`; an issue that is not in `parts` has no not covered need. A stakeholder is covered when at least one of its needs, in any of these issues, is covered (3.18). (ETBlue, 2026-10-20; the part about issues not in `parts` added after the Phase N review, 2026-10-20)

Phase S (2026-10-20). From ETBlue's notes in `human-inputs.md` (commits 487bac6 and 8c4bd4b). ETBlue answered Q14–Q19 on 2026-10-21: the recommended answers for Q14, Q15, Q16, Q18 and Q19, and the other choice for Q17 (decision 69).

61. The page column is at most 1440 px wide, not 1024 px. The header, the main block and the footer use it. Long text stays at most 48rem wide. The grids of `#/issues` and `#/solutions` get a third column from `xl`. The checks run at 1440 px and 1920 px too (3.22). (ETBlue, `human-inputs.md`, 2026-10-20)
62. `#/stakeholders` has the stakeholder side menu and, in the main block, statistics about the stakeholders. A click on a stakeholder opens its page. The tree of detailed `StakeholderCard`s is no longer on this page. This replaces the `#/stakeholders` part of 3.9 and of decision 33 (3.20). (ETBlue, `human-inputs.md`, 2026-10-20) **Replaced by decision 87 (Phase L).**
63. The statistics on `#/stakeholders` are plain counts in fixed orders: 總數, 依分類 (the first levels of 分類路徑, in tree order), 特別關注族群 (the fixed 6 groups) and 各議題 (issue number order). No percent, no bar, no chart, no rank, and nothing is sorted by a count. They follow the side bar filters. A note says the numbers only show how much the analysis wrote (3.20). (ETBlue, `human-inputs.md`, 2026-10-20; the content: Q18; ETBlue, 2026-10-21) **Replaced by decision 88 (Phase L; Q22, ETBlue, 2026-10-22):** the statistics are removed.
64. The stakeholder page has the side bar next to the main block. The main block has the h1, the metadata and the tabs. `#/stakeholders` and `#/stakeholders/<id>/…` share one layout route, so the side bar keeps its state when the reader picks another stakeholder. The story page is not in this layout. This replaces the stakeholder page part of decision 58 (3.3, 3.21). (ETBlue, `human-inputs.md`, 2026-10-20) **Replaced by decisions 87 and 94 (Phase L):** neither page has the side bar, and the layout route is removed.
65. The side menu is a tree: 組織 and 個人 as roots, then the levels of 分類路徑 with the names from `path-labels.csv`. Each group has a button to open and close it, and every group is open by default. A group shows the number of stakeholders under it. Levels with no stakeholder are left out. The order is the tree order and the ID order, never a count. This replaces the two flat lists of 3.14 (3.21). (ETBlue, `human-inputs.md`, 2026-10-20)
66. Each stakeholder in the side menu shows one count. The count depends on the page: it is the number of items the main block shows after a click on that item, with the same filters (stories on `#/stakeholders` and the 總覽 tab; wants, needs or solutions on those tabs; per issue on the issue page, summed over the issues on the stakeholder page). A 0 is shown. The menu is never sorted by the counts. This replaces 「The menu shows no counts」 in 3.14 (3.21). (ETBlue, `human-inputs.md`, 2026-10-20; the exact rule: Q16; ETBlue, 2026-10-21) **Phase L:** only the issue page contexts are left (decisions 87 and 94).
67. Every filter of a page with the side bar is in the side bar, above the tree: 只看有資料根據 (all side bar pages), 只看跨議題 and 特別關注 (`#/stakeholders` and the stakeholder page, where they change which stakeholders the menu lists). All are in the URL (`evidence=1`, `cross=1`, `special=<group>`) and every side bar link keeps them. The opinion check search box stays in the main block (3.21). (ETBlue, `human-inputs.md`, 2026-10-20) **Decision 75 replaces 「特別關注 … (`#/stakeholders` and the stakeholder page)」:** the 特別關注 chips are on the issue 訴求, 需求 and 解法 tabs too. 只看跨議題 stays only on the stakeholder pages. **Phase L:** the side bar filters of `#/stakeholders` move to the bar of 3.23 (decision 87). On the stakeholder page only 只看有資料根據 stays, in the filter row of the tab content; 只看跨議題 and 特別關注 are removed there (decision 94). The side bar filters stay on the issue tabs.
68. The filter status line and the 「清除篩選」 link are in the main block, not in the side bar: at the top of the tab content, or under the intro line on `#/stakeholders`. The line lists every filter that is on. 「清除篩選」 removes every side bar filter of the page. This replaces the status line part of 3.14 (3.21). (ETBlue, `human-inputs.md`, 2026-10-20) **Phase L:** on `#/stakeholders` the result line of 3.23.6 replaces it (decision 87).
69. From `lg` the side bar is a sticky left column, 16rem wide (18rem from `xl`), with a skip link 「跳過利害關係人選單」. Below `lg` the whole side bar (filters and tree) is one Collapsible above the main block, closed by default on every page, also on `#/stakeholders`. An open default on `#/stakeholders` can be added later if needed. The filter status line in the main block stays visible when it is closed (3.21). (Q17; ETBlue, 2026-10-21) **Phase L:** `#/stakeholders` and the stakeholder page have no side bar now (decisions 87 and 94). This rule now applies only to the issue tabs.
70. On the issue page, the side bar is only on the 訴求, 需求 and 解法 tabs, inside the tab content after the tab list, as in decision 58. The 總覽 tab has no side bar (3.2, 3.21). (Q14; ETBlue, 2026-10-21)
71. The solution pages and the story page have no side bar (3.21). (Q15; ETBlue, 2026-10-21)
72. The compact `IssueCard` (the home block 「最近更新的議題」 and the space page) shows two more fields: 跨議題共用的利害關係人 (the same text and link as the detailed card, only with 2 or more analyzed issues) and 資料根據 (`CellBasis` with `compact`: the counts and the bar, no totals and no 實證 percent). The 資料根據 explanation line is shown once per list. Issues are still never sorted by these numbers (**Phase L:** except the reader-picked sort on `#/issues`, decision 81). This replaces the part of decision 20 that kept 資料根據 off the home page, and extends decision 26 (3.1, 3.6, 3.9). (ETBlue, `human-inputs.md`, 2026-10-20; 「cross-issue info」 means the shared stakeholders: Q19; ETBlue, 2026-10-21)
73. `AllStakeholders` is no longer used on `#/stakeholders`. `StakeholderList` (the tree of detailed cards with its own filters) stays for the 「利害關係人」 section of the issue's 總覽 tab. Unused code is removed in Phase S (3.9, 3.20). (Coordinator, 2026-10-20)
74. On the issue page's 解法 tab, with a stakeholder picked and 「只看有資料根據」 on, a solution is listed only when at least one of that stakeholder's needs in it is still shown under the filter. When the filter hides all of them, the solution is not listed and the side menu does not count it for that stakeholder. So the menu count changes with the filter (decision 66), and the issue page and the stakeholder page use the same rule (decision 59). Before, the solution stayed with the note that its needs were hidden. With no stakeholder picked, the filter still hides no solution (3.2, 3.21). (ETBlue, 2026-10-21) **Decision 77 replaces the last sentence:** with no stakeholder picked, the filter now hides a solution whose needs are all hidden.
75. The issue page's 訴求, 需求 and 解法 tabs have the 特別關注 chips in the side bar, below 「只看有資料根據」. Only the groups that at least one stakeholder of the issue has are shown, in `FOCUS_ORDER`. A chip is in the URL as `special=<group>`, and tab changes, side bar links and other filter links keep it. The chips limit the menu to the stakeholders with a picked group (the picked stakeholder always stays), and they filter the tab content: the wants, needs and solutions of those stakeholders, and the conflicts with a story of them on either side (the same rule as `?stakeholder=`, decision 59). They work together with 只看有資料根據, and `?stakeholder=` applies on top. The menu counts use the same filters (decision 66). The tab labels stay the totals (decision 49). The filter status line names the chips, and 「清除篩選」 removes them. 只看跨議題 is still not on the issue page. On a stakeholder page the content is about one stakeholder, so 只看跨議題 and 特別關注 still change only the menu there. This replaces the part of decision 67 that put 特別關注 only on the stakeholder pages, and the 「No」 for the issue page in the filters table of 3.21 (3.2, 3.21). (ETBlue, 2026-10-21)
76. The side menu on `#/stakeholders` and on a stakeholder page has 「全部利害關係人」 as its first item, as on the issue page. It has no count. It links to `#/stakeholders` and keeps `evidence`, `cross` and `special`. On `#/stakeholders` it is the current item (`aria-current="page"`). This replaces 「No item is current on this page」 in 3.20 and extends 3.21, where only the issue page had this item (3.20, 3.21). (ETBlue, 2026-10-21) **Replaced by decisions 87 and 94 (Phase L):** neither page has a side bar now. 「全部利害關係人」 stays only on the issue page's side bar.
77. On the issue page's 解法 tab with no stakeholder picked, 「只看有資料根據」 hides a solution when it hides every need the solution covers. A solution that lists no need at all stays. The note 「這個解法涵蓋的需求，都沒有標記 [實證] 或 [AI整理]。」 is removed. When no solution is left, the tab says 「沒有解法涵蓋標記 [實證] 或 [AI整理] 的需求。」. The tab label stays the total (decision 49). This extends decision 74 to the case with no stakeholder picked (3.2). (ETBlue, 2026-10-21)
78. A stakeholder with no issue (its 議題 in `stakeholders.csv` is empty) and no move target is left out of every list. This means the side menus, the statistics on `#/stakeholders`, the stakeholder count in the header, 「最近加入的利害關係人」 on the home page, the stakeholder tree, and the 特別關注 options. It is not a moved ID, so it does not redirect. Its own page `#/stakeholders/<ID>` still loads. The page shows the name, the ID, the path and the note 「這位利害關係人目前沒有出現在任何議題中。」. It has no tabs. The side menu on that page is the same as on `#/stakeholders`, with no current item. One helper, `isListed` in `src/lib/stakeholders.ts`, holds this rule, and every list uses it. The first case is I34 本專案作者, which left #9 on 2026-10-21 (3.1, 3.3, 3.7, 3.20). (ETBlue's analysis change, 2026-10-21) **Phase L:** the page of such a stakeholder has no side menu now (decision 94). The statistics are removed (decision 88).

Phase L (2026-10-22). From ETBlue's notes in `human-inputs.md` (commits ef77fec, a325fcb and e879ba7) and ETBlue's decisions of 2026-10-22. ETBlue answered Q20–Q24 on 2026-10-22. A detail still marked *(proposal)* is the coordinator's choice; ETBlue can change it in review.

79. The list pages `#/issues`, `#/stakeholders` and `#/solutions` show no visible page title. The highlighted header link is the visible title. The h1 stays in the page but is visually hidden (`sr-only`), so screen readers still get it. Under the header: the sort and filter bar, the result line, the notes, then one list of cards. The old intro lines are removed *(proposal)* (3.23.1). (ETBlue, `human-inputs.md` and decision 4, 2026-10-22)
80. One bar component `ListBar` on the three list pages. From `md`: one row with the sort `<select>`, popover buttons for the multi-choice filters, the stakeholder picker and toggle buttons. Below `md`: the sort `<select>` and one 「篩選」 button that opens a bottom sheet (a dialog with a focus trap) with all filters. A change applies at once. No sideways scroll at 360 px (3.23.2). (Coordinator, 2026-10-22)
81. Count-based sorts are allowed as option A: the reader picks them, the default stays by date, the label only describes the data (for example 「資料根據比例」; it was 「依資料根據比例（實證＋AI整理）」 before decision 100), and a short note under the bar says the order is not about importance. No scores, weights or formulas beyond the plain share. While such a sort is on, the cards show the percent next to its counts, never alone. This replaces the never-sort-by-count rules **only** for these reader-picked sorts on these three list pages: 3.9 (「Issues are never sorted, ranked or filtered by these numbers」, 「The list keeps issue number order」, the old `#/stakeholders` 「Order」 row, 「Never sorted by a count」 on `#/solutions`), the 「never sorted」 part of decision 20 for `#/issues`, and the last sentence of decision 72 for `#/issues`. Every other place keeps the old rule: the home blocks, the side menu, the tabs, the priority groups and counts (3.4), the solution page, the space page, the focus groups (decision 25) and the stakeholder tree on the issue's 總覽 tab (3.23.3). (ETBlue, decision 1, 2026-10-22)
82. Sort options: 最近更新 (the default, no `sort` param), 最近新增 (`added`), 資料根據比例 (`evidence`), and on `#/stakeholders` also 解法涵蓋比例 (`solutions`). The short labels are from decision 100. There is no 依編號 sort (Q24; ETBlue, 2026-10-22). The fixed ID order still breaks the share ties, orders the items with no value, and is used where a sort does not apply (for example the tree view). An old link with `sort=id` is handled like any unknown value: dropped with `replace`. Dates are newest first, shares highest first. Date ties: ID highest first, the same as the home blocks. Share ties: the fixed ID order. An item with no date, or with 0 cells or 0 needs, is last, in the fixed ID order. Shares are compared exactly, not by the rounded percent (3.23.3). (ETBlue, decisions 1 and 2, 2026-10-22; the details: coordinator)
83. Evidence coverage (資料根據比例) is the share of story cells (我想要… and 以便…) tagged `[實證]` or `[AI整理]`, the same unit as the 資料根據 bar. Issue: all its story cells (`counts.cells`). Stakeholder: all its story cells, in every analyzed issue. Solution (Q23 (a)): the cells of the stories of the needs it covers (decision 60 for cross-issue solutions), each story once. A filter does not change the share *(proposal)* (3.23.4). (ETBlue, decision 2, 2026-10-22; Q23 (a), ETBlue, 2026-10-22)
84. Solution coverage (解法涵蓋比例) of a stakeholder is the share of its needs (its need keys per issue, summed, as its 需求 tab label) that at least one issue solution or cross-issue solution covers. 這次不做 needs are in the total, as on the solution page (decision 50). A stakeholder with 0 needs has no share (3.23.4). (ETBlue, decision 2, 2026-10-22; Q23 (b), ETBlue, 2026-10-22)
85. Filters: `#/issues` 空間類型 (`space`) and 利害關係人 (`who`); `#/stakeholders` 議題 (`issue`) and 只看特別關注族群 (`specialonly=1`); `#/solutions` 議題, 空間類型 and 利害關係人. The 議題 filter has one more choice 「跨議題」 (`issue=X`): on `#/stakeholders` the stakeholders in 2 or more issues (the old `cross=1`), on `#/solutions` the cross-issue solutions (ETBlue, 2026-10-22). Inside one filter: ANY of the picked values. Between filters: ALL. Every sort and filter is in the URL, with a new history entry per change (the search has its own rule, decision 97). The URL params are `sort`, `issue`, `space`, `who`, `specialonly`, `view` and `q` (decision 97). Unknown values are dropped with `replace`, also the old `sort=id` (decision 82). 「清除篩選」 keeps the sort and the view, and removes the search. The new param names do not reuse `stakeholder`, `evidence`, `cross`, `special`, `focus`, `pick` or `from`. This replaces 「The filters of `#/issues` and `#/solutions` do not change」 in 3.21 and the page-state filters of 3.9 (3.23.5). (ETBlue, `human-inputs.md`, 2026-10-22)
86. The 利害關係人 filter is a search box with a list (the ARIA combobox pattern), grouped by 組織 and 個人 in ID order, plus a 「瀏覽」 button that opens a dialog with the full stakeholder tree (`sideMenuTree`, the side menu look, a shared `StakeholderTree` component). The dialog traps focus, closes with Escape, and returns focus to the button. A pick is a link with `who=<id>` (3.23.7). (ETBlue, decision 6, 2026-10-22)
87. `#/stakeholders` has no side bar. It is an extended view of the home block 「最近加入分析的族群」: the bar and a list of `StakeholderCard`s, with 分類路徑, the issues, 資料根據, 解法涵蓋 and both dates, or the tree view (decision 93). This replaces decision 62, the `#/stakeholders` part of decisions 64, 67, 68, 69 and 76, the `#/stakeholders` row of 3.21, and section 3.20. The stakeholder page loses its side bar too (decision 94) (3.23.10). (ETBlue, decision 3, 2026-10-22)
88. The statistics of `#/stakeholders` (decision 63) are removed, with `stakeholderStats`, its test and the `stakeholderStats` UI block. The result line, the 議題 filter, the 特別關注 toggle and the cards cover the useful parts. This replaces decision 63 (3.23.10). (Coordinator, 2026-10-22; Q22, ETBlue, 2026-10-22)
89. `#/solutions` is one flat list of issue solutions and cross-issue solutions, sorted by the picked sort. There are no groups by issue. A cross-issue card has the badge 「跨議題解法」. A cross-issue solution matches the 議題 filter when the issue is in its `parts` or is the issue of a need it covers *(proposal)*, and it matches the 利害關係人 filter when it covers one of the stakeholder's needs in any issue. This replaces the 「first group」 part of decision 51 and the `#/solutions` row of the table 「Where else they show」 in 3.18. In the fixed ID order (used for ties and for items with no value) the cross-issue solutions still come first (3.23.5, 3.23.9). (ETBlue, `human-inputs.md`, 2026-10-22)
90. Dates (way C of 3.23.8): issues get 新增日期 (a hand-kept column in `issues.csv`, `added` in `index.json`). Stakeholders, solutions and cross-issue solutions get 更新日期 (`updated`), kept by a new script `update_dates.py` in `analysis/data/updated-dates.csv` with a content fingerprint, so `check_analysis.py` fails when a change was not dated. 「Updated」 means the item's own content changed, not only its format. The issue 更新日期 stays the git date. The rule text for `method.md` is in 3.23.8. (ETBlue, decision 5, 2026-10-22; the method: coordinator; way C: Q21, ETBlue, 2026-10-22)
91. The home 「看全部」 links go to the list with the same sort as the block: `#/issues`, `#/stakeholders?sort=added` and `#/solutions?sort=added`. The old links keep working: `#/stakeholders?special=<group>` redirects to `?specialonly=1`, and `#/stakeholders?cross=1` redirects to `?issue=X`. The 跨議題共用的利害關係人 link on the issue cards becomes `#/stakeholders?issue=X` (3.23.5, 3.23.12). (Coordinator, 2026-10-22)
92. On the list pages, each card shows the data the sorts use: both dates, and 資料根據 (the issue card as today; the stakeholder card over all its stories; the solution card over the stories of the needs it covers). The stakeholder card also shows 解法涵蓋 as counts (「需求 5 個：有解法涵蓋 3 個、尚未涵蓋 2 個」). The `detailed` `StakeholderCard` gets a prop `listFields`; the story counts by priority (`entries`) stay only on the issue's 總覽 tab. This extends decision 33 (3.23.9). (Coordinator, 2026-10-22)
93. `#/stakeholders` has a view switch 「卡片」 / 「樹狀」 (`view=tree`; cards by default). The tree view is the side menu tree (`sideMenuTree`, shared `StakeholderTree` component) with 組織 and 個人 in two columns from `md`. The filters work in both views. In tree view the sort does not apply, because the tree has its own fixed order. No counts next to the stakeholders in the tree view *(proposal)* (3.23.11). (ETBlue, `human-inputs.md` commit a325fcb, 2026-10-22)
94. The stakeholder page `#/stakeholders/<id>` has no side bar either. The side bar stays only on the issue page's 訴求, 需求 and 解法 tabs. The stakeholder page gets a breadcrumb back to `#/stakeholders` (首頁 › 利害關係人 › I06 身心障礙者（視障、輪椅使用者）, decision 99; ETBlue, 2026-10-22: the ID plus the name) and a filter row at the top of the tab content with 「只看有資料根據」 and `FilterStatus`. 只看跨議題 and 特別關注 are removed from this page, because they only filtered the menu. `StakeholdersLayout` and the stakeholder contexts of `sideMenuCounts` are removed. This replaces decision 64, the stakeholder page part of decisions 58, 66, 67, 69 and 76, the side menu part of decision 78, and the stakeholder page row of 3.21 (3.3, 3.23.10). (Q20; ETBlue, 2026-10-22: "there's no need jumping quickly between stakeholders")

Phase L, search and breadcrumb (2026-10-22). From ETBlue's notes in `human-inputs.md` (commit e879ba7) and ETBlue's rules S1–S6 for the search (2026-10-22).

95. The three list pages `#/issues`, `#/stakeholders` and `#/solutions` have a search box. An item matches when its number or its title matches. Number: the issue number (`8`, `#8`), the stakeholder ID (`I06`, `i6`, `O12`) or the solution code (`A` for every solution A and X-A, `X-A`, `2-A`, `#2 A`). The whole number or code must match. Title: any part of the issue title, the stakeholder name or the solution name. Case does not matter, full-width letters and digits count as half-width (NFKC), and for the number spaces, 「#」 and 「-」 are ignored. Only the number and the title are searched. The logic is in a new file `src/lib/listSearch.ts` (`parseListQuery`, `issueMatches`, `stakeholderMatches`, `solutionMatches`), with tests first. The URL function of `listParams.ts` is renamed from `listSearch` to `listUrlSearch`, so the names do not mix (3.23.5, 3.23.13). (ETBlue, `human-inputs.md` and S1, S2, 2026-10-22; the details: coordinator)
96. An item must match the search AND every filter. The results keep the sort the reader picked; there is no best-match order, because it would need a score. In the tree view of `#/stakeholders` the tree shows the matching stakeholders and the groups above them, with every shown group open. On `#/issues` and `#/solutions` the search box does not replace the 利害關係人 filter (`who`): the search looks only at the issue or solution itself (3.23.13). (ETBlue, S3, S4, S6, 2026-10-22)
97. The search is in the URL as `q=<text>` (trimmed, at most 100 characters; empty means no `q`). The URL is updated 300 ms after the last key press, or at once on Enter. The first update after the box gets focus adds a history entry; later updates until the box loses focus use `replace`, so one search is one step back. 「清除篩選」 removes `q` too, because the result line lists the search with the filters. The clear button 「清除搜尋」 in the box removes only `q` (3.23.13). (ETBlue, S5, 2026-10-22; the typing rule and 「清除篩選」: coordinator)
98. The search box is the first control of the bar from `md` (16rem wide), and its own full-width row above the 「排序」 row on a phone. It is not in the phone 「篩選」 sheet and does not count in 「篩選（N）」. It is a `role="search"` landmark with a visible label 「搜尋」 (full label 「搜尋議題」, 「搜尋利害關係人」, 「搜尋解法」), placeholders 「輸入編號或標題」, 「輸入編號或名稱」, 「輸入代號或名稱」, and a clear button 「清除搜尋」. The result line (`role="status"`) names the search first (「篩選：搜尋「無菸」；…」) and gives the new count. The empty state is 「找不到符合「…」的議題。」 (or 利害關係人, 解法), with 「和目前篩選」 when filters are on too. The bar's name becomes 「搜尋、排序與篩選」. The strings are in a new block `listSearch` in `src/i18n/zh-TW.ts` (3.23.2, 3.23.6, 3.23.13). (Coordinator, 2026-10-22)
99. The issue page `#/issues/<n>` has a breadcrumb above the h1 on every tab: 首頁 › 議題 › #8 無菸城市. 議題 links to `#/issues`. The last item has `aria-current="page"`. One rule for every breadcrumb: an item that names an issue, a stakeholder or a solution shows the ID and the name. An item with no name keeps its ID only. A story has no title, so the story item is 「#2 I06-US01」. A new shared component `Breadcrumb` (`src/components/Breadcrumb.tsx`, `<nav aria-label="頁面位置">` with an `<ol>`) replaces the markup that `Solution.tsx` and `StakeholderStory.tsx` write today. The issue page, the solution pages (首頁 › 解法 › #2 A 清潔箱佈建建議地圖, 首頁 › 解法 › X-A 同一段人行道的共同參與式選址), the story page and the stakeholder page (decision 94, 首頁 › 利害關係人 › I06 身心障礙者（視障、輪椅使用者）) use it. Long names wrap. A 360 px screen has no sideways scroll (3.2, 3.23.10). (ETBlue, `human-inputs.md` commit e879ba7, 2026-10-22; the ID plus the name: ETBlue, 2026-10-22; the other details: coordinator)
100. Three small fixes after the L9 check. (1) The sort labels are short, so they fit in the `<select>` on a 360 px phone: 最近更新, 最近新增, 資料根據比例, 解法涵蓋比例 (before: 「依資料根據比例（實證＋AI整理）」 and 「依解法涵蓋比例」). The sort note still names [實證] and [AI整理], so no information is lost. (2) The 資料根據 line (`t.basis.listNote`) names the items of the page: 議題 on `#/issues`, the home page and the space page, 利害關係人 on `#/stakeholders`, 解法 on `#/solutions`. `#/solutions` now shows this line too, with 資料根據比例, as part of the sort note (as on `#/stakeholders`). (3) The old `?evidence=1` is dropped with `replace` on `#/issues` and `#/solutions` too, as on `#/stakeholders` (`legacyListRedirect`). This changes the labels of decisions 81 and 82, and 3.23.1, 3.23.3, 3.23.5 and 3.23.9. (ETBlue, 2026-10-22)
101. A cell of a step 7 solution table (the 7 rows of each `### 7.n 解法 X：…` table) may hold more than one tag. Each part starts with its own tag and has text after it, for example 「`[實證]` 官方資料顯示… `[AI模擬]` 推想…」. All other cells keep one tag, and 資料根據 does not change. In the issue JSON, `DetailRow.content` is a list of parts (`Cell[]`, one Cell per tag, in file order); a cell with one tag is a list of one Cell. The solution page shows the parts with a new component `CellParts`: each part has its own tag badge, the same as `CellText` for a cell with one tag. At first the 「只看有資料根據」 filter did not change the step 7 tables. **Decision 105 changes this:** with the filter on, a mixed cell shows only its `[實證]` and `[AI整理]` parts. Cross-issue `detail` stays one Cell per field. (ETBlue, 2026-10-22)
102. The five topics of the 分析摘要 move from the 總覽 tab of the issue page to five tabs of their own, after 解法. The tab names are short (ETBlue, 2026-10-22): 難以取捨 (`decisions`, the topic 難以取捨的決定), 可能爭議 (`controversies`, 可能的爭議), 影響到弱勢 (`disadvantaged`, 受影響較大的弱勢族群), 法規障礙 (`legal`, 法規上的障礙) and 相關解法與政策 (`dependencies`, 相依事項與現行政策的關係). The page title uses the short name; the hidden h2 of the tab keeps the full topic name. 總覽 keeps everything else. Each tab label has a count: the rows of the topic. On 受影響較大的弱勢族群 a 【待補】 row is shown but not counted. Each tab has its own URL, page title and the same breadcrumb. An unknown tab shows 「找不到這個分頁。」 as before. The new tabs have no side bar. The 「只看有資料根據」 filter works as on 總覽 before: no row is hidden, and the reference links keep `?evidence=1`. **Changed by decision 108:** the filter now hides rows, and the tabs have the toggle. Below `md` the issue tab list is one row that scrolls sideways; the page does not. This row is as wide as the screen (edge to edge; the first tab still lines up with the page content), its labels are one line each, it never scrolls up and down, and its scrollbar is hidden (`PHONE_SCROLL_CLASS` in `PageTabs`; ETBlue, 2026-10-22). The solution page uses the same row (decision 103). This replaces 「On a phone the tab list wraps onto two rows」 for the issue page only. The cross-issue file also has a 分析摘要, but no page shows it, so nothing changes there. The stakeholder page does not change (3.2, 3.19). (ETBlue, 2026-10-22)
103. The solution page has seven tabs, in this order: 總覽, 需求, 訴求 (`wants`), 利害關係人, 衝突 (`conflicts`), 成效衡量 (`measures`) and 相關政策 (`policies`). Labels: 「訴求　涵蓋 N・未涵蓋 M」, 「衝突　解開 N・相關 M」, 「成效衡量 N」 and 「相關政策　國內 N・國外 M」. A want (the 我想要… cell of one story) is covered when the solution covers the need of its story. 涵蓋的相同訴求群組 moves from 總覽 to 訴求. 解開的衝突 and 相關的衝突 move to 衝突. 成效衡量 moves to its own tab. 總覽 keeps the rest (step 7, 題目或研究中的構想, 跨議題解法, 待補, 更多). 相關政策 shows `practices` (decision 104) in two groups, 國內 and 國外, with the place, the name, the content with its tag, 本文件怎麼用, and where the item comes from; a dependency row links to the issue's 相依與現行政策 tab. Each tab has its own URL, page title and the same breadcrumb; an unknown tab shows 「找不到這個分頁。」. Below `md` the tab list scrolls sideways, as on the issue page (decision 102). The 「只看有資料根據」 filter works on 訴求 (it looks at the 我想要… cell) and on the sides of 解開的衝突, as on the 需求 tab and on 總覽 before. It does not change 成效衡量, 相關的衝突, 涵蓋的相同訴求群組 or 相關政策, because it did not change them before (and the issue's 相依與現行政策 tab is not filtered either). A cross-issue solution has the same seven tabs: its wants are the stories of its covered and not covered needs, its 相關的衝突 are the other cross-issue conflicts with a covered story, and its 相關政策 has only dependency rows, with no link (no page shows the cross-issue 分析摘要). Its 訴求 tab has no 涵蓋的相同訴求群組, because the cross-issue file has no W groups (3.12, 3.18, 3.19). (ETBlue, 2026-10-22; the labels of 成效衡量, the cross-issue tabs and the filter rule for the new tabs: coordinator)
104. The solution page gets a tab 「相關或類似的政策與做法」 with the counts 「國內 N・國外 M」 (ETBlue, 2026-10-22; another change builds the tab). The data is `Solution.practices` and `CrossSolution.practices` (section 6). It has two kinds of rows. (1) `source: "practice"`: a row of a 6.1 practice table (做法 | 內容 | 本文件怎麼用) whose 本文件怎麼用 cell names the solution: 「解法 A」, 「解法 C、D」 or a step 7 section 「7.1」. (2) `source: "dependency"`: a row of the 分析摘要 topic 相依事項與現行政策的關係 whose 相關編號 names the solution (「解法 A」; 「#8 解法 B」 does not count). Each 做法 cell starts with its place and 「：」: the country, and the city if any (「美國紐約：」, 「英國：」, 「臺灣臺北市：」). A place that starts with 「臺灣」 is domestic (國內); any other place is foreign (國外). Every dependency row is domestic (ETBlue's decision). N is the number of items with `domestic: true`, M the number with `domestic: false`. A cross-issue solution has only dependency rows, because the cross-issue file has no practice table. `check_analysis.py` checks the place and that each practice row names at least one solution of its issue.
105. The 「只看有資料根據」 filter now changes the step 7 tables on the solution page (資源、法規、隱私與風險). With the filter on, a cell shows only its `[實證]` and `[AI整理]` parts and hides its `[AI模擬]` parts (`dataBasedParts`, `CellParts` with `dataBasedOnly`). A 【待補】 part has no tag and stays, because it says what is still missing. When every part of a cell is hidden, the cell shows 「這一格只有標記 [AI模擬] 的內容。」 in gray. The rule covers the step 7 總覽 row (成本, 可行性, 主要風險, 主責單位) and the step 7 rows, and the cells of 主責單位、法規、隱私與風險 of a cross-issue solution (one part per cell). The step 7 section has its own 「只看有資料根據」 toggle, because 總覽 has no other toggle after decision 103. The filter is in the URL (`?evidence=1`), and a tab change keeps it. This replaces the last sentences of decision 101 (3.12, 3.18). (ETBlue, 2026-10-22; the 【待補】 part and the cross-issue cells: coordinator)
106. The search, sort and filter bar (`ListBar`) is a full-width band that touches the header, on all three list pages. Its controls use the page column (`containerClass`), so they line up with the header content. `#/solutions` loses its rounded box and looks the same as `#/issues` and `#/stakeholders`. How: the three list routes get `handle.fullWidth`, as the home page does, so `<main>` has no column and no padding. `ListBar` puts its controls in `containerClass`, and each page puts the content under the bar in `listBodyClass` (`containerClass` plus `pb-6`). The skip link still moves focus to `<main>`, and the next Tab goes to the search box. This changes 3.23.1 and 3.23.2. (ETBlue, 2026-10-22)
107. The stakeholder cards on the home page (最近加入分析的族群) show 資料根據, as the issue cards there already do (decision 72). It is the compact `CellBasis`: the counts and the small bar, with no 實證 share, because the home page never ranks by a count (decision 81). The cells are those of all the stakeholder's stories in every analyzed issue (`stakeholderCells`, the same as on `#/stakeholders`). The home page already loads the issue files for the solutions block (`useIssues`). While they load, or when they fail, the card has an invisible row of the same height in place of 資料根據, so the card does not grow when the data comes. The 資料根據 explanation (`t.basis.listNote('利害關係人')`) is shown once, under the stakeholder list, as the issue block does with 議題. This changes 3.1. (ETBlue, 2026-10-22)
108. 「只看有資料根據」 on the five 分析摘要 tabs of the issue page (this changes decision 102). With the filter on, a tab hides the rows whose 說明 is tagged `[AI模擬]` and shows the rows tagged `[實證]` or `[AI整理]` (ETBlue, 2026-10-22). A 【待補】 row has no tag, so it is hidden too. This is the same rule as the other filtered lists of the issue page: they keep only items with a `[實證]` or `[AI整理]` tag (`hasDataBasis`), so an item with no tag is hidden. The tabs have no side bar, so the toggle (`DataBasisToggle`, the same label, hint and URL value `?evidence=1`) is above the rows, under the intro line. While the filter is on, the filter status line of the side bar tabs (`FilterStatus`) is under the toggle: 「篩選：只看有資料根據。顯示 N 項。」 and 「清除篩選」. When the filter hides every row, the tab says 「這裡沒有說明標記 [實證] 或 [AI整理] 的項目。」 (in the style of the 需求 tab's message). The tab counts do not change when the filter is on: they are the totals, as on the 訴求, 需求 and 解法 tabs (decision 49). The reference links still keep `?evidence=1`. Today #1 and #2 have no `[實證]` or `[AI整理]` row in their 分析摘要, so with the filter on every topic tab of these issues shows the empty message. (3.2)

## 14. Open questions

No open questions now. ETBlue answered Q21–Q24 on 2026-10-22 (below). The plan (Phase L) has no GATE left.

Answered questions. ETBlue answered Q1–Q13 on 2026-10-20, Q14–Q19 on 2026-10-21, and Q20–Q24 on 2026-10-22:

| Question | Decision |
|---|---|
| Q1 What the 需求 count counts | 43 |
| Q2 What the 衝突 count counts | 44 |
| Q3 One want or one need of a stakeholder | 45 (no want page and no need page) |
| Q4 URL of story, want and need pages | 46 (only the story page is kept) |
| Q5 Single or multiple choice in the stakeholder menu | 47 |
| Q6 Stakeholder tab counts per issue or summed | 48 |
| Q7 Tab counts with a filter on | 49 |
| Q8 「Not covered」 on the solution page | 50 |
| Q9 Cross-issue solutions: place, URL, counts | 51 and 56 |
| Q10 Issues in the old format | 52 |
| Q11 Links to a part of a tab | 53 |
| Q12 The number on `#/solutions` | 54 |
| Q13 Story IDs as links | 55 |
| Q14 Side bar on every tab of the issue page | 70 (only on 訴求, 需求 and 解法; no side bar on 總覽) |
| Q15 Side bar on the solution pages | 71 (no side bar) |
| Q16 Menu counts follow 「只看有資料根據」 | 66 (yes) |
| Q17 Side bar of `#/stakeholders` open by default on a phone | 69 (no, for now: closed by default on every page) |
| Q18 What the stakeholder statistics show | 63 (plain counts, no chart; removed in Phase L by decision 88) |
| Q19 Cross-issue info on the compact issue card | 72 (the shared stakeholders) |
| Q20 Does the stakeholder page keep its side bar | 94 (no; ETBlue, 2026-10-22) |
| Q24 (a) The meaning of 「filter by issue (including cross-issue)」 | 85 (a 「跨議題」 choice in the 議題 filter; ETBlue, 2026-10-22) |
| Q21 How to add the missing dates | 90 (way C: 新增日期 by hand in `issues.csv`; 更新日期 by `update_dates.py` in `analysis/data/updated-dates.csv` with a content fingerprint; `check_analysis.py` fails on an undated change; the rule text in `method.md`) |
| Q22 The statistics of `#/stakeholders` | 88 (removed; this replaces decision 63) |
| Q23 (a) The 資料根據 of a solution | 83 (yes: both cells of each story of the covered needs, each story once) |
| Q23 (b) 這次不做 needs in a stakeholder's 解法涵蓋 | 84 (yes: they are in the total) |
| Q24 (b) A 依編號 sort | 82 (no 依編號 sort; the fixed ID order still breaks ties and is used where no sort applies; an old `sort=id` is dropped with `replace`) |
