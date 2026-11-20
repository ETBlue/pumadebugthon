# Build plan: the 需求 list and need pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Every subagent brief must repeat ETBlue's plain-English rule (short sentences, common words, main point first, no idioms, lists and tables).

**Goal:** add a 「需求」 item to the header, a list of all issue needs at `#/needs`, and one page per need at `#/needs/<key>`. Planners get an overview of the needs that the analysis found, with filters, like a list of tickets. It is not a done / not-done tracker.

**Architecture:** the Python build gives each need an 新增日期 and an 更新日期 (a new type 「需求」 in `updated-dates.csv`). The app builds the need list from the issue files and `cross-issue.json` in one helper module. It does not add a new data file. The list page reuses `ListBar`, the sorts and the filter helpers of the other list pages. The need page reuses the entity page frame and tabs.

**Tech stack:** Python 3 standard library (`python3 -I`), `unittest`; Vite + React 19 + TypeScript + Vitest in `app/`.

**Status (2026-11-21):** all tasks are done and pushed. ETBlue checked the pages (N7) and said OK on 2026-11-18. After the plan, ETBlue changed the list filters: decision 223 removed the 解法 filter, decision 224 made 解法涵蓋 one toggle (`uncovered=1`, not `covered=yes|no`), and decision 225 added group picks to 空間類型 and 領域. `app/docs/design.md` is the current record; this plan is not updated.

**Before this plan:** `main` is at da11835 (header order 議題 | 利害關係人 | 空間 | 領域 | 解法類型 | 解法, decision 191). The design session with ETBlue was on 2026-11-18.

## Decisions (ETBlue, 2026-11-18)

1. One list item per issue need: the N groups and the single-story needs in each issue's `needs`. Today there are 179 (100 groups, 79 single-story needs). The key is `<issue>-<need id>`, for example `1-N01` or `2-O04-US02`.
2. The header gets 「需求」 with its count, between 利害關係人 and 空間: 議題 | 利害關係人 | 需求 | 空間 | 領域 | 解法類型 | 解法.
3. Needs get dates. `updated-dates.csv` gets a new type 「需求」. Its 更新日期 changes when the need's own content changes (see Task N1).
4. Each need has its own page at `#/needs/<key>`. Other pages link to it where they show a need.
5. A need's 空間 and 領域 are its issue's values, plus the values of the solutions that cover it. So every need has at least its issue's values.
6. X-N groups are not list items. A need in an X-N group shows the X-N label. Its page lists the other needs in the same group. A filter 「跨議題」 shows only the needs in any X-N group.
7. Sorts: 最近更新 (default), 最近新增 and 資料根據比例. This extends decision 81 (share sorts on three list pages) to a fourth page, with the same note under the bar: the order is not about importance.
8. Filters: 議題, 利害關係人, 空間, 領域, 解法, MoSCoW, 解法涵蓋 (有 / 尚無), 跨議題. Plus the 只看有資料根據 toggle.
9. No implemented / not-implemented status. No "most requested" view. The page text says the needs are 「分析整理出的需求」. It never says 「市民意見」 and never names 1999.

## Global constraints

- Follow `CLAUDE.md`. Plain English in every report, commit message, comment and English doc. UI text is zh-TW and lives in `app/src/i18n/zh-TW.ts`.
- No scores, weights or ranks. Counts never decide an order, except the reader-picked 資料根據比例 sort of decision 7. Ties and items with no value go in the fixed ID order: issue number, then need ID with the numeric compare (`compareIds`), never plain text order.
- No redirects in the app.
- Every design decision gets a numbered entry in `app/docs/design.md`, in number order, before 「## 14. Open questions」. The highest number now is 191.
- Do not read `.confidential/`. Do not edit any `human-inputs.md` or `docs/`.
- Each task runs in a worktree (`isolation: worktree`): `git reset --hard main` first, symlink only `app/node_modules`. The main session cherry-picks.
- Reuse the code of the other list and entity pages. Do not copy a page and change the names.
- Stage files by name. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Checks before each commit: `CI=true analysis/scripts/build_all.sh <scratch>`, `python3 -I -m unittest discover -s analysis/tests -t . -p 'test_*.py'`, and in `app/`: `npm run data`, `npx vitest run`, `npx tsc -b`, `npx vite build`.
- **GATE** tasks stop and wait for ETBlue. Push only after ETBlue says OK.

## Definitions (used by every task)

| Term | Meaning |
|---|---|
| Need | One entry of an issue's `needs` (`kind` is `group` or `story`). |
| Its stories | `need.stories`. |
| Its stakeholders | the `stakeholder` of each of its stories, each once, in `compareIds` order. |
| Covering solutions | the issue solutions that list the need ID in `needs.must` or `needs.shouldCould`, plus the cross-issue solutions that cover it through an X-N group (decision 60, as in 3.12 and 3.18). Same rule as `src/lib/coverage.ts`. |
| 解法涵蓋 有 / 尚無 | 有: at least one covering solution. 尚無: none. A need with MoSCoW W (這次不做) is in 尚無 but its card and page also say 這次不做, as on the solution page (decision 50). |
| Its X-N group | the X-N group in `cross-issue.json` `needGroups` whose `needs` list has `{issue, id}`. At most one. If the data ever has two, show both. |
| 只看有資料根據 | show the need when at least one of its stories has a 以便… (`soThat`) cell tagged `[實證]` or `[AI整理]`. This is the rule of the existing `dataBasedNeeds` (the issue's 需求 tab), so a need is shown or hidden the same way on every page. The 我想要… cell is not checked. (Fixed 2026-11-18 during Task N2.) The need summary is always `[AI模擬]`, so the usual rule (hide `[AI模擬]` cells) would hide every need. |
| 資料根據比例 | the share of its stories' cells tagged `[實證]` or `[AI整理]`, the same unit as 3.23.4. Each story counted once. |

## Review focus

1. Every need appears once. Two needs with the same ID in different issues (for example `1-N01` and `2-N01`) are two items with two pages.
2. A need with no covering solution still matches the 空間 and 領域 filters of its issue.
3. 只看有資料根據 does not hide every need.
4. No count decides any order, except the 資料根據比例 sort the reader picks. The note under the bar shows with that sort.
5. No text says 市民意見 or 1999. No done / not-done status anywhere.
6. Every place that showed a need before now links to its page, and the link keys include the issue number.

---

## Part 1: data

### Task N1: need dates

**Files:**
- Modify: `analysis/scripts/update_dates.py`, `analysis/scripts/build_json.py`, `analysis/scripts/build_flat.py` (the `needs` flat files)
- Modify: `analysis/data/updated-dates.csv` (generated)
- Modify: `analysis/docs/method.md` (the updated-dates rules, about line 97), `analysis/docs/data-guide.md`
- Test: `analysis/tests/` (the update_dates, build_json and build_flat tests)

**The new type 「需求」:**
- 編號: `<issue>-<need id>`, for example `1-N01` or `2-O04-US02`.
- Content for the fingerprint: summary, its tag, MoSCoW and its tag, the reason (text and tag), the story list. Not the stories' own text (a story has its own row).
- 新增日期 and 更新日期 are both kept in the CSV, like 使用者故事. (A need has no other place for its 新增日期.)
- First run (back-fill): 新增日期 = the earliest 新增日期 of its stories. 更新日期 = the latest 更新日期 of its stories. After that, the normal rule: 更新日期 changes when the fingerprint changes.
- `build_json.py` adds `added` and `updated` to each need in the issue JSON. The flat `needs.csv` / `needs.json` get the two dates.

- [ ] Write failing tests: the new rows, the back-fill rule, a change of reason changes 更新日期, a change of a story's text does not, the JSON and flat fields.
- [ ] Implement. Update `method.md` and `data-guide.md`.
- [ ] Run the non-CI `build_all.sh` once so `updated-dates.csv` gets the new rows. Commit it.
- [ ] All checks. **Commit.**

---

## Part 2: app

### Task N2: types, fixtures and the need helpers

**Files:**
- Modify: `app/src/types.ts` (`added`, `updated` on a need)
- Modify: `app/src/test/fixtures/issues/*.json`: add only `added` and `updated` to each need. A full `npm run fixtures` run changes all fixtures to today's data and breaks 149 tests.
- Create: `app/src/lib/needRecords.ts`, `app/src/lib/needRecords.test.ts` (`needs.ts` already exists and `coverage.ts` imports it, so a new file avoids an import loop)
- Modify: `app/src/lib/coverage.ts` only if a helper must be shared; do not copy its logic.

**`needRecords.ts`** gives one record per need, with: `key`, `issue`, `need`, `stories`, `stakeholders`, `spaces`, `domains`, `solutions` (issue solutions and X- solutions, as keys), `crossGroups` (X-N IDs), `covered`, `cells` (for the share and the toggle). Also `needRecordKey(issue, id)` (`needKey` already exists for stories), `needByKey(...)` and `parseNeedKey(text)`. Keys use the issue number, so `parseNeedKey('2-O04-US02')` gives issue 2, ID `O04-US02`.

- [ ] Write failing tests for every row of the Definitions table, with a fixture that has the same need ID in two issues, a need with no solution, a need covered only through an X-N group, and a W need.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task N3: the `#/needs` list and the header item

**Files:**
- Create: `app/src/pages/Needs.tsx`, `app/src/pages/Needs.test.tsx`, `app/src/components/NeedCard.tsx`
- Modify: `app/src/router.tsx`, `app/src/lib/nav.ts` (`NAV_ITEMS`), `app/src/components/Header.tsx`, `app/src/lib/counts.ts`, `app/src/lib/listParams.ts` (`PAGE_SORTS.needs`, the new filter params), `app/src/lib/listFilter.ts`
- Modify: `app/src/i18n/zh-TW.ts`
- Test: `nav.test.ts`, `Header.test.tsx`, the list param and filter tests

**The page:** `ListBar` with search (need summary and story text), the sorts of decision 7, the filters of decision 8 (in that order), the result line, the 資料根據比例 note, then the cards. A short intro line says the list is 「分析整理出的需求」 and links to `analysis/docs/method.md`.

**The card:** summary and its tag; MoSCoW (and 這次不做 for W); the issue link; 「使用者故事 n 則 · 解法 n 個」 as plain facts; the X-N label if any; the dates. The card links to the need page.

**URL params:** follow 3.23.5. New params: `priority=<M|S|C|W>` (once per pick), `covered=yes|no`, `cross=1`, `solution=<key>` (once per pick). Reuse `issue`, `stakeholder`, `space`, `domain`, `sort`, `q` and the data-basis param as the other lists do.

- [ ] Failing tests: menu order 議題 | 利害關係人 | 需求 | 空間 | 領域 | 解法類型 | 解法, header count, each filter, each sort and its tie order, the share note, 只看有資料根據, empty state, URL round trip.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task N4: the need page `#/needs/<key>`

**Files:**
- Create: `app/src/pages/Need.tsx`, `app/src/pages/Need.test.tsx`, tab components under `app/src/components/need/`
- Modify: `app/src/router.tsx`, `app/src/lib/entityPaths.ts` (`NEED_TABS`, paths), `app/src/components/Breadcrumb.tsx`, `app/src/i18n/zh-TW.ts`

**Tabs**, in this order (a tab with no content is left out):

| Tab | Content |
|---|---|
| 總覽 | summary, MoSCoW and its reason, issue, X-N label, dates |
| 使用者故事 | the stories, with tags (reuse `StoryCard`) |
| 利害關係人 | the stakeholders of those stories |
| 解法 | covering solutions, grouped must / should-could as today; X- solutions after issue solutions |
| 衝突 | the issue conflicts with this need in `needsA` or `needsB`, and the cross-issue conflicts that list it |
| 其他議題的相同需求 | the other needs of its X-N group, with links |

An unknown key shows the not-found page. The page belongs to the 需求 menu item.

- [ ] Failing tests: each tab, a tab left out when empty, not-found, breadcrumb, page title, the menu item.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task N5: links to need pages

**Files:**
- Modify: `app/src/components/NeedItem.tsx` and its callers (`issue/NeedsTab`, `stakeholder/NeedsTab`, `stakeholder/SolutionsTab`, `solution/NeedsTab`, `solution/StakeholdersTab`, `solution/ConflictsTab`, `solution/CrossTabs`, `ConflictView`)
- Test: the matching tests

Each need shown by `NeedItem` links to `#/needs/<issue>-<id>`. Keep the current layout. Cross-issue places already know the issue number; pass it in.

- [ ] Failing tests for the link in each caller.
- [ ] Implement.
- [ ] All checks. **Commit.**

### Task N6: design record and README

**Files:**
- Modify: `app/docs/design.md` (decisions 192 and up: the decisions of this plan, plus the build choices; a new section for the need list and page next to 3.23)
- Modify: `README.md`, `analysis/README.md`, `app/README.md` if they list the pages

- [ ] Write the entries. Check that each decision of this plan has one.
- [ ] All checks. **Commit.**

### Task N7: GATE: ETBlue checks the pages

- [ ] Run the app locally. Send ETBlue the URLs of `#/needs` and two need pages (one with an X-N group, one W need).
- [ ] Wait for ETBlue. Fix what ETBlue asks. Push only after ETBlue says OK.
