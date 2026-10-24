# Working rules for AI agents in this repo

This file holds the rules for Claude Code and other AI agents that work on this repo. The project is described in [README.md](README.md).

## Writing

- Write in plain English for the owner (ETBlue), who is not a native English speaker: short sentences, common words, no idioms, lists and tables. This applies to chat replies, subagent reports, commit messages, code comments and docs.
- Analysis content and app text are in Traditional Chinese.
- Every subagent brief must repeat the plain-English rule.

## Owner files

- `human-inputs.md` files (`analysis/docs/`, `app/docs/`, `analysis/<n>-…/`) are written by ETBlue. Never rewrite them. Commit an edit only after ETBlue says it is finished. A changed file in `git status` is not enough.
- `doc/` (not in git) is ETBlue's own work in progress. Do not read, edit, stage or commit it.
- Stage files by name. Never use `git add -A` or `git add .`.

## Citizen data (「市長，你給我聽好了」)

- Event rule: 「市長，你給我聽好了」資料已去識別化，不得嘗試反推陳情人身分，也不得使用真實個資。「市長，你給我聽好了」資料僅限於此黑客松活動使用。
- The raw data is in `.confidential/` (git-ignored). Never commit or share it.
- Only the main session reads it. The main session writes a summary in its own words with counts only (`citizen-<n>-<folder>.md` in the session scratchpad). Subagents get only that summary. They never read `.confidential/` or any parsed copy.
- An `[AI整理]` cell needs 10 or more messages behind it. Own words only. No quotes and no personal details.
- No places below district or main-road level. No names of shops, temples, schools, routes, stops, stations, addresses, communities, projects or developers.
- Leave out political statements. Leave out messages that blame a group of people (for example foreign workers) or link shops to national security.

## Neutral tone

- Strictly neutral. Never mention campaigns, candidates or parties. Do not use campaign websites as sources.
- Threat wording never names China. Use 「境外敵對勢力」, 「敵對國家」 or 「戰爭或武力威脅」. Naming China is fine only in the source rule in `analysis/docs/method.md` that excludes examples from totalitarian countries.
- No examples from China, Iran or North Korea in practices from other places.
- No scores, weights, ranks or formulas. Counts never change MoSCoW. Never sort by counts. Lists sort by date, then ID.
- #6: never rate or rank a building or district, and never identify a private building.

## Same rules for every issue

Treat every issue the same way. Do not invent special cases or new formats for one issue. If an answer from ETBlue seems to allow a special case, ask first.

## Issues

- #1–#6 are host issues. #7 is the host's free topic; it is not analysed here. #8, #9 and #10 are our own issues. An own issue says so at the top and uses official public sources for its problem statement.
- To add an issue, follow the commit that added #6 (dfd96ee) and #10 (5ee7c83). Use the current format of the newest issue file. Update `analysis/README.md` and the root `README.md` in the same work.
- Then add the issue to `analysis/cross-issue/` in the same way as commit ce9b7ca.

## Tools and checks

- Run Python with `python3 -I`. No scanning or crawling of city or third-party systems. Normal reads of public pages and public data files are fine.
- Checks before a push (all must pass):
  - `CI=true analysis/scripts/build_all.sh <scratch dir>`
  - `python3 -I -m unittest discover -s analysis/tests -t . -p 'test_*.py'`
  - in `app/`: `npm run data`, `npx vitest run`, `npx tsc -b`, `npx vite build`
- After analysis changes, run a non-CI `analysis/scripts/build_all.sh` once so `analysis/data/updated-dates.csv` gets new dates, and commit it.
- Push to `main` only after the checks pass and ETBlue says OK. A push deploys the app to https://etblue.github.io/pumadebugthon/.

## App design

- UI text is in `app/src/i18n/zh-TW.ts`.
- Every design decision gets a numbered entry in `app/docs/design.md`, in number order, before 「## 14. Open questions」. Check the highest number first.
- No redirects in the app.

## Subagents

- Non-trivial coding goes to subagents with `isolation: worktree`. The subagent runs `git reset --hard main` first and symlinks only `app/node_modules`.
- The main session cherry-picks the commit, removes the `node_modules` symlink, then removes the worktree and its branch.
- If a permission check blocks a subagent, do not do the step for it. Tell ETBlue.
- Do not use the Workflow tool unless ETBlue asks for it.

## Commits

End each commit message with:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
