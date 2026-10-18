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

## 3. Screens

### 3.1 Home page

**Issue list.** The issues in `analysis/issues.csv`: the 6 host issues with a topic (#1–#6), and #8 (無菸城市), which a participant added. #7 (自由題) has no topic, so it is not listed. The 來源 column of `issues.csv` (`主辦單位` or `參加者補充`) becomes `source` in `index.json`. A card with `參加者補充` shows the note 「非主辦單位題目，由參加者補充」 under its title. An issue without an analysis shows 「製作中」 with no numbers, and cannot be opened. Each analyzed issue card shows:

| Field | Example (#2) |
|---|---|
| 利害關係人 | 24 位（組織 13、個人 11） |
| 使用者故事 | 45 則 |
| 衝突 | 7 個 |
| 解法 | 4 個 |
| 跨議題共用的利害關係人 | For example 「8 位, shared with #1」 (the real number is known after #1 is written). Links to the stakeholder list with the 「只看跨議題」 filter on. Shown only when 2 or more issues exist. |
| 資料根據 | 我想要… 實證 6、AI整理 0／45. Two plain counts, not percentages or bars, so they do not read like a score. |
| 更新日期 | Date of the last git commit that changed the issue folder. Left out if the build has no git history. |
| 空間類型 | The issue's space types, for example 人行道、騎樓. Each one links to its space page (section 3.6). |

A space type filter sits above the issue list.

**Stakeholder list.** Every stakeholder in `stakeholders.csv`, across all issues.

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

### 3.2 Issue page

Five tabs. 總覽 opens first.

| Tab | Content |
|---|---|
| 總覽 | Title, notice, tag legend. Counts: stakeholders (O and I), stories, conflicts, solutions. Each count links to its tab. 「使用相同空間的議題」: for each space type of this issue, the other issues that use it, for example 「人行道：#1」, with links. 「待補清單」: every 【待補】 item in the issue, with the section it is in, so readers can see what real input is still missing. |
| 你的意見 | The opinion check (section 4) |
| 利害關係人 | The same list as the home page, limited to this issue. Each row links to the stakeholder page (section 3.3). |
| 衝突 | C1, C2… Each shows both sides with their stories, the deliberation method, and the simulated result. |
| 解法 | A, B… Each shows the one-line summary, its space types, and the stories it covers, grouped by priority (必須有 / 應該有 / 可以有). |

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
  - `[AI整理]`: AI summarized it from real data (for example the 「市長，你給我聽好了」 data), with counts. No person has checked it yet. The counts come from keyword matching, so they are estimates. A person changes the tag to `[實證]` after a spot-check.
  - `[AI模擬]`: AI made it up as a likely view. No data behind it.
- `[實證]`, `[AI整理]`, `[AI模擬]` and 【待補】 each have their own badge style (green, blue, amber, dashed gray outline). The text is always shown, so the tag does not depend on color. A tag is shown next to the text it belongs to, never only once per page.
- Every page shows a short notice: `[AI模擬]` content is not real interviews or real citizen words, and `[AI整理]` content is an AI summary of real data that no person has checked yet.
- A filter 「只看有資料根據」 hides `[AI模擬]` content in lists. It keeps stories whose 我想要… or 以便… cell is `[實證]` or `[AI整理]`. Each item still shows its own tag. The URL parameter is `?evidence=1`, the name from the time the filter was 「只看 `[實證]`」, so old shared links still work.

### 3.6 Space page

URL: `#/spaces/<code>`, for example `#/spaces/sidewalk`.

City space is limited, so this page shows what competes for the same space:
- the issues that use this space type
- every solution, from every issue, that uses it, with its one-line summary and a link
- the stakeholders of those solutions' stories, with links to their stakeholder pages

For example, under 人行道: #2 解法 A (bins), the #1 solutions about tree pits, and I06 身心障礙者, who needs sidewalk width in both issues.

Space types have no `[實證]` / `[AI整理]` / `[AI模擬]` tag. They are a classification, like 分類路徑.

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

## 5. Changes to the analysis format

### 5.1 Shared stakeholder list

New file `analysis/stakeholders.csv` (UTF-8 with BOM):

| Column | Content |
|---|---|
| 利害關係人編號 | Global ID, for example `O04`, `I06`. The same ID means the same stakeholder in every issue. |
| 利害關係人 | Name |
| 分類路徑 | Category path (5.2) |
| 特別關注 | Zero or more of: 高齡, 身心障礙, 兒童與照顧者, 外籍, 經濟弱勢. Separated by 「、」. |
| 議題 | Issue numbers, for example `1 2 5`. Filled by a script. |
| 備註 | For a moved ID: 「已改為 I12」 |

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

## 6. Build script

`analysis/build_json.py`:
- Reads every issue folder that has an `issue-analysis.md`, plus `stakeholders.csv` and `path-labels.csv`.
- Writes `app/public/data/index.json` (issue list, shared stakeholders, path labels, space types) and `app/public/data/issues/<folder>.json`.
- Reads these sections: title, 空間類型 line, 1.1, 1.2, step 4 stories, 相同訴求群組, 5.4 (split 相關故事 on 「vs」 into two sides), 6.1 (with 空間類型), 6.2.
- Adds per-issue counts for the home page cards (section 3.1), including `wantsEvidence` and `wantsAiSummary` (stories whose 我想要… cell is `[實證]` or `[AI整理]`), and the update date from `git log -1 --format=%cs -- <folder>`.
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
    pages/              Home, Issue (with the 5 tabs)
    components/         TagBadge, Notice, StakeholderTree, StoryCard, ...
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
