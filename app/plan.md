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

1. `analysis/issues.csv` (UTF-8 with BOM), columns `編號,資料夾,題目`. Rows #1–#6, titles from `docs/issues.md`:
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

1. Scaffold Vite React TS into `app/` (keep `design.md`, `plan.md`, `human-inputs.md`). Set `<html lang="zh-TW">` and the title 「市政議題利害關係人瀏覽器」 (ETBlue may rename).
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
