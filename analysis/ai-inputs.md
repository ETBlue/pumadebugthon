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
| Source tags | Every content row has one of three tags. `[實證]`: a source a person can check, or an `[AI整理]` summary that a person checked. `[AI整理]`: AI summarized it from a real source, and no person has checked it yet. The source is the host's citizen data (the 「市長，你給我聽好了」 data, 10 or more messages, with counts) or a news report (the cell says 「新聞報導指出…」, has a 【待補：查證…】 item, and the appendix names the outlet and gives the link). `[AI模擬]`: AI made it up as a likely view; no data behind it. A person changes `[AI整理]` to `[實證]` after a spot-check. `[AI整理]` counts come from keyword matching, so they are estimates. Missing human input uses `【待補：…】`. The tag list is in `analysis_common.TAGS`. | `human-inputs.md` line 14, `analysis/method.md`, all issue files |
| Notice at the top | Every issue file starts with a short notice: made by one participant with AI help, not linked to the host, `[AI模擬]` rows are not real interviews or real citizen words, do not quote or screenshot them as citizen opinion. One line under it links to `analysis/method.md`. | all issue files |
| Shared reading guide | `analysis/method.md` (如何閱讀議題分析) holds the text that is the same in every issue: tags, ID rules, 分類路徑, 特別關注, 空間類型, the story format, the 5.1 method table, the MoSCoW and group rules, the 6.2 全部／部分 note, the step 7 note. Each issue file keeps every heading but only its own content. | `analysis/method.md`, all issue files |
| Issue text | It is an input source, not a stakeholder. Each item becomes a story of the stakeholder it most likely speaks for, tagged `[實證]` with the source 「題目原文」. Ideas from 沈伯洋 go to step 6. | `human-inputs.md` steps 1, 2, 6 |
| Stakeholder groups and IDs | 組織 → O + two digits (O01, O02…); 個人 → I + two digits (I01, I02…); stories like `O03-US02`. IDs are shared by all issues and kept in `analysis/stakeholders.csv` (with 分類路徑 and 特別關注). A new stakeholder gets the next free number in its own group in that file. O is only for organizations. A moved ID is listed in the issue's 編號異動紀錄 section. | `human-inputs.md` steps 1, 4; `analysis/stakeholders.csv`; `app/design.md` 5.1 |
| Shared 「我想要」 | One row per stakeholder, each with its own 「以便」. The 「相同訴求」 column (W01, W02…) links them. | `human-inputs.md` step 2 |
| Prioritization | MoSCoW per row, based only on that stakeholder's need. Shared groups are considered in words. No scores, weights, ranks or formulas. Numeric methods (MCDA, RICE) are listed only as options for quantitative data. | `human-inputs.md` step 5, pilot 5.1–5.3 |
| Solutions | Each solution lists the stories it covers and its success measures, with a baseline and a data source. | `human-inputs.md` step 6 |
| Cost and risk | Per solution: data / API / resources, laws, privacy, other concerns, owner department. | `human-inputs.md` step 7 |
| CSV export | Next to each `issue-analysis.md`, a `user-stories.csv` (UTF-8 with BOM) for Google Sheets. | pilot |
| Format model | The #2 pilot (`2-trashcans/`) is the model for the other issues. Check each issue with `check_analysis.py`. | `human-inputs.md` line 14 |
| Writing style | Tags go inside each table cell, so one row in a screenshot still shows its tag. No separate 標記 column and no tag in a heading: the tag starts the main content cell, and a source note goes after it in （）. A cell that is only 【待補】 has no tag. Step 3 uses bold labels (**真正的需求**, **新故事**, **新利害關係人**). Say "the issue text is an input source" only once, in step 1 rules, not in every section. Modest wording for AI content (「可能的…」, 「由 AI 整理，可以作為討論的起點」). 每個 【待補】 都把說明寫在括號內 (`【待補：缺少什麼】`); text that only names the format goes in backticks. In 5.4 相關故事, write ` vs ` exactly once. A table cell must not contain ` \| ` (a space, a bar, a space), because the scripts split cells on it. Step 7 headings are numbered (`### 7.1 解法 A：…`, `### 7.5 總覽`). 總覽 columns: 代號 (the code only), 解法 (the row tag and a short name, for example 「`[AI模擬]` 佈建建議地圖」), 成本, 可行性, 主要風險, 主責單位. 6.2 columns: 代號, 解法, 涵蓋的 Must, 涵蓋的 Should / Could, 涵蓋的相同訴求群組. A 6.3 cell must stand alone, because the solution page shows each 6.3 row without the tables around it: no 「見下表」 or 「見上表」. Give the key numbers with the same tag, and name the section of the full table (for example 「完整數字見附錄 A.2」). | pilot (ETBlue's edits), `check_analysis.py` |
| Template and README | `7-misc/` holds the template (`.md` and `.csv`). `analysis/README.md` is a quick intro for other participants, in zh-TW. Its issue table is updated in the same commit as each new issue analysis (link and status). | `human-inputs.md` line 14. README done; template not made yet. |
| Notice in Google Sheets | The CSV has no notice. The README gives readers a short notice to put in the sheet title or first row. | `analysis/README.md` |
| CSV builder | After editing the step 4 table, rebuild the CSV with `build_csv.py`, then run `check_analysis.py`. | `analysis/build_csv.py`, README |
| Shared script rules | `check_analysis.py`, `sync_stakeholders.py` and `build_json.py` find sections and the step 1 tables (the tables under `### 1.1`, up to the next heading) with the same functions in `analysis/analysis_common.py`. | `analysis/analysis_common.py` |
| Citizen data rule | The rules say 「市長，你給我聽好了」資料僅限於此黑客松活動使用. The repo uses the data only as counts and paraphrased summaries, tagged `[AI整理]`. It never quotes raw messages. The raw file is not in the repo and is not shared. No one is identified. | this file, `analysis/method.md`, `LICENSE-CONTENT.md` |
| Sharing | ETBlue shares each issue analysis in its issue channel on the hackathon Discord (owned by the host), as a participant. No requests to the host. Every file says it is personal work, not linked to the host. | `human-inputs.md` line 16 |

### Hackathon submission

The policy-process tool is ETBlue's main submission (confirmed 2026-10-17). It is separate from the issue analysis.

Starting idea (to be designed later):
- A web page where people browse stakeholders and user stories for an issue.
- People can vote on priorities, for example with dot voting. The votes come from real people, not from a formula.
- Each story shows its source tag (`[實證]` / `[AI整理]` / `[AI模擬]`).
- The #2 pilot can be the demo data.

Rules that apply (from `.eventinfo/event-info.md`, a local folder that git ignores):
- README lists which data is real and which is mock.
- README lists open-source packages and AI tools used.
- (Suggested) README section 「如果市府上任 100 天內要落地，需要做什麼」.
- Working demo on site. Slides or design files alone are not accepted. Submit before 10/24 16:00.

### Timeline

| Date | Work | Status |
|---|---|---|
| 10/16 (Fri) | #2 pilot | Done (planned for 10/17) |
| 10/17 (Sat) | #2 posted on the hackathon Discord | Done |
| 10/17–10/18 | #1, #3, #4, #5, #6, each posted on Discord when done. Template and README. | #1 done, not posted yet. Others not started. |
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
| 2026-10-18 | Moved #2 to the shared format (design 5.1–5.6). Step 1 and 3.7 now use 分類路徑 and 特別關注 from `stakeholders.csv`. O02 became I12. O03-US01 and O03-US03 became I13-US01 and I13-US02 (new I13 清潔隊員). O03, O05, O06, O12 and O13 got new names. Added the 空間類型 line, a 空間類型 column in 6.1, and a 編號異動紀錄 section. | Done. 25 stakeholders (O 12, I 13), 45 stories, no MoSCoW changes. `check_analysis.py` checks the shared files. Tests in `analysis/tests/`. |
| 2026-10-18 | Cleanup after the #1 review. O06 is now one academic stakeholder (學術研究單位) for all issues; the fields are in each issue's 與本題的關係 cell. In #1, O19 became O06, and O20, O21, O22 became O19, O20, O21 (#1 is not public yet). Moved the shared reading text into `analysis/method.md`. Fixed bare 【待補】 items in #2, numbered the step 7 headings, and gave 6.2 a 代號 column. Added `analysis_common.py` so the three scripts find the step 1 tables the same way. | Done. #1: 26 stakeholders (O 14, I 12), 49 stories. #2: 25 stakeholders (O 12, I 13), 45 stories. No MoSCoW changes. `check_analysis.py` now reports a bare 【待補】 and a 6.2 code that is not in 6.1. |
| 2026-10-18 | ETBlue decided on a third source tag, `[AI整理]`: AI summarized it from real data, with counts, not yet checked by a person. A person changes it to `[實證]` after a spot-check. The app filter 「只看 [實證]」 became 「只看有資料根據」 and keeps `[實證]` and `[AI整理]`; only `[AI模擬]` is hidden. The 「市長，你給我聽好了」 data is now used, only as counts and paraphrased summaries. | Done. The scripts accept the new tag (one list in `analysis_common.TAGS`). The app shows a blue badge, and the home card shows two counts (實證, AI整理). `method.md`, both READMEs, `LICENSE-CONTENT.md`, `app/design.md` and the appendix of #1 and #2 say how the data is used. |
| 2026-10-18 | ETBlue decided that content taken only from news reports is `[AI整理]`, not `[AI模擬]`: AI summarized it from a real source, and no person has checked it yet. The cell keeps 「新聞報導指出…」, a 【待補：查證…】 item, and the outlet in the appendix. AI judgments based on news stay `[AI模擬]`. | Done. #1: 3 cells in the 6.1 Singapore table. #8: 3 rows in 題目原文重點, the 資料比對重點 line, and one 6.3 baseline. `check_analysis.py` reports a 「`[AI整理]` 新聞報導…」 line with no 【待補：查證…】 item. `method.md`, `app/design.md` 3.5, `app/README.md` and the app's tag legend updated. |
| 2026-10-18 | Added a 新增日期 column (`YYYY-MM-DD`) to `stakeholders.csv` (after 備註) and to each 6.1 solution table (after 空間類型), for the app's "recent" lists. The first values come from git history. A new stakeholder or solution gets today's date. | Done. `check_analysis.py` checks the column and the dates (not in the future). `build_json.py` writes `added` for each stakeholder and each solution. `method.md` and `app/design.md` 5.1, 5.3 describe the column. |
| 2026-10-18 | Added `analysis/open-data.csv` (名稱, 網址, 提供機關, 授權, 議題): one row per open dataset that the appendices of #1, #2 and #8 cite, for the links in the page footer. | Done. 8 rows. `check_analysis.py` checks that each appendix and the file match both ways. `build_json.py` writes the rows to `index.json` as `openData`. `method.md`, `app/design.md` 5.7 and `app/README.md` describe the file. |
| 2026-10-18 | ETBlue approved a new 特別關注 category, 呼吸道疾病, for people with respiratory illness. | Done. I27 過敏或呼吸道疾病者 has it in `stakeholders.csv` and in the #8 step 1 table. The #8 【待補】 item about this was removed. `method.md`, `app/design.md` 5.1 and 13 (item 7), and the app's `FOCUS_ORDER` (after 身心障礙) list it. |
| 2026-10-19 | The solution page shows 6.3 rows without the tables around them. The #2 解法 A baseline 「見下表」 now gives the key numbers and names the 6.3 「高人流捷運站與清潔箱（名稱比對）」 table. | Done. `check_analysis.py` reports 「見下表」 or 「見上表」 in a 6.3 cell. |
| 2026-10-19 | The step 7 總覽 table had the tag, the code and the name in one first cell. It now has a 代號 column (the code only) and a 解法 column (the row tag and the name), the same as 6.2. | Done in #1, #2 and #8. `build_json.py` finds the row by 代號. `check_analysis.py` checks the header, the code and the row tag. The JSON did not change. |
