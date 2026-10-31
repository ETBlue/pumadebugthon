"""Write the list of cross-issue combine candidates (rule R3).

Usage: python3 -I analysis/scripts/cross_candidates.py analysis analysis/cross-issue/candidates.csv [--check]

The list only suggests pairs. A person decides if a pair becomes a combined
solution (解法 X-…) in cross-issue-analysis.md. See method.md, 跨議題分析.

Rule R3. Two solutions s and t from different issues are a candidate when
all of these are true:
1. They share a solution type (解法類型).
2. They share a domain (領域), or a solution-level space type (空間類型),
   or the shared type is `open-data` or `intake`. Only level 2 codes are
   on solutions, so only level 2 codes are matched.
3. They share a need: both are in the same X-N group (cross-issue 2.1) or
   the same 1.2 row. A solution is in a group or row when one of its 6.2
   needs or stories is listed there for its issue.
A shared stakeholder alone does not count. The stakeholder can have
different needs in the two issues.

Output columns: 解法甲,解法乙,共同解法類型,共同領域,共同空間類型,共同需求,已在跨議題解法.
- IDs look like 1-A. 解法甲 has the lower issue number (then the lower letter).
- Codes in a cell are joined with 「、」. Types, domains and spaces keep the
  order of 解法甲's cell. 共同需求 lists the X-N IDs in ID order, then the
  1.2 rows (「1.2 O12」) in file order.
- 已在跨議題解法 lists the X- solutions that contain both, or is empty.
- Rows are sorted by 解法甲, then 解法乙 (issue number as a number, then
  letter). They are never sorted by a count. There are no scores or ranks.

With --check the script writes nothing. It fails when the file differs from
a rebuild (build_all.sh uses this with CI=true).

The issue files and the cross-issue file are read with build_json.py (which
uses check_cross_issue.py), so there is no second parser here.
"""
import csv, io, os, sys

# python3 -I does not put the script folder on sys.path, so add it.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_json
from analysis_common import ReadError

PLATFORM_TYPES = ("open-data", "intake")
HEADER = ["解法甲", "解法乙", "共同解法類型", "共同領域", "共同空間類型", "共同需求", "已在跨議題解法"]
JOIN = "、"


def shared(first, second):
    """The codes of first that are also in second, in the order of first."""
    other = set(second)
    return [c for c in first if c in other]


def solution_refs(s):
    """The need and story IDs of one issue solution (its 6.2 row)."""
    needs = s.get("needs") or {}
    return set(s.get("stories") or []) | set(needs.get("must") or []) | set(needs.get("shouldCould") or [])


def need_sets(cross):
    """The cross-issue need groups as (name, {(issue, ID)}), X-N groups first."""
    groups = []
    for g in sorted(cross.get("needGroups") or [], key=lambda g: g["id"]):
        refs = {(r["issue"], r["id"]) for r in (g.get("needs") or []) + (g.get("stories") or [])}
        groups.append((g["id"], refs))
    for row in cross.get("repeatedNeeds") or []:
        groups.append((f"1.2 {row['stakeholder']}", {(r["issue"], r["id"]) for r in row["needs"]}))
    return groups


def candidates(issues, cross):
    """The R3 candidate pairs.

    issues: issue dicts as build_json.py writes them (number, solutions with
    id, solutionTypes, domains, spaces, stories, needs).
    cross: the cross-issue dict as build_json.py writes it (needGroups,
    repeatedNeeds, solutions with parts).
    Returns one dict per pair: a, b (like "1-A"), types, domains, spaces,
    needs, crossSolutions (lists of codes).
    """
    sols = sorted(((i["number"], s["id"], s) for i in issues for s in i["solutions"]), key=lambda x: (x[0], x[1]))
    groups = need_sets(cross)
    in_groups = {(num, code): [name for name, refs in groups if any((num, r) in refs for r in solution_refs(s))]
                 for num, code, s in sols}
    parts = [(x["code"], {(p["issue"], p["code"]) for p in x["parts"]})
             for x in sorted(cross.get("solutions") or [], key=lambda x: x["code"])]
    rows = []
    for i, (n1, c1, s) in enumerate(sols):
        for n2, c2, t in sols[i + 1:]:
            if n1 == n2:
                continue
            types = shared(s["solutionTypes"], t["solutionTypes"])
            if not types:
                continue
            domains = shared(s["domains"], t["domains"])
            spaces = shared(s["spaces"], t["spaces"])
            platform = [c for c in types if c in PLATFORM_TYPES]
            if not (domains or spaces or platform):
                continue
            needs = shared(in_groups[(n1, c1)], in_groups[(n2, c2)])
            if not needs:
                continue
            both = [code for code, members in parts if (n1, c1) in members and (n2, c2) in members]
            rows.append({"a": f"{n1}-{c1}", "b": f"{n2}-{c2}", "types": types, "domains": domains,
                         "spaces": spaces, "needs": needs, "crossSolutions": both})
    return rows


def csv_text(rows):
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(HEADER)
    for r in rows:
        w.writerow([r["a"], r["b"]] + [JOIN.join(r[k]) for k in ("types", "domains", "spaces", "needs", "crossSolutions")])
    return out.getvalue()


BOM = "﻿"


def file_is_current(path, text):
    """True when the file at path is exactly text with a BOM in front.
    It reads with plain utf-8, so a file without the BOM is not current."""
    try:
        with open(path, encoding="utf-8", newline="") as f:
            return f.read() == BOM + text
    except FileNotFoundError:
        return False


def main(analysis_dir, out_path, check=False):
    try:
        _, issue_files = build_json.build(analysis_dir)
        cross = build_json.build_cross_issue(analysis_dir)
    except ReadError as e:
        print(f"{e.section}: {e.reason}", file=sys.stderr)
        return 1
    if cross is None:
        print("no cross-issue file; no candidates written", file=sys.stderr)
        return 1
    rows = candidates(issue_files.values(), cross)
    text = csv_text(rows)
    new = sum(1 for r in rows if not r["crossSolutions"])
    if check:
        if not file_is_current(out_path, text):
            print(f"ERROR: {out_path} is not up to date. Run cross_candidates.py without --check and commit it.")
            return 1
        print(f"{out_path} is up to date: {len(rows)} candidates, {new} not in any X- solution")
        return 0
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        f.write(text)
    print(f"wrote {out_path}: {len(rows)} candidates, {new} not in any X- solution")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--check"]
    if len(args) != 2:
        print("Usage: python3 -I analysis/scripts/cross_candidates.py analysis analysis/cross-issue/candidates.csv [--check]")
        sys.exit(2)
    sys.exit(main(args[0], args[1], check="--check" in sys.argv[1:]))
