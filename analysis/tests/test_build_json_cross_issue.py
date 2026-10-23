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
        self.assertEqual(self.data["issues"], [1, 2, 3, 4, 5, 6, 8, 9, 10])
        for key in ("title", "updated", "spaces", "summary", "sharedStakeholders", "repeatedNeeds", "focusGroups",
                    "needGroups", "conflicts", "solutions", "solutionFocus", "pending"):
            self.assertIn(key, self.data)
        self.assertEqual([t["topic"] for t in self.data["summary"]],
                         ["難以取捨的決定", "可能的爭議", "受影響較大的弱勢族群", "法規上的障礙", "相依事項與現行政策的關係"])

    def test_shared_stakeholders(self):
        shared = self.data["sharedStakeholders"]
        self.assertEqual(len(shared), 44)
        o03 = next(s for s in shared if s["id"] == "O03")
        self.assertEqual(o03["issues"], [2, 3, 8])
        self.assertIn({"issue": 8, "id": "O03-US01"}, o03["stories"])
        self.assertIn({"issue": 3, "id": "O03-US02"}, o03["stories"])
        # I04 is in #2, #4, #5, #6, #9 and #10 (one story in each).
        i04 = next(s for s in shared if s["id"] == "I04")
        self.assertEqual(i04["issues"], [2, 4, 5, 6, 9, 10])
        self.assertEqual(i04["stories"], [{"issue": n, "id": "I04-US01"} for n in (2, 4, 5, 6, 9, 10)])
        # I27 is in #3, #4, #8 and #9 (#9 added it for the 呼吸道疾病 group, 2026-10-20).
        i27 = next(s for s in shared if s["id"] == "I27")
        self.assertEqual(i27["issues"], [3, 4, 8, 9])
        self.assertIn({"issue": 9, "id": "I27-US02"}, i27["stories"])
        # I37 is shared by #3 and #6 only (added with #3–#6 on 2026-10-23).
        i37 = next(s for s in shared if s["id"] == "I37")
        self.assertEqual(i37["issues"], [3, 6])
        # I49 is shared by #6 and #10 only (added with #10 on 2026-10-24).
        i49 = next(s for s in shared if s["id"] == "I49")
        self.assertEqual(i49["issues"], [6, 10])
        self.assertEqual(i49["stories"], [{"issue": 6, "id": "I49-US01"}, {"issue": 10, "id": "I49-US01"}])

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
        self.assertEqual(a["plan"]["owner"][0]["tag"], "AI模擬")

    def test_evaluation_and_plan(self):
        # The tables of the 「### 4.5.n 解法 X-A：…」 section: the same keys as
        # for an issue solution (ETBlue, 2026-10-23). Each cell is a list of one Cell.
        e = self.solution("X-E")
        self.assertEqual(list(e["evaluation"]), ["laws", "privacy", "risks", "disasters", "feasibility"])
        self.assertEqual(list(e["plan"]), ["owner", "resources", "cost", "steps"])
        # The old 主要風險 cell is split at 「；災害風險：」.
        self.assertEqual(e["evaluation"]["risks"],
                         [{"text": "分開設置後，清潔箱或吸菸區可能離人多的地方遠一些；菸蒂收集設備需要維護（#8）",
                           "tag": "AI模擬", "pending": False}])
        self.assertTrue(e["evaluation"]["disasters"][0]["text"].startswith("負壓式吸菸區停電時無法排氣"))
        # 可行性 lists the 可行性 of each part (#2 解法 A, #2 解法 B, #8 解法 B).
        self.assertEqual(e["evaluation"]["feasibility"],
                         [{"text": "#2 解法 A：可行性高；#2 解法 B：QR 回報可行性高，感測器試點可行性中；#8 解法 B：可行性中",
                           "tag": "AI模擬", "pending": False}])
        self.assertEqual(e["plan"]["steps"][0]["tag"], "AI模擬")
        self.assertTrue(e["plan"]["steps"][0]["text"].startswith("第一步："))

    def test_summary_rows_of_a_solution(self):
        # The 可能的爭議 and 法規上的障礙 rows whose 相關編號 names 「解法 X-A」.
        a = self.solution("X-A")
        self.assertEqual([i["item"] for i in a["controversies"]], ["合併的選址討論"])
        for i in a["controversies"] + a["legal"]:
            self.assertIn("X-A", i["solutions"])
        dep = next(t for t in self.data["summary"] if t["topic"] == "相依事項與現行政策的關係")
        self.assertEqual(dep["items"], [])

    def test_practices_are_the_dependency_rows(self):
        # The cross-issue file has no practice table. A solution gets the rows of
        # the 相依事項與現行政策的關係 table of its 4.5.n section. They are domestic.
        a = self.solution("X-A")["practices"]
        self.assertEqual([p["name"] for p in a], ["以各議題的解法為基礎", "現行的清潔箱做法"])
        self.assertEqual({(p["place"], p["domestic"], p["use"], p["source"]) for p in a},
                         {(None, True, None, "dependency")})
        self.assertEqual(a[1]["content"]["tag"], "AI模擬")
        self.assertEqual(a[1]["refs"], ["#2 O04-US04", "解法 X-A"])
        self.assertEqual([p["name"] for p in self.solution("X-E")["practices"]], ["以各議題的解法為基礎"])
        # X-C has the #10 row too (added with #10 on 2026-10-24).
        self.assertEqual([p["name"] for p in self.solution("X-C")["practices"]], ["以各議題的解法為基礎", "現行的 1999 噪音派工"])

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
