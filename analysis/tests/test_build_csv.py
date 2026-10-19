"""Tests for analysis/build_csv.py.

The script runs as a subprocess on files from the working tree.
The old format is tested with a fixture in tests/fixtures/old-format.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import csv, os, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "build_csv.py")
ISSUE = "2-trashcans"
MD = os.path.join(ANALYSIS, ISSUE, "issue-analysis.md")
CSV = os.path.join(ANALYSIS, ISSUE, "user-stories.csv")
OLD_FORMAT = os.path.join(ANALYSIS, "tests", "fixtures", "old-format")


def run(md, out):
    p = subprocess.run([sys.executable, "-I", SCRIPT, md, out], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


class BuildCsvTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.out = os.path.join(self._tmp.name, "user-stories.csv")

    def tearDown(self):
        self._tmp.cleanup()

    def test_rebuilds_the_committed_csv_byte_for_byte(self):
        code, output = run(MD, self.out)
        self.assertEqual(code, 0, output)
        with open(self.out, "rb") as a, open(CSV, "rb") as b:
            self.assertEqual(a.read(), b.read())

    def test_bad_priority_cell_exits_1(self):
        with open(MD, encoding="utf-8") as f:
            text = f.read()
        # Change the priority cell of the first story row to a letter that is not MoSCoW.
        start = text.index("\n| O01-US01 | 商圈店家與攤商 |") + 1
        end = text.index("\n", start)
        row = text[start:end]
        cells = row.split(" | ")
        self.assertRegex(cells[-1], r"^`\[(實證|AI模擬)\]` [MSCW] \|$")
        cells[-1] = cells[-1][:-3] + "X |"
        md = os.path.join(self._tmp.name, "issue-analysis.md")
        with open(md, "w", encoding="utf-8") as f:
            f.write(text[:start] + " | ".join(cells) + text[end:])
        code, output = run(md, self.out)
        self.assertEqual(code, 1, output)
        self.assertIn("O01-US01: bad priority cell", output)


    def test_ai_summary_tag(self):
        # [AI整理] is the third source tag. The CSV keeps it without backticks.
        with open(MD, encoding="utf-8") as f:
            text = f.read()
        start = text.index("\n| O01-US01 | 商圈店家與攤商 |") + 1
        end = text.index("\n", start)
        md = os.path.join(self._tmp.name, "issue-analysis.md")
        with open(md, "w", encoding="utf-8") as f:
            f.write(text[:start] + text[start:end].replace("[AI模擬]", "[AI整理]") + text[end:])
        code, output = run(md, self.out)
        self.assertEqual(code, 0, output)
        with open(self.out, encoding="utf-8-sig", newline="") as f:
            rows = {r["故事編號"]: r for r in csv.DictReader(f)}
        r = rows["O01-US01"]
        self.assertEqual((r["我想要標記"], r["以便標記"], r["優先順序標記"]), ("[AI整理]",) * 3)
        self.assertEqual(r["我想要…"], "商圈有足夠的清潔箱")
        self.assertEqual(r["優先順序"], "S")

    def test_needs_format_has_the_need_group_column(self):
        # #2 uses the needs-based format: a 相同需求編號 column after 以便標記.
        # 優先順序 is the priority of the story's need.
        code, output = run(MD, self.out)
        self.assertEqual(code, 0, output)
        with open(self.out, encoding="utf-8-sig", newline="") as f:
            rows = list(csv.reader(f))
        self.assertEqual(rows[0], ["故事編號", "利害關係人編號", "身為…", "我想要…", "我想要標記", "相同訴求編號", "以便…", "以便標記",
                                   "相同需求編號", "來源", "優先順序", "優先順序標記"])
        by_id = {r[0]: dict(zip(rows[0], r)) for r in rows[1:]}
        self.assertEqual(by_id["I01-US03"]["相同需求編號"], "N01")
        self.assertEqual(by_id["I01-US03"]["優先順序"], "M")
        self.assertEqual(by_id["I01-US09"]["相同需求編號"], "—")

    def test_other_issues_rebuild_byte_for_byte(self):
        # #1 and #8 also use the needs-based format: 12 columns.
        for folder in ("1-trees", "8-smokefree"):
            with self.subTest(folder=folder):
                code, output = run(os.path.join(ANALYSIS, folder, "issue-analysis.md"), self.out)
                self.assertEqual(code, 0, output)
                with open(self.out, "rb") as a, open(os.path.join(ANALYSIS, folder, "user-stories.csv"), "rb") as b:
                    self.assertEqual(a.read(), b.read())

    def test_old_format_keeps_11_columns(self):
        # No issue uses the old format now. The fixture is #8 from before commit 37057a9.
        code, output = run(os.path.join(OLD_FORMAT, "issue-analysis.md"), self.out)
        self.assertEqual(code, 0, output)
        with open(self.out, encoding="utf-8-sig", newline="") as f:
            header = next(csv.reader(f))
        self.assertEqual(len(header), 11)
        self.assertNotIn("相同需求編號", header)
        with open(self.out, "rb") as a, open(os.path.join(OLD_FORMAT, "user-stories.csv"), "rb") as b:
            self.assertEqual(a.read(), b.read())

    def test_bare_tag_word_without_brackets_exits_1(self):
        with open(MD, encoding="utf-8") as f:
            text = f.read()
        md = os.path.join(self._tmp.name, "issue-analysis.md")
        with open(md, "w", encoding="utf-8") as f:
            f.write(text.replace("| `[AI模擬]` 商圈有足夠的清潔箱 |", "| AI整理 商圈有足夠的清潔箱 |", 1))
        code, output = run(md, self.out)
        self.assertEqual(code, 1, output)
        self.assertIn("O01-US01: 我想要 cell has no tag", output)


if __name__ == "__main__":
    unittest.main()
