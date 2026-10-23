"""Write one flat file per entity type, for people who want to reuse the data.

Usage: python3 -I analysis/scripts/build_flat.py app/public/data

Reads the JSON that build_json.py wrote in the same folder (index.json,
issues/*.json, cross-issue.json). Writes <dir>/flat/<type>.csv and
<dir>/flat/<type>.json for each type in TYPES. The guide to the files is
analysis/docs/data-guide.md. Do not edit the files by hand: build_all.sh
writes them again each time.

The rules (the data guide explains them to readers):
- One row per ID. The column "id" is a global ID that is unique in its
  file. An ID of one issue gets the issue number in front, joined with
  "-", like the solution slug of the app ("2-A"): "2-N01", "2-O01-US01",
  "2-W01", "2-C1". The columns "issue" and "local_id" keep the parts.
  Stakeholders, space types and the cross-issue IDs (X-N01, X-C1, X-A)
  are already global, so they have no prefix.
- A column that points to other rows holds their global IDs. In the CSV
  a list is joined with one space. In the JSON a list is an array.
- A text cell with a tag has a second column "<name>_tag": 實證, AI整理,
  AI模擬, 待補 (a 【待補】 cell with no tag), or empty (no tag).
- CSV: UTF-8 with a BOM, like analysis/data/*.csv, so Excel shows the
  Chinese text. JSON: a list of row objects with the same keys as the
  CSV columns. An empty value is null in the JSON and empty in the CSV.
"""
import csv, json, os, sys

# The order of the files in the data guide and on the about page.
TYPES = (
    "issues", "stakeholders", "issue-stakeholders", "stories", "wants", "needs",
    "conflicts", "solutions", "cross-need-groups", "cross-conflicts", "cross-solutions",
    "space-types",
)


def cell_tag(cell):
    """The tag column value of a Cell: its tag, 待補, or None."""
    if cell is None:
        return None
    if cell.get("tag"):
        return cell["tag"]
    return "待補" if cell.get("pending") else None


def cell_text(cell):
    return None if cell is None else cell["text"]


def gid(issue, local):
    """The global ID of an ID of one issue, for example gid(2, "N01") -> "2-N01"."""
    return f"{issue}-{local}"


def ref(r):
    """The global ID of a cross-issue reference {issue, id}. issue null is an
    ID of the cross-issue file itself (X-N02)."""
    return r["id"] if r["issue"] is None else gid(r["issue"], r["id"])


def part(p):
    """The global ID of an issue solution {issue, code}, for example "1-C"."""
    return gid(p["issue"], p["code"])


def with_cell(row, name, cell):
    """Add the text column and its _tag column."""
    row[name] = cell_text(cell)
    row[f"{name}_tag"] = cell_tag(cell)


def issue_rows(index):
    return [{
        "id": i["number"],
        "folder": i["folder"],
        "title": i["title"],
        "source": i["source"],
        "available": i["available"],
        "spaces": i["spaces"],
        "added": i.get("added"),
        "updated": i["updated"],
    } for i in index["issues"]]


def stakeholder_rows(index):
    return [{
        "id": s["id"],
        "name": s["name"],
        "path": s["path"],
        "focus": s["focus"],
        "issues": s["issues"],
        "moved_to": s["movedTo"],
        "added": s["added"],
        "updated": s.get("updated"),
    } for s in index["stakeholders"]]


def space_type_rows(index):
    return [{
        "id": s["code"],
        "name": s["name"],
        "group": s["group"],
        "description": s["description"],
        "added": s.get("added"),
        "updated": s.get("updated"),
    } for s in index["spaceTypes"]]


def issue_file_rows(issue):
    """The rows of one issue file, by type."""
    n = issue["number"]
    rows = {t: [] for t in ("issue-stakeholders", "stories", "wants", "needs", "conflicts", "solutions")}
    need_ids = {need["id"] for need in issue["needs"]}
    group_tags = {g["id"]: g["tag"] for g in issue["needGroups"]}

    for s in issue["stakeholders"]:
        row = {"id": gid(n, s["id"]), "issue": n, "stakeholder": s["id"]}
        with_cell(row, "relation", s["relation"])
        rows["issue-stakeholders"].append(row)

    for s in issue["stories"]:
        # The need of the story: its N group, or the story itself when 5.2
        # lists it as a need of its own.
        need = s["needGroup"] or (s["id"] if s["id"] in need_ids else None)
        row = {"id": gid(n, s["id"]), "issue": n, "local_id": s["id"], "stakeholder": s["stakeholder"]}
        with_cell(row, "want", s["want"])
        row["want_group"] = gid(n, s["group"]) if s["group"] else None
        with_cell(row, "so_that", s["soThat"])
        row["need"] = gid(n, need) if need else None
        row["priority"] = s["priority"]
        row["priority_tag"] = s["priorityTag"]
        row["source"] = s["source"]
        row["added"] = s.get("added")
        row["updated"] = s.get("updated")
        rows["stories"].append(row)

    for g in issue["groups"]:
        rows["wants"].append({
            "id": gid(n, g["id"]), "issue": n, "local_id": g["id"],
            "summary": g["summary"], "summary_tag": g["tag"],
            "stories": [gid(n, x) for x in g["stories"]],
        })

    for need in issue["needs"]:
        row = {
            "id": gid(n, need["id"]), "issue": n, "local_id": need["id"], "kind": need["kind"],
            "summary": need["summary"],
            # Only an N group has a tag on its summary (the 相同需求群組 table).
            "summary_tag": group_tags.get(need["id"]) if need["kind"] == "group" else None,
            "stories": [gid(n, x) for x in need["stories"]],
            "priority": need["priority"], "priority_tag": need["priorityTag"],
        }
        with_cell(row, "reason", need["reason"])
        rows["needs"].append(row)

    for c in issue["conflicts"]:
        row = {"id": gid(n, c["id"]), "issue": n, "local_id": c["id"]}
        with_cell(row, "text", c["text"])
        row["stories_a"] = [gid(n, x) for x in c["sideA"]]
        row["stories_b"] = [gid(n, x) for x in c["sideB"]]
        row["needs_a"] = [gid(n, x) for x in c["needsA"]]
        row["needs_b"] = [gid(n, x) for x in c["needsB"]]
        with_cell(row, "way_out", c["wayOut"])
        row["way_out_solutions"] = [gid(n, x) for x in c["wayOutSolutions"]]
        with_cell(row, "method", c["method"])
        with_cell(row, "result", c["result"])
        rows["conflicts"].append(row)

    for s in issue["solutions"]:
        row = {"id": gid(n, s["id"]), "issue": n, "local_id": s["id"]}
        with_cell(row, "name", s["name"])
        row["summary"] = s["summary"]
        row["spaces"] = s["spaces"]
        needs = s["needs"] or {"must": [], "shouldCould": []}
        row["needs_must"] = [gid(n, x) for x in needs["must"]]
        row["needs_should_could"] = [gid(n, x) for x in needs["shouldCould"]]
        row["stories"] = [gid(n, x) for x in s["stories"]]
        for key in ("cost", "feasibility", "risk", "owner"):
            with_cell(row, key, s["overview"][key])
        row["added"] = s["added"]
        row["updated"] = s.get("updated")
        rows["solutions"].append(row)
    return rows


def cross_rows(cross):
    """The rows of cross-issue.json, by type. Empty lists when there is no file."""
    rows = {"cross-need-groups": [], "cross-conflicts": [], "cross-solutions": []}
    if cross is None:
        return rows
    for g in cross["needGroups"]:
        row = {
            "id": g["id"], "summary": g["summary"], "summary_tag": g["tag"],
            "needs": [gid(x["issue"], x["id"]) for x in g["needs"]],
            "stories": [ref(x) for x in g["stories"]],
            "stakeholders": g["stakeholders"],
            "priority": g["priority"], "priority_tag": g["priorityTag"],
            "priorities_differ": g["prioritiesDiffer"],
        }
        with_cell(row, "reason", g["reason"])
        rows["cross-need-groups"].append(row)
    for c in cross["conflicts"]:
        row = {"id": c["id"]}
        with_cell(row, "text", c["text"])
        row["issue_conflicts"] = [ref(x) for x in c["issueConflicts"]]
        row["stories_a"] = [ref(x) for x in c["sideA"]]
        row["stories_b"] = [ref(x) for x in c["sideB"]]
        row["needs_a"] = [ref(x) for x in c["needsA"]]
        row["needs_b"] = [ref(x) for x in c["needsB"]]
        with_cell(row, "way_out", c["wayOut"])
        row["way_out_solutions"] = c["wayOutSolutions"]
        with_cell(row, "method", c["method"])
        with_cell(row, "result", c["result"])
        rows["cross-conflicts"].append(row)
    for s in cross["solutions"]:
        rows["cross-solutions"].append({
            "id": s["code"], "name": s["name"], "name_tag": s["tag"], "summary": s["summary"],
            "parts": [part(p) for p in s["parts"]],
            "spaces": s["spaces"],
            "needs_must": [ref(x) for x in s["needs"]["must"]],
            "needs_should_could": [ref(x) for x in s["needs"]["shouldCould"]],
            "cross_need_groups": s["needs"]["crossIssue"],
            "added": s["added"], "updated": s.get("updated"),
        })
    return rows


def build(index, issues, cross):
    """All tables, by type. issues: the issue files, in any order."""
    tables = {t: [] for t in TYPES}
    tables["issues"] = issue_rows(index)
    tables["stakeholders"] = stakeholder_rows(index)
    tables["space-types"] = space_type_rows(index)
    for issue in sorted(issues, key=lambda i: i["number"]):
        for t, rows in issue_file_rows(issue).items():
            tables[t].extend(rows)
    for t, rows in cross_rows(cross).items():
        tables[t].extend(rows)
    return tables


def csv_value(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, list):
        return " ".join(str(x) for x in v)
    return str(v)


def write_table(folder, name, rows):
    if not rows:
        raise SystemExit(f"build_flat.py: {name}: no rows")
    columns = list(rows[0])
    with open(os.path.join(folder, f"{name}.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(columns)
        for row in rows:
            w.writerow([csv_value(row[c]) for c in columns])
    with open(os.path.join(folder, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
        f.write("\n")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main(argv):
    if len(argv) != 2:
        raise SystemExit(__doc__)
    data = argv[1]
    index = load(os.path.join(data, "index.json"))
    issues = [load(os.path.join(data, "issues", f"{i['folder']}.json")) for i in index["issues"] if i["available"]]
    cross_path = os.path.join(data, "cross-issue.json")
    cross = load(cross_path) if os.path.exists(cross_path) else None
    tables = build(index, issues, cross)
    folder = os.path.join(data, "flat")
    os.makedirs(folder, exist_ok=True)
    names = [t for t in TYPES if not (cross is None and t.startswith("cross-"))]
    # Remove old files, for example the cross-issue files when there is no
    # cross-issue.json now.
    keep = {f"{t}.{ext}" for t in names for ext in ("csv", "json")}
    for f in os.listdir(folder):
        if f not in keep:
            os.remove(os.path.join(folder, f))
    for name in names:
        write_table(folder, name, tables[name])
        print(f"{name}: {len(tables[name])} rows")
    print(f"wrote {folder}")


if __name__ == "__main__":
    main(sys.argv)
