"""Shared rules for reading an issue-analysis.md file.

check_analysis.py, sync_stakeholders.py and build_json.py use these
functions, so the three scripts find sections and tables the same way.
No code runs on import.

Rules:
- A section starts at the first ## or ### heading whose text starts with the
  given prefix, followed by a space, 「：」 or the end of the line. So
  "### 6.1" does not match "### 6.10". The section ends at the next ## or
  ### heading.
- A table is a header line that starts with "|", a separator line such as
  "|---|---|", and the "|" lines after it.
- Cells are split on " | " (a space, a bar, a space). So a cell must not
  contain " | ".
- The step 1 stakeholder tables are all the tables in the section
  "### 1.1", up to the next heading.
- The step 4 story IDs are the first cells of the table rows under
  "## 步驟 4", up to the next heading.
- A reference to another issue is written as 「#」, the issue number, one
  space, then a story ID or a stakeholder ID: 「#2 O01-US01」 or 「#2 O03」
  (CROSS_REF). Such a reference is not a local ID of the file it is in.
- A source tag is one of TAGS in square brackets, for example [AI整理].
  In Markdown it is wrapped in backticks (`[AI整理]`); the CSV keeps the
  plain tag. All scripts use TAGS, so a new tag is added here only.
- The 特別關注族群檢查 table is the table under the heading
  "### 1.n 特別關注族群檢查" (any number n), up to the next heading. It has
  one row per group in FOCUS_GROUPS, in that order.
- The 分析摘要 section starts at "## 分析摘要" and ends at the next "## "
  heading. It has one "### " subsection per topic in SUMMARY_TOPICS, in that
  order. Each subsection has one table with the header SUMMARY_HEADER.
- A 相關編號 cell lists references separated by 「、」, or 「—」. A reference
  is a story (I01-US01), a stakeholder (I05), a conflict (C3), a group (W01)
  or a solution (解法 S1). A reference to another issue starts with 「#」, the
  issue number and one space: 「#8 解法 S2」, 「#2 C9」 (SUMMARY_REF).
  A 相同需求群組 (N01) is a reference too.
- Two formats exist (see docs/method.md). The needs-based format has a
  "### 相同需求群組" section (needs_format). In it, step 5 gives one MoSCoW
  priority per need, 6.2 maps solutions to needs, and the conflicts are in
  "### 6.4". The old format puts the conflicts in "### 5.4" and the
  priority on each story. All analyzed issues (#1, #2, #8) use the
  needs-based format now. The scripts still read the old format, and
  tests/fixtures/old-format tests it.
- 空間類型: the line right under the title lists space codes in backticks,
  separated by 「、」, and each 6.1 row lists its codes in the 空間類型 cell.
  An issue that uses no city space (for example #9) writes 「空間類型：無」
  (NO_SPACE_LINE) and 「—」 (NO_SPACE_CELL) in every 6.1 空間類型 cell.
  Both give an empty list of codes. 「—」 is allowed only with 「無」, and
  「無」 only with 「—」 (ETBlue, 2026-10-20). The space codes are the
  level 2 codes of data/space-types.csv (ETBlue, 2026-10-31): a level 1
  code (road, underground, public-space, building) is not a tag.
- Folders: the scripts get the analysis folder (the folder with the issue
  folders). The shared CSV files are in its data/ folder (data_file) and
  method.md is in its docs/ folder (doc_file).
- Practice tables (practice_tables): the tables in the section "### 6.1"
  whose header is PRACTICE_HEADER (做法 | 內容 | 本文件怎麼用), under bold
  headings such as 「**其他城市的相關做法（…查詢）**」. The 做法 cell starts
  with its place and 「：」 (practice_place): the country, and the city if
  any, for example 「美國紐約：」, 「英國：」, 「臺灣臺北市：」. A place that
  starts with DOMESTIC (「臺灣」) is domestic; any other place is foreign
  (ETBlue, 2026-10-22). The 本文件怎麼用 cell names solutions of this issue
  (practice_refs): 「解法 S1」, a list 「解法 S3、S4」, or a step 7 section
  「7.1」, which means the solution of the heading 「### 7.1 解法 S1：…」. A
  reference to another issue (「#8 解法 S2」) is not a solution of this issue.
- Step 7 「評估解法」 (ETBlue, 2026-10-23): each 「### 7.n 解法 Sn：…」 section
  has an evaluation table (項目 | 內容: STEP7_ROWS), a plan table (執行計畫 |
  內容: PLAN_ROWS) and, when the solution has some, a dependency table
  (DEPENDENCY_HEADER). step7_tables() finds them by header. A dependency
  row is a row of the 分析摘要 topic 相依事項與現行政策的關係 that names the
  solution; the 分析摘要 keeps only the rows that name no solution.
- Type lists (ETBlue, 2026-10-31): data/domain-types.csv (領域, the 政事別
  list of Taipei) and data/solution-types.csv (解法類型). domain_types() and
  solution_types() read them. A code must not repeat. A list with 2 levels
  (domain types, and space types in data/space-types.csv, read by
  space_types()) has a 上層 column: empty on a level 1
  row, the code of a level 1 row on a level 2 row (check_two_levels). Only
  level 2 codes (leaf_codes) are tags on issues and solutions. Types are
  labels only: no scores, weights or ranks.
- 領域 and 解法類型 on an issue (ETBlue, 2026-10-31): the line right under
  the 空間類型 line is 「領域：」 (DOMAIN_LINE) with 1 to 3 level 2 codes
  from domain-types.csv, in backticks, separated by 「、」. The 6.1 header
  is SOLUTION_HEADER. Each 解法類型 cell lists 1 to 3 codes from
  solution-types.csv. Each 領域 cell is empty, or lists 1 to 3 level 2
  domain codes that are not on the issue's 領域 line: a solution gets its
  own domains only when they differ from the issue's. type_codes() and
  tag_problem() check a list of codes. domain_line() reads and checks the
  領域 line, solution_type_problems() the two 6.1 cells, and
  space_problem() one space code. build_json.py and check_analysis.py both
  use them, so both give the same messages. An issue with 「空間類型：無」 (#9)
  still has a 領域 line and its 解法類型 cells. The old format may leave
  out the 領域 line and use OLD_SOLUTION_HEADER (the fixture only).
- Solution, need and conflict IDs (ETBlue, 2026-10-31; app/docs/design.md
  decision 151): one capital letter and a number with no zero padding. An
  issue solution is S1, S2 … (SOLUTION_CODE); its full ID is 「1-S1」. The
  cross-issue file has solutions X-S1 … (X_SOLUTION_CODE), need groups
  X-N1 … (X_NEED_CODE) and conflicts X-C1 … (X_CONFLICT_CODE). The other
  IDs of an issue (N01, W01, C1, O01, I01-US01) do not change. An old ID
  (one capital letter; X- and one capital letter; X-N with a zero) fails
  with a message that names the new form
  (solution_code_problem, x_code_problem). Lists of these IDs sort by the
  number inside the ID, not as text, so S2 comes before S10 (id_key).
- Content fingerprint (fingerprint): the first 12 hex characters of the
  SHA-256 of the content as canonical JSON (keys sorted, no spaces, UTF-8).
  update_dates.py and check_analysis.py use it to see whether the content of
  a stakeholder or a solution changed.
"""
import csv, datetime, hashlib, json, os, re

DATA_FOLDER = "data"
DOCS_FOLDER = "docs"


# Solution, need and conflict IDs (see the rules above). Patterns without
# anchors; use re.fullmatch, or add boundaries.
SOLUTION_CODE = r"S[1-9]\d*"
X_SOLUTION_CODE = r"X-S[1-9]\d*"
X_NEED_CODE = r"X-N[1-9]\d*"
X_CONFLICT_CODE = r"X-C[1-9]\d*"
# A list of issue solution codes, as in a 6.3 解法 cell: 「S1」 or 「S1、S4」.
SOLUTION_CODES = re.compile(rf"{SOLUTION_CODE}(?:、{SOLUTION_CODE})*")


def id_key(value):
    """A sort key that compares the numbers inside an ID as numbers, so
    S2 < S10, X-N2 < X-N10 and 1-S2 < 1-S10 < 2-S1. The other parts compare
    as text."""
    return tuple((0, int(p), "") if p.isdigit() else (1, 0, p) for p in re.findall(r"\d+|\D+", value))


def solution_code_problem(code):
    """Why code is not an issue solution code (S1, S2 …), or None. An old
    code (one capital letter, for example A) gets a message with the new code."""
    if re.fullmatch(SOLUTION_CODE, code):
        return None
    if re.fullmatch(r"[A-Z]", code):
        return f"「{code}」 is an old solution code: write S{ord(code) - 64} (the letters map in order: A is S1, B is S2 …)"
    return f"「{code}」 is not a solution code (S and a number with no zero padding, for example S1 or S10)"


def x_code_problem(code, kind):
    """Why code is not a cross-issue ID of this kind, or None. kind is
    "solution" (X-S1), "need" (X-N1) or "conflict" (X-C1). An old code
    (X- and one capital letter, or X-N with a zero) gets a message with the
    new code."""
    pattern, example = {"solution": (X_SOLUTION_CODE, "X-S1"), "need": (X_NEED_CODE, "X-N1"),
                        "conflict": (X_CONFLICT_CODE, "X-C1")}[kind]
    if re.fullmatch(pattern, code):
        return None
    if kind == "solution" and re.fullmatch(r"X-[A-Z]", code):
        return f"「{code}」 is an old cross-issue solution code: write X-S{ord(code[2]) - 64} (the letters map in order: A is X-S1, B is X-S2 …)"
    m = re.fullmatch(r"X-([NC])0+(\d+)", code)
    if m and m.group(1) == {"need": "N", "conflict": "C"}.get(kind):
        return f"「{code}」 has a zero padding: write X-{m.group(1)}{int(m.group(2))}"
    return f"「{code}」 is not a cross-issue {kind} ID (for example {example}; a number with no zero padding)"


def data_file(analysis_dir, name):
    """The path of a shared CSV file, such as issues.csv: <analysis_dir>/data/<name>."""
    return os.path.join(analysis_dir, DATA_FOLDER, name)


def doc_file(analysis_dir, name):
    """The path of a shared doc, such as method.md: <analysis_dir>/docs/<name>."""
    return os.path.join(analysis_dir, DOCS_FOLDER, name)


class ReadError(Exception):
    """A file or a section that cannot be read. section is the file name or
    the section, reason says what is wrong. build_json.ReadError is this class."""
    def __init__(self, section, reason):
        super().__init__(f"{section}: {reason}")
        self.section, self.reason = section, reason


def read_csv(analysis_dir, name, columns):
    """Rows of a shared CSV file. A missing file or column is a ReadError."""
    path = data_file(analysis_dir, name)
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


# The type lists (see the rules above) and their columns.
DOMAIN_TYPES_FILE = "domain-types.csv"
DOMAIN_TYPE_COLS = ("代碼", "名稱", "上層", "說明", "政事別", "陳情系統主類別")
SOLUTION_TYPES_FILE = "solution-types.csv"
SOLUTION_TYPE_COLS = ("代碼", "名稱", "說明", "判斷方式", "政策工具")
SPACE_TYPES_FILE = "space-types.csv"
SPACE_TYPE_COLS = ("代碼", "名稱", "上層", "說明")
# The 領域 line of an issue file: the line right under the 空間類型 line.
DOMAIN_LINE = "領域："
# A 領域 line, a 解法類型 cell and a 領域 cell list 1 to MAX_TYPES codes.
MAX_TYPES = 3
# The 6.1 table header. OLD_SOLUTION_HEADER (without 解法類型 and 領域) is
# read only in the old format (tests/fixtures/old-format).
SOLUTION_HEADER = ["代號", "解法", "空間類型", "解法類型", "領域", "新增日期", "一句話說明"]
OLD_SOLUTION_HEADER = ["代號", "解法", "空間類型", "新增日期", "一句話說明"]


def code_rows(analysis_dir, name, columns):
    """{代碼: row} of a type list, in file order. The values are stripped.
    A missing column, a file with no rows, an empty code or a repeated code
    is a ReadError."""
    rows = read_csv(analysis_dir, name, columns)
    if not rows:
        raise ReadError(name, "the file has no rows (only a header)")
    out = {}
    for i, r in enumerate(rows, start=2):
        row = {k: (v or "").strip() for k, v in r.items()}
        code = row["代碼"]
        if not code:
            raise ReadError(name, f"row {i}: empty 代碼")
        if code in out:
            raise ReadError(name, f"code {code} is repeated (row {i})")
        out[code] = row
    return out


def _row_list(rows):
    """rows as a list of row dicts: a {code: row} dict or a list of rows."""
    return list(rows.values()) if isinstance(rows, dict) else list(rows)


def leaf_codes(rows):
    """The level 2 codes (a row with a 上層) in file order. rows is a
    {code: row} dict or a list of rows with 代碼 and 上層."""
    return [r["代碼"].strip() for r in _row_list(rows) if r["上層"].strip()]


def check_two_levels(rows, file_name):
    """Check a list with 2 levels. Every 上層 is empty (level 1) or the code
    of a level 1 row (level 2). Every level 1 row has at least one child.
    A child row may come before its parent row. Otherwise a ReadError that
    names the file and the code. rows is a {code: row} dict or a list of
    rows with 代碼 and 上層. A list must not have an empty or a repeated
    代碼 (a dict from code_rows is already checked)."""
    rows = _row_list(rows)
    parent = {}
    for n, r in enumerate(rows, start=1):
        code = r["代碼"].strip()
        if not code:
            raise ReadError(file_name, f"row {n} (data row, not counting the header): empty 代碼")
        if code in parent:
            raise ReadError(file_name, f"code {code} is repeated")
        parent[code] = r["上層"].strip()
    for r in rows:
        code, up = r["代碼"].strip(), r["上層"].strip()
        if not up:
            continue
        if up not in parent:
            raise ReadError(file_name, f"code {code}: 上層 {up} is not a code in this file")
        if parent[up]:
            raise ReadError(file_name, f"code {code}: 上層 {up} is a level 2 code. The list has only 2 levels, "
                                       f"so 上層 must be a level 1 code (a row with an empty 上層)")
    children = set(parent.values())
    for code, up in parent.items():
        if not up and code not in children:
            raise ReadError(file_name, f"level 1 code {code} has no child (no row has 上層 {code})")


def domain_types(analysis_dir):
    """{代碼: row} of data/domain-types.csv (領域), in file order. Runs
    check_two_levels. A ReadError when the file cannot be read or is wrong."""
    rows = code_rows(analysis_dir, DOMAIN_TYPES_FILE, DOMAIN_TYPE_COLS)
    check_two_levels(rows, DOMAIN_TYPES_FILE)
    return rows


def solution_types(analysis_dir):
    """{代碼: row} of data/solution-types.csv (解法類型), in file order.
    A ReadError when the file cannot be read or a code repeats."""
    return code_rows(analysis_dir, SOLUTION_TYPES_FILE, SOLUTION_TYPE_COLS)


def space_types(analysis_dir):
    """{代碼: row} of data/space-types.csv (空間類型), in file order. Runs
    check_two_levels. A ReadError when the file cannot be read or is wrong."""
    rows = code_rows(analysis_dir, SPACE_TYPES_FILE, SPACE_TYPE_COLS)
    check_two_levels(rows, SPACE_TYPES_FILE)
    return rows


def cell_codes(cell):
    """The codes in backticks in a table cell or a line, in order. Repeats
    stay in the list, so a caller can report them."""
    return re.findall(r"`([^`]+)`", cell)


def tag_problem(code, rows, file_name):
    """Why a code cannot be a tag, or None. rows: {代碼: row} of a type list.
    The code must be in the list. In a list with 2 levels (rows with a 上層
    column) it must be a level 2 code: a level 1 code fails, and the message
    names its children."""
    row = rows.get(code)
    if row is None:
        return f"unknown code {code} (not in {file_name})"
    if "上層" in row and not row["上層"].strip():
        children = [c for c, r in rows.items() if r["上層"].strip() == code]
        # check_two_levels rejects a level 1 code with no child, but rows may
        # come from a list that was not checked.
        use = f"Use one of its children: {'、'.join(children)}" if children else "It has no children in the list"
        return f"{code} is a level 1 code. Only level 2 codes are tags. {use}"
    return None


def space_problem(code, rows):
    """Why a code cannot be a space tag, or None: an unknown code, or a level
    1 code. rows: {代碼: row} of space-types.csv (space_types)."""
    return tag_problem(code, rows, SPACE_TYPES_FILE)


def type_codes(value, rows, file_name, max_count=MAX_TYPES):
    """The codes of a 領域 line or of a 解法類型 or 領域 cell, and the
    problems: (codes, problems). value is codes in backticks, separated by
    「、」. An empty value gives ([], []); the caller decides whether it may
    be empty. The problems: a wrong format, a repeated code, more than
    max_count codes, and each code that tag_problem rejects."""
    v = value.strip()
    if not v:
        return [], []
    codes = cell_codes(v)
    problems = []
    if not codes or "、".join(f"`{c}`" for c in codes) != v:
        problems.append(f"must be codes in backticks separated by 「、」: {v}")
    for c in sorted({c for c in codes if codes.count(c) > 1}):
        problems.append(f"code {c} is listed twice")
    if len(codes) > max_count:
        problems.append(f"{len(codes)} codes, but at most {max_count} are allowed")
    for c in dict.fromkeys(codes):  # each code once, also when it repeats
        p = tag_problem(c, rows, file_name)
        if p:
            problems.append(p)
    return codes, problems


def domain_line(lines, domain_rows, needs_format):
    """The 領域 line of an issue file: (codes, problems). lines: the lines
    of the file. The line is lines[3], right under the 空間類型 line. Only
    the old format (needs_format False) may leave it out; then ([], []).
    A line with no code is a problem. Each message is ready to show."""
    if len(lines) > 3 and lines[3].startswith(DOMAIN_LINE):
        codes, problems = type_codes(lines[3][len(DOMAIN_LINE):], domain_rows, DOMAIN_TYPES_FILE)
        if not codes and not problems:
            return [], [f"領域 line has no code; write 1 to {MAX_TYPES} codes from {DOMAIN_TYPES_FILE}"]
        return codes, [f"領域 line: {p}" for p in problems]
    if needs_format:
        return [], [f"no 「{DOMAIN_LINE}」 line right under the 空間類型 line"]
    return [], []


def solution_type_problems(sol, types_cell, domains_cell, issue_domains, solution_type_rows, domain_rows):
    """The 解法類型 and 領域 cells of one 6.1 row: (solution types, own
    domains, problems). sol is the solution code. The 解法類型 cell must
    have 1 to 3 codes. The 領域 cell is empty, or has codes that are not in
    issue_domains (a solution gets its own domains only when they differ).
    Each message starts with 「solution <sol>: 」."""
    problems = []
    types, found = type_codes(types_cell, solution_type_rows, SOLUTION_TYPES_FILE)
    if not types and not found:
        problems.append(f"solution {sol}: the 解法類型 cell is empty; write 1 to {MAX_TYPES} codes from {SOLUTION_TYPES_FILE}")
    problems += [f"solution {sol}: 解法類型: {p}" for p in found]
    own, found = type_codes(domains_cell, domain_rows, DOMAIN_TYPES_FILE)
    problems += [f"solution {sol}: 領域: {p}" for p in found]
    for code in own:
        if code in issue_domains:
            problems.append(f"solution {sol}: 領域 {code} is on the issue's 領域 line. "
                            f"Fill the 領域 cell only when the solution's domains differ from the issue's")
    return types, own, problems

# The source tags, in display order (see method.md, section 標記):
# 實證 = a person can check the source, or a person checked the AI summary.
# AI整理 = AI summarized it from real data, with counts; no person checked it yet.
# AI模擬 = AI made it up as a likely view; no data behind it.
TAGS = ("實證", "AI整理", "AI模擬")
# The tag names as a regex alternation, for building other patterns.
TAG_NAMES = "|".join(map(re.escape, TAGS))
# One tag with its brackets, for example [AI整理]. Group 1 is the tag name.
TAG_RE = rf"\[({TAG_NAMES})\]"

# The 特別關注 groups, in the fixed order (see method.md, 分類路徑與特別關注).
# Every list of these groups uses this order, never an order by count.
# The app keeps the same list in FOCUS_ORDER (app/src/lib/issues.ts); a test
# checks that the two lists are the same.
FOCUS_GROUPS = ("高齡", "身心障礙", "呼吸道疾病", "兒童與照顧者", "外籍", "經濟弱勢")
# The 特別關注族群檢查 table in step 1 (see method.md, 特別關注族群檢查).
FOCUS_HEADING = re.compile(r"^### 1\.\d+ 特別關注族群檢查\s*$")
FOCUS_HEADER = ["特別關注", "納入的利害關係人", "說明"]
# The 納入的利害關係人 cell of a group with no stakeholder in the issue.
FOCUS_NONE = "（無）"

# The 分析摘要 section near the top of each issue file (see method.md, 分析摘要).
SUMMARY_HEADING = "## 分析摘要"
# The topics, in the fixed order. Each one is a "### " subsection.
SUMMARY_TOPICS = ("難以取捨的決定", "可能的爭議", "受影響較大的弱勢族群", "法規上的障礙", "相依事項與現行政策的關係")
SUMMARY_HEADER = ["項目", "說明", "相關編號"]
# One reference in a 相關編號 cell. Group 1 is the issue number of another
# issue (or None), group 2 the ID: a story, a stakeholder, a conflict, a group
# or 「解法 S1」.
SUMMARY_REF = re.compile(rf"(?:#(\d+) )?([OI]\d\d-US\d\d|[OI]\d\d|C\d+|W\d\d|N\d\d|解法 {SOLUTION_CODE})")

# The needs-based format (see the rules above and method.md).
NEED_GROUP_HEADING = "### 相同需求群組"
# A 相同需求群組 ID, for example N01.
NEED_ID = re.compile(r"(?<![A-Za-z0-9])N\d\d(?![0-9])")
# The step 5 table: one row per need (an N group, or a story whose need is in no group).
NEED_PRIORITY_HEADER = ["需求", "以便（摘要）", "故事編號", "優先順序", "理由"]
# The 6.2 table in the needs-based format.
NEED_MAP_HEADER = ["代號", "解法", "涵蓋的 Must 需求", "涵蓋的 Should / Could 需求"]
# The conflict table in the needs-based format ("### 6.4").
CONFLICT_HEADER = ["#", "衝突", "相關故事", "雙方的需求", "以需求為本的解方", "可能的審議方法", "模擬結果"]
# The 以需求為本的解方 cell when no solution was found. It then needs a 審議 method.
WAY_OUT_NONE = "未找到"

# An issue with no city space (see the rules above).
NO_SPACE_LINE = "無"
NO_SPACE_CELL = "—"

# 6.1 practice tables (see the rules above).
PRACTICE_HEADER = ["做法", "內容", "本文件怎麼用"]
# The 做法 cell: the place (no space, no 「：」, no bracket), 「：」, then the name.
PRACTICE_NAME = re.compile(r"([^\s：:（）()]+)：(\S.*)")
# A place that starts with this is domestic (國內); any other place is foreign (國外).
DOMESTIC = "臺灣"
# Solutions in a 本文件怎麼用 cell: 「解法 S1」 or 「解法 S3、S4」 (group 1), not
# after 「#8 」; or a step 7 section 「7.1」 (group 2).
PRACTICE_SOLUTIONS = re.compile(rf"(?<!#\d )(?<!#\d\d )解法 ?({SOLUTION_CODE}(?![A-Za-z0-9-])(?:、{SOLUTION_CODE}(?![A-Za-z0-9-]))*)"
                                r"|(?<![0-9.])7\.(\d+)(?![0-9]|\.[0-9])")
# A step 7 heading for one solution: 「### 7.1 解法 S1：…」.
STEP7_HEADING = re.compile(rf"^### 7\.(\d+) 解法 ({SOLUTION_CODE})：")

# Step 7 「評估解法」 (ETBlue, 2026-10-23; method.md, 步驟 7). Each solution
# section has up to three tables, found by their header (step7_tables):
# - the evaluation table (STEP7_HEADER) with the rows STEP7_ROWS, in this order;
# - the plan table (PLAN_HEADER, 執行計畫) with the rows PLAN_ROWS, in this order;
# - optional: the dependency table (DEPENDENCY_HEADER), the rows of
#   相依事項與現行政策的關係 that name this solution. A row that names several
#   solutions is written under each of them, with the same text.
# The cross-issue file uses the same tables in its 「### 4.5.n 解法 X-S1：…」 sections.
STEP7_HEADER = ["項目", "內容"]
STEP7_ROWS = ("相關法規", "隱私", "其他顧慮與風險", "災害風險", "可行性")
PLAN_HEADER = ["執行計畫", "內容"]
PLAN_ROWS = ("主責單位", "需要的資料／API／資源", "成本", "執行步驟")
DEPENDENCY_TOPIC = "相依事項與現行政策的關係"
DEPENDENCY_HEADER = [DEPENDENCY_TOPIC, "說明", "相關編號"]
# The JSON keys of the rows (build_json.py and check_cross_issue.py).
EVALUATION_KEYS = dict(zip(STEP7_ROWS, ("laws", "privacy", "risks", "disasters", "feasibility")))
PLAN_KEYS = dict(zip(PLAN_ROWS, ("owner", "resources", "cost", "steps")))
# The 災害風險 cell when no disaster changes the solution.
NO_DISASTER = "無明顯相關災害風險"
# A cell that is only one 【待補：…】 item, with no tag (for example the
# 執行步驟 placeholder 「【待補：執行步驟】」).
PENDING_ONLY = re.compile(r"【待補：[^】]+】")
# The 4.5 heading of one combined solution in the cross-issue file.
CROSS_STEP7_HEADING = re.compile(rf"^### 4\.5\.(\d+) 解法 ({X_SOLUTION_CODE})：")

SEPARATOR = re.compile(r"^\|(?:\s*:?-+:?\s*\|)+\s*$")
HEADING = re.compile(r"^(#{2,3}) (.+)$")
# A reference to a story or stakeholder of another issue, for example 「#2 O01-US01」.
# Group 1 is the issue number, group 2 the ID.
CROSS_REF = re.compile(r"(?<![A-Za-z0-9&])#(\d+) ([OI]\d\d(?:-US\d\d)?)(?![0-9])")
STEP4_ROW = re.compile(r"^\| ([OI]\d\d-US\d\d) \|")


def split_cells(line):
    """The cells of one Markdown table line, without the outer bars, stripped."""
    return [x.strip() for x in line.strip().strip("|").split(" | ")]


def heading_matches(line, prefix):
    """True if the line is a heading that starts with prefix (see the rules above)."""
    return line == prefix or line.startswith(prefix + " ") or line.startswith(prefix + "：")


def section(text, heading):
    """The lines after the first heading that matches `heading`, up to the next
    ## or ### heading. None if no heading matches."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if heading_matches(line, heading):
            body = []
            for l in lines[i + 1:]:
                if HEADING.match(l):
                    break
                body.append(l)
            return body
    return None


def tables(lines):
    """Every Markdown table in the lines: a list of (header cells, rows of cells)."""
    out = []
    for i in range(1, len(lines)):
        if SEPARATOR.match(lines[i]) and lines[i - 1].startswith("|"):
            rows = []
            for l in lines[i + 1:]:
                if not l.startswith("|"):
                    break
                rows.append(split_cells(l))
            out.append((split_cells(lines[i - 1]), rows))
    return out


def step1_tables(text):
    """The step 1 stakeholder tables: every table under "### 1.1", up to the
    next heading. A list of (header cells, rows of cells). Empty if there is
    no "### 1.1" heading."""
    body = section(text, "### 1.1")
    return tables(body) if body is not None else []


def step1_ids(text):
    """The first cell of every row of the step 1 tables, in file order."""
    return [row[0] for _, rows in step1_tables(text) for row in rows]


def step4_ids(text):
    """The story IDs in the first cell of the rows under "## 步驟 4", in file order."""
    body = section(text, "## 步驟 4") or []
    return [m.group(1) for m in map(STEP4_ROW.match, body) if m]


def cross_refs(text):
    """Every reference to another issue in the text: a list of (issue number, ID)."""
    return [(int(m.group(1)), m.group(2)) for m in CROSS_REF.finditer(text)]


def without_cross_refs(text):
    """The text with every cross-issue reference replaced by a space, so the
    local ID checks do not see the IDs of other issues."""
    return CROSS_REF.sub(" ", text)


def split_focus(value):
    """The groups in a 特別關注 value such as 「高齡、經濟弱勢」. 「—」 or empty -> []."""
    v = value.strip()
    return [] if v in ("", "—") else [x.strip() for x in v.split("、")]


def focus_heading(text):
    """The "### 1.n 特別關注族群檢查" heading line, or None."""
    return next((l for l in text.splitlines() if FOCUS_HEADING.match(l)), None)


def focus_tables(text):
    """The tables under the 特別關注族群檢查 heading, up to the next heading:
    a list of (header cells, rows of cells). None if there is no such heading."""
    head = focus_heading(text)
    return None if head is None else tables(section(text, head))


def needs_format(text):
    """True if the file uses the needs-based format: it has a
    "### 相同需求群組" section."""
    return section(text, NEED_GROUP_HEADING) is not None


def conflict_heading(text):
    """The heading prefix of the conflict section: "### 6.4" in the
    needs-based format, "### 5.4" in the old format."""
    return "### 6.4" if needs_format(text) else "### 5.4"


def need_group_ids(text):
    """The N IDs in the first cell of the 相同需求群組 table rows, in file order."""
    out = []
    for h, rows in tables(section(text, NEED_GROUP_HEADING) or []):
        for r in rows:
            m = re.search(r"N\d\d", r[0])
            if m:
                out.append(m.group(0))
    return out


def issue_ids(text):
    """The IDs that a 相關編號 reference can point to in one issue file:
    {"story", "stakeholder", "conflict", "group", "need", "solution"} -> set of IDs.
    A conflict is the first cell of a row of the conflict table (C1; see
    conflict_heading), a group the W ID of a 相同訴求群組 row (W01), a need
    the N ID of a 相同需求群組 row (N01), a solution the 代號 of a 6.1 row (S1)."""
    conflicts = {r[0] for h, rows in tables(section(text, conflict_heading(text)) or []) if h and h[0] == "#" for r in rows}
    groups = set()
    for h, rows in tables(section(text, "### 相同訴求群組") or []):
        for r in rows:
            m = re.search(r"W\d\d", r[0])
            if m:
                groups.add(m.group(0))
    solutions = {r[0] for h, rows in tables(section(text, "### 6.1") or []) if h and h[0] == "代號"
                 for r in rows if re.fullmatch(SOLUTION_CODE, r[0])}
    return {"story": set(step4_ids(text)), "stakeholder": set(step1_ids(text)),
            "conflict": conflicts, "group": groups, "need": set(need_group_ids(text)), "solution": solutions}


def summary_lines(text):
    """The lines after "## 分析摘要", up to the next "## " heading. None if
    there is no such heading."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.strip() == SUMMARY_HEADING:
            body = []
            for l in lines[i + 1:]:
                if l.startswith("## "):
                    break
                body.append(l)
            return body
    return None


def summary_topics(lines):
    """The "### " subsections of the 分析摘要 lines: a list of (topic, lines).
    Lines before the first "### " heading are left out."""
    out = []
    for l in lines:
        if l.startswith("### "):
            out.append((l[4:].strip(), []))
        elif out:
            out[-1][1].append(l)
    return out


def split_refs(value):
    """The references in a 相關編號 cell, split on 「、」. 「—」 or empty -> []."""
    v = value.strip()
    return [] if v in ("", "—") else [x.strip() for x in v.split("、")]


def parse_ref(ref):
    """One 相關編號 reference -> (issue number or None, kind, ID), or None when
    it is not a reference. kind is story, stakeholder, conflict, group or
    solution, or need (N01). The ID of a solution is its code: 「解法 S2」 -> "S2"."""
    m = SUMMARY_REF.fullmatch(ref)
    if not m:
        return None
    num = int(m.group(1)) if m.group(1) else None
    rid = m.group(2)
    if rid.startswith("解法 "):
        return num, "solution", rid[3:]
    if "-US" in rid:
        return num, "story", rid
    if rid[0] in "OI":
        return num, "stakeholder", rid
    return num, {"C": "conflict", "W": "group", "N": "need"}[rid[0]], rid


def practice_tables(text):
    """The 6.1 practice tables: a list of (header cells, rows of cells). Only
    tables whose header is exactly PRACTICE_HEADER. [] when there is no 6.1."""
    return [(h, rows) for h, rows in tables(section(text, "### 6.1") or []) if h == PRACTICE_HEADER]


def practice_place(name):
    """The 做法 cell -> (place, name after 「：」), or None when it does not
    start with a place and 「：」."""
    m = PRACTICE_NAME.fullmatch(name.strip())
    return (m.group(1), m.group(2).strip()) if m else None


def step7_sections(text):
    """{section number "1": solution code "S1"} from the 「### 7.n 解法 Sn：」 headings."""
    return {m.group(1): m.group(2) for m in map(STEP7_HEADING.match, text.splitlines()) if m}


def step7_tables(lines):
    """The tables of one step 7 solution section, by kind: {"evaluation",
    "plan", "dependencies", "other"} -> list of (header cells, rows of cells).
    A table belongs to a kind by its exact header (STEP7_HEADER, PLAN_HEADER,
    DEPENDENCY_HEADER); any other table is "other"."""
    out = {"evaluation": [], "plan": [], "dependencies": [], "other": []}
    for h, rows in tables(lines):
        kind = {tuple(STEP7_HEADER): "evaluation", tuple(PLAN_HEADER): "plan",
                tuple(DEPENDENCY_HEADER): "dependencies"}.get(tuple(h), "other")
        out[kind].append((h, rows))
    return out


def ref_solutions(refs, prefix=""):
    """The solution codes that a list of references names as 「解法 <prefix>X」,
    in order, without repeats. 「#8 解法 S2」 (another issue) is not one.
    prefix is "X-" in the cross-issue file: 「解法 X-S1」 -> "X-S1"."""
    out = []
    for r in refs:
        m = re.fullmatch(rf"解法 ({re.escape(prefix)}{SOLUTION_CODE})", r.strip())
        if m and m.group(1) not in out:
            out.append(m.group(1))
    return out


def practice_refs(use, sections):
    """The solution codes that a 本文件怎麼用 cell names, in order, without
    repeats, and the references that are not solutions: (codes, bad).
    sections: step7_sections(). A code is any S code after 「解法」;
    the caller checks that it is in 6.1. bad lists each 「7.n」 that is not
    the section of a solution."""
    codes, bad = [], []
    for m in PRACTICE_SOLUTIONS.finditer(use):
        if m.group(1):
            found = m.group(1).split("、")
        elif m.group(2) in sections:
            found = [sections[m.group(2)]]
        else:
            bad.append(f"7.{m.group(2)}")
            found = []
        codes += [c for c in found if c not in codes]
    return codes, bad


def today():
    """Today's date in Taiwan (UTC+8). The dates in the analysis are Taiwan
    dates, but the CI runner uses UTC, so date.today() can be one day behind."""
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date()


def fingerprint(content):
    """A short hash of parsed content (dicts, lists, strings, numbers, None):
    the first 12 hex characters of SHA-256 of its canonical JSON. The key
    order of a dict does not change it."""
    data = json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(data.encode("utf-8")).hexdigest()[:12]
