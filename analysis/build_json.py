"""Turn the issue analysis Markdown into JSON for the app.

Usage: python3 -I analysis/build_json.py analysis app/public/data

Reads issues.csv, stakeholders.csv, path-labels.csv and space-types.csv, and
<folder>/issue-analysis.md for each issue folder that has one. Writes
<out>/index.json and <out>/issues/<folder>.json. Removes issues/*.json files
for folders that no longer have an analysis.

A section that cannot be read stops the script with exit code 1 and the line
"<folder>: <section>: <reason>". Nothing is written in that case.

Sections are found the same way as in check_analysis.py: by their heading
text ("## 步驟 1", "### 1.2", "## 步驟 4", "### 相同訴求群組", "### 5.4",
"### 6.1", "### 6.2"). Inside a section, the script reads the first Markdown
table (step 1: every table) and finds columns by their header names.
"""
import csv, glob, json, os, re, subprocess, sys

TAG = re.compile(r"`?\[(實證|AI模擬)\]`?")
PENDING = re.compile(r"【待補[^】]*】")
STORY_ID = re.compile(r"[OI]\d\d-US\d\d")
STAKEHOLDER_ID = re.compile(r"(?<![A-Za-z0-9])([OI]\d\d)(?![0-9])")
SEPARATOR = re.compile(r"^\|(?:\s*:?-+:?\s*\|)+\s*$")
HEADING = re.compile(r"^(#{2,3}) (.+)$")
MOVED = "已改為"


class ReadError(Exception):
    def __init__(self, section, reason):
        super().__init__(f"{section}: {reason}")
        self.section, self.reason = section, reason


# ---------- small helpers ----------

def parse_cell(s):
    """A table cell with an optional tag -> {"text", "tag", "pending"}."""
    s = s.strip()
    tags = TAG.findall(s)
    text = TAG.sub("", s).strip()
    text = re.sub(r"  +", " ", text)
    tag = tags[0] if tags else None
    return {"text": text, "tag": tag, "pending": tag is None and text.startswith("【待補")}


def dash_to_none(s):
    s = s.strip()
    return None if s in ("", "—") else s


def unique(items):
    seen, out = set(), []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def cells(line):
    return [x.strip() for x in line.strip().strip("|").split(" | ")]


def read_csv(analysis_dir, name):
    with open(os.path.join(analysis_dir, name), encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def git_updated(folder):
    """Date of the last commit that changed the folder (YYYY-MM-DD), or None."""
    try:
        p = subprocess.run(["git", "log", "-1", "--format=%cs", "--", "."], cwd=folder,
                           capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    out = p.stdout.strip()
    return out if p.returncode == 0 and re.fullmatch(r"\d{4}-\d\d-\d\d", out) else None


# ---------- Markdown structure ----------

def section(lines, prefix, name):
    """Lines after the heading that starts with prefix, up to the next ## or ### heading."""
    for i, line in enumerate(lines):
        if line.startswith(prefix):
            body = []
            for l in lines[i + 1:]:
                if HEADING.match(l):
                    break
                body.append(l)
            return body
    raise ReadError(name, f"no heading that starts with 「{prefix}」")


def tables(body):
    """Every Markdown table in the lines: a list of (header, rows)."""
    out = []
    for i in range(1, len(body)):
        if SEPARATOR.match(body[i]) and body[i - 1].startswith("|"):
            rows = []
            for l in body[i + 1:]:
                if not l.startswith("|"):
                    break
                rows.append(cells(l))
            out.append((cells(body[i - 1]), rows))
    return out


def table_rows(body, name, columns, all_tables=False):
    """Rows of the first table (or every table) as dicts keyed by the wanted column names."""
    found = tables(body)
    if not found:
        raise ReadError(name, "no table")
    out = []
    for header, rows in (found if all_tables else found[:1]):
        missing = [c for c in columns if c not in header]
        if missing:
            raise ReadError(name, f"table has no column {'、'.join(missing)} (header: {' | '.join(header)})")
        for r in rows:
            if len(r) != len(header):
                raise ReadError(name, f"row 「{r[0]}」 has {len(r)} cells, expected {len(header)}")
            out.append({c: r[header.index(c)] for c in columns})
    return out


def headings_before(lines):
    """For each line, the nearest ## or ### heading above it (or None)."""
    out, current = [], None
    for l in lines:
        m = HEADING.match(l)
        if m:
            current = m.group(2).replace("`", "").strip()
        out.append(current)
    return out


# ---------- one issue ----------

def parse_issue(text):
    lines = text.splitlines()

    if not lines or not lines[0].startswith("# "):
        raise ReadError("title", "the first line is not a 「# 」 title")
    if len(lines) < 3 or not lines[2].startswith("空間類型："):
        raise ReadError("空間類型", "no 「空間類型：」 line right under the title")
    spaces = re.findall(r"`([^`]+)`", lines[2])
    if not spaces:
        raise ReadError("空間類型", "no space codes in backticks")

    # step 1 (1.1): the 組織 and 個人 tables
    s1 = table_rows(section(lines, "### 1.1", "步驟 1"), "步驟 1",
                    ["利害關係人編號", "與本題的關係"], all_tables=True)
    stakeholders = []
    for r in s1:
        sid = r["利害關係人編號"]
        if not re.fullmatch(r"[OI]\d\d", sid):
            raise ReadError("步驟 1", f"bad stakeholder ID 「{sid}」")
        stakeholders.append({"id": sid, "relation": parse_cell(r["與本題的關係"])})

    # 1.2 input sources
    input_sources = []
    for r in table_rows(section(lines, "### 1.2", "1.2"), "1.2", ["輸入來源", "適合的利害關係人", "注意事項"]):
        fit = r["適合的利害關係人"]
        input_sources.append({
            "source": r["輸入來源"],
            "stakeholders": unique(STAKEHOLDER_ID.findall(fit)),
            "fit": parse_cell(fit),
            "note": r["注意事項"],
        })

    # step 4 stories
    stories = []
    cols4 = ["故事編號", "我想要…", "相同訴求編號", "以便…", "來源", "優先順序"]
    for r in table_rows(section(lines, "## 步驟 4", "步驟 4"), "步驟 4", cols4):
        sid = r["故事編號"]
        if not re.fullmatch(STORY_ID, sid):
            raise ReadError("步驟 4", f"bad story ID 「{sid}」")
        p = re.fullmatch(r"`?\[(實證|AI模擬)\]`? ([MSCW])", r["優先順序"])
        if not p:
            raise ReadError("步驟 4", f"{sid}: bad 優先順序 cell 「{r['優先順序']}」 (expected a tag and M, S, C or W)")
        group = dash_to_none(r["相同訴求編號"])
        if group is not None and not re.fullmatch(r"W\d\d", group):
            raise ReadError("步驟 4", f"{sid}: bad 相同訴求編號 「{group}」")
        stories.append({
            "id": sid, "stakeholder": sid.split("-")[0],
            "want": parse_cell(r["我想要…"]), "group": group,
            "soThat": parse_cell(r["以便…"]), "source": dash_to_none(r["來源"]),
            "priority": p.group(2), "priorityTag": p.group(1),
        })

    # 相同訴求群組
    groups = []
    for r in table_rows(section(lines, "### 相同訴求群組", "相同訴求群組"), "相同訴求群組",
                        ["群組", "我想要（摘要）", "故事編號"]):
        c = parse_cell(r["群組"])
        if not re.fullmatch(r"W\d\d", c["text"]):
            raise ReadError("相同訴求群組", f"bad group ID 「{r['群組']}」")
        groups.append({"id": c["text"], "summary": r["我想要（摘要）"], "tag": c["tag"],
                       "stories": STORY_ID.findall(r["故事編號"])})

    # 5.4 conflicts
    conflicts = []
    for r in table_rows(section(lines, "### 5.4", "5.4"), "5.4", ["#", "衝突", "相關故事", "可能的審議方法", "模擬結果"]):
        cid = r["#"]
        sides = r["相關故事"].split(" vs ")
        if len(sides) != 2:
            raise ReadError("5.4", f"{cid}: 相關故事 must have exactly one 「 vs 」, found {len(sides) - 1}")
        a, b = (STORY_ID.findall(s) for s in sides)
        if not a or not b:
            raise ReadError("5.4", f"{cid}: one side of 「 vs 」 has no story ID")
        conflicts.append({"id": cid, "text": parse_cell(r["衝突"]), "sideA": a, "sideB": b,
                          "method": parse_cell(r["可能的審議方法"]), "result": parse_cell(r["模擬結果"])})

    # 6.1 solutions
    solutions = []
    for r in table_rows(section(lines, "### 6.1", "6.1"), "6.1", ["代號", "解法", "空間類型", "一句話說明"]):
        solutions.append({"id": r["代號"], "name": parse_cell(r["解法"]), "summary": r["一句話說明"],
                          "spaces": re.findall(r"`([^`]+)`", r["空間類型"]), "stories": []})
    by_sol = {s["id"]: s for s in solutions}

    # 6.2 stories per solution
    for r in table_rows(section(lines, "### 6.2", "6.2"), "6.2", ["解法", "涵蓋的 Must", "涵蓋的 Should / Could"]):
        sol = r["解法"].split(" ", 1)[0]
        if sol not in by_sol:
            raise ReadError("6.2", f"solution 「{sol}」 is not in 6.1")
        by_sol[sol]["stories"] = unique(STORY_ID.findall(r["涵蓋的 Must"]) + STORY_ID.findall(r["涵蓋的 Should / Could"]))

    # every 【待補…】 item with the nearest heading. Items in backticks are
    # examples of the format (for example in the notice), not open items.
    pending = []
    for line, head in zip(lines, headings_before(lines)):
        plain = re.sub(r"`[^`]*`", "", line)
        for m in PENDING.finditer(plain):
            pending.append({"section": head, "text": m.group(0)})

    return {"spaces": spaces, "stakeholders": stakeholders, "inputSources": input_sources,
            "stories": stories, "groups": groups, "conflicts": conflicts,
            "solutions": solutions, "pending": pending}


# ---------- whole build ----------

def build(analysis_dir):
    issues_csv = read_csv(analysis_dir, "issues.csv")
    index_issues, issue_files = [], {}
    for row in issues_csv:
        num, folder, title = int(row["編號"]), row["資料夾"], row["題目"]
        md = os.path.join(analysis_dir, folder, "issue-analysis.md")
        if not os.path.exists(md):
            index_issues.append({"number": num, "folder": folder, "title": title, "available": False,
                                 "spaces": [], "updated": None, "counts": None})
            continue
        with open(md, encoding="utf-8") as f:
            text = f.read()
        try:
            data = parse_issue(text)
        except ReadError as e:
            raise ReadError(f"{folder}: {e.section}", e.reason)
        updated = git_updated(os.path.join(analysis_dir, folder))
        ids = [s["id"] for s in data["stakeholders"]]
        counts = {
            "stakeholdersO": sum(i.startswith("O") for i in ids),
            "stakeholdersI": sum(i.startswith("I") for i in ids),
            "stories": len(data["stories"]),
            "conflicts": len(data["conflicts"]),
            "solutions": len(data["solutions"]),
            "wantsEvidence": sum(s["want"]["tag"] == "實證" for s in data["stories"]),
        }
        index_issues.append({"number": num, "folder": folder, "title": title, "available": True,
                             "spaces": data["spaces"], "updated": updated, "counts": counts})
        issue_files[folder] = {"number": num, "folder": folder, "title": title,
                               "spaces": data["spaces"], "updated": updated, **{k: v for k, v in data.items() if k != "spaces"}}

    stakeholders = []
    for r in read_csv(analysis_dir, "stakeholders.csv"):
        note = r["備註"].strip()
        moved = re.match(rf"{MOVED}\s*([OI]\d\d)", note)
        focus = r["特別關注"].strip()
        stakeholders.append({
            "id": r["利害關係人編號"], "name": r["利害關係人"], "path": r["分類路徑"].strip() or None,
            "focus": [x.strip() for x in focus.split("、")] if focus else [],
            "issues": [] if moved else [int(x) for x in r["議題"].split()],
            "movedTo": moved.group(1) if moved else None,
        })

    index = {
        "issues": index_issues,
        "stakeholders": stakeholders,
        "pathLabels": {r["分類路徑"]: r["名稱"] for r in read_csv(analysis_dir, "path-labels.csv")},
        "spaceTypes": [{"code": r["代碼"], "name": r["名稱"], "group": r["分組"], "description": r["說明"]}
                       for r in read_csv(analysis_dir, "space-types.csv")],
    }
    return index, issue_files


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main(analysis_dir, out_dir):
    try:
        index, issue_files = build(analysis_dir)
    except ReadError as e:
        print(f"{e.section}: {e.reason}", file=sys.stderr)
        return 1
    issues_dir = os.path.join(out_dir, "issues")
    os.makedirs(issues_dir, exist_ok=True)
    write_json(os.path.join(out_dir, "index.json"), index)
    for folder, data in issue_files.items():
        write_json(os.path.join(issues_dir, f"{folder}.json"), data)
    for old in glob.glob(os.path.join(issues_dir, "*.json")):
        if os.path.splitext(os.path.basename(old))[0] not in issue_files:
            os.remove(old)
            print(f"removed {old}")
    for folder, data in issue_files.items():
        print(f"{folder}: {len(data['stories'])} stories, {len(data['conflicts'])} conflicts, "
              f"{len(data['solutions'])} solutions, {len(data['pending'])} 待補 items")
    print(f"wrote {out_dir}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 -I analysis/build_json.py analysis app/public/data")
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
