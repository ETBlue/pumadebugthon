"""Rebuild user-stories.csv from the step 4 table in issue-analysis.md.
Usage: python3 -I analysis/build_csv.py analysis/2-trashcans/issue-analysis.md analysis/2-trashcans/user-stories.csv"""
import csv, re, sys

md, out = sys.argv[1], sys.argv[2]
text = open(md, encoding="utf-8").read()
sec = text.split("## 步驟 4：使用者故事總表", 1)[1].split("### 相同訴求群組", 1)[0]
rows = []
for line in sec.splitlines():
    if re.match(r"^\| [OI]\d\d-US\d\d \|", line):
        # Markdown cells wrap tags in backticks; the CSV keeps plain tags.
        cells = [c.strip().replace("`", "") for c in line.strip().strip("|").split(" | ")]
        assert len(cells) == 7, cells
        sid, who, want, w, so, src, pri = cells
        # 我想要… and 以便… start with a tag. A 【待補】 cell has no tag.
        def split_tag(cell, name):
            m = re.match(r"^(\[實證\]|\[AI模擬\]) (.+)$", cell)
            if m: return m.group(2), m.group(1)
            assert cell.startswith("【待補"), f"{sid}: {name} cell has no tag: {cell!r}"
            return cell, ""
        want, want_tag = split_tag(want, "我想要")
        so, so_tag = split_tag(so, "以便")
        # The priority cell is a tag followed by the MoSCoW letter.
        p = re.match(r"^(\[實證\]|\[AI模擬\]) ([MSCW])$", pri)
        assert p, f"{sid}: bad priority cell {pri!r}"
        rows.append([sid, sid.split("-")[0], who, want, want_tag, w, so, so_tag, src, p.group(2), p.group(1)])
with open(out, "w", encoding="utf-8-sig", newline="") as f:
    wr = csv.writer(f, lineterminator="\n")
    wr.writerow(["故事編號", "利害關係人編號", "身為…", "我想要…", "我想要標記", "相同訴求編號", "以便…", "以便標記", "來源", "優先順序", "優先順序標記"])
    wr.writerows(rows)
print(len(rows), "rows")
