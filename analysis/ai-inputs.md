# AI inputs

Suggestions from the AI (Claude). ETBlue decides what goes into [human-inputs.md](human-inputs.md). When the two files differ, `human-inputs.md` is the one that counts.

This file has two parts:
- **Current summary:** the suggestions in force now, and the open questions.
- **Changelog:** one dated line per change. Git keeps the full text of every version.

Claude updates this file after each review round.

---

## Current summary

### Accepted suggestions

| Topic | Decision | Where it is now |
|---|---|---|
| Source tags | Every content row has `[實證]` (with a source) or `[AI模擬]`. Missing human input uses `【待補：…】`. | `human-inputs.md` line 14, all issue files |
| Notice at the top | Every issue file starts with a notice: made by one participant with AI help, not linked to the host, `[AI模擬]` rows are not real interviews or real citizen words. | all issue files |
| Issue text | It is an input source, not a stakeholder. Each item becomes a story of the stakeholder it most likely speaks for, tagged `[實證]` with the source 「題目原文」. Ideas from 沈伯洋 go to step 6. | `human-inputs.md` steps 1, 2, 6 |
| Stakeholder groups and IDs | 組織 → O01, O02…; 個人 → I01, I02…; stories like `O03-US02`. A new stakeholder gets the next free number in its own group. | `human-inputs.md` steps 1, 4 |
| Shared 「我想要」 | One row per stakeholder, each with its own 「以便」. The 「相同訴求」 column (W01, W02…) links them. | `human-inputs.md` step 2 |
| Prioritization | MoSCoW per row, based only on that stakeholder's need. Shared groups are considered in words. No scores, weights, ranks or formulas. Numeric methods (MCDA, RICE) are listed only as options for quantitative data. | `human-inputs.md` step 5, pilot 5.1–5.3 |
| Solutions | Each solution lists the stories it covers and its success measures, with a baseline and a data source. | `human-inputs.md` step 6 |
| Cost and risk | Per solution: data / API / resources, laws, privacy, other concerns, owner department. | `human-inputs.md` step 7 |
| CSV export | Next to each `issue-analysis.md`, a `user-stories.csv` (UTF-8 with BOM) for Google Sheets. | pilot |
| Format model | The #2 pilot (`2-trashcans/`) is the model for the other issues. Check each issue with `check_analysis.py`. | `human-inputs.md` line 14 |
| Writing style | Tags go inside each table cell, so one row in a screenshot still shows its tag. Step 3 uses bold labels (**真正的需求**, **新故事**, **新利害關係人**). Say "the issue text is an input source" only once, in step 1 rules, not in every section. Modest wording for AI content (「可能的…」, 「由 AI 整理，可以作為討論的起點」). | pilot (ETBlue's edits) |
| Template and README | `7-misc/` holds the template (`.md` and `.csv`). `analysis/README.md` is a quick intro for the host. | `human-inputs.md` line 14 (not made yet) |
| Citizen data rule | The rules say 「市長，你給我聽好了」資料僅限於此黑客松活動使用. If the data is released, the repo cites only counts or summaries, never raw messages, and never tries to identify senders. | this file |
| Blog post | Say the suggestion is personal and not linked to the host. | this file |

### Hackathon submission

The policy-process tool is ETBlue's main submission. It is separate from the suggestion to the host.

Starting idea (to be designed later):
- A web page where people browse stakeholders and user stories for an issue.
- People can vote on priorities, for example with dot voting. The votes come from real people, not from a formula.
- Each story shows its source tag (`[實證]` / `[AI模擬]`).
- The #2 pilot can be the demo data.

Rules that apply (from [docs/event-info.md](../docs/event-info.md)):
- README lists which data is real and which is mock.
- README lists open-source packages and AI tools used.
- (Suggested) README section 「如果市府上任 100 天內要落地，需要做什麼」.
- Working demo on site. Slides or design files alone are not accepted. Submit before 10/24 16:00.

### Timeline

| Date | Work | Status |
|---|---|---|
| 10/16 (Fri) | #2 pilot | Done (planned for 10/17) |
| 10/17–10/18 | #1, #3, #4, #5, #6. Template and README. | Not started |
| 10/19 (Mon) | Blog post and Google Slides flow chart | Not started |
| 10/19–10/22 | Host has about 4 days to decide. Design and build the submission tool. | Not started |
| 10/23 (Fri) | Day 1 on Discord | |
| 10/24 (Sat) | Day 2. Submission deadline 16:00. | |

### Open questions

From the #2 pilot (`2-trashcans/issue-analysis.md`). A person should decide:
1. W06, W09 and W10 group stories whose 「我想要」 are similar but not the same. Keep or split?
2. Possible groups not made yet: O04-US01 with W01, and I09-US03 with O10-US01.
3. I09 (nearby resident) wants placement suggestions (I09-US04) but no bin at their door (I09-US01). Do these fit together?
4. W02 (活動期間臨時清潔箱) is all Could. It could also be Should.
5. The laws listed in step 7 need a check by someone with legal knowledge.
6. All 【待補】 items (for example the real number of bins, overflow rate, sensor cost) need human input.

---

## Changelog

All changes so far happened on 2026-10-16.

| Date | Change | Result |
|---|---|---|
| 2026-10-16 | Suggested tags for real vs simulated content, using real voices as evidence. | Accepted. Tags later renamed (see below). |
| 2026-10-16 | Suggested a pilot on one issue first. | Accepted. ETBlue chose #2. |
| 2026-10-16 | Explained MoSCoW, RICE, impact × effort, and other prioritization methods. | Step 5 lists methods for different contexts. |
| 2026-10-16 | Found gaps in the steps: success measures, conflicts, solution × story mapping, laws and privacy, issue text as a starting point, Day 1 time, specific citizen groups, ID format. | Added to `human-inputs.md`. |
| 2026-10-16 | Found gaps in the Day 1 proposal: who prepares the stories, Discord Q&A, new stories from participants, people who miss Day 1, issue #7. | Added to `human-inputs.md` line 18. |
| 2026-10-16 | Six suggestions: template and README, CSV export, notice and tags, citizen data rule, working demo, timeline. | Accepted. The working demo became the main submission, not a fallback. |
| 2026-10-16 | Built the #2 pilot. | `2-trashcans/framing.md` and `user-stories.csv`. |
| 2026-10-16 | Pointed out that 「主辦方／政策組」 as a stakeholder conflicted with the plan. Suggested using the issue text as an input source, and moving 沈伯洋's ideas to step 6. | Accepted. Pilot updated. |
| 2026-10-16 | Suggested one row per stakeholder for a shared 「我想要」, each with its own 「以便」, plus a 「相同訴求」 group column. | Accepted. Pilot updated with W01–W11. |
| 2026-10-16 | Pilot format: merged the 題目原文 tables, moved real data to the appendix, changed to O/I IDs. | Done. |
| 2026-10-16 | Source tags renamed from `[evidence]` / `[simulated]` to `[實證]` / `[AI模擬]`. | Done in all files. |
| 2026-10-16 | Pointed out that some pilot rows were lowered on purpose to control the Must count. Suggested a scoring method for shared groups. | ETBlue chose no numbers. Each row is judged on its own need; shared groups are considered in words. |
| 2026-10-16 | Suggested clearer wording for "avoid using numbers". | ETBlue updated step 5. Numeric methods in pilot 5.1 labelled 〔僅限量化資料〕. |
| 2026-10-16 | Moved the check script into the repo. | `analysis/check_framing.py`. |
| 2026-10-16 | Fixed weekdays in the timeline. The earlier version had 10/17 as Friday and 10/19 as Sunday. They are Saturday and Monday. | Done. |
| 2026-10-16 | ETBlue edited the pilot: less repetition, tags inside cells, bold labels in step 3, modest wording, 「缺口分數」 → 「缺口指標」. | Added as writing style rules for the other issues. |
| 2026-10-16 | Renamed `framing.md` to `issue-analysis.md`, and `check_framing.py` to `check_analysis.py`. | Done. |
| 2026-10-16 | Renamed the plan and review files. Turned this file into a current summary with a changelog. | `human-inputs.md`, `ai-inputs.md`. |
