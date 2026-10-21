# Design: policy issue browser

Status: approved by ETBlue (2026-10-18). Updated 2026-10-20 for the needs-based pages: sections 3.2, 3.3, 3.12 and the new sections 3.14–3.19, decisions 34–42. Updated again 2026-10-20 with ETBlue's answers to the open questions: decisions 43–57 (no want page and no need page; solutions get their own path `#/solutions/<n>-<code>`). Section 14 has no open questions now. Updated 2026-10-21 again with ETBlue's notes: the 特別關注 chips on the issue page (decision 75), the 「全部利害關係人」 item on the stakeholder pages (decision 76) and the data filter on the 解法 tab with no stakeholder picked (decision 77).
Updated 2026-10-20 (Phase S) with ETBlue's new notes in `human-inputs.md` (commits 487bac6 and 8c4bd4b): the stakeholder side menu, the new `#/stakeholders` page, the stakeholder page layout, wide screens up to 1440 px and the compact issue card. New sections 3.20–3.22, decisions 61–73. Updated 2026-10-21 with ETBlue's answers to Q14–Q19: Q17 changed decision 69 (on a phone the side bar is closed by default on every page). Section 14 has no open questions now. Updated 2026-10-21 again with ETBlue's notes: the 特別關注 chips on the issue page (decision 75), the 「全部利害關係人」 item on the stakeholder pages (decision 76) and the data filter on the 解法 tab with no stakeholder picked (decision 77).
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
| 最近更新的議題 | A compact `IssueCard`: 「#8 無菸城市」 (link to the issue), 跨議題共用的利害關係人, 資料根據 (counts and bar), 更新日期, the space types (links to the space pages). Since Phase S (decision 72); before, only the title, the date and the space types. The 資料根據 explanation line (3.9) is shown once, under the block's list. |
| 最近加入分析的族群 | The name (link to the stakeholder page), the ID, the 特別關注 badges, the issues it appears in (links), 加入日期 |
| 最近分析出的解法 | 「#8 E」 and the name with its tag (the code and name are a link to the solution page, 3.12), the one-line summary, 新增日期 |

Sort rule for all three blocks: by date, newest first. Items with the same date are sorted by ID, highest first (issue number; stakeholder ID, the reverse of the usual ID order, so I comes before O and I28 before I27; for solutions the issue number, then the solution letter). **Never sorted by a count.** An item without a date (for example an issue with no git history) goes last. The sort functions are `recentIssues`, `recentStakeholders` and `recentSolutions` in `src/lib/recent.ts`.

Old links to the stakeholder filter on the home page (`#/?cross=1`, shared on Discord) go to `#/stakeholders?cross=1`.

### 3.2 Issue page

URL: `#/issues/<n>` (the 總覽 tab) and `#/issues/<n>/<tab>`. The issue page has four tabs, in this order. 總覽 opens first. (ETBlue, 2026-10-20, decisions 34 and 38.)

| Tab | URL | Tab label (example #2) |
|---|---|---|
| 總覽 | `#/issues/2` | 總覽 |
| 訴求 | `#/issues/2/wants` | 訴求 39・衝突 9 |
| 需求 | `#/issues/2/needs` | 需求 21 |
| 解法 | `#/issues/2/solutions` | 解法 5 |

Rules for the tab labels:
- The counts come from `issueTabCounts` in `src/lib/tabCounts.ts`. 訴求 is `wantCount` (the opinion check pick items, 4.1). 衝突 is the number of conflicts (C1, C2…). 需求 is `needCount` (the rows of step 5.2, `needs` in the issue JSON; decision 43). 解法 is the number of solutions.
- A count is a plain number, also in the accessible name (「訴求 39・衝突 9」). It is not a score.
- The counts are the totals of the issue. They do not change when a filter is on (3.14, decision 49).
- On a phone the tab list wraps onto two rows. It never scrolls sideways.
- A label with counts has two parts (`TabLabel` in `src/lib/tabLabel.ts`): the name and the counts. Below `md` the second part is on its own line under the first, in smaller text, for example 「訴求 39」 over 「衝突 9」, and 「需求」 over 「涵蓋 9・未涵蓋 12」 on the solution page. Neither part breaks inside. From `md` the label is one line. The tab's `aria-label` is the one-line text, so every count stays in the accessible name. (Review of N4–N9, 2026-10-20: the one-part label broke onto 3 lines at 360 px.)

Above the tabs: the h1 (「#2 找回消失的垃圾桶」), the space types and the update date, as before.

**總覽.** The same content as before (分析摘要, title, tag legend, counts, 資料根據, 特別關注族群, 使用相同空間的議題, 待補清單), plus one new section at the end:
- 「利害關係人」 (h3, element ID `focus-stakeholders`): the stakeholder list of this issue, the content of the old 利害關係人 tab (`StakeholderList` with detailed `StakeholderCard`s, 3.9). (Decision 38.)
- The counts row: 利害關係人 links to the section above (`?focus=stakeholders`), 訴求 to the 訴求 tab, 衝突 to `#/issues/<n>/wants?focus=conflicts`, 需求 to the 需求 tab, 解法 to the 解法 tab. 使用者故事 has no tab, so its count is plain text.
- 分析摘要 links (`summaryRefTo` in `src/lib/summary.ts`):

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

**Side bar (Phase S, decisions 66–70).** The stakeholder menu of the 訴求, 需求 and 解法 tabs becomes the side menu of 3.21: a tree, with a count next to each stakeholder (decision 66). The 「只看有資料根據」 toggle moves from the top of the tab content into the side bar, above the tree (decision 67). The filter status line and 「清除篩選」 move from the menu to the top of the tab content (decision 68). The menu stays inside the tab content, after the tab list, and the 總覽 tab has no side bar (decision 58 is kept, decision 70). So item 1 of the 訴求 and 需求 lists above, and 「The stakeholder filter menu and the data toggle」 of the 解法 tab, now mean the side bar.

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

Layout (Phase S, decision 64, section 3.21): the page has two parts. The **side bar** is the stakeholder side menu with the filters (3.21). The **main block** has, from top to bottom: the note 「O02 已改為 I12」 after a redirect, the h1 (the name), the metadata (the ID, 分類路徑 as names, 特別關注, the issues it appears in as links), then the tab list and the tab content. From `lg` the side bar is a left column next to the whole main block, so it starts at the same height as the h1. Below `lg` the side bar is a closed Collapsible above the main block (3.21). The page shares one layout route with `#/stakeholders` (3.20), so the side bar keeps its open and closed groups and its scroll position when the reader picks another stakeholder.

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

The 「只看有資料根據」 toggle works on every tab, with the same rules as the issue page. Since Phase S it is in the side bar, not above the tab content (decision 67). The filter status line and 「清除篩選」 are at the top of the tab content (decision 68).

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

Each list page has its own URL and an h1. The header links to it.

**`#/issues`: 議題列表.** The issues in `analysis/data/issues.csv`: the 6 host issues with a topic (#1–#6), and #8 (無菸城市), which a participant added. #7 (自由題) has no topic, so it is not listed. The 來源 column of `issues.csv` (`主辦單位` or `參加者補充`) becomes `source` in `index.json`. A card with `參加者補充` shows the note 「非主辦單位題目，由參加者補充」 under its title. An issue without an analysis shows 「製作中」 with no numbers, and cannot be opened. Each analyzed issue card shows:

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
- Issues are never sorted, ranked or filtered by these numbers. The list keeps issue number order. ~~The home page does not show them.~~ Since Phase S the compact `IssueCard` shows them too, on the home page and the space page, without the totals and without the 實證 percent (decision 72). The explanation line is shown once per list.

**`#/stakeholders`: 利害關係人列表.** *Replaced by section 3.20 in Phase S (decision 62).* The page is now the side menu and a statistics block. The text below is the old design. The tree with detailed `StakeholderCard`s stays only in the 「利害關係人」 section of the issue's 總覽 tab.

Every stakeholder in `stakeholders.csv`, across all issues.

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

URL: `#/solutions/<n>-<code>` (the 總覽 tab) and `#/solutions/<n>-<code>/<tab>`, for example `#/solutions/2-A/needs` (ETBlue, 2026-10-20, decision 56). Solutions have their own path, not a path under the issue, because solutions and issues are many-to-many: a cross-issue solution combines solutions of several issues. A cross-issue solution uses the same path format and the same page: `#/solutions/X-A` (3.18). One page per solution, because the content of a solution can be long (ETBlue, `human-inputs.md`). Page title: 「#2 A 清潔箱佈建建議地圖 · 解法 · 市政提案小幫手」. The page has three tabs (ETBlue, 2026-10-20, decision 36):

| Tab | URL | Tab label (example #2 A) |
|---|---|---|
| 總覽 | `#/solutions/2-A` | 總覽 |
| 需求 | `#/solutions/2-A/needs` | 需求　涵蓋 9・未涵蓋 12 |
| 利害關係人 | `#/solutions/2-A/stakeholders` | 利害關係人　涵蓋 14・未涵蓋 13 |

**The path segment** (`parseSolutionSlug` in `src/lib/entityPaths.ts`):
- `<issue number>-<code>`, for example `2-A`: the solution A of issue #2. The code is the solution code of 6.1 (letters only).
- `X-<letter>`, for example `X-A`: a cross-issue solution. `X-A` is the code as `cross-issue.json` writes it.
- Anything else shows the "not found" message.

**Old URLs.** `#/issues/<n>/solutions/<code>` and `#/issues/<n>/solutions/<code>/<tab>` (shared on Discord) redirect with `replace` to `#/solutions/<n>-<code>` and `#/solutions/<n>-<code>/<tab>`. The query (for example `?evidence=1`) is kept. The issue's own 解法 tab `#/issues/<n>/solutions` does not change.

Definitions (`solutionTabCounts` in `src/lib/tabCounts.ts`, decision 50):
- A need is **covered** when its ID is in `needs.must` or `needs.shouldCould` of the solution (step 6.2). Every other need of the issue (`needs` in the issue JSON) is **not covered**, also a 這次不做 need.
- A stakeholder of the issue is **covered** when at least one of its needs is covered. Every other stakeholder of the issue (step 1) is **not covered**.
- The counts are plain numbers. There is no percent and no bar, because a ratio would look like a score. A solution does not need to cover every need.

Above the tabs, on every tab: the breadcrumb (首頁 › 解法 › #2 A, in a `<nav>`; 解法 links to `#/solutions`), the h1 (「#2 A」 and the name with its tag), the line 「議題：#2 找回消失的垃圾桶」 (a link to the issue), the one-line summary, the space types (links) and 新增日期.

**總覽**, in this order:

| Part | Content | Data |
|---|---|---|
| 解開的衝突 | Each conflict whose `wayOutSolutions` lists this solution: the conflict text, 雙方的需求 and the 以需求為本的解方 cell, with a link to `?focus=C1` on the issue's 訴求 tab. Left out when there is none. | 6.4 |
| 相關的衝突 | The other conflicts with a covered story on either side, as before | 6.4 |
| 涵蓋的相同訴求群組 | As before: each W group with a covered story, 全部 or 部分 | worked out from the stories |
| 成效衡量 | As before | 6.3 |
| 資源、法規、隱私與風險 | As before | step 7 |
| 題目或研究中的構想 | As before | 6.1 構想 table |
| 跨議題解法 | Only when the solution is in the `parts` of a cross-issue solution (3.18): its code and name as a link (`#/solutions/X-A`) | `cross-issue.json` |
| 待補 | As before | `pending` |
| 更多 | Links to the issue's 解法 tab and to `#/solutions` | |

The old part 「涵蓋的使用者故事」 moves into the 需求 tab, under each need.

**需求.** The 「只看有資料根據」 toggle, then two h3 parts:
- 「涵蓋的需求」: grouped by the need's priority (必須有, 應該有, 可以有). Each need shows its summary with its tag, its ID (a link to the need on the issue's 需求 tab, `?focus=<need key>`), its stakeholders (links to their stakeholder page's 需求 tab) and, in a Collapsible, its stories (story ID links).
- 「未涵蓋的需求」: grouped by priority (必須有, 應該有, 可以有, 這次不做). Each need also shows 「由其他解法涵蓋：B、C」 (links) or 「沒有任何解法涵蓋」. One line under the heading: 「一個解法不需要涵蓋所有需求。未涵蓋的需求，可能由其他解法涵蓋。」

**利害關係人.** Two h3 parts, each in ID order, never by count:
- 「涵蓋的利害關係人」: a compact `StakeholderCard` per stakeholder (with the 「也出現在」 mark, 4.2). Under it: 「涵蓋的需求」 and, when there are any, 「未涵蓋的需求」 of that stakeholder (the summary links to the need on the issue's 需求 tab, `?focus=<need key>`).
- 「未涵蓋的利害關係人」: a compact `StakeholderCard` per stakeholder, with its needs and the other solutions that cover each one.

Rules:
- Every mention of a solution links to its page (as before). The link text is the code and the name. The link keeps `?evidence=1`.
- A tab change keeps `?evidence=1`.
- An unknown path segment, an unknown issue, an issue with no analysis, an unknown code or an unknown tab shows a short message with links (the issue's 解法 tab when the issue is known, `#/solutions`, the home page).
- The logic is in `src/lib/solutionPage.ts`: the existing functions, plus `solutionNeedCoverage`, `solutionStakeholderCoverage`, `solutionWayOutConflicts`. The paths are in `src/lib/entityPaths.ts`: `parseSolutionSlug`, `parseSolutionTab`, `solutionPath`, `crossSolutionPath`, `legacySolutionPath`. Nothing is sorted by a count.

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

*Phase S changes this section. Section 3.21 is the new design of the menu. These rules below are replaced: 「Two groups … in ID order」 (now a tree, decision 65), 「The menu shows no counts」 (now a count per item, decision 66), the status line in the menu (now in the main block, decision 68), and the layout rules (3.21). The other rules stay.*

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
| Breadcrumb | 首頁 › 利害關係人 › I06 身心障礙者… › #2 I06-US01, in a `<nav>` |
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

ETBlue wants the cross-issue solutions in the app (`human-inputs.md`, decision 39). A cross-issue solution combines solutions of several issues. It has the same page shape and the same URL format as an issue solution (3.12, decision 56): `#/solutions/X-A`, `#/solutions/X-A/needs`, `#/solutions/X-A/stakeholders`.

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
| Breadcrumb, h1, title | 首頁 › 解法 › X-A. The h1 is 「X-A」 and the name with its tag. Page title: 「X-A <name> · 解法 · 市政提案小幫手」. |
| Line under the h1 | 「跨議題解法・議題：#1、#2、#8」, each issue a link. The issues are the ones in `parts`. Then the summary, the space types and 新增日期. |
| Covered needs | An issue need is covered when it is in `needs.must` or `needs.shouldCould`, or in an X-N group listed in `needs.crossIssue` (decision 60). This can be a need of an issue that is not in `parts`. For example X-E has parts in #2 and #8, but its group X-N03 has #1 N15, so #1 N15 is covered. |
| Not covered needs | Every other need of the issues in `parts`. An issue that is not in `parts` has no not covered need. |
| Covered stakeholders | A stakeholder with at least one covered need, in any of these issues (also an issue that is not in `parts`). Each stakeholder is listed once, in ID order. |
| Tab counts | The same rules as 3.12, summed over the issues. They count needs and stakeholders, not priorities (decision 48). |
| 需求 tab | One h3 per issue (「#2 找回消失的垃圾桶」, in issue number order), then the covered and the not covered needs of that issue as in 3.12. An issue that is not in `parts` shows only its covered needs, under the note 「這個議題沒有解法被合併進來。這裡只列出透過「跨議題的共同需求」涵蓋的需求。」. Before them, 「跨議題的共同需求」: each X-N group in `needs.crossIssue`, with its summary and tag, its priority (or 「各議題的優先順序不同」 when `prioritiesDiffer`), its reason, and its issue needs as links (`#/issues/<n>/needs?focus=<id>`). An X-N group has no page and no link. |
| 利害關係人 tab | As in 3.12. Under each stakeholder, its needs are split by issue. For an issue that is not in `parts`, only the covered needs show, and only the stakeholders of those needs are added. |
| 總覽 | 合併的解法 (each item of `parts`, as a link `#/solutions/<n>-<code>` with the issue and the name), 解開的衝突 (each cross-issue conflict whose `wayOutSolutions` lists this code: the text, the two sides with story links, 雙方的需求, 以需求為本的解方, and the issue conflicts in `issueConflicts` as links `#/issues/<n>/wants?focus=C7`), 特別關注族群 (each `solutionFocus` item that lists this code: the group and its note), 成效衡量 (`measures`: the indicator, the baseline with its tag, the source, the issue solutions in `from` as links, and 「新指標」 when `isNew`), 主責單位、法規、隱私與風險 (`detail`), and 更多 (link to `#/solutions`). |
| 待補 | No own list. The `pending` list of the file is per section, not per solution. The 【待補】 text shows inside each cell. |

The page needs the issue files of the issues in `parts`, plus the issues of every need it covers (`needs.must`, `needs.shouldCould` and the X-N groups in `needs.crossIssue`). It loads them like the issue page does.

**Where else they show:**

| Place | What |
|---|---|
| `#/solutions` | A first group 「跨議題解法」 (h2), before the per-issue groups (decision 51). Each card shows the code and name, the summary, and the issues (「#1、#2、#8」). The issue filter matches a cross-issue solution when one of its issues is picked. |
| Issue 解法 tab | A box 「本議題也在跨議題解法中」 with links to each cross-issue solution that has the issue in `parts`, and the issue's solutions that it combines. The box is above the 「只看有資料根據」 toggle. |
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
| `#/issues/<n>`, `#/issues/<n>/<tab>` | Issue (3.2) | 總覽 · 訴求 · 需求 · 解法 (`wants`, `needs`, `solutions`) |
| `#/stakeholders` | Stakeholders: side menu and statistics (3.20; was the list of 3.9) | — |
| `#/stakeholders/<id>`, `#/stakeholders/<id>/<tab>` | Stakeholder (3.3) | 總覽 · 訴求 · 需求 · 解法 (`wants`, `needs`, `solutions`) |
| `#/stakeholders/<id>/stories/<n>/<storyId>` | Story (3.15) | — |
| `#/solutions` | Solution list (3.9) | — |
| `#/solutions/<n>-<code>`, `…/<tab>` (for example `#/solutions/2-A`) | Solution (3.12) | 總覽 · 需求 · 利害關係人 (`needs`, `stakeholders`) |
| `#/solutions/X-<letter>`, `…/<tab>` (for example `#/solutions/X-A`) | Cross-issue solution (3.12, 3.18) | 總覽 · 需求 · 利害關係人 (`needs`, `stakeholders`) |
| `#/spaces/<code>` | Space (3.6) | — |
| `#/about` | About (3.13) | — |

Query parameters: `evidence=1` (3.5), `stakeholder=<id>` (3.14), `cross=1` (the side bar filter of the stakeholder pages) and `special=<特別關注 group>` (the side bar filter of the stakeholder pages and the issue 訴求, 需求 and 解法 tabs, 3.21), `pick=<key>` (4), `focus=<value>` (3.2, 3.16), `from=<old id>` (3.3), `cross=1` and the list filters (3.9).

Old URLs:

| Old URL | Now |
|---|---|
| `#/issues/<n>/opinion`, `…/conflicts`, `…/stakeholders` | Redirect (3.2) |
| `#/issues/<n>/solutions/<code>`, `#/issues/<n>/solutions/<code>/<tab>` | Redirect to `#/solutions/<n>-<code>` and `#/solutions/<n>-<code>/<tab>`, query kept (3.12) |
| `#/stakeholders/<moved id>/…` | Redirect to the new ID, rest of the path kept (3.3) |
| `#/?cross=1` | `#/stakeholders?cross=1` (3.1) |
| `#/wants`, `#/needs` | Not found (decisions 31, 40) |
| `#/stakeholders/<id>/wants/<n>/<key>`, `…/needs/<n>/<key>`, `#/solutions/cross/<code>` | Not found. These were draft URLs and were never published (decisions 45, 56). |

Under a stakeholder, the segment `stories` is only a sub-page name. `#/stakeholders/I06/stories` (no tab with this name) shows the "tab not found" message. `#/stakeholders/I06/wants` and `…/needs` are tabs.

### 3.20 Stakeholders page (Phase S)

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
| `#/stakeholders` | Yes, next to the statistics (3.20) | Opens the stakeholder page. 「全部利害關係人」 is the current item (decision 76). |
| `#/stakeholders/<id>`, every tab | Yes, next to the whole main block (h1, metadata, tabs) | Opens the same tab of that stakeholder (as before). 「全部利害關係人」 goes to `#/stakeholders` (decision 76). |
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
- 「全部利害關係人」 is the first item, above the roots, with no count, on every page with the side bar (decision 76):
  - Issue page: it removes `?stakeholder=` and keeps the other filters. It is current (`aria-current="true"`) when no stakeholder is picked.
  - `#/stakeholders`: it links to `#/stakeholders` and is the current item (`aria-current="page"`).
  - A stakeholder page: it links to `#/stakeholders`. It is not current.
  - The link keeps `evidence`, `cross` and `special` (`allStakeholdersTarget`).
- Each step down the tree is indented 0.75rem. Long names wrap. The count stays on the right of the first line.

**Count next to each stakeholder** (decision 66). The count depends on the page. The rule: **the count is the number of items the main block shows after a click on that item, with the same filters.** So the count says what the reader will see. It is not a score.

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

**Filters in the side bar** (decision 67). Every filter of the page moves into the side bar, above the tree, in this order: 只看有資料根據, 只看跨議題, 特別關注.

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
- The filters of `#/issues` and `#/solutions` do not change. Those pages have no side bar.
- The 「利害關係人」 section of the issue's 總覽 tab keeps its own 只看跨議題 toggle and 特別關注 chips, because that tab has no side bar.

**Filter status line and 「清除篩選」 in the main block** (decision 68).
- The line moves out of the menu into the main block: at the top of the tab content on the issue page and on the stakeholder page, and under the intro line on `#/stakeholders`. So the reader sees it also when the side bar is closed on a phone.
- It lists every filter that is on, then what is shown. For example: 「篩選：I06 身心障礙者（視障、輪椅使用者）、只看有資料根據。顯示 2 個訴求、1 個衝突。」, or 「篩選：只看跨議題、特別關注：高齡。選單顯示 12 位利害關係人。」
- 「清除篩選」 is a link. It removes every side bar filter of that page (`stakeholder`, `evidence`, `cross`, `special`) and keeps the page and the tab. On a stakeholder page the stakeholder itself is not a filter, so it stays.
- The element with `role="status"` is always in the page. It is empty when no filter is on.

**Layout from `lg` (1024 px)** (decision 69). As before: a left column, sticky at the top, with its own scroll when it is taller than the window. It is 16rem wide, and 18rem from `xl` (1280 px). A 「跳過利害關係人選單」 link at the top of the side bar (shown on keyboard focus) moves focus to the main block, because the menu has more than 50 links.

**Layout below `lg`** (decision 69). The whole side bar (filters and tree) is one Collapsible above the main block.
- Closed by default on every page, also on `#/stakeholders` (Q17; ETBlue, 2026-10-21). Then the statistics are the first content on a phone. An open default on `#/stakeholders` can be added later if needed.
- The button says the current choice: 「利害關係人與篩選：I06 身心障礙者（視障、輪椅使用者）」 or 「利害關係人與篩選：全部」. The filter status line in the main block shows the filters, so the button does not list them.
- Open, it shows the filters, the count line and the tree, with every group open. It closes after a pick (as before).
- No sideways scroll at 360 px. The tree indent is small (0.75rem per step), so a 5-level path still fits. Each item and each group button is at least 24 × 24 px (WCAG 2.2 AA target size).

**Keyboard and screen reader.**
- Keyboard order: on the stakeholder pages, the side bar (skip link, filters, tree), then the main block. On the issue page: the tab list, the side bar, then the tab content (decision 58).
- The tree is nested lists (`<ul>`) in a `<nav>`, with a button per group (`aria-expanded`, from the shadcn Collapsible) and a link per stakeholder. It does not use the ARIA `tree` role. That role needs arrow-key focus handling, and plain lists of buttons and links already work with Tab and with screen readers.
- The current item has `aria-current` (`page` on the stakeholder page, `true` on the issue page, as before). It is bold and has a bar on the left.
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
- Cross-issue tests start when a second issue exists.
- Vitest for Phase S (2026-10-20), on the fixtures: the side menu tree (roots, levels left out when empty, order), the side menu counts for each page context (with and without 只看有資料根據; the count equals the list length of the tab view), the side bar filters in the URL (`cross`, `special`, `evidence`) and 「清除篩選」, and `stakeholderStats` (fixed orders, the filters, no sorting by count). Decision 74 (2026-10-21): #2 I06 has 2 solutions without the data filter and 0 with it, and the issue page and the stakeholder page give the same 解法 count for each stakeholder in each issue. Decisions 75–77 (2026-10-21): the chips of each issue (`issueSpecialOptions`), the menu with the chips (`menuIdsFor`, the picked stakeholder kept), the three tab views with `special` (alone, with the data filter, with a stakeholder on top), the menu count equals the list length with each chip on #1, #2, #8 and #9 (evidence on and off), the 「全部利害關係人」 link (`allStakeholdersTarget`), and the solutions that the data filter hides with no stakeholder picked.
- Vitest for the needs-based pages (2026-10-20), on the #1, #2 and #8 fixtures: the tab counts (#2: 訴求 39, 衝突 9, 需求 21, 解法 5; I06: 訴求 5, 衝突 4, 需求 4, 解法 4; #2 A: needs 9 / 12, stakeholders 14 / 13), the want and need keys, the stakeholder filter, the old tab redirects, the solution paths (`#/solutions/2-A`, `#/solutions/X-A`) and the old solution redirects, `?focus=` values, and every 分析摘要 reference (also N groups) has a link.

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
18. Each solution has its own page, `#/issues/<n>/solutions/<code>`, because its content can be long. It shows the covered stories, W groups, stakeholders, conflicts, measures, the step 7 details and the 待補 items of the solution. Every mention of a solution links to it. A solution code is never reused in an issue, so the links keep working (3.12, 5.8). (ETBlue, `human-inputs.md`, 2026-10-18) The URL is now `#/solutions/<n>-<code>` (decision 56); the old URL redirects.
19. A header link also looks active on the pages under its list page, for example 議題 on `#/issues/2/overview` and 利害關係人 on `#/stakeholders/I12`. One solution's page `#/issues/<n>/solutions/<code>` makes 解法 active, not 議題. `aria-current` is `page` on the list page and `true` on a page under it (3.7). (2026-10-19) The solution page is now under `#/solutions` (decision 56).
20. 資料根據 shows each issue's story cells by tag: the 我想要… and the 以便… cell of every story, in the fixed order 實證, AI整理, AI模擬, 待補. It is on the issue card (`#/issues`) and the 總覽 tab, as text with counts, the 實證 percent next to the counts, and a small stacked bar. It replaces the old field that counted only the 我想要… cell. Issues are never sorted, ranked or filtered by it, and the home page does not show it. One explanation line says it is the make-up of the data sources, not the importance or quality of the issue, and that organization stories are `[AI模擬]` until a real interview, so it never reaches 100%. One percent is not shown alone: it looks like a score and can mislead. For example #8 has 39 `[AI整理]` cells that no person has checked yet, so a single number would hide what is behind it (3.9). (ETBlue, 2026-10-19) **Partly replaced by decision 72 (Phase S):** the compact `IssueCard` on the home page and the space page now shows 資料根據 too (counts and bar, no totals, no percent).
21. Every list of 議題 and 解法 uses a shared card: `IssueCard` or `SolutionCard`. Each card has two variants, `detailed` (the list pages `#/issues` and `#/solutions`) and `compact` (the home page, the space page, the stakeholder page and the opinion check). `SolutionSummary` is removed (3.9). (ETBlue, `human-inputs.md`, 2026-10-19)
22. The header gets 需求 with a count, between 訴求 and 解法. A 需求 is the 以便… cell of one story: one per story, with no merging. It gets a list page `#/needs`, built like `#/wants`, with search and the 「只看有資料根據」 filter. On this page the filter looks at the 以便… cell only. 訴求 stays the opinion check pick list (3.7, 3.9). (ETBlue, `human-inputs.md`, 2026-10-19)
23. `[AI整理]` is yellow, not blue, so the three tags follow the color spectrum: 實證 green, AI整理 yellow, AI模擬 orange. The shades are darker (light theme `#765900`) or lighter (dark theme `#d4a300`) than Solarized yellow `#b58900`, to pass AA on the page backgrounds, also under the watermark. This also keeps the tag apart from the blue links. (ETBlue, 2026-10-19)
24. In the light theme, 實證 green is `#2e7000` (was `#5a6800`), so it is easy to tell apart from the AI整理 yellow in the badges and the 資料根據 bar. The contrast stays about the same. (ETBlue, 2026-10-19)
25. Each issue analysis has a 特別關注族群檢查 table in step 1 (`### 1.3`), so a 特別關注 group with no stakeholder is shown, not hidden. Only a person decides that a group does not apply: the AI writes a neutral 【待補】 question, never 「不相關」. The 總覽 tab shows all 6 groups with their stakeholders, stories and 資料根據 (3.2). The detailed issue card shows the groups not included yet, or 「都已納入」 (3.9). There is no count like 「4／6」 anywhere, because it reads like a score. Issues are never sorted, ranked or filtered by these numbers, and the groups are always in the fixed order, never by count. (ETBlue, 2026-10-19)
26. Every list of 議題 uses the card look, also the short lists. The compact `IssueCard` is a box like the compact `SolutionCard` (`rounded-md border p-3`, dashed for 製作中). The home block 「最近更新的議題」 stacks these cards with a gap instead of a line between items. The space page lists its issues with the compact `IssueCard` in a grid (1, 2 or 3 columns by width), not as plain links. Issue links inside a sentence or a field stay plain links, because they are references, not lists (3.6, 3.9). (ETBlue, 2026-10-19) **Extended by decision 72 (Phase S):** the compact card also shows 跨議題共用的利害關係人 and 資料根據.
27. The home block links to the list pages are named 「看全部」 and sit on the heading row, right aligned. Each keeps its full name (for example 「看全部議題」) as its `aria-label` (3.1). (ETBlue, 2026-10-19)
28. The theme button shows the theme it switches to (moon + 深色模式, or sun + 淺色模式), not a fixed 深色模式 with `aria-pressed`. With the fixed text, the only change was a filled moon and a gray background, so readers thought the button did not work (3.10). (ETBlue, 2026-10-19)
29. Each issue analysis has a 「分析摘要」 section near the top, after the intro notes and before 題目原文重點 (ETBlue, `human-inputs.md`). It has 5 topics in a fixed order: 難以取捨的決定, 可能的爭議, 受影響較大的弱勢族群, 法規上的障礙, 相依事項與現行政策的關係. Each item has a tag (mostly `[AI模擬]`, or a 【待補】 item) and lists where it comes from (相關編號). The summary adds no new facts. 受影響較大的弱勢族群 follows the 1.3 order and names the groups not included yet. The wording is neutral: each controversy gives the sides in the same way, and a current policy is described as 「與現行政策的關係」. The app shows the summary first on the 總覽 tab (3.2). The section heading 「分析摘要」 is an h3, like the other sections of the tab, so each topic is an h4. The topics are never sorted by the number of items. (ETBlue, 2026-10-19)
30. The header shows only the app name, 議題, 利害關係人 and 解法 with counts, and the theme button. 訴求 and 需求 are no longer in the header (ETBlue, `human-inputs.md`, information architecture). This replaces the header part of decisions 13 and 22 (3.7). (ETBlue, 2026-10-20)
31. The pages `#/wants` and `#/needs` are removed, with their routes, page files and list code (`src/lib/wants.ts`, `src/lib/needs.ts`). Their old URLs show the not-found page. The pick link helpers move to `src/lib/opinion.ts`. `wantCount` and `needCount` stay in `src/lib/counts.ts` for the planned 訴求 and 需求 tabs. This replaces decisions 14 and 22 (3.9). (ETBlue, `human-inputs.md`, 2026-10-20)
32. The footer has only three parts: a short text on what the app is (who made it, for 市政 debug 松, what it does), the disclaimer, and a link 「關於本站」. A new page `#/about` 關於本站 has the event page link, the GitHub link, the licenses, the data files and the author's related blog posts. These moved from the footer (3.8, 3.13). This replaces the footer part of decisions 13 and 16. (ETBlue, `human-inputs.md`, 2026-10-20)
33. Every list of 利害關係人 uses a shared card `StakeholderCard` with the variants `detailed` (`#/stakeholders` and the issue's 利害關係人 tab, with the story counts per issue) and `compact` (the home page, the solution page, the space page and the opinion check). The home block 「最近加入分析的族群」 is boxed like the other two blocks. The stakeholder tree keeps its structure, with the cards as its leaves. The compact card always shows the ID and the 特別關注 badges, so the space page and the opinion check now show them too (3.9). (ETBlue, `human-inputs.md`, 2026-10-20) **Partly replaced by decision 62 (Phase S):** `#/stakeholders` no longer shows the tree of detailed cards. The detailed card stays in the issue's 總覽 tab.
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
51. Cross-issue solutions are the first group on `#/solutions`. They are included in the header 解法 count, and in the home block 「最近分析出的解法」 because they have a date. Their URL is in decision 56 (3.18). (Q9; ETBlue, 2026-10-20)
52. Issues in the old format (`format: "stories"`, no `needs`): no issue uses it now. The app keeps the type, and the 需求 tab shows a short note 「本議題使用舊格式，沒有需求列表」 instead of a fallback (3.2). (Q10; ETBlue, 2026-10-20)
53. A link to a part of a tab uses `?focus=<value>`, because the hash router uses the `#`. The page scrolls to the part and moves keyboard focus to it (3.2). (Q11; ETBlue, 2026-10-20)
54. `#/solutions` shows the number of covered needs (「涵蓋 9 個需求」), not the number of covered stories, because step 6.2 now maps solutions to needs (3.9). (Q12; ETBlue, 2026-10-20)
55. Every story ID in the app links to its story page, like solutions (3.15). (Q13; ETBlue, 2026-10-20)
56. Solutions get their own path, because solutions and issues are many-to-many: a cross-issue solution combines several issues. An issue solution is `#/solutions/<n>-<code>` (for example `#/solutions/2-A`). A cross-issue solution uses the same format with its own code (for example `#/solutions/X-A`) and the same page shape. Tabs are `#/solutions/2-A/<tab>`. The old URLs `#/issues/<n>/solutions/<code>[/<tab>]` redirect to the new ones, with the tab and the query kept. The draft `#/solutions/cross/<code>` is not used. Solution pages are under the header link 解法, not 議題. This replaces the URL part of decisions 18, 19 and 39 (3.7, 3.12, 3.18, 3.19). (ETBlue, 2026-10-20)
57. A link to one want or one need goes to the issue's 訴求 or 需求 tab with `?focus=<key>` (for example `#/issues/2/wants?focus=W08`, `#/issues/2/needs?focus=N07`). A link to a stakeholder in a want or need list goes to that stakeholder's page on the same tab (`#/stakeholders/I06/wants`). This is the simplest rule: it uses the `?focus=` parameter that already exists, and needs no new page (3.16). (ETBlue, 2026-10-20)
58. On the issue page, the stakeholder menu is inside the content of the 訴求, 需求 and 解法 tabs, after the tab list. The keyboard order is: tabs, then the menu, then the content. The reason: the 總覽 tab has no menu, and a wrapper around the tabs would build the tabs again on each tab change, so the keyboard focus would be lost. On the stakeholder page the menu is on every tab, so it stays before the tabs (3.3, 3.14). (Coordinator, after the N4 review, 2026-10-20) **The stakeholder page part is replaced by decision 64 (Phase S):** the side bar is next to the whole main block (h1, metadata, tabs). The issue page part is kept (decision 70).
59. On the stakeholder page's 解法 tab, the 「只看有資料根據」 filter hides a need with no data basis (`dataBasedNeeds`), and hides a solution that has no need left. A conflict link in a filtered list keeps `?stakeholder=` and `?evidence=1` (3.3, 3.14). (Coordinator, after the N4 review, 2026-10-20)
60. On a cross-issue solution page, an issue need is covered when it is in `needs.must` or `needs.shouldCould`, or in an X-N group listed in `needs.crossIssue`. A need of an issue that is not in `parts` is covered too when it is in such a group (for example #1 N15 for X-E, through X-N03), and the page loads that issue for it. 「Not covered」 means every other need of the issues in `parts`; an issue that is not in `parts` has no not covered need. A stakeholder is covered when at least one of its needs, in any of these issues, is covered (3.18). (ETBlue, 2026-10-20; the part about issues not in `parts` added after the Phase N review, 2026-10-20)

Phase S (2026-10-20). From ETBlue's notes in `human-inputs.md` (commits 487bac6 and 8c4bd4b). ETBlue answered Q14–Q19 on 2026-10-21: the recommended answers for Q14, Q15, Q16, Q18 and Q19, and the other choice for Q17 (decision 69).

61. The page column is at most 1440 px wide, not 1024 px. The header, the main block and the footer use it. Long text stays at most 48rem wide. The grids of `#/issues` and `#/solutions` get a third column from `xl`. The checks run at 1440 px and 1920 px too (3.22). (ETBlue, `human-inputs.md`, 2026-10-20)
62. `#/stakeholders` has the stakeholder side menu and, in the main block, statistics about the stakeholders. A click on a stakeholder opens its page. The tree of detailed `StakeholderCard`s is no longer on this page. This replaces the `#/stakeholders` part of 3.9 and of decision 33 (3.20). (ETBlue, `human-inputs.md`, 2026-10-20)
63. The statistics on `#/stakeholders` are plain counts in fixed orders: 總數, 依分類 (the first levels of 分類路徑, in tree order), 特別關注族群 (the fixed 6 groups) and 各議題 (issue number order). No percent, no bar, no chart, no rank, and nothing is sorted by a count. They follow the side bar filters. A note says the numbers only show how much the analysis wrote (3.20). (ETBlue, `human-inputs.md`, 2026-10-20; the content: Q18; ETBlue, 2026-10-21)
64. The stakeholder page has the side bar next to the main block. The main block has the h1, the metadata and the tabs. `#/stakeholders` and `#/stakeholders/<id>/…` share one layout route, so the side bar keeps its state when the reader picks another stakeholder. The story page is not in this layout. This replaces the stakeholder page part of decision 58 (3.3, 3.21). (ETBlue, `human-inputs.md`, 2026-10-20)
65. The side menu is a tree: 組織 and 個人 as roots, then the levels of 分類路徑 with the names from `path-labels.csv`. Each group has a button to open and close it, and every group is open by default. A group shows the number of stakeholders under it. Levels with no stakeholder are left out. The order is the tree order and the ID order, never a count. This replaces the two flat lists of 3.14 (3.21). (ETBlue, `human-inputs.md`, 2026-10-20)
66. Each stakeholder in the side menu shows one count. The count depends on the page: it is the number of items the main block shows after a click on that item, with the same filters (stories on `#/stakeholders` and the 總覽 tab; wants, needs or solutions on those tabs; per issue on the issue page, summed over the issues on the stakeholder page). A 0 is shown. The menu is never sorted by the counts. This replaces 「The menu shows no counts」 in 3.14 (3.21). (ETBlue, `human-inputs.md`, 2026-10-20; the exact rule: Q16; ETBlue, 2026-10-21)
67. Every filter of a page with the side bar is in the side bar, above the tree: 只看有資料根據 (all side bar pages), 只看跨議題 and 特別關注 (`#/stakeholders` and the stakeholder page, where they change which stakeholders the menu lists). All are in the URL (`evidence=1`, `cross=1`, `special=<group>`) and every side bar link keeps them. The opinion check search box stays in the main block (3.21). (ETBlue, `human-inputs.md`, 2026-10-20) **Decision 75 replaces 「特別關注 … (`#/stakeholders` and the stakeholder page)」:** the 特別關注 chips are on the issue 訴求, 需求 and 解法 tabs too. 只看跨議題 stays only on the stakeholder pages.
68. The filter status line and the 「清除篩選」 link are in the main block, not in the side bar: at the top of the tab content, or under the intro line on `#/stakeholders`. The line lists every filter that is on. 「清除篩選」 removes every side bar filter of the page. This replaces the status line part of 3.14 (3.21). (ETBlue, `human-inputs.md`, 2026-10-20)
69. From `lg` the side bar is a sticky left column, 16rem wide (18rem from `xl`), with a skip link 「跳過利害關係人選單」. Below `lg` the whole side bar (filters and tree) is one Collapsible above the main block, closed by default on every page, also on `#/stakeholders`. An open default on `#/stakeholders` can be added later if needed. The filter status line in the main block stays visible when it is closed (3.21). (Q17; ETBlue, 2026-10-21)
70. On the issue page, the side bar is only on the 訴求, 需求 and 解法 tabs, inside the tab content after the tab list, as in decision 58. The 總覽 tab has no side bar (3.2, 3.21). (Q14; ETBlue, 2026-10-21)
71. The solution pages and the story page have no side bar (3.21). (Q15; ETBlue, 2026-10-21)
72. The compact `IssueCard` (the home block 「最近更新的議題」 and the space page) shows two more fields: 跨議題共用的利害關係人 (the same text and link as the detailed card, only with 2 or more analyzed issues) and 資料根據 (`CellBasis` with `compact`: the counts and the bar, no totals and no 實證 percent). The 資料根據 explanation line is shown once per list. Issues are still never sorted by these numbers. This replaces the part of decision 20 that kept 資料根據 off the home page, and extends decision 26 (3.1, 3.6, 3.9). (ETBlue, `human-inputs.md`, 2026-10-20; 「cross-issue info」 means the shared stakeholders: Q19; ETBlue, 2026-10-21)
73. `AllStakeholders` is no longer used on `#/stakeholders`. `StakeholderList` (the tree of detailed cards with its own filters) stays for the 「利害關係人」 section of the issue's 總覽 tab. Unused code is removed in Phase S (3.9, 3.20). (Coordinator, 2026-10-20)
74. On the issue page's 解法 tab, with a stakeholder picked and 「只看有資料根據」 on, a solution is listed only when at least one of that stakeholder's needs in it is still shown under the filter. When the filter hides all of them, the solution is not listed and the side menu does not count it for that stakeholder. So the menu count changes with the filter (decision 66), and the issue page and the stakeholder page use the same rule (decision 59). Before, the solution stayed with the note that its needs were hidden. With no stakeholder picked, the filter still hides no solution (3.2, 3.21). (ETBlue, 2026-10-21) **Decision 77 replaces the last sentence:** with no stakeholder picked, the filter now hides a solution whose needs are all hidden.
75. The issue page's 訴求, 需求 and 解法 tabs have the 特別關注 chips in the side bar, below 「只看有資料根據」. Only the groups that at least one stakeholder of the issue has are shown, in `FOCUS_ORDER`. A chip is in the URL as `special=<group>`, and tab changes, side bar links and other filter links keep it. The chips limit the menu to the stakeholders with a picked group (the picked stakeholder always stays), and they filter the tab content: the wants, needs and solutions of those stakeholders, and the conflicts with a story of them on either side (the same rule as `?stakeholder=`, decision 59). They work together with 只看有資料根據, and `?stakeholder=` applies on top. The menu counts use the same filters (decision 66). The tab labels stay the totals (decision 49). The filter status line names the chips, and 「清除篩選」 removes them. 只看跨議題 is still not on the issue page. On a stakeholder page the content is about one stakeholder, so 只看跨議題 and 特別關注 still change only the menu there. This replaces the part of decision 67 that put 特別關注 only on the stakeholder pages, and the 「No」 for the issue page in the filters table of 3.21 (3.2, 3.21). (ETBlue, 2026-10-21)
76. The side menu on `#/stakeholders` and on a stakeholder page has 「全部利害關係人」 as its first item, as on the issue page. It has no count. It links to `#/stakeholders` and keeps `evidence`, `cross` and `special`. On `#/stakeholders` it is the current item (`aria-current="page"`). This replaces 「No item is current on this page」 in 3.20 and extends 3.21, where only the issue page had this item (3.20, 3.21). (ETBlue, 2026-10-21)
77. On the issue page's 解法 tab with no stakeholder picked, 「只看有資料根據」 hides a solution when it hides every need the solution covers. A solution that lists no need at all stays. The note 「這個解法涵蓋的需求，都沒有標記 [實證] 或 [AI整理]。」 is removed. When no solution is left, the tab says 「沒有解法涵蓋標記 [實證] 或 [AI整理] 的需求。」. The tab label stays the total (decision 49). This extends decision 74 to the case with no stakeholder picked (3.2). (ETBlue, 2026-10-21)
78. A stakeholder with no issue (its 議題 in `stakeholders.csv` is empty) and no move target is left out of every list. This means the side menus, the statistics on `#/stakeholders`, the stakeholder count in the header, 「最近加入的利害關係人」 on the home page, the stakeholder tree, and the 特別關注 options. It is not a moved ID, so it does not redirect. Its own page `#/stakeholders/<ID>` still loads. The page shows the name, the ID, the path and the note 「這位利害關係人目前沒有出現在任何議題中。」. It has no tabs. The side menu on that page is the same as on `#/stakeholders`, with no current item. One helper, `isListed` in `src/lib/stakeholders.ts`, holds this rule, and every list uses it. The first case is I34 本專案作者, which left #9 on 2026-10-21 (3.1, 3.3, 3.7, 3.20). (ETBlue's analysis change, 2026-10-21)

## 14. Open questions

None now.

Answered before (Q1–Q19). ETBlue answered Q1–Q13 on 2026-10-20 and Q14–Q19 on 2026-10-21:

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
| Q18 What the stakeholder statistics show | 63 (plain counts, no chart) |
| Q19 Cross-issue info on the compact issue card | 72 (the shared stakeholders) |
