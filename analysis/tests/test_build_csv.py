"""Tests for analysis/build_csv.py.

The script runs as a subprocess on files from the working tree.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "build_csv.py")
ISSUE = "2-trashcans"
MD = os.path.join(ANALYSIS, ISSUE, "issue-analysis.md")
CSV = os.path.join(ANALYSIS, ISSUE, "user-stories.csv")


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
        start = text.index("\n| O01-US01 |") + 1
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


if __name__ == "__main__":
    unittest.main()
