# Build plan: cost ranges and a work breakdown with a Gantt chart (pilot on #2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Every subagent brief must repeat ETBlue's plain-English rule (short sentences, common words, main point first, no idioms, lists and tables).

**Goal:** in step 7 of issue #2 (`analysis/2-trashcans/issue-analysis.md`), each solution gets (a) a cost with time, money and man-day ranges, and (b) a work breakdown structure (WBS) with a Mermaid Gantt chart that replaces the 執行步驟 row. The checker, the JSON build and the app support the new format. Other issues keep the old format until ETBlue approves the pilot.

**Spec:** `analysis/docs/human-inputs.md`, step 7 (commit 23f15b8), and ETBlue's answers on 2026-11-04 (below).

**Tech stack:** Python 3 standard library (`python3 -I`), `unittest`; Vite + React 19 + TypeScript + Vitest in `app/`.

## Decisions (ETBlue, 2026-11-04)

1. Money and man-days are ranges marked `[AI模擬]`, for example 「約 NT$ 50–100 萬」, 「約 120–200 人天」.
2. 「時間」 is the total length of the work, for example 「約 6–9 個月」. The Gantt chart shows how that time splits into phases.
3. The WBS replaces the 執行步驟 row.
4. The chart is a Mermaid `gantt` chart.
5. Start with #2 as a pilot. Roll out to the other issues, the template and cross-issue 4.5 only after ETBlue approves.

## Format (binding for all tasks)

### 成本 row (in the 執行計畫 table)

The cell keeps the 低／中／高 word and its reason. It adds three parts, each with its own `[AI模擬]` tag:

```
`[AI模擬]` 成本中（人力與場地）。`[AI模擬]` 時間：約 6–9 個月；經費：約 NT$ 50–100 萬；人力：約 120–200 人天【待補：專業人士確認】
```

- Keep every existing 【待補：…】 in the cell (for example 【待補：市場詢價】).
- Every range ends with or is followed by 【待補：專業人士確認】 once per cell.
- The 7.n 總覽 table 成本 column stays 低／中／高. It does not change.

### 執行計畫 table

Rows in order: 主責單位, 需要的資料／API／資源, 成本. The 執行步驟 row is removed in the new format.

### 工作分解與時程 (new, right after the 執行計畫 table)

A table, then a Mermaid block. Both are required in the new format.

```
| 編號 | 工作項目 | 主責單位 | 期間 | 人天 |
|---|---|---|---|---|
| 1 | `[AI模擬]` 準備：… | 環保局 | 第 1–2 個月 | 約 20–40 |
| 1.1 | `[AI模擬]` … | 環保局 | 第 1 個月 | 約 10–20 |
| 2 | `[AI模擬]` 試點：… | … | 第 3–6 個月 | 約 60–100 |
| 2.1 | … | … | … | … |
```

- Two levels only. A level 1 row is a phase (for example 準備, 試點, 評估, 擴大). The phases come from the old 執行步驟 text, so no idea is lost.
- 編號: level 1 is `1`, `2`, …; level 2 is `1.1`, `1.2`, …. Rows sort by 編號. Every level 1 row has at least one level 2 row.
- 工作項目 starts with one tag, like other tables. Other cells have no tag; they are plain text and may be 【待補：…】.
- 期間 uses relative months: 「第 n 個月」 or 「第 n–m 個月」. No calendar dates.
- 人天 is a range 「約 a–b」 or 【待補：…】.

The Mermaid block:

```mermaid
gantt
  dateFormat YYYY-MM-DD
  axisFormat …
  section 1 準備
  1.1 …  :t1_1, …, 30d
  section 2 試點
  2.1 …  :t2_1, after t1_1, 90d
```

- One `section` per level 1 row, named 「<編號> <short name>」, in 編號 order.
- One task per level 2 row. The task name starts with its 編號. Its id is `t<編號 with . replaced by _>`.
- The chart must not look like a real calendar plan. Task 1 picks how (axis format, a fixed start date, a note under the chart, or another way), checks that it renders both on GitHub and with the `mermaid` npm package, writes the choice into `analysis/docs/method.md`, and the other tasks follow it.

## Global constraints

- Follow `CLAUDE.md`. Plain English in every report, commit message, comment and English doc. Analysis text and UI text are Traditional Chinese. UI text lives in `app/src/i18n/zh-TW.ts`.
- Do not read `.confidential/`. Do not edit any `human-inputs.md` or `docs/`.
- Neutral tone. No scores, weights, ranks or formulas. The checker does not add up man-days or compare totals.
- Do not write numbers that look like facts. All ranges are `[AI模擬]` estimates.
- Every app design decision gets a numbered entry in `app/docs/design.md`, in number order, before 「## 14. Open questions」. The highest number now is 180.
- The old format (執行步驟 row, no WBS) stays valid for every issue except #2 and for cross-issue 4.5. One issue file may not mix the two formats.
- Each task runs in a worktree (`isolation: worktree`): `git reset --hard main` first, symlink only `app/node_modules`. The main session cherry-picks.
- Stage files by name. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Checks (all must pass at the end of each task): `CI=true analysis/scripts/build_all.sh <scratch>`, `python3 -I -m unittest discover -s analysis/tests -t . -p 'test_*.py'`, and in `app/`: `npm run data`, `npx vitest run`, `npx tsc -b`, `npx vite build`.
- Do not push.

## Task 1: method, checker and JSON build for the new format

**Files:** `analysis/docs/method.md` (步驟 7 section), `analysis/scripts/analysis_common.py`, `analysis/scripts/check_analysis.py`, `analysis/scripts/build_json.py`, tests in `analysis/tests/`.

- [ ] In `method.md` 步驟 7, describe the new format exactly as in "Format" above, say it is a pilot on #2 (ETBlue, 2026-11-04), and say the old format is still valid until the rollout. Write the Mermaid date choice here.
- [ ] `check_analysis.py`: accept a solution section in either format. New format: 執行計畫 table without 執行步驟; then the WBS table with the exact header; then one ```` ```mermaid ```` block that starts with `gantt`. Check the 編號 rules, the 期間 and 人天 wording, the tag rule, that sections and tasks match the WBS rows one to one (by 編號 and order), and that one issue file does not mix formats. Error messages in the style of the existing ones.
- [ ] `build_json.py`: for the new format, add to each solution's JSON the WBS rows (編號, level, 工作項目 as cells with tags, 主責單位, 期間, 人天) and the Mermaid source text. Keep `steps` for the old format. Document the JSON shape in the module docstring.
- [ ] Unit tests for each new check (pass and fail cases) and for the JSON output, with small fixtures. A fixture must have at least two phases and two items in one phase, so that order and matching are really tested.
- [ ] If cross-issue code reads 執行步驟 from issue files, keep it working for both formats.

## Task 2: write the #2 pilot content

**Files:** `analysis/2-trashcans/issue-analysis.md`, `analysis/data/updated-dates.csv`.

- [ ] For each of S1–S5 in step 7: add time, money and man-day ranges to the 成本 cell; remove the 執行步驟 row; add the 工作分解與時程 table and the Mermaid chart. Turn the old 執行步驟 text into the phases and items. Keep all its facts and 【待補】 items.
- [ ] Keep each range in line with the 低／中／高 word and the other cells (主責單位, resources). Do not invent sources. Use 【待補：…】 for facts that need checking.
- [ ] Add a line to the change log at the top of the file (as lines 25–26 do), dated 2026-11-04.
- [ ] Run a non-CI `analysis/scripts/build_all.sh <scratch>` once and commit the new `updated-dates.csv` rows.

## Task 3: show the WBS and the Gantt chart in the app

**Files:** `app/src/types.ts`, `app/src/lib/solutionPage.ts` (+ test), `app/src/components/solution/PlanTab.tsx`, `app/src/i18n/zh-TW.ts`, test fixtures, `app/docs/design.md`, `app/package.json` (new dependency `mermaid`).

- [ ] On the 執行計畫 tab, when a solution has a WBS, show the WBS table and the Gantt chart in place of the 執行步驟 list. Solutions in the old format show the list as today.
- [ ] Render the chart with the `mermaid` package. Load it with a dynamic `import()` so it is a separate chunk and only loads on this tab. Show the WBS table even if the chart fails to render, and show a short error text from `zh-TW.ts`.
- [ ] Update `planIntro` and any text that names 執行步驟 so it fits both formats.
- [ ] Add tests (old format, new format, chart failure) and design decisions 181+ in `app/docs/design.md`.

## Review focus

1. Every fact and 【待補】 in the old 執行步驟 text of #2 is still in the WBS.
2. The checker fails when the Mermaid tasks and the WBS rows do not match, and when one file mixes formats.
3. Old-format issues build and show as before.
4. No range is shown as a fact: every range has `[AI模擬]` and the cost cell has 【待補：專業人士確認】.
