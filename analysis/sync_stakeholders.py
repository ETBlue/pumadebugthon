"""Fill the 議題 column of stakeholders.csv from the step 1 tables of the issue files.

Usage: python3 -I analysis/sync_stakeholders.py analysis

For each issue folder in issues.csv, the script reads <folder>/issue-analysis.md
and takes the stakeholder IDs from the step 1 tables (rows that start with
"| O.." or "| I.."). It then sets 議題 of each row to the sorted issue numbers,
separated by one space. A moved row (備註 starts with 已改為) gets an empty 議題.
Only the 議題 column changes. The BOM, the header, the row order, the line
endings and all other cells stay as they are. The step 1 rules are the same as
in check_analysis.py, so the two scripts agree.
"""
import csv, io, os, re, sys
from collections import defaultdict

ISSUE_COL = "議題"
ID_COL = "利害關係人編號"
NOTE_COL = "備註"
MOVED = "已改為"


def step1_ids(text):
    """Return the stakeholder IDs in the step 1 (1.1) tables. Same rule as check_analysis.py."""
    sec = text.split("## 步驟 1", 1)[1].split("### 1.2", 1)[0] if "## 步驟 1" in text else ""
    return [l.strip().strip("|").split(" | ")[0].strip()
            for l in sec.splitlines() if re.match(r"^\| [OI]\d\d \|", l)]


def to_csv_text(rows):
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n").writerows(rows)
    return buf.getvalue()


def main(analysis_dir):
    with open(os.path.join(analysis_dir, "issues.csv"), encoding="utf-8-sig", newline="") as f:
        issues = [(int(r["編號"]), r["資料夾"]) for r in csv.DictReader(f)]

    path = os.path.join(analysis_dir, "stakeholders.csv")
    with open(path, "rb") as f:
        raw = f.read()
    bom = b"\xef\xbb\xbf" if raw.startswith(b"\xef\xbb\xbf") else b""
    text = raw[len(bom):].decode("utf-8")
    rows = list(csv.reader(io.StringIO(text, newline="")))
    # Write the file back only if writing the rows unchanged gives the same text.
    # Then no other cell, quote or line ending can change.
    if to_csv_text(rows) != text:
        print(f"ERROR: {path} uses a CSV layout this script cannot keep exactly (quotes or line endings). Nothing written.")
        return 1
    header = rows[0]
    id_i, issue_i, note_i = header.index(ID_COL), header.index(ISSUE_COL), header.index(NOTE_COL)
    known = {r[id_i] for r in rows[1:]}

    listed = defaultdict(set)
    errors = []
    for num, folder in issues:
        md = os.path.join(analysis_dir, folder, "issue-analysis.md")
        if not os.path.exists(md):
            continue  # this issue has no analysis yet
        with open(md, encoding="utf-8") as f:
            for sid in step1_ids(f.read()):
                if sid not in known:
                    errors.append(f"ERROR: {sid} is in step 1 of issue {num} ({folder}) but not in stakeholders.csv")
                listed[sid].add(num)
    if errors:
        for e in errors:
            print(e)
        print("Nothing written.")
        return 1

    changed = 0
    for r in rows[1:]:
        sid = r[id_i]
        want = "" if r[note_i].strip().startswith(MOVED) else " ".join(str(n) for n in sorted(listed[sid]))
        if r[issue_i] != want:
            print(f'{sid}: "{r[issue_i]}" -> "{want}"')
            r[issue_i] = want
            changed += 1
    if changed:
        with open(path, "wb") as f:
            f.write(bom + to_csv_text(rows).encode("utf-8"))
    print(f"{changed} row(s) changed")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 -I analysis/sync_stakeholders.py analysis")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
