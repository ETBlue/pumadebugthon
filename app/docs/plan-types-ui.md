# Build plan: app UI for 領域, 解法類型 and the candidate pairs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Every subagent brief must repeat ETBlue's plain-English rule (short sentences, common words, main point first, no idioms, lists and tables).

**Goal:** show 領域 (domain types) and 解法類型 (solution types) in the app the same way space types show today, and show the cross-issue candidate pairs (rule R3) on each issue solution page.

**Architecture:** the Python build adds the type lists and the candidate pairs to the app JSON. The app reuses the `#/spaces` pages, helpers and cards for the two new kinds of type. It does not copy them. The app never computes rule R3 itself; it only shows `candidates.csv`.

**Tech stack:** Python 3 standard library (`python3 -I`), `unittest`; Vite + React 19 + TypeScript + Vitest in `app/`.

**Before this plan:** `app/docs/plan-types.md` Parts 1 and 2 are done and pushed (7247d6c). The design session with ETBlue was on 2026-11-01.

## Decisions (ETBlue, 2026-11-01)

1. 領域 and 解法類型 each get a list page and a detail page, built like `#/spaces`: `#/domains`, `#/domains/<code>`, `#/solution-types`, `#/solution-types/<code>`.
2. Level 1 (the space groups and the 政事別 大分類) is only a heading on the list page and a filter, as on `#/spaces` today. Only level 2 has a detail page. Tags show only the level 2 name.
3. `#/domains` shows all 28 領域. A 領域 that no issue uses shows 「尚無議題」, like an unused space type. (Today 9 are used and 19 are not.)
4. The candidate pairs show on issue solution pages, in a new tab 「可能合併」 at `#/solutions/<id>/candidates`. X- solution pages do not get this tab.
5. A solution's 領域 tags show whether they come from the issue or are the solution's own. By decision 14 of `plan-types.md`, they are either all from the issue or all its own, never mixed. Tags from the issue use a muted style and are followed by the text 「（沿用議題）」. Screen readers read the text too.
6. The detail pages show all fields: 領域 shows 上層, 說明, 政事別 and 陳情系統主類別. 解法類型 shows 說明, 判斷方式 and 政策工具.

## Global constraints

- Follow `CLAUDE.md`. Plain English in every report, commit message, comment and English doc. UI text is zh-TW and lives in `app/src/i18n/zh-TW.ts`.
- No scores, weights or ranks. Counts never decide an order. Lists sort as the data file does (type lists), or by issue number then solution ID (solutions and pairs). Use the numeric ID compare (`compareIds` / `compareCodes`), never plain text order.
- No redirects in the app.
- Every design decision gets a numbered entry in `app/docs/design.md`, in number order, before 「## 14. Open questions」. The highest number now is 151.
- Do not read `.confidential/`. Do not edit any `human-inputs.md` or `docs/`.
- Each task runs in a worktree (`isolation: worktree`): `git reset --hard main` first, symlink only `app/node_modules`. The main session cherry-picks.
- Reuse the space code. When a helper or component fits all three kinds of type, make it generic and use it for all three. Do not copy a page and change the names.
- Stage files by name. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Checks before each push: `CI=true analysis/scripts/build_all.sh <scratch>`, `python3 -I -m unittest discover -s analysis/tests -t . -p 'test_*.py'`, and in `app/`: `npm run data`, `npx vitest run`, `npx tsc -b`, `npx vite build`.
- **GATE** tasks stop and wait for ETBlue. Push only after ETBlue says OK.

## Review focus

1. A level 1 code never has a detail page. `#/domains/economic-development` shows the not-found page.
2. An unused 領域 still has a card and a detail page. Its tabs show the empty-state text and do not crash.
3. The 「（沿用議題）」 mark shows when the solution has no own 領域, and does not show when it has.
4. The 可能合併 tab lists each paired solution once, in issue number then ID order (`#4 S2` before `#12 S1`), with links. A pair already in an X- solution links to it. Empty 共同領域 / 共同空間類型 rows are left out.
5. No count decides any order. No "how many things they share" number appears.

---

## Part 1: data

### Task U1: type lists and candidate pairs in the app JSON

**Files:**
- Modify: `analysis/scripts/build_json.py` (and `analysis/scripts/analysis_common.py` if a reader is needed)
- Modify: `analysis/docs/data-guide.md`
- Test: `analysis/tests/` (the build_json tests)

**Add to `index.json`:**
- `domainTypes`: the level 2 rows of `domain-types.csv`, in file order. Fields: `code`, `name`, `parent`, `group` (the parent's 名稱), `description`, `budgetName` (政事別), `petitionCategory` (陳情系統主類別), `added`, `updated` (from `updated-dates.csv`, like space types).
- `domainGroups`: the level 1 rows, in file order (`code`, `name`, `description`).
- `solutionTypes`: the rows of `solution-types.csv`, in file order. Fields: `code`, `name`, `description`, `howToJudge` (判斷方式), `policyTool` (政策工具), `added`, `updated`.
- `domains` on each issue summary (the issue's 「領域：」 codes), as `spaces` is today.

**Add to `cross-issue.json`:**
- `domains` on each X- solution: the union of its member solutions' `domains`, in member order, each code once.
- `candidates`: the rows of `analysis/cross-issue/candidates.csv`, in file order. Fields: `a`, `b` (full IDs like `4-S2`), `solutionTypes`, `domains`, `spaces`, `needs` (X-N IDs and 1.2 rows, as in the CSV), `crossSolutions` (X- IDs). Read the CSV with the existing helpers. Do not run rule R3 again.

- [ ] Write failing tests for each new field (file order kept, level 1 not in `domainTypes`, the X- union keeps member order and has no repeats, `candidates` matches the CSV).
- [ ] Implement. Update `data-guide.md`.
- [ ] All checks. **Commit.**

---

## Part 2: app

### Task U2: types, fixtures and generic type helpers

**Files:**
- Modify: `app/src/types.ts` (make the optional fields from `plan-types.md` Task 5 required where the data now always has them; add `DomainType`, `DomainGroup`, `SolutionType`, `Candidate`, and the new index and cross-issue fields)
- Modify: `app/src/test/fixtures/*` (run `npm run fixtures`, then check the diff)
- Modify: `app/src/lib/spaces.ts`, `app/src/lib/spaceTabs.ts` → generic helpers that take the kind of type (space, domain, solution type)
- Test: the matching `*.test.ts`

The kinds differ in where the codes are:

| Kind | On an issue | On a solution |
|---|---|---|
| space | `spaces` | `spaces` |
| domain | `domains` | `domains` |
| solution type | none (an issue "uses" a solution type when one of its solutions has it) | `solutionTypes` |

- [ ] Write failing tests for the generic helpers with all three kinds (issues by type, solutions by type, stakeholders by type, groups for the list page; level 1 code returns nothing).
- [ ] Move the space helpers onto the generic ones. The space tests must still pass unchanged.
- [ ] All checks. **Commit.**

### Task U3: `#/domains` and `#/solution-types` pages and the menu

**Files:**
- Modify: `app/src/pages/Spaces.tsx`, `app/src/pages/Space.tsx`, `app/src/components/SpaceCard.tsx`, `app/src/components/SpaceTabMenu.tsx` → generic, or add thin wrappers over a shared page body
- Modify: `app/src/router.tsx`, `app/src/lib/nav.ts`, `app/src/lib/entityPaths.ts`, `app/src/components/Breadcrumb.tsx`
- Modify: `app/src/i18n/zh-TW.ts`
- Test: page and lib tests for both new kinds

**Pages:**
- `#/domains`: 8 headings (domainGroups, file order), cards under them (file order). Card: name, 說明, 議題 n 個 · 利害關係人 n 位 · 解法 n 個, or 「尚無議題」. Search by code or name. Filters 領域分類 and 議題, like `#/spaces`.
- `#/domains/<code>`: tabs 總覽 | 議題 | 解法 | 利害關係人. 總覽 fields: 上層, 說明, 政事別, 陳情系統主類別, dates.
- `#/solution-types`: 13 cards, no headings. Search. Filter 議題.
- `#/solution-types/<code>`: same tabs. 總覽 fields: 說明, 判斷方式, 政策工具, dates.
- A level 1 code or an unknown code shows the not-found page.

**Menu:** 議題 | 利害關係人 | 空間 | 領域 | 解法 | 解法類型. Detail pages belong to their list's menu item.

- [ ] Failing tests: routes, not-found for level 1 and unknown codes, empty states for an unused 領域, menu order, breadcrumbs, page titles.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task U4: tags on issue and solution pages and cards

**Files:**
- Modify: the issue page header and `IssueCard.tsx`; the solution page header, `SolutionCard.tsx` and the X- solution card (`app/src/components/solution/CrossSolutionCard.tsx`); `SpaceLinks.tsx` → a generic type-links component
- Modify: `app/src/i18n/zh-TW.ts`
- Test: component and page tests

| Where | 領域 | 解法類型 | 空間類型 |
|---|---|---|---|
| Issue page header, issue cards | yes | no | yes (as today) |
| Solution page header, solution cards | yes | yes | yes (as today) |
| X- solution page and cards | yes (the union, normal style) | yes | yes (as today) |

- Each tag links to its detail page. Tags use the level 2 name only.
- Decision 5: on an issue solution with no own 領域, the 領域 tags use the muted style and are followed by 「（沿用議題）」.
- [ ] Failing tests, including both cases of decision 5.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task U5: filters on `#/issues` and `#/solutions`

**Files:**
- Modify: `app/src/lib/listFilter.ts`, `app/src/pages/Issues.tsx`, `app/src/pages/Solutions.tsx`, `app/src/i18n/zh-TW.ts`
- Test: `listFilter.test.ts` and the page tests

- `#/issues`: new filter 領域.
- `#/solutions`: new filters 領域 and 解法類型. An X- solution matches by its union of 領域 and by its 解法類型.
- Filter options are level 2 only, grouped or ordered as in the data file. They show in the result line and the URL like the 空間類型 filter.
- [ ] Failing tests.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task U6: the 可能合併 tab

**Files:**
- Modify: `app/src/pages/Solution.tsx` and the solution tab helpers, `app/src/i18n/zh-TW.ts`
- Create: a component for one candidate card, and its helper in `app/src/lib/`
- Test: helper, component and page tests

- Tab label 「可能合併 n」, last in the tab row, path `#/solutions/<id>/candidates`. Issue solutions only.
- A solution with no pair: follow the rule the other solution tabs use when they have no content.
- Intro text: 「這些是其他議題中，可能可以和這個解法合併的解法。這份清單由規則產生，只是建議，由人決定是否合併。」 plus a link to the rule (the cross-issue section of `analysis/docs/method.md`, as other method links do).
- One card per paired solution (the other side of each pair where this solution is `a` or `b`):

| Field | Shows |
|---|---|
| Solution | `#n Sk` + name, link |
| 共同解法類型 | names, links to `#/solution-types/<code>` |
| 共同領域 | names, links; row left out when empty |
| 共同空間類型 | names, links; row left out when empty |
| 共同需求 | X-N links; 1.2 rows as text |
| 已在跨議題解法 | X- links, or 「尚未合併」 |

- Order: issue number, then solution ID (numeric). No count, no score.
- [ ] Failing tests (review focus 4 and 5).
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task U7: design record and README

**Files:**
- Modify: `app/docs/design.md` (decisions 152 and up, one per decision above, plus the screen sections for the new pages and tab), `app/README.md` (zh-TW), the root `README.md` if it lists the app pages.

- [ ] Write the entries. All checks. **Commit.**

- [ ] **GATE: Part 3 review.** The main session runs all checks on `main`, starts the local app for ETBlue, reports, and pushes only after ETBlue says OK.
