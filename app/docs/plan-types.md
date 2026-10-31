# Build plan: domain types, solution types and split space types

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Every subagent brief must repeat ETBlue's plain-English rule (short sentences, common words, main point first, no idioms, lists and tables).

**Goal:** tag every issue with 領域 (domain types) and every solution with 解法類型 (solution types), make space types and domain types a 2-level list, split the space types `sidewalk` and `indoor` into exact types, and build a list of cross-issue combine candidates with rule R3.

**Architecture:** three new or changed reference files in `analysis/data/` hold the fixed lists. Each `issue-analysis.md` gets a 「領域：」 line and two new 6.1 columns. The Python scripts read, check and export the new fields. A new script writes the R3 candidate list. The app needs only test and fixture updates in this plan. The app UI for the new types is a separate plan after a design session (Part 3).

**Tech stack:** Python 3 standard library (run with `python3 -I`), `unittest`; Vite + React + TypeScript + Vitest in `app/`.

**Spec:** `analysis/docs/types-research.md` (already in the repo, not committed yet; Task 1 commits it). Use 「Round 3」 for the lists and the domain tags, and 「Round 2」 for everything Round 3 does not change. The decisions below override anything in it.

## Decisions (ETBlue, 2026-10-30 and 2026-10-31)

1. Domains are the official 政事別 list of Taipei: 8 大分類 (level 1) and 28 中分類 (level 2), as in spec R3.2. The full list is used, also items with no issue yet. Items that only the central government uses are left out. No `greenery`; #1 is `environment`.
2. 13 solution types, as listed in the spec (R2.1).
3. A solution has 1 to 3 solution types.
4. A solution gets its own 領域 only when it differs from its issue's 領域.
5. `sidewalk` is split into `sidewalk-walkway` and `sidewalk-furniture`. `indoor` is split into `indoor-home`, `indoor-common`, `indoor-business` and `indoor-public`. `crossing` and `alley` are added.
6. **Space types have 2 levels** (spec R3.1). The 4 level 1 codes are `road`, `underground`, `public-space` and `building`, the 4 groups of today. The `sidewalk-…`, `crossing` and `alley` codes are under `road`. The `indoor-…` codes are under `building`. There are no groups 「人行道」 or 「室內」.
7. The old links `#/spaces/sidewalk` and `#/spaces/indoor` will stop working. No redirects.
8. The 5 special retags in the spec (6-B, 6-F, 12-D, 1-B, 10-F) are accepted.
9. Candidate rule R3: two solutions from different issues are a candidate when (a) they share a solution type, and (b) they share a domain, or a solution-level space type, or the shared type is `open-data` or `intake`, and (c) both are in the same X-N group or the same cross-issue 1.2 row.
10. A shared stakeholder with different needs (the X-L case) does not make a candidate. People can still add such an X- solution by hand.
11. Both lists have exactly 2 levels. Only level 2 codes go on issues and solutions. The level 1 code comes from the parent.
12. Matching (rule R3) uses level 2 codes only.
13. Solution, need and conflict IDs use one capital letter and a number with no zero padding (ETBlue, 2026-10-31).
    - Cross-issue: solutions `X-S1`, `X-S2` …; needs `X-N1`, `X-N2` …; conflicts `X-C1` … (already this format). Solutions map in today's order: X-A → X-S1 … X-M → X-S13. Needs keep their numbers: X-N01 → X-N1 … X-N20 → X-N20.
    - Issue solutions: `解法 S1`, `S2` … inside an issue; the full ID is `1-S1`, `6-S3`. Letters map in order: A → S1, B → S2 …
    - Other issue-level IDs (`N01`, `W01`, `O01`, `I01-US01`, `C1` …) do not change.
    - No redirects; the old links were not shared.
14. A solution's own 領域 replaces the issue's 領域 (ETBlue, 2026-10-31). So `domains` = `ownDomains`, or else the issue's domains. Rule R3 gives 133 candidates, 63 not in any X- solution.

## Global constraints

- Follow `CLAUDE.md`. Plain English in every report, commit message, comment and English doc. Analysis text is zh-TW.
- Types are labels only. No scores, weights or ranks. Never sort by counts. Lists sort by issue number, then solution ID.
- Do not read `.confidential/`. Do not edit any `human-inputs.md`. Do not edit `docs/`.
- Each task runs in a worktree (`isolation: worktree`): `git reset --hard main` first, symlink only `app/node_modules`. The main session cherry-picks.
- Stage files by name. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- After any change to an analysis file, run a non-CI `analysis/scripts/build_all.sh <scratch>` and commit `analysis/data/updated-dates.csv`.
- Checks before each push: `CI=true analysis/scripts/build_all.sh <scratch>`, `python3 -I -m unittest discover -s analysis/tests -t . -p 'test_*.py'`, and in `app/`: `npm run data`, `npx vitest run`, `npx tsc -b`, `npx vite build`.
- **GATE** tasks stop and wait for ETBlue. Push only after ETBlue says OK.

## Review focus

1. #9 has 「空間類型：無」. It still needs a 「領域：」 line. Its 6.1 解法類型 cells are required; 領域 cells stay empty. Test: #9 passes the check after migration.
2. A solution's 領域 cell that repeats a code from the issue's 「領域：」 line must fail with a clear message (decision 4). Test in Task 2.
3. An unknown code, an empty 解法類型 cell, or more than 3 solution types must fail with the solution ID in the message. Tests in Task 2.
4. No old `sidewalk` or `indoor` code may stay anywhere (issue files, cross-issue, template, docs examples, app fixtures and tests). Test: the space-code check already rejects unknown codes; Task 4 and Task 5 end with a `grep` that must print nothing.
5. A level 1 code used as a tag (for example `road` in 空間類型, or `social-welfare` in 領域) must fail with a clear message. A row whose 上層 is unknown or is itself a level 2 code must fail. A level 1 row with no child must fail. Tests in Task 1 and Task 2.
6. The candidate list must list each pair once (`1-A ~ 3-A`, never also `3-A ~ 1-A`), never pair two solutions of the same issue, and keep a stable order. Tests in Task 6.

---

## Part 1: types in the analysis data

### Task 1: spec file and reference lists

**Files:**
- Commit: `analysis/docs/types-research.md` (already in the working tree; do not change it)
- Create: `analysis/data/domain-types.csv` (UTF-8 with BOM), columns `代碼,名稱,上層,說明,政事別,陳情系統主類別`, 8 level 1 rows (empty 上層) and 28 level 2 rows from spec R3.2. 說明 is one short zh-TW sentence based on the scope text in the national standard (spec R3.2 lists the source). 陳情系統主類別 comes from spec R2.1 and is empty for children with no issue yet
- Create: `analysis/data/solution-types.csv` (UTF-8 with BOM), columns `代碼,名稱,說明,判斷方式,政策工具`, 13 rows from spec round 1 section 2.2
- Modify: `analysis/scripts/analysis_common.py`: add readers `domain_types(analysis_dir)` and `solution_types(analysis_dir)` next to the existing space-type reader, returning `{code: row}` in file order. Add one shared check for a 2-level list: every 上層 is empty or the code of a row with an empty 上層, and a level 1 row has at least one child
- Modify: `analysis/scripts/update_dates.py`: treat 領域類型 and 解法類型 rows like 空間類型 rows (they keep a 新增日期)
- Test: `analysis/tests/test_analysis_common.py`, `analysis/tests/test_update_dates.py`

**Interfaces:**
- Produces: `analysis_common.domain_types(analysis_dir) -> dict[str, dict]`, `analysis_common.solution_types(analysis_dir) -> dict[str, dict]`. Both raise the existing read error type when a code repeats or a column is missing.
- Produces: `analysis_common.leaf_codes(rows) -> list[str]` (level 2 codes in file order) and `analysis_common.check_two_levels(rows, file_name)` (raises the read error type). Task 3 uses both for `space-types.csv`.
- Produces: `update_dates.py` types `領域類型` and `解法類型`.

- [ ] **Step 1: Write the failing tests.** In `test_analysis_common.py`: the real files load; the domain list has 36 rows and 28 level 2 codes, and the solution list 13; a level 2 row with an unknown 上層 fails; a row whose 上層 is a level 2 code fails; a level 1 row with no child fails; a temp copy with a repeated code fails; a temp copy without the 說明 column fails. In `test_update_dates.py`: a new row in `domain-types.csv` gets today's 新增日期.
- [ ] **Step 2: Run them and see them fail.** `python3 -I -m unittest analysis.tests.test_analysis_common analysis.tests.test_update_dates -v`
- [ ] **Step 3: Add the CSV files, the readers and the update_dates change.** Do not change `space-types.csv` in this task. Task 3 does it together with the issue files, so every commit builds.
- [ ] **Step 4: Run the tests and see them pass.** Then run all checks in the Global constraints.
- [ ] **Step 5: Commit** the spec copy, the two new CSV files, the script and test changes.

### Task 2: read and check 領域 and 解法類型

> Tasks 2 and 3 run in the same worktree, one after the other. After Task 2 the real issue files do not have the new format yet, so the full build fails until Task 3 is done. The main session cherry-picks both commits together.

**Files:**
- Modify: `analysis/scripts/analysis_common.py` (format notes at the top: the 「領域：」 line and the two 6.1 columns)
- Modify: `analysis/scripts/build_json.py`: read the 「領域：」 line (the line right after 「空間類型：」); read the 6.1 columns 「解法類型」 and 「領域」
- Modify: `analysis/scripts/check_analysis.py`: the checks below
- Modify: `analysis/scripts/build_flat.py`: export the new fields
- Modify: `analysis/scripts/update_dates.py`: add `solutionTypes` and `domains` to `SOLUTION_KEYS`
- Test: `analysis/tests/test_build_json.py`, `analysis/tests/test_check_analysis.py`, `analysis/tests/test_build_flat.py`

**Format:**
- Issue header, line 4: `領域：` then 1 to 3 codes from `domain-types.csv` in backticks, separated by 「、」. Example: ``領域：`environment`、`health` ``.
- 6.1 header: `| 代號 | 解法 | 空間類型 | 解法類型 | 領域 | 新增日期 | 一句話說明 |`
- 解法類型 cell: 1 to 3 codes from `solution-types.csv` in backticks, separated by 「、」.
- 領域 cell: empty, or 1 to 3 codes that are **not** on the issue's 「領域：」 line.
- Every 領域 code (header and cell) must be a level 2 code. A level 1 code fails with a message that names the code and says to use one of its children.
- The old 6.1 header (without the two columns) is still read for the old-format fixture only, if the fixture uses it today. Do not change the frozen fixture `analysis/tests/fixtures/old-format/`.

**Interfaces:**
- Produces in the issue JSON: `issue.domains: list[str]`; each solution gets `solutionTypes: list[str]`, `ownDomains: list[str]` (the 6.1 cell, maybe empty) and `domains: list[str]` (ownDomains if not empty, else the issue's domains).
- Produces in `build_flat.py` output: the same three fields on each solution row, and `domains` on each issue row, joined with 「、」 like the existing `spaces`.

- [ ] **Step 1: Write the failing tests** in `test_check_analysis.py`, using the existing `edit()` and `run_check()` helpers. The real files do not have the new format until Task 3. So add a helper `to_new_format()` in the test class: it edits the temp copy of #2 to add ``領域：`environment` `` and the two 6.1 columns (解法類型 `participation` on every row, 領域 empty). Each case starts from that and changes one thing. Cases:
  - no 「領域：」 line → fails, message names 「領域」
  - unknown domain code `foo` → fails, message names `foo`
  - 解法類型 cell empty for solution A → fails, message names `solution A`
  - 4 solution types → fails, message says at most 3
  - unknown solution type → fails
  - 領域 cell repeats the issue's domain → fails, message says only when different
  - a level 1 domain code (`community-environment`) on the 「領域：」 line → fails, message names the code
  - a valid own domain (`welfare-services` on a solution of an `environment` issue) → passes
- [ ] **Step 2: Write the failing tests** in `test_build_json.py`: the JSON of a valid edited #2 has `domains`, `solutionTypes`, `ownDomains` and `domains` on each solution as in the Interfaces block.
- [ ] **Step 3: Run them and see them fail.**
- [ ] **Step 4: Implement** in `build_json.py` (reading and errors), `check_analysis.py` (the rules), `build_flat.py`, `update_dates.py`.
- [ ] **Step 5: Run the new tests and see them pass.** Other tests and the full build still fail until Task 3 migrates the issue files.
- [ ] **Step 6: Commit.**

### Task 3: migrate the issue files and the template

**Files:**
- Modify: every `analysis/<n>-…/issue-analysis.md` (#1–#6, #8–#12)
- Modify: `analysis/0-template/issue-analysis.md`, `analysis/0-template/README.md`
- Modify: `analysis/data/space-types.csv`: rename the column `分組` to `上層`; add the 4 level 1 rows (`road` 道路, `underground` 地下, `public-space` 公共空間, `building` 建築); set 上層 on every other row to the level 1 code; remove `sidewalk` and `indoor`; add the 8 rows from spec R2.1 (上層 per decision 6). 說明 is one short zh-TW sentence, the same style as the other rows
- Modify: `analysis/scripts/build_json.py`, `analysis/scripts/update_dates.py` (`SPACE_COLS`), `analysis/scripts/check_analysis.py`: read `上層`; run `check_two_levels`; a level 1 space code on an issue or solution fails. The JSON `spaceTypes` list keeps only level 2 rows, and each keeps `group` = the 名稱 of its parent, so the app does not change. Each row also gets `parent` (the level 1 code). A new JSON list `spaceGroups` holds the level 1 rows (`code`, `name`, `description`)
- Modify: `analysis/docs/method.md`, `analysis/docs/data-guide.md` (explain 領域 and 解法類型; replace `sidewalk` examples)
- Modify: `analysis/data/updated-dates.csv` (from the non-CI build)

**Interfaces:**
- Consumes: Task 1 lists, Task 2 format.

- [ ] **Step 1:** For each issue, set the 「空間類型：」 header from spec R2.2 「Issues」, and add the 「領域：」 line from spec R3.3.
- [ ] **Step 2:** For each 6.1 row, set 空間類型 from the 「空間類型 (new)」 column and 解法類型 from spec R2.2 「Solutions」. Set 領域 from spec R3.3 (own domains). Keep every other cell as it is.
- [ ] **Step 3:** Update the template header and 6.1 example row, and the template README.
- [ ] **Step 4:** Update `method.md` and `data-guide.md`: what the two types are, the 2 levels of space and domain types and that only level 2 codes are used as tags, the official source of the domain list (臺北市 歲出政事別: 大分類 and 中分類), the 1–3 rule, the own-domain rule, and that types are labels only.
- [ ] **Step 5:** Run `grep -rn '`sidewalk`\|`indoor`' analysis --include='*.md' --include='*.csv'`. It must print nothing, except inside `analysis/docs/types-research.md` and `analysis/tests/fixtures/old-format/`.
- [ ] **Step 6:** Run the non-CI build, then all checks in the Global constraints. Fix test expectations that list exact spaces of a solution only when the new value is the migrated value. List every such change in the report.
- [ ] **Step 7: Commit** (issue files, template, docs, `space-types.csv`, `updated-dates.csv`, test changes).

### Task 4: cross-issue file

**Files:**
- Modify: `analysis/cross-issue/cross-issue-analysis.md`: 4.1 table gets 「解法類型」 after 「空間類型」; recompute 空間類型 of each X- from its member solutions with the new codes
- Modify: `analysis/scripts/check_cross_issue.py` (`XS_HEADER`, read 解法類型, check: each X- 解法類型 cell has 1–3 known codes, and each code is used by at least one member solution)
- Modify: `analysis/scripts/build_json.py` (cross-issue JSON: `solutionTypes` on each X-)
- Test: `analysis/tests/test_check_cross_issue.py`, `analysis/tests/test_build_json_cross_issue.py`

**Interfaces:**
- Produces: cross-issue JSON field `solutionTypes: list[str]` on each X- solution.

- [ ] **Step 1: Write the failing tests:** an X- with an unknown type fails; an X- with a type that no member solution has fails; the JSON has `solutionTypes`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, then edit the cross-issue file. Use the types from spec R2.2 and the member list in 4.1.
- [ ] **Step 4:** Run the same `grep` as Task 3 Step 5 on `analysis/cross-issue`. It must print nothing.
- [ ] **Step 5:** Non-CI build, then all checks. **Commit.**

### Task 5: app tests and fixtures for the split space types

**Files:**
- Modify: `app/src/test/fixtures/**/*.json` and the test files that use `sidewalk` or `indoor` (spec R2.5 lists them)
- Modify: comments in `app/src/lib/types.ts` and `app/src/lib/entityPaths.ts` (or where they are)
- Modify: `app/src/lib/types.ts`: add the new optional JSON fields (`domains`, `solutionTypes`, `ownDomains`) to the types, without any UI use yet
- Modify: `app/src/lib/types.ts`: add the optional `parent` field on a space type and the optional `spaceGroups` list, without any UI use yet. The space list filter keeps using `group`
- Modify: `app/docs/design.md`: one new numbered decision (check the highest number first; insert before 「## 14. Open questions」) that records the split, decision 6 and decision 7; update the `#/spaces/sidewalk` example

- [ ] **Step 1:** Run `npm run data`, then `npx vitest run`. Note every failing test.
- [ ] **Step 2:** Update fixtures and tests to the new codes. Do not change what a test checks, only the code names.
- [ ] **Step 3:** Run `grep -rn "'sidewalk'\|\"sidewalk\"\|'indoor'\|\"indoor\"" app/src`. It must print nothing.
- [ ] **Step 4:** All checks in the Global constraints. **Commit.**

### Task 6 is in Part 2. Part 1 ends here.

- [ ] **GATE: Part 1 review.** The main session runs all checks on `main`, reports to ETBlue, and pushes only after ETBlue says OK.

---

## Part 2: cross-issue candidate list (rule R3)

### Task 6: candidate script

**Files:**
- Create: `analysis/scripts/cross_candidates.py`
- Create: `analysis/cross-issue/candidates.csv` (generated, committed)
- Modify: `analysis/scripts/build_all.sh` (new step; with `CI=true` it fails when the committed file differs from a rebuild, like the other generated files)
- Modify: `analysis/docs/method.md` (the rule in plain words, why a shared stakeholder alone does not count, and that the list only suggests: a person decides)
- Modify: `analysis/README.md` (one line about `candidates.csv`)
- Test: `analysis/tests/test_cross_candidates.py`

**Rule** (decision 9): for each pair of solutions (s, t) from different issues:
- `types = s.solutionTypes ∩ t.solutionTypes`; no pair if empty
- `domains = s.domains ∩ t.domains`, `spaces = s.spaces ∩ t.spaces` (level 2 codes only, decision 12)
- `platform = types ∩ {"open-data", "intake"}`
- no pair unless `domains` or `spaces` or `platform` is not empty
- `needs` = the X-N IDs and 1.2 rows that contain both s and t (a solution is in an X-N group when one of its 6.2 needs or stories is listed in that group for its issue; the same for a 1.2 row); no pair if empty

**Output columns:** `解法甲,解法乙,共同解法類型,共同領域,共同空間類型,共同需求,已在跨議題解法`. IDs like `1-A`. 解法甲 is the one with the lower issue number (then lower letter). Cells join codes with 「、」. 已在跨議題解法 lists the X- IDs that contain both, or is empty. Rows sorted by 解法甲 then 解法乙 (issue number as a number, then letter).

**Interfaces:**
- Consumes: issue JSON fields from Task 2 (`solutionTypes`, `domains`, `spaces`, solution stories and needs), cross-issue 2.1 X-N groups and 1.2 rows (reuse the parsing in `check_cross_issue.py` or `build_json.py`; do not write a second parser).
- Produces: `cross_candidates.candidates(issues, cross) -> list[dict]` (pure function), and `main(analysis_dir, out_path, check=False)`.

- [ ] **Step 1: Write the failing tests** with small in-memory inputs (no files):
  - two solutions of the same issue → no pair
  - shared type, shared domain, shared X-N → one pair, listed once, lower issue first
  - shared type and shared X-N, but no shared domain or space → no pair
  - same as above, but the shared type is `open-data` → one pair
  - shared domain and X-N, no shared type → no pair
  - shared type and domain, no shared need → no pair
  - a pair inside X-B → 已在跨議題解法 is `X-B`
  - order: pairs `(10-A, 12-B)`, `(2-A, 3-B)`, `(2-A, 10-C)` come out as `2-A~3-B`, `2-A~10-C`, `10-A~12-B`
- [ ] **Step 2: Run them and see them fail.** `python3 -I -m unittest analysis.tests.test_cross_candidates -v`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests and see them pass.**
- [ ] **Step 5:** Run the script on the real data. Compare with spec R3.4: about 139 candidates and 69 not in any X-. Small differences can come from Task 3 edits; explain each one in the report. Do not tune the rule to match.
- [ ] **Step 6:** Add the build step, the docs, the README line. All checks. **Commit.**

### Task 7: new solution and need ID format (decision 13)

Runs after Task 6 is merged, so the candidate list uses the new IDs too.

**Rename everywhere** except `human-inputs.md` files and `docs/`:
- issue solutions `A`, `B` … → `S1`, `S2` … (full IDs `1-A` → `1-S1`; references 「解法 A」 → 「解法 S1」, 「解法 A、B」 → 「解法 S1、S2」, 「#1 解法 A」 → 「#1 解法 S1」);
- cross-issue solutions `X-A…X-M` → `X-S1…X-S13`;
- cross-issue needs `X-N01…` → `X-N1…`.

Places: all 11 issue files and the 0-template, the cross-issue file, `analysis/related-proposals/`, `analysis/README.md`, the root `README.md`, `analysis/docs/*`, `app/docs/*`, scripts, tests, app code, app fixtures, i18n text, `candidates.csv`. History notes keep their meaning but use the new IDs.

**Rules:**
- New patterns: issue solutions `S[1-9]\d*` (full `\d+-S[1-9]\d*`), cross-issue solutions `X-S[1-9]\d*`, needs `X-N[1-9]\d*`, conflicts `X-C[1-9]\d*`. Old IDs (`A`, `1-A`, `X-A`, `X-N01`) must fail the check with a clear message.
- Do not mix up the kinds: `S1` (solution) vs `N01` (need) vs `C1` (conflict); `X-S1` vs `X-N1` vs `X-C1`. Tests for each.
- Sort by number: `S2` before `S10`, `X-S2` before `X-S10`, `X-N2` before `X-N10`. Check every sort in the scripts and in `app/src/lib/` (for example `listSort.ts`), with tests. Today letters and zero padding make text sorting work, so this is the main risk.
- `analysis/data/updated-dates.csv`: move each row from the old key to the new key, so the dates do not change only because of the rename.
- Add a numbered decision to `app/docs/design.md`.
- End with a `git grep` for the old IDs (outside `human-inputs.md`, `docs/`, the history in `analysis/docs/types-research.md`, and this plan, which keeps the old IDs as a record) that prints nothing.
- All checks. **Commit.**

- [ ] **GATE: Part 2 review.** Report the counts and the X- check (found, partly found, missed) to ETBlue. Push only after ETBlue says OK.

---

## Part 3: app UI for domain and solution types

Not planned yet. It needs a design session with ETBlue first (`superpowers:brainstorming`): where the types show (issue and solution pages, cards, list filters, maybe `#/domains` and `#/solution-types` pages like `#/spaces`), how level 1 shows (a page per parent, or only a filter), and whether `candidates.csv` shows in the app. After that session, write `app/docs/plan-types-ui.md`.

- [x] **GATE: design session with ETBlue.** Done on 2026-11-01. The plan is `app/docs/plan-types-ui.md`.
