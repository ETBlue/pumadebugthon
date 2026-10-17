"""Tests for analysis/sync_stakeholders.py.

Each test copies issue #2 and the shared files into a temp dir, changes one
thing, runs the script as a subprocess, and looks at the exit code, the output
and the bytes of stakeholders.csv.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import os, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "sync_stakeholders.py")
SHARED = ("issues.csv", "stakeholders.csv", "path-labels.csv", "space-types.csv")
ISSUE = "2-trashcans"


class SyncStakeholdersTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = os.path.join(self._tmp.name, "analysis")
        os.makedirs(self.dir)
        for name in SHARED:
            shutil.copy(os.path.join(ANALYSIS, name), self.dir)
        shutil.copytree(os.path.join(ANALYSIS, ISSUE), os.path.join(self.dir, ISSUE))
        self.csv = os.path.join(self.dir, "stakeholders.csv")
        with open(os.path.join(ANALYSIS, "stakeholders.csv"), "rb") as f:
            self.original = f.read()

    def tearDown(self):
        self._tmp.cleanup()

    def edit(self, rel, old, new):
        """Replace one exact piece of text in a copied file, keeping its bytes otherwise."""
        path = os.path.join(self.dir, rel)
        with open(path, "rb") as f:
            data = f.read()
        old_b, new_b = old.encode("utf-8"), new.encode("utf-8")
        self.assertEqual(data.count(old_b), 1, f"{old!r} must occur once in {rel}")
        with open(path, "wb") as f:
            f.write(data.replace(old_b, new_b))

    def csv_bytes(self):
        with open(self.csv, "rb") as f:
            return f.read()

    def run_sync(self):
        p = subprocess.run([sys.executable, "-I", SCRIPT, self.dir],
                           capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def test_puts_back_removed_issue_number(self):
        self.edit("stakeholders.csv", "I05,高齡者,res,高齡,2,", "I05,高齡者,res,高齡,,")
        self.assertNotEqual(self.csv_bytes(), self.original)
        code, out = self.run_sync()
        self.assertEqual(code, 0, out)
        self.assertIn('I05: "" -> "2"', out)
        self.assertIn("1 row(s) changed", out)
        self.assertEqual(self.csv_bytes(), self.original)

    def test_unchanged_copy_stays_the_same(self):
        code, out = self.run_sync()
        self.assertEqual(code, 0, out)
        self.assertIn("0 row(s) changed", out)
        self.assertEqual(self.csv_bytes(), self.original)

    def test_moved_row_gets_empty_issue_value(self):
        self.edit("stakeholders.csv", "O02,便利商店店員,,,,已改為 I12", "O02,便利商店店員,,,2,已改為 I12")
        code, out = self.run_sync()
        self.assertEqual(code, 0, out)
        self.assertIn('O02: "2" -> ""', out)
        self.assertEqual(self.csv_bytes(), self.original)

    def test_step1_id_missing_from_csv(self):
        row = "| I13 | 清潔隊員 | `wrk` | — | `[AI模擬]` 實際清運的人；清潔箱滿不滿會影響他們的路線與工作量 |\n"
        self.edit(f"{ISSUE}/issue-analysis.md", row, row + "| I14 | 新的人 | `res` | — | `[AI模擬]` 測試 |\n")
        self.edit("stakeholders.csv", "I05,高齡者,res,高齡,2,", "I05,高齡者,res,高齡,,")
        before = self.csv_bytes()
        code, out = self.run_sync()
        self.assertEqual(code, 1, out)
        self.assertIn("I14", out)
        self.assertIn("2-trashcans", out)
        self.assertEqual(self.csv_bytes(), before)


if __name__ == "__main__":
    unittest.main()
