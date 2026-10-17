#!/usr/bin/env bash
# Run every analysis check and build the app JSON. Stops at the first failure.
#
# Usage: analysis/build_all.sh [output dir]   (default: app/public/data)
# Works from any folder. A relative output dir is read from the folder you run it in.
#
# Steps:
#   1. sync_stakeholders.py fills the 議題 column of stakeholders.csv.
#   2. For each issue folder in issues.csv that has an issue-analysis.md:
#      build_csv.py, then check_analysis.py.
#   3. The unittest suite.
#   4. build_json.py writes the JSON.
# With CI=true, steps 1 and 2 also fail when a rebuilt file differs from the
# committed one. In CI the committed files must already be up to date.
set -euo pipefail

out="${1:-}"
if [[ -n "$out" && "$out" != /* ]]; then out="$PWD/$out"; fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
python3 -I analysis/sync_stakeholders.py analysis
not_committed analysis/stakeholders.csv "sync_stakeholders.py changed it"

echo "== 2. build_csv.py and check_analysis.py for each issue"
# Column 2 of issues.csv is the folder. Skip the header line.
while read -r folder; do
  md="analysis/$folder/issue-analysis.md"
  csv="analysis/$folder/user-stories.csv"
  [[ -f "$md" ]] || continue
  echo "-- $folder"
  python3 -I analysis/build_csv.py "$md" "$csv"
  not_committed "$csv" "build_csv.py rebuilt it from the step 4 table"
  python3 -I analysis/check_analysis.py "$md" "$csv"
done < <(tail -n +2 analysis/issues.csv | cut -d, -f2 | tr -d '\r')

echo "== 3. unit tests"
python3 -I -m unittest discover -s analysis/tests -t .

echo "== 4. build_json.py -> $out"
python3 -I analysis/build_json.py analysis "$out"

echo "== all steps passed"
