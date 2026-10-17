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
| Writing style | Tags go inside each table cell, so one row in a screenshot still shows its tag. No separate 標記 column and no tag in a heading: the tag starts the main content cell, and a source note goes after it in （）. A cell that is only 【待補】 has no tag. Step 3 uses bold labels (**真正的需求**, **新故事**, **新利害關係人**). Say "the issue text is an input source" only once, in step 1 rules, not in every section. Modest wording for AI content (「可能的…」, 「由 AI 整理，可以作為討論的起點」). | pilot (ETBlue's edits) |
| Template and README | `7-misc/` holds the template (`.md` and `.csv`). `analysis/README.md` is a quick intro for other participants, in zh-TW. | `human-inputs.md` line 14. README done; template not made yet. |
| Notice in Google Sheets | The CSV has no notice. The README gives readers a short notice to put in the sheet title or first row. | `analysis/README.md` |
| CSV builder | After editing the step 4 table, rebuild the CSV with `build_csv.py`, then run `check_analysis.py`. | `analysis/build_csv.py`, README |
| Citizen data rule | The rules say 「市長，你給我聽好了」資料僅限於此黑客松活動使用. If the data is released, the repo cites only counts or summaries, never raw messages, and never tries to identify senders. | this file |
| Sharing | ETBlue shares each issue analysis in its issue channel on the hackathon Discord (owned by the host), as a participant. No requests to the host. Every file says it is personal work, not linked to the host. | `human-inputs.md` line 16 |

### Hackathon submission

The policy-process tool is ETBlue's main submission (confirmed 2026-10-17). It is separate from the issue analysis.

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
| 10/17 (Sat) | #2 posted on the hackathon Discord | Done |
| 10/17–10/18 | #1, #3, #4, #5, #6, each posted on Discord when done. Template and README. | Not started |
| 10/19–10/22 | Design and build the submission tool | Not started |
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
| 2026-10-16 | ETBlue removed the repeated 「AI 模擬，非真實訪談」 from the step 4 source column. | CSV rebuilt. Added `build_csv.py`. Check script accepts a tag-only cell. |
| 2026-10-16 | Suggested a notice for the CSV in Google Sheets, given in the README. | Accepted. |
| 2026-10-16 | Wrote `analysis/README.md` (zh-TW). | Draft for ETBlue's review. |
| 2026-10-16 | ETBlue edited the README: new 為什麼要做這個 section, softer Day 1 wording, read-only story docs for participants. Suggested putting back a short notice and softening the 為什麼 text. | Accepted. README done. |
| 2026-10-16 | Renamed `framing.md` to `issue-analysis.md`, and `check_framing.py` to `check_analysis.py`. | Done. |
| 2026-10-16 | Renamed the plan and review files. Turned this file into a current summary with a changelog. | `human-inputs.md`, `ai-inputs.md`. |
| 2026-10-16 | ETBlue asked to remove the 「利害關係人」 CSV column, because it always held the same text as 「身為…」. | Done. CSV now has 9 columns. `build_csv.py` and `check_analysis.py` updated. |
| 2026-10-16 | ETBlue renamed CSV columns (故事編號, 相同訴求編號, 來源), put 來源 before 來源標記, and split 優先順序 into 優先順序 and 優先順序標記, so Sheets users can sort by tag. Claude suggested 「相同訴求編號」 over 「訴求編號」. In the Markdown, the step 4 priority cell changed from `S [AI模擬]` to `[AI模擬] S`. Story tables use 故事編號 and 相同訴求編號; stakeholder tables use 利害關係人編號. | Done. CSV now has 10 columns. Note: Sheets sorts 優先順序 A–Z as C, M, S, W, not MoSCoW order. |
| 2026-10-16 | ETBlue asked to move tags into table cells: merge the 標記 column into the content cell (1.1, step 2, 3.7, 6.3) and move heading tags into each row (5.2, 5.3). Claude suggested the same for 題目原文重點, 6.3 捷運 table, 步驟 7 總覽 and 附錄 主要數字, and no tag for 【待補】 cells. | Accepted. Done in the pilot. `check_analysis.py` reads the new 5.2 rows. |
| 2026-10-16 | ETBlue asked to tag 我想要… and 以便… separately in step 4, tag the 群組 cell in the W table, and move the 構想 table tag into the rows. Claude suggested the same per-cell tags in step 2, and `[實證]` for the 構想 cell with `[AI模擬]` for the other two cells. | Accepted. O01-US03, O04-US05 and I09-US04 now show `[實證]` 我想要 with `[AI模擬]` 以便. 來源 holds only the note (「—」 if none). CSV now has 11 columns (我想要標記, 以便標記 replace 來源標記). |
| 2026-10-17 | ETBlue changed the goal: no suggestion to the host and no blog post. ETBlue analyzes all issues as a participant and shares them on the hackathon Discord. #2 was posted. ETBlue removed the Day 1 section from the README. | Claude put back a short 資料使用說明 in the README, changed the pilot notice about 「市長，你給我聽好了」 so it does not address the host, fixed typos in `human-inputs.md`, and updated this file. The submission tool plan stays. |
