"""A test helper (not a test file): put an issue file in the format with
領域 and 解法類型 (ETBlue, 2026-10-31), with known values.

set_types(text, domains, solution_type) returns the text with:
- the line 「領域：」 right under the 空間類型 line, with the given domain
  codes (added when missing, replaced when it is there);
- the 6.1 header | 代號 | 解法 | 空間類型 | 解法類型 | 領域 | 新增日期 | 一句話說明 |
  (the two columns are added when missing);
- in every 6.1 row: the 解法類型 cell set to solution_type and the 領域 cell
  set to empty.

The tests use it so that each test starts from the same values, before and
after the real issue files get the new format.
"""
import re

OLD_HEADER = "| 代號 | 解法 | 空間類型 | 新增日期 | 一句話說明 |"
NEW_HEADER = "| 代號 | 解法 | 空間類型 | 解法類型 | 領域 | 新增日期 | 一句話說明 |"
DOMAIN_LINE = "領域："


def new_space_codes(text):
    """The text with the space codes that were split on 2026-10-31 renamed:
    `sidewalk` -> `sidewalk-walkway`, `indoor` -> `indoor-home`. The
    old-format fixture still has the old codes, and the fixture file stays
    as it is, so the tests rename them in their copy only."""
    return text.replace("`sidewalk`", "`sidewalk-walkway`").replace("`indoor`", "`indoor-home`")


def join_cells(cells):
    """One table line from its cells. An empty cell is written as 「|  |」."""
    return "| " + " | ".join(cells) + " |"


def set_types(text, domains="`environment`", solution_type="`participation`"):
    lines = text.split("\n")
    if not lines[2].startswith("空間類型："):
        raise ValueError("no 空間類型 line in line 3")
    if lines[3].startswith(DOMAIN_LINE):
        lines[3] = DOMAIN_LINE + domains
    else:
        lines.insert(3, DOMAIN_LINE + domains)
    start = lines.index("### 6.1 候選解法") if "### 6.1 候選解法" in lines else \
        next(i for i, l in enumerate(lines) if l.startswith("### 6.1"))
    head = next(i for i in range(start, len(lines)) if lines[i].startswith("| 代號 | 解法 | 空間類型 |"))
    old = lines[head] == OLD_HEADER
    if not old and lines[head] != NEW_HEADER:
        raise ValueError(f"unknown 6.1 header: {lines[head]}")
    lines[head] = NEW_HEADER
    lines[head + 1] = "|---|---|---|---|---|---|---|"
    i = head + 2
    while i < len(lines) and re.match(r"^\| S[1-9]\d* \|", lines[i]):
        c = [x.strip() for x in lines[i].strip().strip("|").split(" | ")]
        if old:
            c = c[:3] + [solution_type, ""] + c[3:]
        else:
            c[3], c[4] = solution_type, ""
        lines[i] = join_cells(c)
        i += 1
    return "\n".join(lines)


def cross_section_span(text, code):
    """The start and end of the 4.5 section of this combined solution."""
    start = re.search(rf"^### 4\.5\.\d+ 解法 {code}：", text, re.M).start()
    first_line_end = text.index("\n", start)
    return start, first_line_end + re.search(r"^(### |## |---$)", text[first_line_end:], re.M).start()


def cross_to_new_format(text, code):
    """The cross-issue text with the plan table, the work breakdown and the
    chart of the 4.5 section of this combined solution replaced by a small
    fixture in the new format. The fixture (test_wbs_format.SECTION) has 2
    phases, and phase 1 has 2 items, so a test sees order and matching."""
    from .test_wbs_format import SECTION
    start, end = cross_section_span(text, code)
    body, count = re.subn(r"\| 執行計畫 \| 內容 \|\n.*?\n```mermaid\n.*?\n```\n", lambda _: SECTION, text[start:end], count=1, flags=re.S)
    if count != 1:
        raise ValueError(f"no plan table and chart in the section of {code}")
    return text[:start] + body + text[end:]


def cross_to_old_format(text, code):
    """The cross-issue text with the 4.5 section of this combined solution
    back in the old format: a 執行步驟 row, no work breakdown table, no chart
    and no ranges in the 成本 cell. No real section uses the old format now
    (2026-11-09). The tests use this to show that it is rejected."""
    start, end = cross_section_span(text, code)
    body, count = re.subn(r"\n\n\| 編號 \| 工作項目 .*?\n```mermaid\n.*?\n```", "\n| 執行步驟 | `[AI模擬]` 第一步：先試辦 |", text[start:end], count=1, flags=re.S)
    if count != 1:
        raise ValueError(f"no work breakdown table in the section of {code}")
    body, count = re.subn(r"。`\[AI模擬\]` [^`|]*?時間：.*?【待補：專業人士確認】", "", body, count=1)
    if count != 1:
        raise ValueError(f"no ranges in the 成本 cell of {code}")
    return text[:start] + body + text[end:]
