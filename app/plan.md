# Build plan: policy issue browser

> **For Claude:** use `superpowers:subagent-driven-development` to run this plan task by task. Every subagent brief must include ETBlue's plain-English rule (short sentences, common words, main point first, no idioms).

**Goal:** a static web app that shows the issue analysis in `analysis/`, with an opinion check, a cross-issue stakeholder view and a space view. Design: [design.md](design.md) (approved 2026-10-18).

**Architecture:** Python scripts in `analysis/` check the Markdown and turn it into JSON. A Vite + React + TypeScript app in `app/` reads only the JSON. All logic is in pure functions in `app/src/lib/`, tested with Vitest. GitHub Actions builds and publishes to GitHub Pages.

**Tech stack:** Python 3 (standard library only, run with `-I`), Node 22, Vite, React 19, TypeScript, React Router 7 (hash router), Tailwind CSS v4, shadcn/ui, Vitest.

## Rules for every task

- Follow the design doc. If a task needs a change to the design, stop and ask ETBlue.
- Commits: ETBlue allowed a local commit after each task (2026-10-18). End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.
- Test first where the task has logic: write the failing test, run it, see it fail, write the code, run it, see it pass.
- Python: run with `python3 -I`. Tests use `unittest`: `python3 -I -m unittest discover -s analysis/tests -t .` run from the repo root.
- After any change to an `issue-analysis.md`: run `build_csv.py`, then `check_analysis.py`. Both must pass.
- Writing in the analysis files: zh-TW, tags inside cells (`[實證]` / `[AI模擬]` in backticks), 【待補】 cells have no tag. See `analysis/ai-inputs.md` → Writing style.
- **Gates:** a task marked **GATE** stops and waits for ETBlue.

## Phase A: analysis format and #2 migration

### Task A1: shared reference files

**Files:** create `analysis/issues.csv`, `analysis/space-types.csv`, `analysis/path-labels.csv`.

1. `analysis/issues.csv` (UTF-8 with BOM), columns `編號,資料夾,題目`. Rows #1–#6, titles from `.eventinfo/issues.md` (local, git ignores it):
   `1,1-trees,把三千棵樹種回來` / `2,2-trashcans,找回消失的垃圾桶` / `3,3-mice,鼠患四處跑，衛生安全怎麼辦` / `4,4-neihutraffic,內湖尖峰車流好比停車場` / `5,5-busroutes,公車路網如何即時反應需求` / `6,6-oldbuildings,危老耐震如何查，風險評級怎麼找`
2. `analysis/space-types.csv`, columns `代碼,名稱,分組,說明`. The 13 rows in design section 5.3. 說明 is one short zh-TW sentence each.
3. `analysis/path-labels.csv`, columns `分類路徑,名稱`. One row for every prefix used in Task A2, plus the first levels from design 5.2 (`gov`, `gov-central`, `gov-local`, `soe`, `ind`, `acd`, `ngo`, `cmt`, `res`, `mov`, `vis`, `wrk`), plus `gov-local-taipei-council` 臺北市議會 and `gov-central-ly` 立法院.

### Task A2: shared stakeholder list for #2 — **GATE**

**Files:** create `analysis/stakeholders.csv`, columns `利害關係人編號,利害關係人,分類路徑,特別關注,議題,備註`.

Reviewed by ETBlue on 2026-10-18 (O06 renamed, O07 moved to `cmt`):

| ID | Name | Path | 特別關注 |
|---|---|---|---|
| O01 | 商圈店家與攤商 | `ind-retail` | |
| O02 | 便利商店店員 | — | 備註：已改為 I12 |
| O03 | 環保局清潔隊 | `gov-local-taipei-epb-cleaning` | |
| O04 | 環保局（環境清潔管理科） | `gov-local-taipei-epb` | |
| O05 | 里辦公處 | `gov-local-taipei-li` | |
| O06 | 學術研究單位（環境工程、都市規劃、行為科學） | `acd` | |
| O07 | 公民科技社群 | `cmt-civictech` | |
| O08 | 環保與零廢棄團體 | `ngo-environment` | |
| O09 | IoT／智慧城市業者 | `ind-tech` | |
| O10 | 臺北捷運公司 | `soe-taipei-metro` | |
| O11 | 大型活動主辦單位（跨年、演唱會、市集） | `ind-events` | |
| O12 | 工務局新建工程處（人行道管理） | `gov-local-taipei-pwd-nce` | |
| O13 | 1999 市民熱線 | `gov-local-taipei-rdec-1999` | |
| I01 | 通勤行人（捷運、公車乘客） | `mov` | |
| I02 | 國內觀光客 | `vis` | |
| I03 | 外國觀光客 | `vis` | 外籍 |
| I04 | 在台外籍居民（含學生、移工） | `res` | 外籍 |
| I05 | 高齡者 | `res` | 高齡 |
| I06 | 身心障礙者（視障、輪椅使用者） | `mov` | 身心障礙 |
| I07 | 推嬰兒車的家長 | `mov` | 兒童與照顧者 |
| I08 | 夜班工作者（含外送員） | `wrk` | |
| I09 | 清潔箱附近住戶 | `res` | |
| I10 | 遛狗飼主 | `res` | |
| I11 | 資源回收個體業者（含高齡回收者） | `wrk` | 高齡、經濟弱勢 |
| I12 | 便利商店店員 | `wrk` | |

**O03 story review (design 5.5).** Approved by ETBlue on 2026-10-18: two O03 stories are about the workers' own needs, so they move to a new **I13 清潔隊員** (`wrk`):

| Story | 我想要… | 以便… | Proposal |
|---|---|---|---|
| O03-US01 | 知道哪個清潔箱快滿了再去清 | 排出比較順的路線，不白跑 | Move to I13-US01 (the worker's own route and effort) |
| O03-US02 | 清潔箱被丟家用垃圾時，有方法記錄並交給稽查處理 | 減少重複清理 | Stay (team process) |
| O03-US03 | 用手機一鍵回報清潔箱的狀態 | 回報不必多寫報告，資料也能累積 | Move to I13-US02 (the worker's own paperwork) |
| O03-US04 | 做到動態清理 | 清潔箱不會滿出來，清潔人力用在需要的地方 | Stay (`[實證]`, team level) |

The gate is passed: ETBlue approved this table and the O03 moves on 2026-10-18. Add I13 清潔隊員 (`wrk`) to the file. Fill 議題 with `2` for every active row.

### Task A3: check script, new checks (test first)

**Files:** modify `analysis/check_analysis.py`. Create `analysis/tests/__init__.py`, `analysis/tests/test_check_analysis.py`.

The shared files are found next to the issue folder: `analysis_dir = dirname(dirname(md_path))`.

New checks:
1. Every step 1 ID is in `stakeholders.csv`, active (empty 備註), with the same name, 分類路徑 and 特別關注.
2. Every prefix of every 分類路徑 in `stakeholders.csv` has a row in `path-labels.csv`.
3. The 議題 column of `stakeholders.csv` matches the issue files that list each ID in step 1.
4. The 「空間類型：」 line exists under the title. Every code is in `space-types.csv`.
5. 6.1 has a 空間類型 column. Every code is in `space-types.csv` and in the issue's list.
6. IDs that appear only in the 「編號異動紀錄」 section are skipped by the existing "ID exists" checks.
7. The step 1 tables have the columns `利害關係人編號 | 利害關係人 | 分類路徑 | 特別關注 | 與本題的關係`.

Tests (copy #2 and its shared files to a temp dir, change one thing, run the check as a subprocess, assert exit code 1 and the error text):
- #2 as it is → exit 0 (after Task A4)
- a step 1 name differs from `stakeholders.csv` → error names the ID
- a path prefix with no label → error names the prefix
- an unknown space code in the 空間類型 line → error names the code
- a solution space not in the issue list → error names the solution
- a wrong 議題 value → error names the ID

### Task A4: migrate #2

**Files:** modify `analysis/2-trashcans/issue-analysis.md`, rebuild `analysis/2-trashcans/user-stories.csv`.

1. Under the title, add `空間類型：`sidewalk`、`arcade`、`park`、`mrt-exit``.
2. 1.1 and 3.7: replace 類別 with 分類路徑 (code in backticks), add 特別關注. Use names from `stakeholders.csv`.
3. Move O02 → I12 and the O03 stories approved in Task A2 → I13. Change every reference in the file (tables, step 3 text, W groups, 5.2, 5.3, 5.4, 6.2, notices). Keep story numbering per stakeholder.
4. Rename O03, O05, O06, O12, O13 everywhere (names in `stakeholders.csv`).
5. Add 6.1 column 空間類型 (draft: A `sidewalk`、`mrt-exit`; B `sidewalk`、`mrt-exit`、`park`; C `sidewalk`、`mrt-exit`、`park`、`arcade`; D `sidewalk`、`arcade`、`park`).
6. Add a section 「編號異動紀錄」 before the appendix, as a table: 舊編號, 新編號, 日期, 原因.
7. Update the counts in the text (step 1 summary, step 4 summary).
8. Run `build_csv.py` and `check_analysis.py`. Run the unittest suite.
9. Add a changelog line to `analysis/ai-inputs.md`.

### Task A5: script to fill the 議題 column

**Files:** create `analysis/sync_stakeholders.py`, test in `analysis/tests/test_sync_stakeholders.py`.

It reads every `analysis/*/issue-analysis.md`, finds the step 1 IDs, and rewrites only the 議題 column of `stakeholders.csv` (issue numbers from `issues.csv`, space-separated, sorted). Test: remove `2` from one row in a temp copy → the script puts it back; no other cell changes.

## Phase B: JSON build

### Task B1: `analysis/build_json.py` (test first)

**Files:** create `analysis/build_json.py`, `analysis/tests/test_build_json.py`.

Usage: `python3 -I analysis/build_json.py analysis app/public/data`.

Cell shape: `{"text": str, "tag": "實證" | "AI模擬" | null, "pending": bool}`. Tags are removed from `text`. Backticks around tags are removed.

`index.json`:
```json
{
  "issues": [{"number": 2, "folder": "2-trashcans", "title": "找回消失的垃圾桶", "available": true,
              "spaces": ["sidewalk"], "updated": "2026-10-18",
              "counts": {"stakeholdersO": 12, "stakeholdersI": 13, "stories": 45, "conflicts": 7,
                         "solutions": 4, "wantsEvidence": 6}}],
  "stakeholders": [{"id": "I06", "name": "…", "path": "mov", "focus": ["身心障礙"], "issues": [2], "movedTo": null}],
  "pathLabels": {"gov": "政府"},
  "spaceTypes": [{"code": "sidewalk", "name": "人行道", "group": "道路", "description": "…"}]
}
```
Unavailable issues: `available: false`, `counts: null`, `spaces: []`, `updated: null`.

`issues/<folder>.json`:
```json
{
  "number": 2, "folder": "2-trashcans", "title": "…", "spaces": ["sidewalk"], "updated": "2026-10-18",
  "stakeholders": [{"id": "O01", "relation": Cell}],
  "inputSources": [{"source": "…", "stakeholders": ["O03"], "fit": Cell, "note": "…"}],
  "stories": [{"id": "O01-US01", "stakeholder": "O01", "want": Cell, "group": "W01" | null,
               "soThat": Cell, "source": "…" | null, "priority": "M", "priorityTag": "AI模擬"}],
  "groups": [{"id": "W01", "summary": "…", "tag": "AI模擬", "stories": ["O01-US03"]}],
  "conflicts": [{"id": "C1", "text": Cell, "sideA": ["I01-US01"], "sideB": ["I09-US01"], "method": Cell, "result": Cell}],
  "solutions": [{"id": "A", "name": Cell, "summary": "…", "spaces": ["sidewalk"], "stories": ["…"]}],
  "pending": [{"section": "6.3 成效衡量", "text": "【待補：環保局稽查資料】", "context": "家用垃圾違規棄置件數（試點區）"}]
}
```
- `updated`: `git log -1 --format=%cs -- <folder>`. `null` if git fails.
- 5.4 相關故事: split on 「 vs 」. Each side: all story IDs in it.
- 6.2: a solution's stories are all IDs in the Must and Should/Could columns.
- `pending`: every `【待補…】` in the file, with the nearest `##`/`###` heading.
- A section that cannot be read → exit 1 with `<folder>: <section>: <reason>`.

Tests on #2 (numbers after Task A4):
- story count 45; conflict count 7; solution count 4; group count 11
- C6: `sideA` has `I01-US01`; `sideB` has `I06-US01`, `I07-US02`, `O12-US01`
- solution A's stories include `I06-US01`
- `pending` has an item from 6.3 and an item from step 7
- `index.json` has 6 issues; only #2 is available
- I12 is active; O02 has `movedTo: "I12"`
- a cell like `` `[AI模擬]` 文字 `` becomes `{"text": "文字", "tag": "AI模擬", "pending": false}`

### Task B2: one command for all checks

**Files:** create `analysis/build_all.sh`: runs `sync_stakeholders.py`, `build_csv.py` + `check_analysis.py` for each issue folder that has an `issue-analysis.md`, the unittest suite, then `build_json.py`. Stops at the first failure.

## Phase C: app

All app commands run in `app/`. UI text only in `src/i18n/zh-TW.ts`.

### Task C1: scaffold

1. Scaffold Vite React TS into `app/` (keep `design.md`, `plan.md`, `human-inputs.md`). Set `<html lang="zh-TW">` and the title 「提案小幫手」 (the name ETBlue chose in `human-inputs.md`).
2. Add Tailwind CSS v4 with `@tailwindcss/vite`.
3. Add the `@/` path alias, then `npx shadcn@latest init`. Add only: `tabs`, `toggle-group`, `badge`, `collapsible`, `input`.
4. Add Vitest (`npm test` runs `vitest run`) and React Router 7 with `createHashRouter`.
5. `vite.config.ts`: `base: '/pumadebugthon/'`.
6. `app/.gitignore`: `node_modules`, `dist`. `public/data/` is built, so also ignore it; tests use fixtures (C2).
7. Check: `npm run build` and `npm test` pass.

### Task C2: types, data loading, fixtures

**Files:** `src/types.ts` (matches the JSON in B1), `src/data.ts` (fetch `${import.meta.env.BASE_URL}data/index.json` and `data/issues/<folder>.json`, with a loading and an error state), `src/test/fixtures/` (copies of the #2 JSON made by `build_json.py`; a script `npm run fixtures` refreshes them).

### Task C3: tags and priority (test first)

**Files:** `src/lib/priority.ts`, `src/lib/priority.test.ts`, `src/i18n/zh-TW.ts`.

- `priorityLabel('M')` → `必須有`; S 應該有; C 可以有; W 這次不做.
- `priorityCounts(stories)` → list of `{tag, counts: [{priority, n}]}`, order M S C W, zero values left out, one entry per tag.

### Task C4: opinion check (test first)

**Files:** `src/lib/opinion.ts`, `src/lib/opinion.test.ts`.

- `pickList(issue)`: one item per W group (label = group summary) plus one per story with no group (label = want text). Item: `{key, label, storyIds}`.
- `filterPickList(items, query)`: substring match on the label; empty query returns all.
- `opinionResult(issue, storyIds)` → `{same, otherSide, solutions, notMentioned}`:
  - `same`: the picked stories
  - `otherSide`: conflicts where a picked story is on one side, with the other side's stories
  - `solutions`: solutions that list any picked story
  - `notMentioned`: stakeholders of the issue not in `same` or `otherSide`
- Tests on the #2 fixture: picking W08 → `otherSide` has C6 with `I01-US01`; `solutions` includes A and D; `same` has 3 stories from O12, I06, I07. Search 「人行道」 returns the W08 item.

### Task C5: stakeholder lookups (test first)

**Files:** `src/lib/stakeholders.ts`, `src/lib/stakeholders.test.ts`.

- `buildTree(stakeholders, pathLabels, counts)`: `counts` comes from `storyCountsByStakeholder(issues)`, so the caller chooses which issues to count. O tree by path prefix; I grouped by first level. First levels in a fixed order (gov, soe, ind, acd, ngo, cmt; res, mov, vis, wrk), decided by ETBlue on 2026-10-18. Node: `{path, label, children, stakeholders, storyTotal}`. Order by path, then ID.
- `storiesWithoutSolution(issue, stakeholderId)`
- `resolveId(stakeholders, id)`: a moved ID returns the new ID.
- `filterStakeholders(list, {crossIssueOnly, focus})`: moved IDs are left out; a stakeholder matches when it has ANY selected focus tag (ETBlue, 2026-10-18)
- Tests: `resolveId('O02')` → `I12`; the 臺北市 node's `storyTotal` equals the sum of its children; a stakeholder with every story covered returns `[]`.

### Task C6: space lookups (test first)

**Files:** `src/lib/spaces.ts`, `src/lib/spaces.test.ts`.

- `issuesBySpace(index, code)`, `solutionsBySpace(issues, code)`, `sameSpaceIssues(index, issueNumber)`.
- Tests on the fixture: `sidewalk` has issue 2 and solution A; `sameSpaceIssues` of #2 is empty while only #2 exists.

### Task C7: shared components

**Files:** `src/components/`: `Notice`, `TagBadge` (text badge, not color only), `CellText` (text + badge, 【待補】 style), `PriorityCounts` (with the legend from design 3.4), `StoryCard`, `Layout` (header, notice, footer with the GitHub link).

### Task C8: home page

**Files:** `src/pages/Home.tsx`, `src/components/IssueCard.tsx`, `src/components/StakeholderList.tsx`.

Design 3.1: issue cards with all fields, space filter, stakeholder list (O tree with Collapsible, I groups), filters (只看跨議題, 特別關注 chips with Toggle Group), the count note. No sorting by count.

### Task C9: issue page

**Files:** `src/pages/Issue.tsx` and one component per tab.

Design 3.2: Tabs (總覽 first). 總覽 includes 使用相同空間的議題 and 待補清單. 利害關係人 reuses `StakeholderList` for one issue. 衝突 and 解法 as in the design. The tab is part of the URL: `#/issues/2/conflicts`.

### Task C10: opinion check tab

**Files:** `src/components/OpinionCheck.tsx`. Search box (shadcn `input`), pick list, result in 4 parts (design 4.2), 「也出現在」 marks.

### Task C11: stakeholder page

**Files:** `src/pages/Stakeholder.tsx`. Design 3.3. A moved ID redirects with `resolveId`.

### Task C12: space page

**Files:** `src/pages/Space.tsx`. Design 3.6.

### Task C13: accessibility and phone check

Check every page with the keyboard only, and at 375 px width. Fix: focus order, visible focus, headings in order, no horizontal scroll. Run `npm run build`.

### Task C14: `app/README.md` (zh-TW)

Design section 10, including the reuse idea and the `[AI模擬]` warning in 「100 天內落地」. List the AI tools used: Claude Code (Claude Opus 5.5).

### Task C15: deploy — **GATE**

**Files:** `.github/workflows/pages.yml`: checkout with `fetch-depth: 0`, set up Python 3 and Node 22, run `analysis/build_all.sh`, `npm ci`, `npm test`, `npm run build` in `app/`, publish `app/dist` with `actions/upload-pages-artifact` and `actions/deploy-pages`.

**Stop here.** ETBlue turns on Pages (Settings → Pages → Source: GitHub Actions) and decides when to push.

## Phase D: issue #1 (trees)

Runs after Phase A, in parallel with Phases B and C.

### Task D1: #1 analysis — **GATE**

**Files:** create `analysis/1-trees/issue-analysis.md` and `user-stories.csv`. Update `analysis/stakeholders.csv`, `analysis/path-labels.csv`.

- Follow `analysis/human-inputs.md`, the #2 format and `analysis/ai-inputs.md` → Writing style. Notice at the top.
- Reuse IDs from `stakeholders.csv` for the same stakeholders (for example I06, I07, O05, O12, I09). New stakeholders get the next free number.
- 空間類型 for the issue and for each solution.
- Real data: only public files, cited in the appendix. Data go in the scratchpad. No scanning or load testing.
- Run `build_all.sh` until it passes.

**Stop here.** ETBlue reviews #1 before it is posted on Discord.

### Task D2: cross-issue tests

Add Vitest tests with the #1 + #2 fixtures: shared stakeholders show 「也出現在」, `sameSpaceIssues` of #2 includes #1, the cross-issue filter lists only shared stakeholders. Update the home page card field 跨議題共用的利害關係人.

## Phase U: UI update (design 3.1, 3.7–3.10)

ETBlue's notes for the UI are in `human-inputs.md`. Part 1 is U1. Part 2 is U2. Part 3 is U3.

### Task U1: theme, header, footer, list routes

**Files:** `src/index.css`, `index.html`, `src/theme.ts`, `src/lib/theme.ts`, `src/lib/counts.ts`, `src/components/Layout.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/ThemeToggle.tsx`, `src/pages/Issues.tsx`, `src/pages/Stakeholders.tsx`, `src/pages/Solutions.tsx`, `src/router.tsx`, `src/i18n/zh-TW.ts`.

1. Solarized tokens in `index.css` (design 3.10). Check AA contrast for every text, link, badge, border and focus color in both themes.
2. Theme toggle (test first for the pure part in `src/lib/theme.ts`). Inline script in `index.html` to avoid a flash.
3. Header with counts (test first: `src/lib/counts.ts`).
4. Footer (design 3.8).
5. Routes `#/issues`, `#/stakeholders`, `#/solutions`. The first two show the lists that were on the home page. `#/solutions` is a 「製作中」 page.

### Task U2: home page and list pages

**Files:** `src/pages/Home.tsx`, `src/pages/Solutions.tsx`, `src/lib/recent.ts`.

1. Test first: `recentIssues`, `recentStakeholders`, `recentSolutions` in `src/lib/recent.ts`. Sort by date, newest first, then by ID, highest first. Never by a count. An item with no date goes last.
2. Home page: hero and the three blocks (design 3.1), each with a link to its list page. Remove the old issue and stakeholder sections from the home page.
3. `#/solutions`: the solution list (design 3.9).
4. `#/wants`: the 訴求 list (design 3.9), added by ETBlue on 2026-10-18. The header link 訴求 goes there.
5. Check: keyboard only, 375 px and 1280 px, both themes, `npm test`, `npm run build`.

### Task U3: full-width hero, columns, no notice box, event link, watermark

**Files:** `src/index.css`, `src/components/Layout.tsx`, `src/components/Footer.tsx`, `src/components/Watermark.tsx`, `src/components/links.ts`, `src/components/styles.ts`, `src/pages/Home.tsx`, `src/router.tsx`, `src/i18n/zh-TW.ts`, `src/lib/contrast.ts`, `src/lib/tokens.ts`, `src/lib/layout.ts`. Remove `src/components/Notice.tsx`.

1. Test first: `contrastRatio`, `blend`, `worstContrast` (`src/lib/contrast.ts`), `parseTokens` (`src/lib/tokens.ts`), `isFullWidth` (`src/lib/layout.ts`), and `src/lib/designTokens.test.ts`, which checks the token contrast in `index.css`.
2. Full-width hero and 3 columns from `lg` (design 3.1, decision 15).
3. Remove the notice box (design 3.5, decision 16).
4. Footer link to the event page (design 3.8, decision 16).
5. Watermark (design 3.11, decision 17).
6. Check: 1280, 768 and 375 px, both themes, clicks through the watermark, no sideways scroll, no console errors, `npm test`, `npm run build`.

## Phase N: needs-based pages (design 3.2, 3.3, 3.12, 3.14–3.19)

Decided by ETBlue on 2026-10-20 (design decisions 34–42). The design follows the recommendations in design section 14 (Q1–Q13) until ETBlue decides otherwise.

**Rules for this phase** (on top of the rules at the top of this file):
- Pure logic goes in `src/lib/`, with Vitest tests written first. Components only show what `src/lib/` returns.
- All UI text goes in `src/i18n/zh-TW.ts`. Each task adds its own block (the namespace is given in the task), so tasks in parallel change different parts of the file.
- No scores, ranks or sorting by a count. Sort by the fixed order (M, S, C, W; the 6 特別關注 groups) or by ID / file order.
- Tags `[實證]` / `[AI整理]` / `[AI模擬]` always show with `TagBadge`, next to their text. The 「只看有資料根據」 filter (`?evidence=1`) works on every new list.
- Solarized tokens only. Headings in order, `aria` names, keyboard use, no sideways scroll at 360 px.
- Every task ends with `npm test`, `npx tsc -b` and `npm run build` in `app/`, all passing, and a local commit. Do not push until Task N12 passes.
- Real numbers for tests come from the fixtures (#1, #2, #8). Examples in this plan: #2 has 訴求 39, 衝突 9, 需求 21, 解法 5. I06 has 訴求 5, 衝突 4, 需求 4, 解法 4. #2 A covers 9 needs (12 not covered) and 14 stakeholders (13 not covered).

**Order and parallel groups:**

| Step | Tasks | Can run in parallel? |
|---|---|---|
| 1 | N1 | No. Everything else needs it. |
| 2 | N2a, N2b, N2c | Yes. Each one only creates new files in `src/lib/`. |
| 3 | N2d | No. It uses N2b and N2c. |
| 4 | N3 | No. It changes the router, the tab lists and the shared links. |
| 5 | N4 | No. It makes the shared components. |
| 6 | N5, N6, N7, N8, N9 | Yes, but only in separate git worktrees. They change different page files. They all add to `zh-TW.ts`, each in its own block, so a merge may need a small fix in that file. Without worktrees, run them one after another. |
| 7 | N10 | No. It checks links across all pages. |
| 8 | N11 | No. It needs the cross-issue data from `analysis/cross-issue/`. |
| 9 | N12 | No. The final check. |

### Task N1: refresh the fixtures and fix the broken tests (test first for `summary.ts`)

**Files:** `src/test/fixtures/index.json`, `src/test/fixtures/issues/1-trees.json`, `2-trashcans.json`, `8-smokefree.json`, `src/types.ts`, `src/types.test.ts`, `src/lib/summary.ts`, `src/lib/summary.test.ts`, and the tests that fail (expected: `types.test` #2 counts, `cellBasis`, `issuePage`, `priority`, `solutionPage` ×4, `spaces`, `summary`; about 11).

1. Run `analysis/build_all.sh <a scratchpad dir>` and copy its `index.json` and the three issue files over the fixtures.
2. `src/types.ts`: add the new fields, as `build_json.py` writes them (see its docstring):
   - `IssueFile.format: 'needs' | 'stories'`, `IssueFile.needGroups: NeedGroup[]` (`id`, `summary`, `tag`, `stories`), `IssueFile.needs: Need[]` (`id`, `kind: 'group' | 'story'`, `summary`, `stories`, `priority`, `priorityTag`, `reason: Cell`)
   - `Story.needGroup: string | null`
   - `Conflict.needsA`, `Conflict.needsB: string[]`, `Conflict.wayOut: Cell | null`, `Conflict.wayOutSolutions: string[]`
   - `Solution.needs: { must: string[]; shouldCould: string[] } | null`
3. Run `npm test`. For each failing test, check why. Update the expected numbers to the new data when the code is right. Fix the code when it is wrong. Write down each change in the commit message.
4. Test first: `parseSummaryRef` reads N groups (`N01`, `#1 N03`) as a new kind `need`. `summaryRefTo` links:
   - `N01` → `{ pathname: '/issues/2/needs', search: '?focus=N01' }` (with `evidence=1` when the filter is on). Return null when the N group is not in the issue.
   - `#1 N03` → `/issues/1/needs?focus=N03`.
   - W refs keep working (`W08` → opinion pick). Add a test for a W ref in each fixture that has one.
   - The test 「every reference in the fixtures has a link」 must pass for all three fixtures.
   The `needs` tab does not exist until Task N3. That is expected.

**Done when:** all tests pass with the new fixtures, and no test was deleted without a reason in the commit message.

### Task N2a: paths, the stakeholder filter and `?focus=` (test first) — parallel group 2

**Files (new):** `src/lib/entityPaths.ts`, `src/lib/entityPaths.test.ts`, `src/lib/stakeholderFilter.ts`, `src/lib/stakeholderFilter.test.ts`, `src/lib/focus.ts`, `src/lib/focus.test.ts`.

1. `entityPaths.ts` (design 3.3, 3.12, 3.15–3.17, 3.19):
   - `STAKEHOLDER_TABS = ['overview', 'wants', 'needs', 'solutions']`, `parseStakeholderTab(segment)`, `stakeholderTabPath(id, tab)` (`/stakeholders/I06`, `/stakeholders/I06/wants`)
   - `storyPath(issueNumber, storyId)` → `/stakeholders/I06/stories/2/I06-US01` (the stakeholder is the part before 「-」)
   - `wantPath(stakeholderId, issueNumber, key)`, `needPath(stakeholderId, issueNumber, key)`
   - `SOLUTION_TABS = ['overview', 'needs', 'stakeholders']`, `parseSolutionTab`, `solutionTabPath(issueNumber, code, tab)`
   - `movedStakeholderPath(pathname, oldId, newId)`: the same path with the new ID, and a story ID that starts with the old ID gets the new ID (design 3.3)
2. `stakeholderFilter.ts` (design 3.14): `STAKEHOLDER_PARAM = 'stakeholder'`, `stakeholderFilterOf(params, issueIds, stakeholders)` (resolves a moved ID; an ID not in the issue gives null), `withStakeholderFilter(params, id | null)`, `keptSearch(params)` (keeps `evidence` and `stakeholder`, drops `pick` and `focus`), `menuGroups(ids, stakeholders)` → `[{ group: 'O', items }, { group: 'I', items }]` in ID order (`compareIds`), empty groups left out.
3. `focus.ts` (design 3.2): `FOCUS_PARAM = 'focus'`, `focusElementId(value)` → `focus-<value>` for `conflicts`, `stakeholders`, `C\d+`, `N\d\d`, a story ID; null for anything else.

**Done when:** each function has tests for the normal case, an unknown value and a moved ID where it applies.

### Task N2b: needs (test first) — parallel group 2

**Files (new):** `src/lib/needs.ts`, `src/lib/needs.test.ts`.

1. `needKey(story)` → `story.needGroup ?? story.id`.
2. `NeedItem`: `need`, `summary: Cell` (the group's summary and tag, or the story's 以便… cell), `stories`, `stakeholders` (ID order), `solutions` (`{ solution, part: 'must' | 'shouldCould' }`, letter order), `conflicts` (the conflicts that list the key in `needsA` or `needsB`).
3. `issueNeeds(issue)` → `NeedItem[]` in the order of `issue.needs`. `needsByPriority(items)` → groups in the order M, S, C, W, empty groups left out.
4. `needsOfStakeholder(issue, id)` → its `NeedItem`s, each once, with `ownStories`.
5. `findNeed(issue, stakeholderId, key)` → `{ kind: 'found', item, ownStories }`, `{ kind: 'redirect', stakeholderId, key }` (a story ID in an N group, or a story of another stakeholder) or `{ kind: 'notFound' }`. `needView` for the need page (design 3.17).
6. `dataBasedNeeds(items)`: keep a need when at least one of its stories has a `[實證]` or `[AI整理]` 以便… cell. `needsForStakeholder(items, id | null)`.
7. Tests on #2: N01 has 9 stories and the stakeholders I01, I02, I07, I08, I10; I01 has N01 once (5 stories); O09-US01 is 這次不做 and no solution covers it; C1 lists N01; `findNeed(#2, 'I01', 'I01-US01')` redirects to N01; `findNeed(#2, 'I06', 'N01')` is not found. On #8: I06 has the need `I06-US01`.

**Done when:** the tests above pass, and nothing sorts by a count.

### Task N2c: wants and stories (test first) — parallel group 2

**Files (new):** `src/lib/wantList.ts`, `src/lib/wantList.test.ts`, `src/lib/storyPage.ts`, `src/lib/storyPage.test.ts`. Do not change `opinion.ts` here (Task N3 does).

1. `WantItem` = the opinion `PickItem` plus `stakeholders` (ID order), `conflicts` (a story of the item on a side) and `solutions` (they cover the need of one of its stories).
2. `issueWants(issue)` (the order of `pickList`), `wantsOfStakeholder(issue, id)`, `wantsForStakeholder(items, id | null)`, `findWant(issue, stakeholderId, key)` (same result kinds as `findNeed`), `wantView` (design 3.16).
3. `conflictView(issue, conflict)` → the stories of each side, the needs of each side (from `issue.needs`), the way out cell and its solutions, and `hasWayOut`. `conflictsForStakeholder(conflicts, id | null)`.
4. `storyPage.ts`: `findStory(issue, stakeholderId, storyId)` (found, redirect to the right stakeholder, not found) and `storyView(issue, story)` → want key, need key, W group and N group with the other stakeholders, conflicts, solutions (design 3.15).
5. Tests on #2: W08 has I06 and the other stakeholders of the group; I06 in #2 has the wants W08 and W11 and the conflict C6; C1 has needs N01 vs N06 and the way out A, B, D; `findWant(#2, 'I06', 'I06-US01')` redirects to W08; `findStory(#2, 'I01', 'I06-US01')` redirects to I06.

**Done when:** the tests above pass.

### Task N2d: counts for the tab labels and the solution coverage (test first)

**Files:** `src/lib/counts.ts`, `src/lib/counts.test.ts`, new `src/lib/tabCounts.ts`, `src/lib/tabCounts.test.ts`, `src/lib/solutionPage.ts`, `src/lib/solutionPage.test.ts`.

1. `needCount` counts the rows of `issue.needs` (design section 14, Q1). Update its comment and test.
2. `issueTabCounts(issue)` → `{ wants, conflicts, needs, solutions }`. #2: 39, 9, 21, 5.
3. `stakeholderTabCounts(issues, id)` → the same fields, summed over the issues (Q6). I06: 5, 4, 4, 4.
4. In `solutionPage.ts`: `solutionNeedCoverage(issue, solution)` → `{ covered, notCovered }` (NeedItems; each not-covered need with the other solutions that cover it), `solutionStakeholderCoverage(issue, solution)` → `{ covered, notCovered }` (stakeholder ID order, each with its covered and not-covered needs), `solutionWayOutConflicts(issue, solution)`.
5. `solutionTabCounts(issue, solution)`. #2 A: needs 9 / 12, stakeholders 14 / 13.

**Done when:** the numbers above are in the tests and pass.

### Task N3: routes, redirects, tab frames and shared links

**Files:** `src/router.tsx`, `src/lib/issuePage.ts` (+ test), `src/lib/opinion.ts` (+ test), `src/lib/summary.ts` (+ test), `src/lib/nav.ts` (+ test), `src/pages/Issue.tsx`, `src/pages/Stakeholder.tsx`, `src/pages/Solution.tsx`, new `src/pages/StakeholderStory.tsx`, `StakeholderWant.tsx`, `StakeholderNeed.tsx`, `src/components/issue/types.ts`, `src/i18n/zh-TW.ts` (blocks `issue.tabs`, `stakeholderPage.tabs`, `solutionPage.tabs`).

1. Test first in `issuePage.ts`: `ISSUE_TABS = ['overview', 'wants', 'needs', 'solutions']`. `legacyIssueTab(segment)` → the new tab and the search to add (`opinion` → `wants`, same query; `conflicts` → `wants`, `focus=conflicts`; `stakeholders` → `overview`, `focus=stakeholders`), else null.
2. Test first: `opinionPickTo` → `/issues/<n>/wants?pick=…`. `summaryRefTo`: a story → `storyPath`; a conflict → `/issues/<n>/wants?focus=C9`; an N group as in Task N1, now with `tabPath(n, 'needs')`. Same for another issue.
3. Test first: `activeNavItem` gives 利害關係人 for `/stakeholders/I06/needs/2/N07`, and 解法 for `/issues/2/solutions/A/needs` and `/solutions/cross/X1` (design 3.7).
4. Router (design 3.19): `issues/:number/solutions/:code/:tab?`, `stakeholders/:id/:tab?`, `stakeholders/:id/stories/:number/:storyId`, `stakeholders/:id/wants/:number/:key`, `stakeholders/:id/needs/:number/:key`. Old issue tabs redirect with `<Navigate replace>`. Moved stakeholder IDs redirect on every sub-route (`movedStakeholderPath`).
5. Tab frames: the issue page shows the 4 tabs with the count labels (`issueTabCounts`). For now, the 訴求 tab shows the old `OpinionTab` and `ConflictsTab` one after the other, the 需求 tab is empty, and the 總覽 tab adds the old `StakeholdersTab` at the end. The stakeholder page and the solution page get their tab lists with the counts; the current content goes in 總覽 for now. A tab change uses `keptSearch`.
6. The three new pages: find the issue and the item with the `src/lib/` functions, redirect or show the "not found" message with links. The content can be the h1 and the breadcrumb only; Task N8 fills them.

**Done when:** every URL in design 3.19 opens the right page or redirects; old URLs `#/issues/2/opinion?pick=W08`, `#/issues/2/conflicts`, `#/issues/2/stakeholders`, `#/stakeholders/O02/needs` work; tests pass.

### Task N4: shared components

**Files (new):** `src/components/StakeholderMenu.tsx`, `src/components/NeedItem.tsx`, `src/components/WantItem.tsx`, `src/components/ConflictView.tsx`, `src/components/FocusTarget.tsx` (or a hook `useFocusTarget`), `src/components/TabCountLabel.tsx`. **Change:** `src/components/StoryCard.tsx`, `src/components/StoryList.tsx`, `src/i18n/zh-TW.ts` (block `stakeholderMenu`, `need`, `want`, `conflict`).

1. `StakeholderMenu` (design 3.14): two modes (`filter` for the issue page, `switch` for the stakeholder page), links, `aria-current`, the sticky left column from `lg`, the Collapsible below `lg`, the status line with 「清除篩選」.
2. `NeedItem` and `WantItem`: the parts listed in design 3.2 (訴求 and 需求 tabs). Props choose which parts show, so the issue tabs, the stakeholder tabs and the solution tabs can use them.
3. `ConflictView`: the conflict as in design 3.2 (sides, 雙方的需求, 以需求為本的解方, 「備案：審議方法」).
4. `useFocusTarget`: reads `?focus=`, waits for the content, scrolls to `focus-<value>` and focuses it.
5. `StoryCard`: the story ID links to `storyPath`. Optional links 「訴求」 and 「需求」.

**Done when:** the components build, and `StoryCard` links work on the existing pages. Check with the keyboard at 360 px.

### Task N5: issue page 訴求 tab — parallel group 6

**Files:** new `src/components/issue/WantsTab.tsx`; change `src/components/issue/OpinionTab.tsx`, `src/components/issue/ConflictsTab.tsx` (merge into the new tab, or keep them as parts of it), `src/pages/Issue.tsx` (only the `TAB_CONTENT` line), `src/i18n/zh-TW.ts` (block `wantsTab`).

Design 3.2 訴求 and section 4: the menu and the data toggle, 「訴求與意見健檢」 with the pick list (now `WantItem`s with stakeholders and 「有衝突」), the opinion result, then 「衝突」 with `ConflictView`. The stakeholder filter applies to the wants and the conflicts. `?pick=` and `?focus=C1` / `?focus=conflicts` work.

**Done when:** `#/issues/2/wants?stakeholder=I06` shows 2 wants (W08, W11) and 1 conflict (C6); `#/issues/2/wants?focus=C6` focuses C6; the old opinion URLs still open with the item picked.

### Task N6: issue page 需求 tab, 解法 tab and 總覽 — parallel group 6

**Files:** new `src/components/issue/NeedsTab.tsx`; change `src/components/issue/SolutionsTab.tsx`, `src/components/issue/OverviewTab.tsx`, `src/components/issue/StakeholdersTab.tsx` (used inside the overview), `src/pages/Issue.tsx` (only the `TAB_CONTENT` line), `src/i18n/zh-TW.ts` (blocks `needsTab`, `solutionsTab`, `overview`).

1. 需求 tab (design 3.2): grouped by priority, each `NeedItem` with stakeholders, stories (Collapsible), solutions, conflicts. The filter rule for 以便… cells. `?focus=N01`. The old-format note (Q10).
2. 解法 tab: covered needs in the two 6.2 parts, 解開的衝突, the stakeholder filter with 「這個解法還涵蓋其他 N 個需求」.
3. 總覽: the 「利害關係人」 section at the end (`focus-stakeholders`), the counts row with the new links and the 需求 count.

**Done when:** `#/issues/2/needs` shows 21 needs in 4 priority groups at most; `?stakeholder=I01` shows N01 once; `#/issues/2?focus=stakeholders` focuses the section.

### Task N7: stakeholder page tabs — parallel group 6

**Files:** `src/pages/Stakeholder.tsx`, new `src/components/stakeholder/OverviewTab.tsx`, `WantsTab.tsx`, `NeedsTab.tsx`, `SolutionsTab.tsx`, `src/lib/stakeholderPage.ts` (+ test, only if a view function needs a change), `src/i18n/zh-TW.ts` (block `stakeholderPage`).

Design 3.3: the 4 tabs with summed counts, an h2 per issue in each tab, the menu in `switch` mode, the moved-ID note. 解法 tab: 「尚未有解法涵蓋的需求」 replaces 「沒有解法涵蓋的故事」.

**Done when:** I06 shows 訴求 5・衝突 4, 需求 4, 解法 4; the menu goes to the same tab of another stakeholder; `#/stakeholders/O02/wants` lands on `#/stakeholders/I12/wants?from=O02`.

### Task N8: story, want and need pages — parallel group 6

**Files:** `src/pages/StakeholderStory.tsx`, `src/pages/StakeholderWant.tsx`, `src/pages/StakeholderNeed.tsx`, `src/i18n/zh-TW.ts` (blocks `storyPage`, `wantPage`, `needPage`).

Design 3.15, 3.16, 3.17: breadcrumbs, h1, page titles, all the parts in the tables, the redirects and the "not found" messages.

**Done when:** `#/stakeholders/I06/stories/2/I06-US01`, `#/stakeholders/I06/wants/2/W08`, `#/stakeholders/I06/needs/2/N07` show their parts; `#/stakeholders/I01/needs/2/I01-US01` redirects to `…/N01`; `#/stakeholders/I01/stories/2/I06-US01` redirects to I06.

### Task N9: solution page tabs — parallel group 6

**Files:** `src/pages/Solution.tsx`, new `src/components/solution/OverviewTab.tsx`, `NeedsTab.tsx`, `StakeholdersTab.tsx`, `src/i18n/zh-TW.ts` (block `solutionPage`).

Design 3.12: the header above the tabs, 總覽 with 解開的衝突, the 需求 tab (covered by priority; not covered with 「由其他解法涵蓋」), the 利害關係人 tab (covered and not covered, with their needs). Labels with counts from `solutionTabCounts`.

**Done when:** `#/issues/2/solutions/A` shows 「需求　涵蓋 9・未涵蓋 12」 and 「利害關係人　涵蓋 14・未涵蓋 13」; an unknown tab shows the message with links.

### Task N10: link sweep and list pages

**Files:** `src/pages/Solutions.tsx`, `src/lib/solutionList.ts` (+ test), `src/pages/Space.tsx`, `src/pages/Home.tsx`, `src/components/SolutionCard.tsx`, any file that still links to `/opinion`, `/conflicts` or the `stakeholders` issue tab, `app/README.md` (only if it describes the old tabs), `src/i18n/zh-TW.ts` (block `solutionsList`).

1. `#/solutions` and `SolutionCard`: 「涵蓋 9 個需求」 instead of the story count (Q12). Test first in `solutionList.ts` if it computes the number.
2. Search the code for old paths (`'opinion'`, `'conflicts'`, `tabPath(…, 'stakeholders')`) and for story IDs shown without a link. Change them to the new paths and `storyPath` (Q13).
3. The opinion check result (4.2): story IDs link to story pages.

**Done when:** `grep` finds no old tab paths in `src/` except in `legacyIssueTab` and its test; all tests pass.

### Task N11: cross-issue solutions (needs the data from `analysis/cross-issue/`)

**Input:** the cross-issue JSON from the other agent. Before you start, read the real file and its writer in `analysis/build_json.py`. Compare it with the draft shape in design 3.18. If the shape is different, follow the real data and update design 3.18 in the same commit. If the data has no file yet, stop and report.

**Files:** `src/types.ts` (new `CrossIssueFile` type), `src/data.ts` (`useCrossIssue`, null for a missing file), new `src/lib/crossIssue.ts` (+ test, on a new fixture `src/test/fixtures/cross-issue.json` copied from the real build), new `src/pages/CrossSolution.tsx`, `src/router.tsx` (`solutions/cross/:code`), `src/pages/Solutions.tsx`, `src/components/issue/SolutionsTab.tsx`, `src/components/solution/OverviewTab.tsx`, `src/lib/counts.ts` and `src/lib/recent.ts` (Q9), `src/pages/About.tsx` and `src/lib/dataFiles.ts` (list the new JSON file), `src/i18n/zh-TW.ts` (block `crossIssue`).

1. Test first: `crossSolutionPath(code)`, `findCrossSolution`, `crossSolutionsOfIssue(data, issueNumber)`, `crossSolutionsOfSolution(data, issueNumber, code)`, the issue filter rule on `#/solutions`, and the header count with and without the file.
2. The parts in the design 3.18 table.

**Done when:** with the file, every part in design 3.18 shows; without the file, the app works as before and no request error shows in the console.

### Task N12: accessibility and phone check (Playwright)

**Files:** a script in the scratchpad only (not in the repo); fixes in any app file.

1. `npm run build`, then `npx vite preview --port 4311` in `app/` (in the background).
2. A Playwright script (import `~/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs`) opens these pages at 360 px, 375 px, 768 px and 1280 px, in both themes: `#/`, `#/issues/2`, `#/issues/2/wants`, `#/issues/2/wants?stakeholder=I06`, `#/issues/2/needs`, `#/issues/2/solutions`, `#/stakeholders/I06`, `#/stakeholders/I06/wants`, `#/stakeholders/I06/needs`, `#/stakeholders/I06/solutions`, `#/stakeholders/I06/stories/2/I06-US01`, `#/stakeholders/I06/wants/2/W08`, `#/stakeholders/I06/needs/2/N07`, `#/issues/2/solutions/A`, `…/A/needs`, `…/A/stakeholders`, `#/solutions`, and a cross-issue page when the data exists.
3. On each page, check:
   - no sideways scroll (`document.documentElement.scrollWidth <= innerWidth`)
   - **the header at 360 px:** the app name 「市政提案小幫手」 fits on the first row, does not wrap in the middle of the name, and does not overlap the links or the theme button (decision 42)
   - one h1, and no heading level is skipped
   - every tab list has an `aria-label`; tabs work with the arrow keys and Enter
   - the stakeholder menu: keyboard order before the tabs; `aria-current` on the current item; at 360 px it is a closed Collapsible that opens with Enter
   - `?focus=` moves keyboard focus to the target
   - no console errors
4. Take screenshots at 360 px and 1280 px of the issue 訴求 tab, the stakeholder 需求 tab and the solution 利害關係人 tab. Look at them.
5. Fix what fails, then run all the checks again.

**Done when:** every check passes on every page, `npm test` and `npm run build` pass, and the report lists what was fixed.
