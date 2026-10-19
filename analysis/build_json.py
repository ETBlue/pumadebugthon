"""Turn the issue analysis Markdown into JSON for the app.

Usage: python3 -I analysis/build_json.py analysis app/public/data

Reads issues.csv (編號, 資料夾, 題目, 來源), stakeholders.csv, path-labels.csv, space-types.csv,
open-data.csv (名稱, 網址, 提供機關, 授權, 議題: the open datasets that the appendices cite), and
<folder>/issue-analysis.md for each issue folder that has one. Writes
<out>/index.json and <out>/issues/<folder>.json. Removes issues/*.json files
for folders that no longer have an analysis.

A section that cannot be read stops the script with exit code 1 and the line
"<folder>: <section>: <reason>". Nothing is written in that case.

Sections and tables are found with the shared rules in analysis_common.py,
the same as in check_analysis.py and sync_stakeholders.py: by their heading
text ("## 分析摘要" and its "### " topics, "### 1.1", "### 1.2", "### 1.n 特別關注族群檢查", "## 步驟 4", "### 相同訴求群組", "### 5.4",
"### 6.1", "### 6.2", "### 6.3", one "### 7.n 解法 X：…" per solution, and
"### 7.n 總覽"). A heading matches when the prefix is followed by a
space, 「：」 or the end of the line, so "### 6.1" does not match "### 6.10".
Inside a section, the script uses the tables whose header has all the wanted
columns. There must be exactly one such table (step 1: exactly two, 組織 and
個人, found with analysis_common.step1_tables). Columns are found by their
header names.

Lists of IDs (1.2, 相同訴求群組, 5.4 相關故事, 6.2) hold IDs of this issue only.
A reference to another issue there, like 「#2 O01-US01」, stops the script.
In other text it stays as written; check_analysis.py checks that it exists.

Each solution also gets the fields for its own page in the app:
- measures: the 6.3 rows whose 解法 cell lists its code (a cell can list
  several, separated by 「、」, for example 「A、D」).
- detail: the 項目 | 內容 rows of its step 7 section, in file order.
- overview: its row of the 總覽 table (成本, 可行性, 主要風險, 主責單位). The
  row is found by its 代號 cell (the code only). The 解法 cell holds the row
  tag and a short name; every field gets the row tag.
- ideas: the rows of the 6.1 構想 table (if the table exists) whose
  本文件的處理 cell names the solution as 「解法 X」.
- pending: the 【待補】 items of its step 7 section and of its 6.3 rows. The
  same items are also in the issue's pending list.

summary: the 「## 分析摘要」 section, one item per topic in
analysis_common.SUMMARY_TOPICS, in that fixed order: {topic, items: [{item,
text, refs}]}. text is the 說明 Cell (a tag, or a 【待補】 cell). refs are the
references of the 相關編號 cell as written, for example "C5", "解法 A" or
"#8 解法 B". Each one must exist: in this issue, or in issue #n. A 【待補】
item in the summary that is also elsewhere in the file is not listed again
in pending.

focusGroups: the 「### 1.n 特別關注族群檢查」 table, one item per group in
analysis_common.FOCUS_GROUPS, in that fixed order: {tag, stakeholders, note}.
The IDs must be the step 1 stakeholders that have the group in
stakeholders.csv. index.json gets focusGaps for each analyzed issue: the
groups with no stakeholder, in the same order (null for an issue without an
analysis).

Two formats (analysis_common.needs_format). The needs-based format (#2)
has a 「### 相同需求群組」 section; #1 and #8 still use the old format. The
JSON keeps every field of the old format, with the same meaning, so the app
works with both:
- format: "needs" or "stories" (the old format).
- stories[].priority / priorityTag: the priority of the story's need (needs
  format) or of the story itself (old format). stories[].needGroup: the
  相同需求編號 (N01) or null (always null in the old format).
- needGroups: the 「### 相同需求群組」 rows: {id, summary, tag, stories}.
  [] in the old format.
- needs: the 5.2 rows, one per need: {id (N01, or the story ID of a need in
  no group), kind ("group" or "story"), summary, stories, priority,
  priorityTag, reason (a Cell)}. [] in the old format.
- conflicts: the 「### 6.4」 table (needs format) or the 「### 5.4」 table.
  sideA / sideB are the stories of 相關故事, as before. New: needsA / needsB
  (the 雙方的需求 cell, split on 「 vs 」), wayOut (the 以需求為本的解方
  Cell) and wayOutSolutions (the local solution codes in it; [] for
  「未找到」). In the old format: [], [], null and [].
- solutions[].stories: the stories whose need the solution covers in 6.2
  (needs format), or the stories of the 6.2 row (old format).
  solutions[].needs: {must, shouldCould}, the need IDs of the 6.2 row, or
  null in the old format.

Markdown inside cells (for example **bold** and [links](...)) stays as written
in the Cell text and in other text fields. The app renders it.
"""
import csv, datetime, glob, json, os, re, subprocess, sys

# python3 -I does not put the script folder on sys.path, so add it for analysis_common.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analysis_common as common

# A source tag (see analysis_common.TAGS), with or without backticks. Group 1 is the tag name.
TAG = re.compile(rf"`?{common.TAG_RE}`?")
PENDING = re.compile(r"【待補[^】]*】")
STORY_ID = re.compile(r"[OI]\d\d-US\d\d")
STAKEHOLDER_ID = re.compile(r"(?<![A-Za-z0-9])([OI]\d\d)(?![0-9])")
HEADING = common.HEADING
MOVED = "已改為"
# 來源 values in issues.csv: the hackathon host's issues, and issues that a
# participant added (for example #8). The app shows a note for the second one.
ISSUE_SOURCES = ("主辦單位", "參加者補充")


class ReadError(Exception):
    def __init__(self, section, reason):
        super().__init__(f"{section}: {reason}")
        self.section, self.reason = section, reason


# ---------- small helpers ----------

def parse_cell(s):
    """A table cell with an optional tag -> {"text", "tag", "pending"}."""
    s = s.strip()
    tags = TAG.findall(s)
    if len(tags) > 1:
        raise ValueError(f"cell has {len(tags)} tags, expected at most 1: 「{s}」")
    text = TAG.sub("", s).strip()
    text = re.sub(r"  +", " ", text)
    tag = tags[0] if tags else None
    return {"text": text, "tag": tag, "pending": tag is None and text.startswith("【待補")}


# 資料根據: the keys of counts.cells, in the fixed order 實證, AI整理, AI模擬, 待補.
# The value is the cell tag. None is a cell with no tag (a 【待補】 cell).
BASIS_KEYS = (("evidence", "實證"), ("aiSummary", "AI整理"), ("aiSimulated", "AI模擬"), ("pending", None))


def cell_basis(stories):
    """資料根據 of an issue: how many story cells have each tag.
    Counts the 我想要… (want) and the 以便… (soThat) cell of every story, so the
    total is 2 x the number of stories. The priority tag is not counted.
    A cell with no tag counts as pending (待補)."""
    tags = [s[k]["tag"] for s in stories for k in ("want", "soThat")]
    return {key: sum(t == tag for t in tags) for key, tag in BASIS_KEYS}


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


def read_csv(analysis_dir, name, columns):
    """Rows of a shared CSV file. A missing file or column is a ReadError."""
    path = os.path.join(analysis_dir, name)
    try:
        with open(path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            header = reader.fieldnames or []
    except OSError as e:
        raise ReadError(name, f"cannot read the file ({e.strerror})")
    except (UnicodeDecodeError, csv.Error) as e:
        raise ReadError(name, f"cannot read the file ({e})")
    missing = [c for c in columns if c not in header]
    if missing:
        raise ReadError(name, f"header: no column {'、'.join(missing)}")
    for i, r in enumerate(rows, start=2):
        if None in r or any(r[c] is None for c in columns):
            raise ReadError(name, f"row {i}: wrong number of cells")
    return rows


def check_date(value, section_name, where):
    """A 新增日期 value: a real date written YYYY-MM-DD. Otherwise a ReadError.
    (check_analysis.py also checks that the date is not in the future.)"""
    value = value.strip()
    try:
        if not re.fullmatch(r"\d{4}-\d\d-\d\d", value):
            raise ValueError
        datetime.date.fromisoformat(value)
    except ValueError:
        raise ReadError(section_name, f"{where}: 新增日期 「{value}」 must be a date written YYYY-MM-DD")
    return value


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

def section(text, prefix, name):
    """Lines after the heading that starts with prefix, up to the next ## or ### heading."""
    body = common.section(text, prefix)
    if body is None:
        raise ReadError(name, f"no heading that starts with 「{prefix}」")
    return body


def table_rows(found, name, columns, expected=1):
    """Rows of the tables (a list of (header, rows)) whose header has every
    wanted column, as dicts keyed by the column names. There must be exactly
    `expected` such tables."""
    found = [(h, rows) for h, rows in found if all(c in h for c in columns)]
    if len(found) != expected:
        raise ReadError(name, f"found {len(found)} tables with the columns {' | '.join(columns)}, expected {expected}")
    out = []
    for header, rows in found:
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


# Solution codes in a 6.3 解法 cell: one code, or several separated by 「、」 (「A、D」).
SOLUTION_CODES = re.compile(r"[A-Z](?:、[A-Z])*")


def pending_context(line, item_start):
    """The context of a 【待補】 item in a table row: the first cell of the row
    that is not the cell holding the item, not empty, not 「—」 and not only
    solution codes (like 「A」 or 「A、D」 in 6.3). Tags and backticks are
    removed. None when the line is not a table row or no cell fits."""
    if not line.startswith("|"):
        return None
    parts = line.strip().strip("|").split(" | ")
    # The cell that holds the item: count the cell separators before it.
    holder = line[:item_start].count(" | ")
    for i, part in enumerate(parts):
        c = re.sub(r"\s+", " ", TAG.sub("", part).replace("`", "")).strip()
        if i == holder or c in ("", "—") or SOLUTION_CODES.fullmatch(c):
            continue
        return c
    return None


# A step 7 heading for one solution, for example 「### 7.1 解法 A：清潔箱佈建建議地圖」. Group 1 is the code.
STEP7_SOLUTION = re.compile(r"^### 7\.\d+ 解法 ([A-Z])：")
# A solution named in the 構想 table's 本文件的處理 cell, for example 「併入解法 B」.
IDEA_SOLUTION = re.compile(r"解法 ?([A-Z])(?![A-Za-z])")


def row_codes(value, known, section_name, where):
    """The solution codes in a cell such as 「A」 or 「A、D」. Each must be a code from 6.1."""
    v = value.strip()
    if not SOLUTION_CODES.fullmatch(v):
        raise ReadError(section_name, f"{where}: 解法 cell 「{value}」 must be solution codes separated by 「、」, for example 「A」 or 「A、D」")
    codes = re.findall(r"[A-Z]", v)
    for c in codes:
        if c not in known:
            raise ReadError(section_name, f"{where}: solution {c} is not in 6.1")
    return codes


def cell(s, section_name, where):
    try:
        return parse_cell(s)
    except ValueError as e:
        raise ReadError(section_name, f"{where}: {e}")


def local_ids(pattern, value, section_name, where):
    """The IDs in a cell that lists stories or stakeholders of this issue only
    (1.2, 相同訴求群組, 5.4, 6.2). A reference to another issue
    (「#2 O01-US01」, see analysis_common.CROSS_REF) is an error here."""
    m = common.CROSS_REF.search(value)
    if m:
        raise ReadError(section_name, f"{where}: 「{m.group(0)}」 refers to another issue, but this list holds IDs of this issue only")
    return pattern.findall(value)


def no_duplicates(ids, section_name, kind):
    seen = set()
    for i in ids:
        if i in seen:
            raise ReadError(section_name, f"{kind} {i} is listed twice")
        seen.add(i)


# ---------- one issue ----------

FOCUS = "特別關注族群檢查"


def parse_focus(text, step1):
    """The 特別關注族群檢查 table -> [{"tag", "stakeholders", "note"}], one
    item per group in common.FOCUS_GROUPS, in that order. stakeholders is []
    for 「（無）」. note is a Cell, or None for 「—」. Each ID must be in step1."""
    found = common.focus_tables(text)
    if found is None:
        raise ReadError(FOCUS, f"no heading 「### 1.n {FOCUS}」")
    rows = table_rows(found, FOCUS, common.FOCUS_HEADER)
    tags = [r["特別關注"] for r in rows]
    if tags != list(common.FOCUS_GROUPS):
        raise ReadError(FOCUS, f"the groups must be {'、'.join(common.FOCUS_GROUPS)}, in this order; found {'、'.join(tags)}")
    out = []
    for r in rows:
        tag, ids_cell = r["特別關注"], r["納入的利害關係人"].strip()
        if ids_cell == common.FOCUS_NONE:
            ids = []
        elif re.fullmatch(r"[OI]\d\d(?:、[OI]\d\d)*", ids_cell):
            ids = ids_cell.split("、")
        else:
            raise ReadError(FOCUS, f"{tag}: 納入的利害關係人 「{ids_cell}」 must be IDs separated by 「、」, or 「{common.FOCUS_NONE}」")
        no_duplicates(ids, FOCUS, f"{tag}: stakeholder")
        for sid in ids:
            if sid not in step1:
                raise ReadError(FOCUS, f"{tag}: {sid} is not in step 1")
        note = None if r["說明"].strip() in ("", "—") else cell(r["說明"], FOCUS, tag)
        out.append({"tag": tag, "stakeholders": ids, "note": note})
    return out


def check_focus(focus_groups, step1_ids, focus_by_id):
    """Each group lists exactly the step 1 stakeholders that have it in
    stakeholders.csv (focus_by_id: ID -> list of groups)."""
    for g in focus_groups:
        want = [sid for sid in step1_ids if g["tag"] in focus_by_id.get(sid, [])]
        for sid in g["stakeholders"]:
            if sid not in want:
                raise ReadError(FOCUS, f"{g['tag']}: {sid} does not have 特別關注 {g['tag']} in stakeholders.csv")
        for sid in want:
            if sid not in g["stakeholders"]:
                raise ReadError(FOCUS, f"{g['tag']}: {sid} has 特別關注 {g['tag']} in stakeholders.csv but is not listed")

SUMMARY = "分析摘要"


def parse_summary(text, ids):
    """The 分析摘要 section -> ([{"topic", "items"}], cross refs).
    ids: the IDs of this issue (analysis_common.issue_ids). A local reference
    must be in ids. A reference to another issue is returned as
    (issue number, kind, ID, ref, where), for build() to check."""
    lines = common.summary_lines(text)
    if lines is None:
        raise ReadError(SUMMARY, f"no heading 「{common.SUMMARY_HEADING}」")
    topics = common.summary_topics(lines)
    names = [n for n, _ in topics]
    if names != list(common.SUMMARY_TOPICS):
        raise ReadError(SUMMARY, f"the topics must be {'、'.join(common.SUMMARY_TOPICS)}, in this order; "
                                 f"found {'、'.join(names)}")
    out, cross = [], []
    for name, body in topics:
        try:
            rows = table_rows(common.tables(body), SUMMARY, common.SUMMARY_HEADER)
        except ReadError as e:
            raise ReadError(SUMMARY, f"{name}: {e.reason}")
        if not rows:
            raise ReadError(SUMMARY, f"{name}: the table has no rows")
        items = []
        for r in rows:
            where = f"{name} 「{r['項目']}」"
            text_cell = cell(r["說明"], SUMMARY, where)
            if text_cell["tag"] is None and not text_cell["pending"]:
                raise ReadError(SUMMARY, f"{where}: 說明 must start with a tag, or be one 【待補：…】 item")
            refs = common.split_refs(r["相關編號"])
            if text_cell["tag"] is not None and not refs:
                raise ReadError(SUMMARY, f"{where}: 相關編號 is empty")
            for ref in refs:
                parsed = common.parse_ref(ref)
                if parsed is None:
                    raise ReadError(SUMMARY, f"{where}: 「{ref}」 is not a reference")
                num, kind, rid = parsed
                if num is None:
                    if rid not in ids[kind]:
                        raise ReadError(SUMMARY, f"{where}: {ref} is not in this issue")
                else:
                    cross.append((num, kind, rid, ref, where))
            items.append({"item": r["項目"], "text": text_cell, "refs": refs})
        out.append({"topic": name, "items": items})
    return out, cross


def summary_range(lines):
    """(start, end) line indexes of the 分析摘要 section (heading included), or (0, 0)."""
    for i, l in enumerate(lines):
        if l.strip() == common.SUMMARY_HEADING:
            end = next((j for j in range(i + 1, len(lines)) if lines[j].startswith("## ")), len(lines))
            return i, end
    return 0, 0


def parse_needs(text, stories):
    """The needs-based format: the 相同需求群組 table and the 5.2 need table.
    Returns (needGroups, needs). Checks that each N group has 2 or more
    stories, that each need has exactly one row in 5.2, and that the priority
    of each story is the priority of its need."""
    known = {s["id"] for s in stories}
    groups = []
    for r in table_rows(common.tables(section(text, common.NEED_GROUP_HEADING, "相同需求群組")), "相同需求群組",
                        ["群組", "以便（摘要）", "故事編號"]):
        c = cell(r["群組"], "相同需求群組", r["群組"])
        if not re.fullmatch(r"N\d\d", c["text"]):
            raise ReadError("相同需求群組", f"bad group ID 「{r['群組']}」")
        ids = local_ids(STORY_ID, r["故事編號"], "相同需求群組", c["text"])
        for sid in ids:
            if sid not in known:
                raise ReadError("相同需求群組", f"{c['text']}: story {sid} is not in step 4")
        if len(ids) < 2:
            raise ReadError("相同需求群組", f"{c['text']}: a group needs 2 or more stories")
        groups.append({"id": c["text"], "summary": r["以便（摘要）"], "tag": c["tag"], "stories": ids})
    no_duplicates([g["id"] for g in groups], "相同需求群組", "group")
    by_group = {g["id"]: g for g in groups}
    for s in stories:
        n = s["needGroup"]
        if n is not None and (n not in by_group or s["id"] not in by_group[n]["stories"]):
            raise ReadError("步驟 4", f"{s['id']}: 相同需求編號 {n} does not match the 相同需求群組 table")
    for g in groups:
        for sid in g["stories"]:
            if next(s for s in stories if s["id"] == sid)["needGroup"] != g["id"]:
                raise ReadError("相同需求群組", f"{g['id']}: story {sid} has another 相同需求編號 in step 4")

    needs = []
    for r in table_rows(common.tables(section(text, "### 5.2", "5.2")), "5.2", common.NEED_PRIORITY_HEADER):
        nid = r["需求"].strip()
        p = re.fullmatch(rf"`?{common.TAG_RE}`? ([MSCW])", r["優先順序"])
        if not p:
            raise ReadError("5.2", f"{nid}: bad 優先順序 cell 「{r['優先順序']}」 (expected a tag and M, S, C or W)")
        ids = local_ids(STORY_ID, r["故事編號"], "5.2", nid)
        if nid in by_group:
            kind = "group"
            if sorted(ids) != sorted(by_group[nid]["stories"]):
                raise ReadError("5.2", f"{nid}: 故事編號 does not match the 相同需求群組 table")
        elif STORY_ID.fullmatch(nid):
            kind = "story"
            s = next((s for s in stories if s["id"] == nid), None)
            if s is None:
                raise ReadError("5.2", f"story {nid} is not in step 4")
            if s["needGroup"] is not None:
                raise ReadError("5.2", f"story {nid} is in {s['needGroup']}; its priority is on the group row")
            if ids != [nid]:
                raise ReadError("5.2", f"{nid}: 故事編號 must be {nid}")
        else:
            raise ReadError("5.2", f"「{nid}」 is not a need (an N ID or a story ID)")
        needs.append({"id": nid, "kind": kind, "summary": r["以便（摘要）"], "stories": ids,
                      "priority": p.group(2), "priorityTag": p.group(1), "reason": cell(r["理由"], "5.2", nid)})
    no_duplicates([n["id"] for n in needs], "5.2", "need")
    by_need = {n["id"]: n for n in needs}
    for s in stories:
        key = s["needGroup"] or s["id"]
        if key not in by_need:
            raise ReadError("5.2", f"the need of {s['id']} ({key}) has no row")
        if (s["priority"], s["priorityTag"]) != (by_need[key]["priority"], by_need[key]["priorityTag"]):
            raise ReadError("步驟 4", f"{s['id']}: 優先順序 is not the priority of its need {key} in 5.2")
    return groups, needs


def parse_issue(text, space_codes):
    lines = text.splitlines()
    needs_format = common.needs_format(text)

    if not lines or not lines[0].startswith("# "):
        raise ReadError("title", "the first line is not a 「# 」 title")
    if len(lines) < 3 or not lines[2].startswith("空間類型："):
        raise ReadError("空間類型", "no 「空間類型：」 line right under the title")
    spaces = re.findall(r"`([^`]+)`", lines[2])
    if not spaces:
        raise ReadError("空間類型", "no space codes in backticks")
    for code in spaces:
        if code not in space_codes:
            raise ReadError("空間類型", f"unknown space code {code} (not in space-types.csv)")

    # step 1 (1.1): the 組織 and 個人 tables
    if common.section(text, "### 1.1") is None:
        raise ReadError("步驟 1", "no heading that starts with 「### 1.1」")
    s1 = table_rows(common.step1_tables(text), "步驟 1",
                    ["利害關係人編號", "與本題的關係"], expected=2)
    stakeholders = []
    for r in s1:
        sid = r["利害關係人編號"]
        if not re.fullmatch(r"[OI]\d\d", sid):
            raise ReadError("步驟 1", f"bad stakeholder ID 「{sid}」")
        stakeholders.append({"id": sid, "relation": cell(r["與本題的關係"], "步驟 1", sid)})
    no_duplicates([s["id"] for s in stakeholders], "步驟 1", "stakeholder")

    # 1.2 input sources
    input_sources = []
    for r in table_rows(common.tables(section(text, "### 1.2", "1.2")), "1.2", ["輸入來源", "適合的利害關係人", "注意事項"]):
        fit = r["適合的利害關係人"]
        input_sources.append({
            "source": r["輸入來源"],
            "stakeholders": unique(local_ids(STAKEHOLDER_ID, fit, "1.2", r["輸入來源"])),
            "fit": cell(fit, "1.2", r["輸入來源"]),
            "note": dash_to_none(r["注意事項"]),
        })

    # 1.n 特別關注族群檢查: one row per group, in the fixed order. The IDs must
    # be stakeholders of step 1. build() checks them against stakeholders.csv.
    focus_groups = parse_focus(text, {s["id"] for s in stakeholders})

    # step 4 stories
    stories = []
    cols4 = ["故事編號", "我想要…", "相同訴求編號", "以便…", "來源", "優先順序"] + (["相同需求編號"] if needs_format else [])
    for r in table_rows(common.tables(section(text, "## 步驟 4", "步驟 4")), "步驟 4", cols4):
        sid = r["故事編號"]
        if not re.fullmatch(STORY_ID, sid):
            raise ReadError("步驟 4", f"bad story ID 「{sid}」")
        p = re.fullmatch(rf"`?{common.TAG_RE}`? ([MSCW])", r["優先順序"])
        if not p:
            raise ReadError("步驟 4", f"{sid}: bad 優先順序 cell 「{r['優先順序']}」 (expected a tag and M, S, C or W)")
        group = dash_to_none(r["相同訴求編號"])
        if group is not None and not re.fullmatch(r"W\d\d", group):
            raise ReadError("步驟 4", f"{sid}: bad 相同訴求編號 「{group}」")
        need_group = dash_to_none(r["相同需求編號"]) if needs_format else None
        if need_group is not None and not re.fullmatch(r"N\d\d", need_group):
            raise ReadError("步驟 4", f"{sid}: bad 相同需求編號 「{need_group}」")
        stories.append({
            "id": sid, "stakeholder": sid.split("-")[0],
            "want": cell(r["我想要…"], "步驟 4", sid), "group": group,
            "soThat": cell(r["以便…"], "步驟 4", sid), "source": dash_to_none(r["來源"]),
            "priority": p.group(2), "priorityTag": p.group(1), "needGroup": need_group,
        })

    # 相同訴求群組
    groups = []
    for r in table_rows(common.tables(section(text, "### 相同訴求群組", "相同訴求群組")), "相同訴求群組",
                        ["群組", "我想要（摘要）", "故事編號"]):
        c = cell(r["群組"], "相同訴求群組", r["群組"])
        if not re.fullmatch(r"W\d\d", c["text"]):
            raise ReadError("相同訴求群組", f"bad group ID 「{r['群組']}」")
        groups.append({"id": c["text"], "summary": r["我想要（摘要）"], "tag": c["tag"],
                       "stories": local_ids(STORY_ID, r["故事編號"], "相同訴求群組", c["text"])})

    # cross-references: stories and groups
    story_ids = [s["id"] for s in stories]
    no_duplicates(story_ids, "步驟 4", "story")
    known = set(story_ids)
    group_ids = [g["id"] for g in groups]
    no_duplicates(group_ids, "相同訴求群組", "group")
    for g in groups:
        for sid in g["stories"]:
            if sid not in known:
                raise ReadError("相同訴求群組", f"{g['id']}: story {sid} is not in step 4")
    for s in stories:
        if s["group"] is not None and s["group"] not in group_ids:
            raise ReadError("步驟 4", f"{s['id']}: group {s['group']} has no row in 相同訴求群組")

    # needs-based format: 相同需求群組 and the 5.2 need table
    need_groups, needs = parse_needs(text, stories) if needs_format else ([], [])
    need_ids = {n["id"] for n in needs}

    # conflicts: 6.4 (needs format) or 5.4 (old format)
    chead = common.conflict_heading(text)
    cname = chead[4:]
    ccols = ["#", "衝突", "相關故事", "可能的審議方法", "模擬結果"] + (["雙方的需求", "以需求為本的解方"] if needs_format else [])
    conflicts = []
    for r in table_rows(common.tables(section(text, chead, cname)), cname, ccols):
        cid = r["#"]
        sides = r["相關故事"].split(" vs ")
        if len(sides) != 2:
            raise ReadError(cname, f"{cid}: 相關故事 must have exactly one 「 vs 」, found {len(sides) - 1}")
        a, b = (local_ids(STORY_ID, s, cname, cid) for s in sides)
        if not a or not b:
            raise ReadError(cname, f"{cid}: one side of 「 vs 」 has no story ID")
        for sid in a + b:
            if sid not in known:
                raise ReadError(cname, f"{cid}: story {sid} is not in step 4")
        item = {"id": cid, "text": cell(r["衝突"], cname, cid), "sideA": a, "sideB": b,
                "method": cell(r["可能的審議方法"], cname, cid), "result": cell(r["模擬結果"], cname, cid),
                "needsA": [], "needsB": [], "wayOut": None, "wayOutSolutions": []}
        if needs_format:
            nsides = r["雙方的需求"].split(" vs ")
            if len(nsides) != 2:
                raise ReadError(cname, f"{cid}: 雙方的需求 must have exactly one 「 vs 」")
            na, nb = ([x.strip() for x in s.split("、") if x.strip()] for s in nsides)
            for ref in na + nb:
                if ref not in need_ids:
                    raise ReadError(cname, f"{cid}: 雙方的需求 「{ref}」 is not a need in 5.2")
            way = cell(r["以需求為本的解方"], cname, cid)
            m = re.match(r"解法 ([A-Z](?:、[A-Z])*)：", way["text"])
            if m:
                codes = m.group(1).split("、")
            elif way["text"].startswith(common.WAY_OUT_NONE):
                codes = []
            else:
                raise ReadError(cname, f"{cid}: 以需求為本的解方 must start with 「解法 X：」 or 「{common.WAY_OUT_NONE}」")
            item.update({"needsA": na, "needsB": nb, "wayOut": way, "wayOutSolutions": codes})
        conflicts.append(item)
    no_duplicates([c["id"] for c in conflicts], cname, "conflict")

    # 6.1 solutions
    solutions = []
    for r in table_rows(common.tables(section(text, "### 6.1", "6.1")), "6.1", ["代號", "解法", "空間類型", "新增日期", "一句話說明"]):
        sol, codes = r["代號"], re.findall(r"`([^`]+)`", r["空間類型"])
        if not codes:
            raise ReadError("6.1", f"solution {sol}: no space code")
        for code in codes:
            if code not in space_codes:
                raise ReadError("6.1", f"solution {sol}: unknown space code {code} (not in space-types.csv)")
            if code not in spaces:
                raise ReadError("6.1", f"solution {sol}: space code {code} is not in the issue's 空間類型 line")
        solutions.append({"id": sol, "name": cell(r["解法"], "6.1", sol), "summary": r["一句話說明"],
                          "spaces": codes, "added": check_date(r["新增日期"], "6.1", f"solution {sol}"),
                          "stories": [], "needs": None})
    no_duplicates([s["id"] for s in solutions], "6.1", "solution")
    by_sol = {s["id"]: s for s in solutions}
    in_62 = []

    # 6.2 stories (old format) or needs (needs format) per solution
    by_need = {n["id"]: n for n in needs}
    cols62 = common.NEED_MAP_HEADER if needs_format else ["代號", "解法", "涵蓋的 Must", "涵蓋的 Should / Could"]
    for r in table_rows(common.tables(section(text, "### 6.2", "6.2")), "6.2", cols62):
        sol = r["代號"]
        if not re.fullmatch(r"[A-Z]", sol):
            raise ReadError("6.2", f"bad solution code 「{sol}」 (expected one capital letter)")
        if sol not in by_sol:
            raise ReadError("6.2", f"solution 「{sol}」 is not in 6.1")
        in_62.append(sol)
        if needs_format:
            covered = {}
            for key, col, allowed in (("must", "涵蓋的 Must 需求", "M"), ("shouldCould", "涵蓋的 Should / Could 需求", "SC")):
                value = r[col]
                if common.CROSS_REF.search(value):
                    raise ReadError("6.2", f"solution {sol}: 「{common.CROSS_REF.search(value).group(0)}」 refers to another issue")
                body = TAG.sub("", value).strip()
                refs = [] if body in ("", "—") else [x.strip() for x in body.split("、")]
                for ref in refs:
                    if ref not in by_need:
                        raise ReadError("6.2", f"solution {sol}: 「{ref}」 is not a need in 5.2")
                    if by_need[ref]["priority"] not in allowed:
                        raise ReadError("6.2", f"solution {sol}: {ref} is {by_need[ref]['priority']}, not in the column {col}")
                covered[key] = refs
            by_sol[sol]["needs"] = covered
            # The old field: the stories whose need this solution covers.
            by_sol[sol]["stories"] = unique(sid for ref in covered["must"] + covered["shouldCould"]
                                            for sid in by_need[ref]["stories"])
            continue
        ids = (local_ids(STORY_ID, r["涵蓋的 Must"], "6.2", f"solution {sol}")
               + local_ids(STORY_ID, r["涵蓋的 Should / Could"], "6.2", f"solution {sol}"))
        for sid in ids:
            if sid not in known:
                raise ReadError("6.2", f"solution {sol}: story {sid} is not in step 4")
        by_sol[sol]["stories"] = unique(ids)
    no_duplicates(in_62, "6.2", "solution")
    for s in solutions:
        if s["id"] not in in_62:
            raise ReadError("6.2", f"solution {s['id']} from 6.1 has no row in 6.2")

    sol_codes = [s["id"] for s in solutions]

    # 6.3 measures: a row belongs to every solution its 解法 cell lists (「A、D」).
    for s in solutions:
        s["measures"] = []
    for r in table_rows(common.tables(section(text, "### 6.3", "6.3")), "6.3", ["解法", "指標", "目前數值（基準值）", "資料來源"]):
        metric = r["指標"]
        for code in row_codes(r["解法"], sol_codes, "6.3", f"row 「{metric}」"):
            by_sol[code]["measures"].append({"metric": metric,
                                             "baseline": cell(r["目前數值（基準值）"], "6.3", metric),
                                             "source": r["資料來源"]})

    # step 7: one section 「### 7.n 解法 X：…」 per solution, with a 項目 | 內容 table.
    step7_heads = {}
    for l in lines:
        m = STEP7_SOLUTION.match(l)
        if m:
            code = m.group(1)
            if code not in by_sol:
                raise ReadError("步驟 7", f"「{l}」: solution {code} is not in 6.1")
            if code in step7_heads:
                raise ReadError("步驟 7", f"solution {code} has two sections")
            step7_heads[code] = l
    for s in solutions:
        head = step7_heads.get(s["id"])
        if head is None:
            raise ReadError("步驟 7", f"solution {s['id']} has no section 「### 7.n 解法 {s['id']}：…」")
        name = head[4:].replace("`", "").strip()
        s["detail"] = [{"item": r["項目"], "content": cell(r["內容"], name, r["項目"])}
                       for r in table_rows(common.tables(common.section(text, head)), name, ["項目", "內容"])]

    # 總覽 (### 7.n 總覽): one row per solution. The 代號 cell is the code only
    # (「A」). The 解法 cell is the row tag and a short name (「`[AI模擬]` 佈建建議地圖」).
    # Every field gets the row tag.
    overview_head = next((l for l in lines if re.match(r"^### 7\.\d+ 總覽\s*$", l)), None)
    if overview_head is None:
        raise ReadError("總覽", "no heading 「### 7.n 總覽」")
    for r in table_rows(common.tables(common.section(text, overview_head)), "總覽",
                        ["代號", "解法", "成本", "可行性", "主要風險", "主責單位"]):
        code = r["代號"].strip()
        if not re.fullmatch(r"[A-Z]", code) or code not in by_sol:
            raise ReadError("總覽", f"row 「{r['解法']}」: 代號 「{r['代號']}」 is not a solution code from 6.1")
        first = cell(r["解法"], "總覽", code)
        if "overview" in by_sol[code]:
            raise ReadError("總覽", f"solution {code} has two rows")
        by_sol[code]["overview"] = {
            key: {"text": r[col], "tag": first["tag"], "pending": first["tag"] is None and r[col].startswith("【待補")}
            for key, col in (("cost", "成本"), ("feasibility", "可行性"), ("risk", "主要風險"), ("owner", "主責單位"))}
    for s in solutions:
        if "overview" not in s:
            raise ReadError("總覽", f"solution {s['id']} has no row")

    # 6.1 構想 table (optional): a row belongs to every solution that its
    # 本文件的處理 cell names as 「解法 X」. A row that names no solution is left out.
    for s in solutions:
        s["ideas"] = []
    idea_tables = [t for t in common.tables(section(text, "### 6.1", "6.1")) if "構想" in t[0] and "本文件的處理" in t[0]]
    if idea_tables:
        for r in table_rows(idea_tables, "6.1", ["構想", "本文件的處理"]):
            idea = cell(r["構想"], "6.1", "構想")
            handling = cell(r["本文件的處理"], "6.1", "構想")
            for code in unique(IDEA_SOLUTION.findall(handling["text"])):
                if code not in by_sol:
                    raise ReadError("6.1", f"構想 「{idea['text']}」: 解法 {code} is not in 6.1")
                by_sol[code]["ideas"].append({"idea": idea, "handling": handling})

    # 分析摘要: the topics and items. Cross-issue references are checked in build().
    summary, summary_cross = parse_summary(text, common.issue_ids(text))

    # every 【待補…】 item with the nearest heading. Items in backticks are
    # examples of the format (for example in the notice), not open items.
    # An item in a solution's 7.n section or in its 6.3 row is also listed
    # under that solution.
    pending = []
    # The 分析摘要 adds no new facts, so a 【待補】 item there that is also
    # elsewhere in the file is not listed twice.
    s_start, s_end = summary_range(lines)
    outside = {m.group(0) for i, l in enumerate(lines) if not s_start <= i < s_end
               for m in PENDING.finditer(re.sub(r"`[^`]*`", "", l))}
    step7_names = {code: head[4:].replace("`", "").strip() for code, head in step7_heads.items()}
    for s in solutions:
        s["pending"] = []
    for n_line, (line, head) in enumerate(zip(lines, headings_before(lines))):
        # Blank out code spans (same length) so positions still match the line.
        plain = re.sub(r"`[^`]*`", lambda m: " " * len(m.group(0)), line)
        owners = [c for c, n in step7_names.items() if n == head]
        if head is not None and head.split(" ")[0] == "6.3" and line.startswith("|"):
            first = common.split_cells(line)[0]
            if SOLUTION_CODES.fullmatch(first):
                owners = [c for c in re.findall(r"[A-Z]", first) if c in by_sol]
        for m in PENDING.finditer(plain):
            if s_start <= n_line < s_end and m.group(0) in outside:
                continue
            item = {"section": head, "text": m.group(0), "context": pending_context(line, m.start())}
            pending.append(item)
            for c in owners:
                by_sol[c]["pending"].append(item)

    return {"spaces": spaces, "format": "needs" if needs_format else "stories", "summary": summary,
            "summaryCross": summary_cross, "stakeholders": stakeholders, "inputSources": input_sources,
            "focusGroups": focus_groups, "stories": stories, "groups": groups, "needGroups": need_groups,
            "needs": needs, "conflicts": conflicts, "solutions": solutions, "pending": pending}


# ---------- whole build ----------

def build(analysis_dir):
    issues_csv = read_csv(analysis_dir, "issues.csv", ["編號", "資料夾", "題目", "來源"])
    space_rows = read_csv(analysis_dir, "space-types.csv", ["代碼", "名稱", "分組", "說明"])
    space_codes = {r["代碼"] for r in space_rows}
    label_rows = read_csv(analysis_dir, "path-labels.csv", ["分類路徑", "名稱"])
    stake_rows = read_csv(analysis_dir, "stakeholders.csv",
                          ["利害關係人編號", "利害關係人", "分類路徑", "特別關注", "議題", "備註", "新增日期"])
    focus_by_id = {r["利害關係人編號"]: common.split_focus(r["特別關注"]) for r in stake_rows}
    index_issues, issue_files = [], {}
    ids_by_num, cross_by_folder = {}, {}
    for i, row in enumerate(issues_csv, start=2):
        if not re.fullmatch(r"\d+", row["編號"].strip()):
            raise ReadError("issues.csv", f"row {i}: 編號 「{row['編號']}」 is not a number")
        num, folder, title, source = int(row["編號"]), row["資料夾"], row["題目"], row["來源"].strip()
        if source not in ISSUE_SOURCES:
            raise ReadError("issues.csv", f"row {i}: 來源 「{row['來源']}」 must be one of {'、'.join(ISSUE_SOURCES)}")
        md = os.path.join(analysis_dir, folder, "issue-analysis.md")
        if not os.path.exists(md):
            index_issues.append({"number": num, "folder": folder, "title": title, "source": source, "available": False,
                                 "spaces": [], "updated": None, "counts": None, "focusGaps": None})
            continue
        with open(md, encoding="utf-8") as f:
            text = f.read()
        try:
            data = parse_issue(text, space_codes)
        except ReadError as e:
            raise ReadError(f"{folder}: {e.section}", e.reason)
        ids = [s["id"] for s in data["stakeholders"]]
        try:
            check_focus(data["focusGroups"], ids, focus_by_id)
        except ReadError as e:
            raise ReadError(f"{folder}: {e.section}", e.reason)
        ids_by_num[num] = common.issue_ids(text)
        cross_by_folder[folder] = (num, data.pop("summaryCross"))
        updated = git_updated(os.path.join(analysis_dir, folder))
        counts = {
            "stakeholdersO": sum(i.startswith("O") for i in ids),
            "stakeholdersI": sum(i.startswith("I") for i in ids),
            "stories": len(data["stories"]),
            "conflicts": len(data["conflicts"]),
            "solutions": len(data["solutions"]),
            "cells": cell_basis(data["stories"]),
        }
        index_issues.append({"number": num, "folder": folder, "title": title, "source": source, "available": True,
                             "spaces": data["spaces"], "updated": updated, "counts": counts,
                             # The groups with no stakeholder, in the fixed order (for the issue card).
                             "focusGaps": [g["tag"] for g in data["focusGroups"] if not g["stakeholders"]]})
        issue_files[folder] = {"number": num, "folder": folder, "title": title,
                               "spaces": data["spaces"], "updated": updated, **{k: v for k, v in data.items() if k != "spaces"}}

    # 分析摘要 references to another issue: the issue has an analysis and the ID.
    for folder, (own, refs) in cross_by_folder.items():
        for num, kind, rid, ref, where in refs:
            if num == own:
                raise ReadError(f"{folder}: {SUMMARY}", f"{where}: {ref} is this issue itself; write {rid}")
            if num not in ids_by_num:
                raise ReadError(f"{folder}: {SUMMARY}", f"{where}: {ref}: issue #{num} has no analysis")
            if rid not in ids_by_num[num][kind]:
                raise ReadError(f"{folder}: {SUMMARY}", f"{where}: {ref} is not in issue #{num}")

    stakeholders = []
    for r in stake_rows:
        sid, note = r["利害關係人編號"], r["備註"].strip()
        # Same rule as check_analysis.py and sync_stakeholders.py: a row is
        # moved when 備註 starts with 已改為. The new ID must follow.
        moved_to = None
        if note.startswith(MOVED):
            m = re.match(rf"{MOVED} ?([OI]\d\d)(?![0-9])", note)
            if not m:
                raise ReadError("stakeholders.csv", f"{sid}: 備註 「{note}」 starts with {MOVED} but no ID like I12 follows")
            moved_to = m.group(1)
        issues = r["議題"].split()
        if not all(re.fullmatch(r"\d+", x) for x in issues):
            raise ReadError("stakeholders.csv", f"{sid}: 議題 「{r['議題']}」 must be issue numbers separated by spaces")
        focus = r["特別關注"].strip()
        stakeholders.append({
            "id": sid, "name": r["利害關係人"], "path": r["分類路徑"].strip() or None,
            "focus": [x.strip() for x in focus.split("、")] if focus else [],
            "issues": [] if moved_to else [int(x) for x in issues],
            "movedTo": moved_to,
            "added": check_date(r["新增日期"], "stakeholders.csv", sid),
        })

    open_data = []
    for r in read_csv(analysis_dir, "open-data.csv", ["名稱", "網址", "提供機關", "授權", "議題"]):
        nums = r["議題"].split()
        if not nums or not all(re.fullmatch(r"\d+", x) for x in nums):
            raise ReadError("open-data.csv", f"{r['網址']}: 議題 「{r['議題']}」 must be issue numbers separated by spaces")
        open_data.append({"name": r["名稱"], "url": r["網址"], "agency": r["提供機關"], "license": r["授權"],
                          "issues": [int(x) for x in nums]})

    index = {
        "issues": index_issues,
        "stakeholders": stakeholders,
        "pathLabels": {r["分類路徑"]: r["名稱"] for r in label_rows},
        "spaceTypes": [{"code": r["代碼"], "name": r["名稱"], "group": r["分組"], "description": r["說明"]}
                       for r in space_rows],
        "openData": open_data,
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
