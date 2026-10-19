"""Rebuild user-stories.csv from the step 4 table in issue-analysis.md.
A file in the needs-based format (analysis_common.needs_format) has an
extra 相同需求編號 column in step 4, so its CSV has 12 columns. A file in
the old format keeps 11 columns.
Usage: python3 -I analysis/build_csv.py analysis/2-trashcans/issue-analysis.md analysis/2-trashcans/user-stories.csv"""
import csv, os, re, sys

# python3 -I does not put the script folder on sys.path, so add it for analysis_common.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analysis_common import STEP4_ROW, TAG_NAMES, needs_format, section, split_cells

md, out = sys.argv[1], sys.argv[2]
text = open(md, encoding="utf-8").read()
# The step 4 section: from "## 步驟 4" up to the next heading (### 相同訴求群組).
sec = section(text, "## 步驟 4")
assert sec is not None, f"{md}: no '## 步驟 4' heading"
needs = needs_format(text)
rows = []
for line in sec:
    if STEP4_ROW.match(line):
        # Markdown cells wrap tags in backticks; the CSV keeps plain tags.
        cells = [c.replace("`", "") for c in split_cells(line)]
        assert len(cells) == (8 if needs else 7), cells
        if needs:
            sid, who, want, w, so, n, src, pri = cells
        else:
            sid, who, want, w, so, src, pri = cells
        # 我想要… and 以便… start with a tag. A 【待補】 cell has no tag.
        def split_tag(cell, name):
            m = re.match(rf"^(\[(?:{TAG_NAMES})\]) (.+)$", cell)
            if m: return m.group(2), m.group(1)
            assert cell.startswith("【待補"), f"{sid}: {name} cell has no tag: {cell!r}"
            return cell, ""
        want, want_tag = split_tag(want, "我想要")
        so, so_tag = split_tag(so, "以便")
        # The priority cell is a tag followed by the MoSCoW letter.
        p = re.match(rf"^(\[(?:{TAG_NAMES})\]) ([MSCW])$", pri)
        assert p, f"{sid}: bad priority cell {pri!r}"
        row = [sid, sid.split("-")[0], who, want, want_tag, w, so, so_tag, src, p.group(2), p.group(1)]
        if needs:
            row.insert(8, n)
        rows.append(row)
with open(out, "w", encoding="utf-8-sig", newline="") as f:
    wr = csv.writer(f, lineterminator="\n")
    header = ["故事編號", "利害關係人編號", "身為…", "我想要…", "我想要標記", "相同訴求編號", "以便…", "以便標記", "來源", "優先順序", "優先順序標記"]
    if needs:
        header.insert(8, "相同需求編號")
    wr.writerow(header)
    wr.writerows(rows)
print(len(rows), "rows")
