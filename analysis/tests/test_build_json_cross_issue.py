"""Tests for the cross-issue part of analysis/scripts/build_json.py (cross-issue.json).

The tests copy the issue folders, the shared files and the cross-issue folder
from the working tree into a temp dir and run the script there as a
subprocess.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import json, os, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "scripts", "build_json.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "data/open-data.csv",
          "docs/method.md", "docs/human-inputs.md")
CROSS = os.path.join("cross-issue", "cross-issue-analysis.md")
# The fields of index.json. The cross-issue data must not change them (the app reads them).
INDEX_KEYS = {"issues", "stakeholders", "pathLabels", "spaceTypes", "openData"}


def make_copy(root):
    d = os.path.join(root, "analysis")
    os.makedirs(d)
    for name in SHARED:
        os.makedirs(os.path.join(d, os.path.dirname(name)), exist_ok=True)
        shutil.copy(os.path.join(ANALYSIS, name), os.path.join(d, name))
    for n in os.listdir(ANALYSIS):
        if os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")) or n == "cross-issue":
            shutil.copytree(os.path.join(ANALYSIS, n), os.path.join(d, n))
    return d


def run_build(analysis_dir, out_dir):
    p = subprocess.run([sys.executable, "-I", SCRIPT, analysis_dir, out_dir], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


class CrossIssueJsonTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.dir = make_copy(cls._tmp.name)
        cls.out = os.path.join(cls._tmp.name, "out")
        code, out = run_build(cls.dir, cls.out)
        if code != 0:
            raise AssertionError(f"build failed ({code}): {out}")
        with open(os.path.join(cls.out, "cross-issue.json"), encoding="utf-8") as f:
            cls.data = json.load(f)
        with open(os.path.join(cls.out, "index.json"), encoding="utf-8") as f:
            cls.index = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def solution(self, code):
        return next(s for s in self.data["solutions"] if s["code"] == code)

    def test_index_fields_unchanged(self):
        self.assertEqual(set(self.index), INDEX_KEYS)
        self.assertTrue(os.path.exists(os.path.join(self.out, "issues", "2-trashcans.json")))

    def test_top_level_fields(self):
        self.assertEqual(self.data["issues"], [1, 2, 8, 9])
        for key in ("title", "updated", "spaces", "summary", "sharedStakeholders", "repeatedNeeds", "focusGroups",
                    "needGroups", "conflicts", "solutions", "solutionFocus", "pending"):
            self.assertIn(key, self.data)
        self.assertEqual([t["topic"] for t in self.data["summary"]],
                         ["難以取捨的決定", "可能的爭議", "受影響較大的弱勢族群", "法規上的障礙", "相依事項與現行政策的關係"])

    def test_shared_stakeholders(self):
        shared = self.data["sharedStakeholders"]
        self.assertEqual(len(shared), 18)
        o03 = next(s for s in shared if s["id"] == "O03")
        self.assertEqual(o03["issues"], [2, 8])
        self.assertIn({"issue": 8, "id": "O03-US01"}, o03["stories"])
        # I04 is shared by #2 and #9 only.
        i04 = next(s for s in shared if s["id"] == "I04")
        self.assertEqual(i04["issues"], [2, 9])
        self.assertEqual(i04["stories"], [{"issue": 2, "id": "I04-US01"}, {"issue": 9, "id": "I04-US01"}])
        # I27 is shared by #8 and #9 (#9 added it for the 呼吸道疾病 group, 2026-10-20).
        i27 = next(s for s in shared if s["id"] == "I27")
        self.assertEqual(i27["issues"], [8, 9])
        self.assertIn({"issue": 9, "id": "I27-US02"}, i27["stories"])

    def test_issue_9_part_has_no_space(self):
        # #9 uses no city space. X-D gets its spaces from its other parts.
        d = self.solution("X-D")
        self.assertIn({"issue": 9, "code": "D"}, d["parts"])
        self.assertEqual(d["spaces"], ["sidewalk", "arcade", "park", "mrt-exit"])
        self.assertIn({"issue": 9, "id": "N05"}, d["needs"]["must"])
        self.assertIn("X-N08", d["needs"]["crossIssue"])

    def test_combined_solution_parts_and_needs(self):
        a = self.solution("X-A")
        self.assertEqual(a["parts"], [{"issue": 1, "code": "C"}, {"issue": 2, "code": "D"}, {"issue": 8, "code": "A"}])
        self.assertIn({"issue": 1, "id": "N05"}, a["needs"]["must"])
        self.assertIn({"issue": 1, "id": "N11"}, a["needs"]["shouldCould"])
        self.assertIn("X-N01", a["needs"]["crossIssue"])
        self.assertEqual(a["tag"], "AI模擬")
        self.assertEqual(a["detail"]["owner"]["tag"], "AI模擬")

    def test_measures(self):
        measures = self.solution("X-B")["measures"]
        new = [m for m in measures if m["isNew"]]
        self.assertTrue(new)
        self.assertEqual(new[0]["from"], [])
        first = measures[0]
        self.assertEqual(first["from"], [{"issue": 1, "code": "D"}])
        self.assertEqual(first["baseline"]["tag"], "實證")

    def test_need_group_priorities(self):
        groups = {g["id"]: g for g in self.data["needGroups"]}
        self.assertEqual(groups["X-N01"]["priority"], "M")
        self.assertFalse(groups["X-N01"]["prioritiesDiffer"])
        self.assertIsNone(groups["X-N06"]["priority"])
        self.assertTrue(groups["X-N06"]["prioritiesDiffer"])
        self.assertIn({"issue": 2, "id": "N06", "priority": "M"}, groups["X-N06"]["needs"])

    def test_conflicts(self):
        c2 = next(c for c in self.data["conflicts"] if c["id"] == "X-C2")
        self.assertEqual(c2["issueConflicts"], [{"issue": 2, "id": "C9"}])
        self.assertEqual(c2["wayOutSolutions"], ["X-E", "X-B"])
        self.assertEqual(c2["sideA"], [{"issue": 2, "id": "I01-US09"}])
        c1 = next(c for c in self.data["conflicts"] if c["id"] == "X-C1")
        self.assertIn({"issue": None, "id": "X-N02"}, c1["needsB"])


class CrossIssueJsonErrorTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = make_copy(self._tmp.name)
        self.out = os.path.join(self._tmp.name, "out")

    def tearDown(self):
        self._tmp.cleanup()

    def test_error_stops_the_build(self):
        path = os.path.join(self.dir, CROSS)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace("| #2 解法 A、#2 解法 B、#8 解法 B |", "| #2 解法 A、#2 解法 B |"))
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("cross-issue", out)
        self.assertIn("X-E", out)
        self.assertNotIn("Traceback", out)
        self.assertFalse(os.path.exists(os.path.join(self.out, "index.json")))

    def test_no_cross_issue_file(self):
        shutil.rmtree(os.path.join(self.dir, "cross-issue"))
        os.makedirs(self.out)
        old = os.path.join(self.out, "cross-issue.json")
        with open(old, "w", encoding="utf-8") as f:
            f.write("{}")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 0, out)
        self.assertFalse(os.path.exists(old))
        self.assertTrue(os.path.exists(os.path.join(self.out, "index.json")))


if __name__ == "__main__":
    unittest.main()
