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
"""
import re

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
