"""Tests for the cross-issue part of analysis/scripts/build_json.py (cross-issue.json).

The tests copy the issue folders, the shared files and the cross-issue folder
from the working tree into a temp dir and run the script there as a
subprocess.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import csv, json, os, shutil, subprocess, sys, tempfile, unittest

from . import new_format as NEW_FORMAT

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ANALYSIS, "scripts", "build_json.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "data/domain-types.csv", "data/solution-types.csv", "data/open-data.csv",
          "docs/method.md", "docs/human-inputs.md")
CROSS = os.path.join("cross-issue", "cross-issue-analysis.md")
# The fields of index.json. The cross-issue data must not change them (the app reads them).
INDEX_KEYS = {"issues", "stakeholders", "pathLabels", "spaceTypes", "spaceGroups", "domainTypes", "domainGroups",
              "solutionTypes", "openData"}
CANDIDATES = os.path.join("cross-issue", "candidates.csv")


def make_copy(root):
    d = os.path.join(root, "analysis")
    os.makedirs(d)
    for name in SHARED:
        os.makedirs(os.path.join(d, os.path.dirname(name)), exist_ok=True)
        shutil.copy(os.path.join(ANALYSIS, name), os.path.join(d, name))
    for n in os.listdir(ANALYSIS):
        if n == "0-template":  # the template folder is not an issue
            continue
        if os.path.isfile(os.path.join(ANALYSIS, n, "issue-analysis.md")) or n == "cross-issue":
            shutil.copytree(os.path.join(ANALYSIS, n), os.path.join(d, n))
    return d


def run_build(analysis_dir, out_dir):
    p = subprocess.run([sys.executable, "-I", SCRIPT, analysis_dir, out_dir], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


class CrossIssueNewFormatJsonTest(unittest.TestCase):
    """A 4.5 section in the new step 7 format (plan-wbs-rollout.md, Task 1)."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        d = make_copy(cls._tmp.name)
        path = os.path.join(d, CROSS)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        with open(path, "w", encoding="utf-8") as f:
            f.write(NEW_FORMAT.cross_to_new_format(text, "X-S5"))
        out = os.path.join(cls._tmp.name, "out")
        code, log = run_build(d, out)
        if code != 0:
            raise AssertionError(f"build failed ({code}): {log}")
        with open(os.path.join(out, "cross-issue.json"), encoding="utf-8") as f:
            cls.solutions = {s["code"]: s for s in json.load(f)["solutions"]}
        with open(os.path.join(out, "issues", "2-trashcans.json"), encoding="utf-8") as f:
            cls.issue_solution = json.load(f)["solutions"][0]

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_schedule_rows_in_file_order(self):
        rows = self.solutions["X-S5"]["schedule"]["rows"]
        self.assertEqual([(r["id"], r["level"]) for r in rows], [("1", 1), ("1.1", 2), ("1.2", 2), ("2", 1), ("2.1", 2)])
        self.assertEqual(rows[1], {"id": "1.1", "level": 2, "item": {"text": "和各區公所訂好流程", "tag": "AI模擬", "pending": False},
                                   "owner": "環保局", "period": "第 1 個月", "days": "約 10–20"})
        self.assertEqual(rows[2]["days"], "【待補：人力估計】")

    def test_schedule_has_the_shape_of_an_issue_solution(self):
        schedule, model = self.solutions["X-S5"]["schedule"], self.issue_solution["schedule"]
        self.assertEqual(set(schedule), set(model))
        self.assertEqual(set(schedule["rows"][0]), set(model["rows"][0]))
        self.assertEqual(set(schedule["rows"][0]["item"]), set(model["rows"][0]["item"]))

    def test_gantt_is_the_chart_source(self):
        gantt = self.solutions["X-S5"]["schedule"]["gantt"]
        self.assertTrue(gantt.startswith("gantt\n  title 時程示意"))
        self.assertLess(gantt.index("1.1 訂好流程"), gantt.index("1.2 選出試點的里"))
        self.assertLess(gantt.index("section 1 準備"), gantt.index("section 2 試點"))
        self.assertNotIn("```", gantt)

    def test_plan_has_no_steps_and_the_cost_has_two_parts(self):
        plan = self.solutions["X-S5"]["plan"]
        self.assertEqual(list(plan), ["owner", "resources", "cost"])
        self.assertEqual([p["tag"] for p in plan["cost"]], ["AI模擬", "AI模擬"])
        self.assertEqual(plan["cost"][0]["text"], "成本中（人力與場地）。")
        self.assertTrue(plan["cost"][1]["text"].startswith("時間：約 6–9 個月"))

    def test_old_format_section_has_no_schedule(self):
        old = self.solutions["X-S1"]
        self.assertIsNone(old["schedule"])
        self.assertIn("steps", old["plan"])


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
        self.assertEqual(self.data["issues"], [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
        for key in ("title", "updated", "spaces", "summary", "sharedStakeholders", "repeatedNeeds", "focusGroups",
                    "needGroups", "conflicts", "solutions", "solutionFocus", "pending"):
            self.assertIn(key, self.data)
        self.assertEqual([t["topic"] for t in self.data["summary"]],
                         ["難以取捨的決定", "可能的爭議", "受影響較大的弱勢族群", "法規上的障礙", "相依事項與現行政策的關係"])

    def test_shared_stakeholders(self):
        shared = self.data["sharedStakeholders"]
        self.assertEqual(len(shared), 54)
        o03 = next(s for s in shared if s["id"] == "O03")
        self.assertEqual(o03["issues"], [2, 3, 8, 11])
        self.assertIn({"issue": 8, "id": "O03-US01"}, o03["stories"])
        self.assertIn({"issue": 3, "id": "O03-US02"}, o03["stories"])
        # I04 is in #2, #4, #5, #6, #9, #10 and #11 (one story in each).
        i04 = next(s for s in shared if s["id"] == "I04")
        self.assertEqual(i04["issues"], [2, 4, 5, 6, 9, 10, 11])
        self.assertEqual(i04["stories"], [{"issue": n, "id": "I04-US01"} for n in (2, 4, 5, 6, 9, 10, 11)])
        # I27 is in #3, #4, #8 and #9 (#9 added it for the 呼吸道疾病 group, 2026-10-20).
        i27 = next(s for s in shared if s["id"] == "I27")
        self.assertEqual(i27["issues"], [3, 4, 8, 9])
        self.assertIn({"issue": 9, "id": "I27-US02"}, i27["stories"])
        # I37 was shared by #3 and #6 (added with #3–#6 on 2026-10-23); #11 and #12 have it too.
        i37 = next(s for s in shared if s["id"] == "I37")
        self.assertEqual(i37["issues"], [3, 6, 11, 12])
        # I49 is shared by #6 and #10 only (added with #10 on 2026-10-24).
        i49 = next(s for s in shared if s["id"] == "I49")
        self.assertEqual(i49["issues"], [6, 10])
        self.assertEqual(i49["stories"], [{"issue": 6, "id": "I49-US01"}, {"issue": 10, "id": "I49-US01"}])
        # I43 is shared by #5 and #12 only (added with #11 and #12 on 2026-10-24).
        i43 = next(s for s in shared if s["id"] == "I43")
        self.assertEqual(i43["issues"], [5, 12])
        self.assertIn({"issue": 12, "id": "I43-US01"}, i43["stories"])

    def test_issue_9_part_has_no_space(self):
        # #9 uses no city space. X-S4 gets its spaces from its other parts.
        d = self.solution("X-S4")
        self.assertIn({"issue": 9, "code": "S4"}, d["parts"])
        self.assertEqual(d["spaces"], ["sidewalk-walkway", "sidewalk-furniture", "arcade", "park", "mrt-exit"])
        self.assertIn({"issue": 9, "id": "N05"}, d["needs"]["must"])
        self.assertIn("X-N8", d["needs"]["crossIssue"])

    def test_combined_solution_parts_and_needs(self):
        a = self.solution("X-S1")
        self.assertEqual(a["parts"], [{"issue": 1, "code": "S3"}, {"issue": 2, "code": "S4"}, {"issue": 8, "code": "S1"}])
        self.assertIn({"issue": 1, "id": "N05"}, a["needs"]["must"])
        self.assertIn({"issue": 1, "id": "N11"}, a["needs"]["shouldCould"])
        self.assertIn("X-N1", a["needs"]["crossIssue"])
        self.assertEqual(a["tag"], "AI模擬")
        self.assertEqual(a["plan"]["owner"][0]["tag"], "AI模擬")

    def test_solution_types(self):
        # Each X- solution has its 4.1 解法類型 cell as a list, in cell order.
        self.assertEqual(self.solution("X-S5")["solutionTypes"], ["facility", "planning"])
        self.assertEqual(self.solution("X-S7")["solutionTypes"], ["service"])
        for s in self.data["solutions"]:
            self.assertTrue(1 <= len(s["solutionTypes"]) <= 3, s["code"])

    def test_solution_domains_are_the_union_of_the_parts(self):
        # domains of an X- solution: the domains of its parts, in part order,
        # each code once (plan-types-ui.md, Task U1).
        issues = {}
        for name in os.listdir(os.path.join(self.out, "issues")):
            with open(os.path.join(self.out, "issues", name), encoding="utf-8") as f:
                data = json.load(f)
            issues[data["number"]] = {s["id"]: s for s in data["solutions"]}
        for s in self.data["solutions"]:
            expected = []
            for p in s["parts"]:
                for d in issues[p["issue"]][p["code"]]["domains"]:
                    if d not in expected:
                        expected.append(d)
            self.assertEqual(s["domains"], expected, s["code"])
            self.assertEqual(len(s["domains"]), len(set(s["domains"])), s["code"])
            self.assertTrue(s["domains"], s["code"])
        # X-S1 is 1-S3, 2-S4 and 8-S1. environment comes from #1 and #2,
        # health from #8. Each is there once.
        self.assertEqual(self.solution("X-S1")["domains"], ["environment", "health"])
        # X-S9 is 4-S3, then 6-S6: the order of the parts, not of the codes.
        self.assertEqual(self.solution("X-S9")["domains"], ["civil-affairs", "industry", "community-development"])

    def test_candidates_are_the_csv_rows(self):
        with open(os.path.join(self.dir, CANDIDATES), encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))
        def split(v):
            return v.split("、") if v else []
        expected = [{"a": r["解法甲"], "b": r["解法乙"], "solutionTypes": split(r["共同解法類型"]),
                     "domains": split(r["共同領域"]), "spaces": split(r["共同空間類型"]),
                     "needs": split(r["共同需求"]), "crossSolutions": split(r["已在跨議題解法"])} for r in rows]
        self.assertEqual(self.data["candidates"], expected)
        self.assertEqual(len(self.data["candidates"]), 133)
        first = self.data["candidates"][0]
        self.assertEqual(first, {"a": "1-S1", "b": "2-S1", "solutionTypes": ["digital-tool", "planning"],
                                 "domains": ["environment"], "spaces": ["sidewalk-furniture"],
                                 "needs": ["1.2 O12"], "crossSolutions": ["X-S2"]})
        # An empty cell is [] (1-S1 and 3-S1 are in no X- solution).
        third = self.data["candidates"][2]
        self.assertEqual((third["a"], third["b"], third["crossSolutions"]), ("1-S1", "3-S1", []))

    def test_evaluation_and_plan(self):
        # The tables of the 「### 4.5.n 解法 X-S1：…」 section: the same keys as
        # for an issue solution (ETBlue, 2026-10-23). Each cell is a list of one Cell.
        e = self.solution("X-S5")
        self.assertEqual(list(e["evaluation"]), ["laws", "privacy", "risks", "disasters", "feasibility"])
        self.assertEqual(list(e["plan"]), ["owner", "resources", "cost", "steps"])
        # The old 主要風險 cell is split at 「；災害風險：」.
        self.assertEqual(e["evaluation"]["risks"],
                         [{"text": "分開設置後，清潔箱或吸菸區可能離人多的地方遠一些；菸蒂收集設備需要維護（#8）",
                           "tag": "AI模擬", "pending": False}])
        self.assertTrue(e["evaluation"]["disasters"][0]["text"].startswith("負壓式吸菸區停電時無法排氣"))
        # 可行性 lists the 可行性 of each part (#2 解法 S1, #2 解法 S2, #8 解法 S2).
        self.assertEqual(e["evaluation"]["feasibility"],
                         [{"text": "#2 解法 S1：可行性高；#2 解法 S2：QR 回報可行性高，感測器試點可行性中；#8 解法 S2：可行性中",
                           "tag": "AI模擬", "pending": False}])
        self.assertEqual(e["plan"]["steps"][0]["tag"], "AI模擬")
        self.assertTrue(e["plan"]["steps"][0]["text"].startswith("第一步："))

    def test_summary_rows_of_a_solution(self):
        # The 可能的爭議 and 法規上的障礙 rows whose 相關編號 names 「解法 X-S1」.
        a = self.solution("X-S1")
        self.assertEqual([i["item"] for i in a["controversies"]], ["合併的選址討論"])
        for i in a["controversies"] + a["legal"]:
            self.assertIn("X-S1", i["solutions"])
        dep = next(t for t in self.data["summary"] if t["topic"] == "相依事項與現行政策的關係")
        self.assertEqual(dep["items"], [])

    def test_practices_are_the_dependency_rows(self):
        # The cross-issue file has no practice table. A solution gets the rows of
        # the 相依事項與現行政策的關係 table of its 4.5.n section. They are domestic.
        a = self.solution("X-S1")["practices"]
        self.assertEqual([p["name"] for p in a], ["以各議題的解法為基礎", "現行的清潔箱做法"])
        self.assertEqual({(p["place"], p["domestic"], p["use"], p["source"]) for p in a},
                         {(None, True, None, "dependency")})
        self.assertEqual(a[1]["content"]["tag"], "AI模擬")
        self.assertEqual(a[1]["refs"], ["#2 O04-US04", "解法 X-S1"])
        self.assertEqual([p["name"] for p in self.solution("X-S5")["practices"]], ["以各議題的解法為基礎"])
        # X-S3 has the #10 row and the #11 row too (added on 2026-10-24).
        self.assertEqual([p["name"] for p in self.solution("X-S3")["practices"]],
                         ["以各議題的解法為基礎", "現行的 1999 噪音派工", "現行的大型廢棄物電話預約"])

    def test_measures(self):
        measures = self.solution("X-S2")["measures"]
        new = [m for m in measures if m["isNew"]]
        self.assertTrue(new)
        self.assertEqual(new[0]["from"], [])
        first = measures[0]
        self.assertEqual(first["from"], [{"issue": 1, "code": "S4"}])
        self.assertEqual(first["baseline"]["tag"], "實證")

    def test_ids_are_in_number_order(self):
        # 13 solutions and 20 need groups, so the numbers go past 10. The file
        # order is the number order: X-S2 before X-S10, X-N2 before X-N10.
        self.assertEqual([s["code"] for s in self.data["solutions"]], [f"X-S{n}" for n in range(1, 14)])
        self.assertEqual([g["id"] for g in self.data["needGroups"]], [f"X-N{n}" for n in range(1, 21)])

    def test_need_group_priorities(self):
        groups = {g["id"]: g for g in self.data["needGroups"]}
        self.assertEqual(groups["X-N1"]["priority"], "M")
        self.assertFalse(groups["X-N1"]["prioritiesDiffer"])
        self.assertIsNone(groups["X-N6"]["priority"])
        self.assertTrue(groups["X-N6"]["prioritiesDiffer"])
        self.assertIn({"issue": 2, "id": "N06", "priority": "M"}, groups["X-N6"]["needs"])

    def test_conflicts(self):
        c2 = next(c for c in self.data["conflicts"] if c["id"] == "X-C2")
        self.assertEqual(c2["issueConflicts"], [{"issue": 2, "id": "C9"}])
        self.assertEqual(c2["wayOutSolutions"], ["X-S5", "X-S2"])
        self.assertEqual(c2["sideA"], [{"issue": 2, "id": "I01-US09"}])
        c1 = next(c for c in self.data["conflicts"] if c["id"] == "X-C1")
        self.assertIn({"issue": None, "id": "X-N2"}, c1["needsB"])


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
            f.write(text.replace("| #2 解法 S1、#2 解法 S2、#8 解法 S2 |", "| #2 解法 S1、#2 解法 S2 |"))
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("cross-issue", out)
        self.assertIn("X-S5", out)
        self.assertNotIn("Traceback", out)
        self.assertFalse(os.path.exists(os.path.join(self.out, "index.json")))

    def test_candidates_file_is_needed(self):
        os.remove(os.path.join(self.dir, CANDIDATES))
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("candidates.csv", out)
        self.assertNotIn("Traceback", out)

    def test_candidate_with_an_unknown_solution(self):
        path = os.path.join(self.dir, CANDIDATES)
        with open(path, encoding="utf-8-sig") as f:
            text = f.read()
        with open(path, "w", encoding="utf-8-sig") as f:
            f.write(text.replace("1-S1,2-S1,", "1-S1,2-S99,", 1))
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-S99", out)
        self.assertNotIn("Traceback", out)

    def test_candidate_with_an_unknown_cross_solution(self):
        path = os.path.join(self.dir, CANDIDATES)
        with open(path, encoding="utf-8-sig") as f:
            text = f.read()
        old = "1-S1,2-S1,digital-tool、planning,environment,sidewalk-furniture,1.2 O12,X-S2\n"
        self.assertIn(old, text)
        with open(path, "w", encoding="utf-8-sig") as f:
            f.write(text.replace(old, old.replace("X-S2", "X-S99"), 1))
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("X-S99", out)
        self.assertNotIn("Traceback", out)

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
