# Review of the issue framing plan

Author: Claude (AI agent), reviewed by ETBlue
Date: 2026-10-16
Reviews: [2026-10-15-issue-framing.md](2026-10-15-issue-framing.md)
Note: the source tags were renamed from `[evidence]` / `[simulated]` to `[實證]` / `[AI模擬]` on 2026-10-16.

These are the open points from the last review round. ETBlue accepted all six. Two points changed after the discussion (see notes in #1 and #5).

## Summary

| # | Plan line | Topic | Decision |
|---|---|---|---|
| 1 | 14 | Template and landing page | Template goes in `analysis/7-misc/`. Add `analysis/README.md`. |
| 2 | 18 | Markdown → Google Docs / Sheets | Export each user story table as CSV too. |
| 3 | 18, 20 | Simulated stories in public | Notice at the top of every file. `[AI模擬]` tag on every row. |
| 4 | 6 | Rule on the citizen data | Cite counts or summaries only. No raw messages in the repo. |
| 5 | 20 | Working demo | The policy-process tool is now ETBlue's main hackathon submission. |
| 6 | — | Timeline | Pilot 10/17, other issues 10/18, blog post 10/19. |

## 1. Template and landing page

**Gap:** Line 18 says #7 (自由題) participants fill in the structure themselves, so they need an empty template. The GitHub link in the blog post also needs a starting page.

**Decision:**
- `analysis/7-misc/TEMPLATE.md`: the empty structure, in zh-TW. Participants of #7 copy it and fill it in.
- `analysis/README.md`: a zh-TW summary with the structure, the Day 1 proposal, and links to each issue folder. This is the page the blog post links to.

## 2. Markdown → Google Docs / Sheets

**Gap:** Line 18 suggests live docs in Google Docs or Google Sheets. The host would need to move the Markdown tables there by hand.

**Decision:** Next to each issue's `.md` file, also save the user story table as a `.csv` file. The host can import it into Google Sheets in one step.

## 3. Simulated stories in public

**Gap:** The repo is public and the blog post will be shared on social media. Someone may screenshot a `[AI模擬]` story and present it as a real citizen's words. This is more likely around an election campaign.

**Decision:**
- Every file starts with a notice: the content is a simulation made with AI help, and stories marked `[AI模擬]` are not real interviews.
- Every table row keeps its `[實證]` or `[AI模擬]` tag, so a screenshot of one row still shows it.
- The blog post says the suggestion is personal and not linked to the host.

## 4. Rule on the citizen data

**Gap:** The rules say: 「市長，你給我聽好了」資料僅限於此黑客松活動使用. A public repo stays online after the event.

**Decision:** If the host releases the data, the repo cites only counts or summaries (for example "N messages about bins in 信義區"). Raw messages are not copied into the repo. The rules also forbid trying to identify the people who sent them.

## 5. Working demo (now the main submission)

**Gap:** The first plan was to turn the suggestions into a submission if the host does not use them. But the rules say the demo must be a working product. Slides or design files alone are not accepted.

**Decision (changed):** The policy-process tool is now ETBlue's main hackathon submission, not only a fallback. Reason: the policy-making process is the topic ETBlue cares about most among all issues.

Starting idea for the tool (to be designed later):
- A web page where people browse stakeholders and user stories for an issue.
- People can vote on priorities, for example with dot voting.
- Each story shows its source tag (`[實證]` / `[AI模擬]`).
- The #2 pilot can be the demo data.

Rules that apply to the submission (from [docs/event-info.md](../docs/event-info.md)):
- README lists which data is real and which is mock.
- README lists open-source packages and AI tools used.
- (Suggested) README section "如果市府上任 100 天內要落地，需要做什麼".
- Working demo on site. Submit before 10/24 16:00.
- If the host also adopts the Day 1 idea, the tool and the suggestion support each other. If not, the tool still works on its own.

## 6. Timeline

**Gap:** The host needs time to decide before Day 1 (10/23). Public feedback on the blog post also needs time.

**Decision:**

| Date | Work |
|---|---|
| 10/17 (Fri) | #2 pilot done and reviewed |
| 10/18 (Sat) | #1, #3, #4, #5, #6 done. `TEMPLATE.md` and `README.md` done. |
| 10/19 (Sun) | Blog post and Google Slides flow chart published |
| 10/19–10/22 | Host has about 4 days to decide. Design and build the submission tool. |
| 10/23 (Fri) | Day 1 on Discord |
| 10/24 (Sat) | Day 2. Submission deadline 16:00. |
