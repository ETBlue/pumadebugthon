# Build plan: roll out cost ranges, the work breakdown and the Gantt chart to all solutions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Every subagent brief must repeat ETBlue's plain-English rule (short sentences, common words, main point first, no idioms, lists and tables).

## Status (2026-11-11): done and pushed

All tasks are done. The checkboxes below were not ticked during the work. The last commit is 57c5b4a. All checks passed before the push. ETBlue's decisions during the rollout are in `analysis/docs/ai-inputs.md` (2026-11-09 and 2026-11-11 rows) and `analysis/docs/method.md`.

Open follow-ups:

| # | What is open |
|---|---|
| F1 | No second reviewer read the last 4.5 fixes (commit 27d1125): the member texts copied from the issue files, and the 「同上」 owner rows. |
| F2 | Three WBS rows said 環保局 and now say 「同上」, because the old text names no agency: X-S3 2.2, X-S7 2.3, X-S7 3.3. ETBlue has not confirmed this. |
| F3 | In 4.5, only the 可行性, 需要的資料／API／資源 and 成本 rows were brought up to date from the issue files. The 隱私, 其他顧慮與風險 and 災害風險 rows were not compared. |
| F4 | The cross-issue file has 280 【待補】 items (180 before the rollout). Most come from the copied member texts. |
| F5 | #11 S4 需要的資料 starts with 「`[AI模擬]` 需要：」. Other issue files do not use this prefix. |
| F6 | All ranges are `[AI模擬]` estimates without sources. The reviews checked only that they are consistent, not that they are realistic. |
| F7 | Some finished agent worktrees under `.claude/worktrees/` were locked and not removed. Their commits are all on main. |

**Goal:** every solution in step 7 of every issue, every combined solution in cross-issue 4.5, and the template use the new execution plan format that was tested on #2.

**Scope:**

| Part | File | Solutions |
|---|---|---|
| Issues | `analysis/<n>-…/issue-analysis.md` for #1, #3, #4, #5, #6, #8, #9, #10, #11, #12 | 58 |
| Cross-issue | `analysis/cross-issue/cross-issue-analysis.md`, section 4.5 | 13 (X-S1 to X-S13) |
| Template | `analysis/0-template/issue-analysis.md` | 1 |

**Spec:** the section 「成本範圍與工作分解（新格式）」 in `analysis/docs/method.md`. ETBlue approved the #2 pilot on 2026-11-09. The model is step 7 of `analysis/2-trashcans/issue-analysis.md`. The pilot plan is `analysis/docs/plan-wbs-pilot.md`.

**Tech stack:** Python 3 standard library (`python3 -I`), `unittest`; Vite + React 19 + TypeScript + Vitest in `app/`.

## Global constraints

- Follow `CLAUDE.md`. Analysis text and UI text are Traditional Chinese. Everything else is plain English.
- Do not read `.confidential/` or any parsed copy of it. Do not edit any `human-inputs.md` or `docs/`.
- Neutral tone. Never mention campaigns, candidates or parties. No scores, weights, ranks or formulas. Threat wording never names China.
- #6: never rate or rank a building or district, and never identify a private building.
- No places below district or main-road level. No new names of shops, schools, stops, communities or developers.
- All ranges are `[AI模擬]` estimates. Do not write numbers that look like facts. Do not invent sources. Facts that need checking go in 【待補：…】.
- Every old 執行步驟 fact and 【待補】 must still be in the new WBS. Every existing 【待補】 in the 成本 cell stays.
- Each range must fit the 低／中／高 word and the other cells of that solution. If a part of the solution has no known cost (for example 【待補：市場詢價】), say which parts the range leaves out, as #2 S2 does.
- The 7.n 總覽 成本 column does not change. MoSCoW does not change.
- Each task runs in a worktree (`isolation: worktree`): `git reset --hard main` first, symlink only `app/node_modules`. The main session cherry-picks.
- Stage files by name. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## Task order

Task 1 first. Tasks 2–6 run at the same time after Task 1. Task 7 after Tasks 2–6. Task 8 is done by the main session last.

## Task 1: support 4.5, update the rules and the template

**Files:** `analysis/scripts/check_cross_issue.py`, `analysis/scripts/build_json.py`, `analysis/docs/method.md`, `analysis/0-template/issue-analysis.md`, `analysis/0-template/README.md` if it names 執行步驟, `analysis/tests/`, and app files only if the cross-issue solution page needs them.

- [ ] `check_cross_issue.py`: 4.5 accepts the new format, with the same checks as `check_analysis.py` (reuse `analysis_common.step7_format` and `step7_schedule`; do not copy the code). Remove the comment and the error that treat a WBS table as unknown in 4.5. During this rollout, 4.5 may hold both formats. Task 7 makes it one format.
- [ ] `build_json.py`: a 4.5 section in the new format gets `schedule` in the same shape as an issue solution. Document this in the module docstring.
- [ ] App: check that the cross-issue solution page shows the WBS table and the chart. Fix it if it does not. Add a numbered decision in `app/docs/design.md` before 「## 14. Open questions」 only if the app changes. Check the highest number first.
- [ ] `method.md`: line 「先在 #2 試行」 changes to say the new format is the standard for all issues, cross-issue 4.5 and the template (ETBlue, 2026-11-09). Line 251 and the example row at line 269 change to fit. The 評估 (4.5) rule says 4.5 uses the same new format, and the rule for combined cost changes as in decision D1 below.
- [ ] Template: step 7 uses the new format with 【填寫】 placeholders. Line 29 no longer describes 「執行步驟」.
- [ ] Unit tests for the 4.5 new format: pass, WBS and chart do not match, and JSON output. A fixture must have at least two phases and two items in one phase.

**Decision D1 (combined solution cost).** `method.md` said the combined cost is 【待補：…】. The new format needs ranges. Each X-S 成本 cell keeps its text per member solution. It adds `[AI模擬]` ranges for the combined work and 【待補：專業人士確認】. The range must not be a plain sum of the member ranges, because combined work shares staff and sites. The WBS may not add facts that are not in the issue files (rule 「不加入新的事實」).

**Decision D2 (old format code).** The scripts and the app keep reading the old format. Old fixtures and tests stay. After the rollout, no analysis file uses it.

## Tasks 2–6: write the content for the issues

| Task | Issues | Solutions |
|---|---|---|
| 2 | #1, #3 | 12 |
| 3 | #4, #5 | 13 |
| 4 | #6, #8 | 11 |
| 5 | #9, #10 | 11 |
| 6 | #11, #12 | 11 |

For each solution in step 7 of each file:

- [ ] Add time, money and man-day ranges to the 成本 cell, in the format of #2.
- [ ] Remove the 執行步驟 row. Add the WBS table and the Mermaid chart right after the 執行計畫 table. Turn the old 執行步驟 text into the phases and items.
- [ ] Make each chart task match its 期間 (one month is 30 days; only the first task has a date), as `method.md` says.
- [ ] Add one line to the change log at the top of each file, dated 2026-11-09, in the style of the #2 line for this change.
- [ ] Run `python3 -I analysis/scripts/check_analysis.py` on each file you changed, or the way `analysis/scripts/build_all.sh` calls it. It must pass.
- [ ] Do NOT stage `analysis/data/updated-dates.csv`, `user-stories.csv` or generated files. Stage only the issue files, by name. Other tasks run at the same time. The main session updates the dates in Task 8.
- [ ] Do not change tests. Some tests may read the old format of an issue file. List the failures in your report. Task 7 fixes them.

The tests and the full build may fail in this task only for those reasons. Report any other failure.

## Task 7: cross-issue 4.5 and tests

**Files:** `analysis/cross-issue/cross-issue-analysis.md`, tests in `analysis/tests/` and `app/src/` that read real issue data in the old format, `analysis/README.md` and root `README.md` if they name the old format.

- [ ] For each of X-S1 to X-S13: use the new format and decision D1. Base the phases on the old 執行步驟 text and on the WBS of its member solutions.
- [ ] `check_cross_issue.py`: 4.5 now requires the new format for every section.
- [ ] Update the tests that read old 執行步驟 text from real data, in the same way as commit 89d3204. Do not weaken a test. Do not change a test only to make it pass.
- [ ] Add a change log line if the file has one.

## Task 8: main session

- [ ] Cherry-pick all commits. Remove the `node_modules` symlinks, the worktrees and the branches.
- [ ] Run a non-CI `analysis/scripts/build_all.sh <scratch>` once. Commit `analysis/data/updated-dates.csv` and any changed generated CSV.
- [ ] Run all checks in `CLAUDE.md`.
- [ ] Tell ETBlue the results. Push only after ETBlue says OK.

## Review focus

1. Every fact and 【待補】 in each old 執行步驟 text is still in the WBS.
2. No range is shown as a fact: every range has `[AI模擬]`, and each 成本 cell has 【待補：專業人士確認】.
3. Each range fits the 低／中／高 word. A 低 solution must not cost more than a 高 solution in the same issue without a reason in the cell. This is a check of the text only; do not add a score or rank.
4. No banned content: place names below district or main-road level, campaign wording, policy list names, naming China in threats, rating of buildings or districts.
5. `check_cross_issue.py` fails when a 4.5 chart and its WBS do not match.
