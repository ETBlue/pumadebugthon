#!/usr/bin/env bash
# Run every analysis check and build the app JSON. Stops at the first failure.
#
# Usage: analysis/scripts/build_all.sh [output dir]   (default: app/public/data)
# Works from any folder. A relative output dir is read from the folder you run it in.
#
# Steps:
#   1. sync_stakeholders.py fills the 議題 column of stakeholders.csv.
#   2. build_csv.py for each issue folder in issues.csv that has an
#      issue-analysis.md.
#   3. update_dates.py updates data/updated-dates.csv (the dates of each
#      stakeholder, solution, story and space type). With CI=true it runs with --check: it writes
#      nothing and fails when the file is not up to date, so CI never writes a date.
#   4. check_analysis.py for each of these issue folders.
#   5. check_cross_issue.py for cross-issue/cross-issue-analysis.md (if it exists).
#   6. The unittest suite.
#   7. build_json.py writes the JSON (also cross-issue.json).
#   8. build_flat.py reads that JSON and writes one CSV and one JSON file per
#      entity type into <output dir>/flat/ (analysis/docs/data-guide.md).
# With CI=true, steps 1, 2 and 3 also fail when a rebuilt file differs from the
# committed one. In CI the committed files must already be up to date.
set -euo pipefail

out="${1:-}"
if [[ -n "$out" && "$out" != /* ]]; then out="$PWD/$out"; fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"
out="${out:-app/public/data}"
ci="${CI:-}"

# Fail in CI when the file differs from the last commit (or is not committed).
# Locally, print a note only.
not_committed() {
  local file="$1" why="$2"
  if [[ -n "$(git status --porcelain -- "$file")" ]]; then
    if [[ "$ci" == "true" ]]; then
      echo "ERROR: $file is not up to date in the commit ($why)."
      git --no-pager diff --stat -- "$file"
      exit 1
    fi
    echo "NOTE: $file differs from the last commit ($why). Commit it."
  fi
}

echo "== 1. sync_stakeholders.py"
python3 -I analysis/scripts/sync_stakeholders.py analysis
not_committed analysis/data/stakeholders.csv "sync_stakeholders.py changed it"

# The issue folders that have an issue-analysis.md. Column 2 of issues.csv is
# the folder. Skip the header line.
folders=()
while read -r folder; do
  [[ -f "analysis/$folder/issue-analysis.md" ]] && folders+=("$folder")
done < <(tail -n +2 analysis/data/issues.csv | cut -d, -f2 | tr -d '\r')

echo "== 2. build_csv.py for each issue"
for folder in "${folders[@]}"; do
  echo "-- $folder"
  csv="analysis/$folder/user-stories.csv"
  python3 -I analysis/scripts/build_csv.py "analysis/$folder/issue-analysis.md" "$csv"
  not_committed "$csv" "build_csv.py rebuilt it from the step 4 table"
done

echo "== 3. update_dates.py"
if [[ "$ci" == "true" ]]; then
  python3 -I analysis/scripts/update_dates.py analysis --check
else
  python3 -I analysis/scripts/update_dates.py analysis
fi
not_committed analysis/data/updated-dates.csv "update_dates.py changed it"

echo "== 4. check_analysis.py for each issue"
for folder in "${folders[@]}"; do
  echo "-- $folder"
  python3 -I analysis/scripts/check_analysis.py "analysis/$folder/issue-analysis.md" "analysis/$folder/user-stories.csv"
done

echo "== 5. check_cross_issue.py"
cross="analysis/cross-issue/cross-issue-analysis.md"
if [[ -f "$cross" ]]; then
  python3 -I analysis/scripts/check_cross_issue.py "$cross"
else
  echo "no $cross; skipped"
fi

echo "== 6. unit tests"
python3 -I -m unittest discover -s analysis/tests -t .

echo "== 7. build_json.py -> $out"
python3 -I analysis/scripts/build_json.py analysis "$out"

echo "== 8. build_flat.py -> $out/flat"
python3 -I analysis/scripts/build_flat.py "$out"

echo "== all steps passed"
