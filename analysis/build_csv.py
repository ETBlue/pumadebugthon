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
        # The source cell is a tag, optionally followed by a note.
        m = re.match(r"^(\[實證\]|\[AI模擬\])(?: (.*))?$", src)
        assert m, f"{sid}: bad source cell {src!r}"
        rows.append([sid, sid.split("-")[0], who, who, want, w, so, m.group(1), m.group(2) or "", pri])
with open(out, "w", encoding="utf-8-sig", newline="") as f:
    wr = csv.writer(f, lineterminator="\n")
    wr.writerow(["編號", "利害關係人編號", "利害關係人", "身為…", "我想要…", "相同訴求", "以便…", "來源標記", "來源說明", "優先順序"])
    wr.writerows(rows)
print(len(rows), "rows")
