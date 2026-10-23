"""Tests for analysis/scripts/build_json.py.

The tests copy every issue folder that has an issue-analysis.md, and the
shared files, into a temp dir and run the
script there as a subprocess. Every copied file comes from the last commit
(git archive HEAD), not from the working tree. Another agent may edit the
shared CSV files or the issue files at the same time; their edits that are
not committed yet must not change the results of these tests.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import importlib.util, json, os, re, shutil, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ANALYSIS)
SCRIPT = os.path.join(ANALYSIS, "scripts", "build_json.py")
SHARED = ("data/issues.csv", "data/stakeholders.csv", "data/path-labels.csv", "data/space-types.csv", "data/open-data.csv")
ISSUE = "2-trashcans"
# No issue uses the old format now. This copy of #8 (from before commit
# 37057a9) tests it. It is read from the working tree, not from HEAD.
OLD_FORMAT = os.path.join(ANALYSIS, "tests", "fixtures", "old-format")


def head_issue_folders():
    """Paths of the issue folders in HEAD that have an issue-analysis.md."""
    names = subprocess.run(["git", "ls-tree", "-r", "--name-only", "HEAD", "--", "analysis"], cwd=REPO,
                           capture_output=True, text=True, check=True).stdout.splitlines()
    return sorted({os.path.dirname(n) for n in names
                   if n.endswith("/issue-analysis.md") and n.count("/") == 2})


def make_copy(root):
    """Copy the issue folders and the shared files from HEAD into root/analysis. Return that dir."""
    paths = [f"analysis/{n}" for n in SHARED] + head_issue_folders()
    tar = subprocess.run(["git", "archive", "HEAD", "--", *paths], cwd=REPO,
                         capture_output=True, check=True).stdout
    subprocess.run(["tar", "-x", "-C", root], input=tar, check=True)
    return os.path.join(root, "analysis")


def use_old_format(analysis_dir):
    """Put the old-format fixture in place of the copied 8-smokefree files."""
    for name in ("issue-analysis.md", "user-stories.csv"):
        shutil.copy(os.path.join(OLD_FORMAT, name), os.path.join(analysis_dir, "8-smokefree", name))


def run_build(analysis_dir, out_dir):
    p = subprocess.run([sys.executable, "-I", SCRIPT, analysis_dir, out_dir],
                       capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def load_module():
    spec = importlib.util.spec_from_file_location("build_json", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class BuildJsonOutputTest(unittest.TestCase):
    """Build #2 once and look at the JSON."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.dir = make_copy(cls._tmp.name)
        cls.out = os.path.join(cls._tmp.name, "out")
        code, out = run_build(cls.dir, cls.out)
        if code != 0:
            raise AssertionError(f"build failed ({code}): {out}")
        with open(os.path.join(cls.out, "index.json"), encoding="utf-8") as f:
            cls.index = json.load(f)
        with open(os.path.join(cls.out, "issues", f"{ISSUE}.json"), encoding="utf-8") as f:
            cls.issue = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def story(self, sid):
        return next(s for s in self.issue["stories"] if s["id"] == sid)

    def test_counts(self):
        self.assertEqual(len(self.issue["stories"]), 53)
        self.assertEqual(len(self.issue["conflicts"]), 10)
        self.assertEqual(len(self.issue["solutions"]), 5)
        self.assertEqual(len(self.issue["groups"]), 11)
        self.assertEqual(len(self.issue["stakeholders"]), 27)

    def test_index_counts(self):
        item = next(i for i in self.index["issues"] if i["number"] == 2)
        # cells: want + soThat. 實證 8+1, AI整理 11+13, AI模擬 34+38, 待補 0+1.
        self.assertEqual(item["counts"], {"stakeholdersO": 12, "stakeholdersI": 15, "stories": 53,
                                          "conflicts": 10, "solutions": 5,
                                          "cells": {"evidence": 9, "aiSummary": 24, "aiSimulated": 72,
                                                    "pending": 1}})
        self.assertEqual(item["spaces"], ["sidewalk", "arcade", "park", "mrt-exit"])
        self.assertEqual(item["title"], "找回消失的垃圾桶")
        self.assertEqual(item["folder"], ISSUE)

    def test_cells_are_two_per_story(self):
        # Every analyzed issue: each story has a 我想要… and a 以便… cell.
        for item in self.index["issues"]:
            if item["available"]:
                c = item["counts"]
                self.assertEqual(list(c["cells"]), ["evidence", "aiSummary", "aiSimulated", "pending"])
                self.assertEqual(sum(c["cells"].values()), 2 * c["stories"], item["folder"])

    def test_conflict_c6_sides(self):
        c6 = next(c for c in self.issue["conflicts"] if c["id"] == "C6")
        self.assertIn("I01-US01", c6["sideA"])
        for sid in ("I06-US01", "I07-US02", "O12-US01"):
            self.assertIn(sid, c6["sideB"])
        self.assertNotIn("I01-US01", c6["sideB"])
        self.assertEqual(c6["text"]["tag"], "AI模擬")
        self.assertFalse(c6["text"]["text"].startswith("`"))

    def test_solution_a(self):
        a = next(s for s in self.issue["solutions"] if s["id"] == "A")
        self.assertIn("I06-US01", a["stories"])
        self.assertIn("O01-US01", a["stories"])  # from the Should / Could column
        self.assertEqual(a["name"], {"text": "清潔箱佈建建議地圖", "tag": "AI模擬", "pending": False})
        self.assertEqual(a["spaces"], ["sidewalk", "mrt-exit"])
        self.assertTrue(a["summary"].startswith("結合清潔箱位置"))

    def solution(self, code, issue=None):
        return next(s for s in (issue or self.issue)["solutions"] if s["id"] == code)

    def test_solution_measures(self):
        # 6.3 rows whose 解法 cell lists the code. A row for 「A、D」 belongs to both.
        a = self.solution("A")
        self.assertEqual([m["metric"] for m in a["measures"]],
                         ["清潔箱總數", "無清潔箱資料的行政區數", "高人流捷運站的「每處每日出站人次」",
                          "家用垃圾違規棄置件數（試點區）"])
        self.assertEqual(a["measures"][1], {"metric": "無清潔箱資料的行政區數",
                                            "baseline": {"text": "1 區（北投區，主表 0 筆；130 點總表有 49 處）",
                                                         "tag": "實證", "pending": False},
                                            "source": "data.gov.tw 121355"})
        d = self.solution("D")
        self.assertEqual(d["measures"][0]["metric"], "家用垃圾違規棄置件數（試點區）")
        self.assertEqual(d["measures"][0]["baseline"],
                         {"text": "【待補：環保局稽查資料】", "tag": None, "pending": True})
        self.assertEqual(len(d["measures"]), 3)

    def test_solution_detail(self):
        # The rows of the step 7 section 「### 7.n 解法 X：…」, in file order.
        a = self.solution("A")
        self.assertEqual([r["item"] for r in a["detail"]],
                         ["需要的資料／API", "相關法規", "隱私", "其他顧慮", "災害風險", "主責單位", "成本／可行性／風險"])
        # content is a list of parts; a cell with one tag is a list of one Cell.
        self.assertEqual(a["detail"][5]["content"],
                         [{"text": "環保局（環境清潔管理科）；協作：資訊局、工務局新工處、交通局",
                           "tag": "AI模擬", "pending": False}])
        # A solution with no related disaster says so in its 災害風險 row.
        self.assertEqual(self.solution("C")["detail"][4],
                         {"item": "災害風險",
                          "content": [{"text": "無明顯相關災害風險", "tag": "AI模擬", "pending": False}]})

    def test_mixed_step_7_cell(self):
        # #2 解法 E: the 災害風險 cell is split into parts with their own tags
        # (ETBlue, 2026-10-22): official sources [實證], news and a plan copied
        # on a school website [AI整理], AI judgement [AI模擬].
        e = self.solution("E")["detail"][4]
        self.assertEqual(e["item"], "災害風險")
        self.assertEqual([p["tag"] for p in e["content"]],
                         ["AI模擬", "實證", "AI整理", "AI模擬", "實證", "AI模擬", "實證", "AI整理"])
        self.assertTrue(e["content"][1]["text"].startswith("傳染病防治法第 25 條規定"))
        self.assertTrue(e["content"][7]["text"].startswith("新聞報導指出"))
        self.assertIn("【待補：查證", e["content"][7]["text"])
        self.assertTrue(all(p["text"] and not p["pending"] for p in e["content"]))

    def test_solution_overview(self):
        # The solution's row of the 總覽 table, found by its 代號 cell. The row tag (in the 解法 cell) is on every field.
        b = self.solution("B")
        cell = lambda t: {"text": t, "tag": "AI模擬", "pending": False}
        self.assertEqual(b["overview"], {"cost": cell("低（QR）／中（感測器）"), "feasibility": cell("中"),
                                         "risk": cell("維護、資安、勞動條件"), "owner": cell("環保局")})

    def test_solution_ideas(self):
        # Rows of the 6.1 構想 table whose 本文件的處理 cell names the solution (「併入解法 B」).
        b = self.solution("B")
        self.assertEqual(len(b["ideas"]), 2)
        self.assertEqual(b["ideas"][0]["idea"],
                         {"text": "設偵測系統，偵測到垃圾桶滿了才派人去收，不用一直定時巡邏",
                          "tag": "實證", "pending": False})
        self.assertTrue(b["ideas"][0]["handling"]["text"].startswith("併入解法 B"))
        self.assertEqual(b["ideas"][0]["handling"]["tag"], "AI模擬")
        self.assertEqual(list(b["ideas"][0]), ["idea", "handling"])
        for code in "ACDE":
            self.assertEqual(self.solution(code)["ideas"], [])

    def test_solution_pending(self):
        # 待補 items in the solution's 7.n section or in its 6.3 rows. The global list stays.
        a = self.solution("A")
        texts = [(p["section"], p["text"]) for p in a["pending"]]
        self.assertIn(("6.3 成效衡量", "【待補：環保局稽查資料】"), texts)
        self.assertIn(("7.1 解法 A：清潔箱佈建建議地圖", "【待補：法務確認】"), texts)
        self.assertNotIn(("6.3 成效衡量", "【待補：短問卷】"), texts)  # a C row
        self.assertTrue(all(p["section"] in ("6.3 成效衡量", "7.1 解法 A：清潔箱佈建建議地圖")
                            for p in a["pending"]), texts)
        d = self.solution("D")
        self.assertIn("【待補：環保局稽查資料】", [p["text"] for p in d["pending"]])
        for p in a["pending"]:
            self.assertIn(p, self.issue["pending"])
        self.assertEqual(list(a["pending"][0]), ["section", "text", "context"])

    def test_solution_keys(self):
        self.assertEqual(list(self.solution("A")),
                         ["id", "name", "summary", "spaces", "added", "updated", "stories", "needs",
                          "measures", "detail", "overview", "ideas", "practices", "pending"])

    def test_solution_practices(self):
        # The 6.1 practice rows that name the solution, then the 相依事項與現行政策的關係
        # rows that name it (domestic; ETBlue, 2026-10-22).
        b = self.solution("B")
        self.assertEqual([(p["place"], p["source"]) for p in b["practices"]],
                         [("美國紐約", "practice"), ("美國費城", "practice"), ("美國費城", "practice")])
        first = b["practices"][0]
        self.assertEqual(list(first), ["name", "place", "domestic", "content", "use", "source"])
        self.assertEqual(first["name"], "新設計的清潔箱（Better Bin）")
        self.assertFalse(first["domestic"])
        self.assertEqual(first["content"]["tag"], "實證")
        self.assertEqual(first["use"]["tag"], "AI模擬")
        self.assertTrue(first["use"]["text"].startswith("解法 B 在被丟家用垃圾的點"))
        # 「（N04、7.2）」 names B through its step 7 section, and the row names no other solution.
        self.assertTrue(b["practices"][2]["use"]["text"].endswith("（N04、7.2）"))
        a = self.solution("A")
        self.assertEqual([(p["place"], p["domestic"], p["source"]) for p in a["practices"]],
                         [("美國費城", False, "practice"), ("韓國首爾", False, "practice"),
                          (None, True, "dependency"), (None, True, "dependency")])
        dep = a["practices"][2]
        self.assertEqual(dep["name"], "現行的裁撤與復設做法")
        self.assertEqual(dep["content"]["tag"], "AI模擬")
        self.assertIsNone(dep["use"])
        # 「#8 解法 B」 in the 和 #8 無菸城市 row is not a solution of this issue.
        self.assertEqual([p["name"] for p in self.solution("E")["practices"]], ["家戶垃圾收運"])

    def test_solution_practices_in_other_issues(self):
        def load(folder):
            with open(os.path.join(self.out, "issues", f"{folder}.json"), encoding="utf-8") as f:
                return json.load(f)
        trees, policy = load("1-trees"), load("9-policydiscovery")
        a1 = [p for p in self.solution("A", trees)["practices"] if p["source"] == "practice"]
        self.assertEqual([p["place"] for p in a1], ["新加坡"] * 4 + ["臺灣臺北市", "美國紐約"])
        self.assertTrue(a1[4]["domestic"])
        # 「7.2、7.5 的相關法規」 names B and E.
        names = lambda code: [p["name"] for p in self.solution(code, trees)["practices"]]
        self.assertIn("樹木保護區（Tree Conservation Areas）", names("B"))
        self.assertIn("樹木保護區（Tree Conservation Areas）", names("E"))
        c9 = self.solution("C", policy)["practices"]
        self.assertEqual([(p["place"], p["domestic"]) for p in c9 if p["source"] == "practice"],
                         [("臺灣", True), ("臺灣", True), ("臺灣臺北市", True)])
        self.assertEqual(self.solution("E", policy)["practices"], [])

    def test_solution_fields_in_other_issues(self):
        with open(os.path.join(self.out, "issues", "1-trees.json"), encoding="utf-8") as f:
            trees = json.load(f)
        with open(os.path.join(self.out, "issues", "8-smokefree.json"), encoding="utf-8") as f:
            smoke = json.load(f)
        a1 = self.solution("A", trees)
        self.assertEqual(len(a1["ideas"]), 1)
        self.assertTrue(a1["ideas"][0]["idea"]["text"].startswith("可參考新加坡"))
        self.assertEqual(self.solution("E", trees)["overview"]["owner"]["text"], "公園處")
        for s in trees["solutions"] + smoke["solutions"]:
            self.assertEqual(len(s["detail"]), 7, s["id"])
            self.assertTrue(s["measures"], s["id"])
        self.assertEqual([s["ideas"] for s in smoke["solutions"]], [[]] * 5)
        b8 = self.solution("B", smoke)
        self.assertEqual(b8["detail"][1]["content"][0]["tag"], "AI模擬")
        self.assertEqual(self.solution("A", smoke)["detail"][1]["content"][0]["tag"], "實證")

    def test_pending_has_6_3_and_step_7(self):
        sections = [p["section"] for p in self.issue["pending"]]
        self.assertIn("6.3 成效衡量", sections)
        step7 = {"7.1 解法 A：清潔箱佈建建議地圖", "7.2 解法 B：滿溢回報與動態清運",
                 "7.3 解法 C：找桶指引與開放資料更新", "7.4 解法 D：參與式選址流程"}
        self.assertTrue(any(p["section"] in step7 and p["text"] == "【待補：法務確認】"
                            for p in self.issue["pending"]), self.issue["pending"])
        for p in self.issue["pending"]:
            self.assertRegex(p["text"], r"^【待補[^】]*】$")

    def test_pending_context(self):
        def ctx(text, section=None):
            items = [p for p in self.issue["pending"] if p["text"] == text
                     and (section is None or p["section"] == section)]
            self.assertTrue(items, text)
            return items[0]["context"]
        self.assertEqual(ctx("【待補：環保局稽查資料】"), "家用垃圾違規棄置件數（試點區）")
        self.assertEqual(ctx("【待補：法務確認】", "7.1 解法 A：清潔箱佈建建議地圖"), "相關法規")
        self.assertEqual(ctx("【待補：政策組安排】"), "訪談清潔隊與環保局")
        self.assertIsNone(ctx("【待補：環保局確認目前實際數量與兩份表的關係】"))
        for p in self.issue["pending"]:
            self.assertEqual(list(p), ["section", "text", "context"])

    def test_input_source_note_dash_is_null(self):
        shops = next(r for r in self.issue["inputSources"] if r["source"] == "商圈發展協會、便利商店門市")
        self.assertIsNone(shops["note"])
        self.assertEqual(self.issue["inputSources"][0]["note"], "題目原文整理自市民意見，不是單一利害關係人的話")

    def test_index_issue_list(self):
        issues = self.index["issues"]
        # #7 (自由題) has no topic, so it is not in issues.csv. #8 and #9 are extra issues.
        self.assertEqual([i["number"] for i in issues], [1, 2, 3, 4, 5, 6, 8, 9])
        available = [i["number"] for i in issues if i["available"]]
        self.assertTrue({1, 2} <= set(available))
        self.assertTrue({1, 2, 3, 4, 5} <= set(available))
        self.assertFalse({6} & set(available))
        six = issues[5]
        self.assertEqual((six["counts"], six["spaces"], six["updated"]), (None, [], None))
        # #9 uses no city space (「空間類型：無」), so its list is empty, but it is available.
        nine = issues[-1]
        self.assertEqual((nine["available"], nine["spaces"]), (True, []))

    def test_focus_groups(self):
        # The 1.3 特別關注族群檢查 table: all 6 groups, in the fixed order.
        none = lambda text: {"text": text, "tag": None, "pending": True}
        self.assertEqual(self.issue["focusGroups"], [
            {"tag": "高齡", "stakeholders": ["I05", "I11"], "note": None},
            {"tag": "身心障礙", "stakeholders": ["I06"], "note": None},
            {"tag": "呼吸道疾病", "stakeholders": [], "note": none("【待補：本議題是否需要納入過敏或呼吸道疾病者的觀點】")},
            {"tag": "兒童與照顧者", "stakeholders": ["I07"], "note": None},
            {"tag": "外籍", "stakeholders": ["I03", "I04"], "note": None},
            {"tag": "經濟弱勢", "stakeholders": ["I11"], "note": None},
        ])

    def test_focus_groups_in_other_issues(self):
        def load_issue(folder):
            with open(os.path.join(self.out, "issues", f"{folder}.json"), encoding="utf-8") as f:
                return json.load(f)
        trees, smoke = load_issue("1-trees"), load_issue("8-smokefree")
        self.assertEqual([(g["tag"], g["stakeholders"]) for g in trees["focusGroups"]],
                         [("高齡", ["I05"]), ("身心障礙", ["I06"]), ("呼吸道疾病", []),
                          ("兒童與照顧者", ["I07", "I16"]), ("外籍", []), ("經濟弱勢", ["I19"])])
        self.assertEqual(trees["focusGroups"][4]["note"]["text"], "【待補：本議題是否需要納入外籍人士的觀點】")
        self.assertEqual([(g["tag"], g["stakeholders"]) for g in smoke["focusGroups"]],
                         [("高齡", ["I05"]), ("身心障礙", ["I06"]), ("呼吸道疾病", ["I27"]),
                          ("兒童與照顧者", ["I07"]), ("外籍", ["I03"]), ("經濟弱勢", ["I19"])])
        # The 待補 items of the table are in the issue's pending list, with the group as context.
        self.assertIn({"section": "1.3 特別關注族群檢查", "text": "【待補：本議題是否需要納入外籍人士的觀點】",
                       "context": "外籍"}, trees["pending"])

    def test_index_focus_gaps(self):
        # focusGaps: the groups with no stakeholder, in the fixed order. null for an issue without an analysis.
        gaps = {i["number"]: i["focusGaps"] for i in self.index["issues"]}
        self.assertEqual(gaps, {1: ["呼吸道疾病", "外籍"], 2: ["呼吸道疾病"], 3: [], 4: ["經濟弱勢"],
                                5: ["呼吸道疾病"], 6: None, 8: [], 9: []})

    def test_index_issue_source(self):
        # 來源 in issues.csv becomes "source": 主辦單位 for the host's issues,
        # 參加者補充 for an issue a participant added.
        source = {i["number"]: i["source"] for i in self.index["issues"]}
        self.assertEqual(source, {1: "主辦單位", 2: "主辦單位", 3: "主辦單位", 4: "主辦單位",
                                  5: "主辦單位", 6: "主辦單位", 8: "參加者補充", 9: "參加者補充"})

    def test_moved_and_active_stakeholders(self):
        by_id = {s["id"]: s for s in self.index["stakeholders"]}
        self.assertEqual(by_id["O02"]["movedTo"], "I12")
        self.assertEqual(by_id["O02"]["issues"], [])
        for sid, issues in (("I12", [2]), ("I13", [1, 2, 3])):
            self.assertIsNone(by_id[sid]["movedTo"])
            self.assertEqual(by_id[sid]["issues"], issues)
        self.assertEqual(by_id["I11"]["focus"], ["高齡", "經濟弱勢"])
        self.assertEqual(by_id["O01"]["focus"], [])
        self.assertEqual(by_id["I06"]["path"], "mov")

    def test_index_shared_lists(self):
        self.assertEqual(self.index["pathLabels"]["gov"], "政府")
        codes = [s["code"] for s in self.index["spaceTypes"]]
        self.assertEqual(len(codes), 13)
        self.assertEqual(self.index["spaceTypes"][0]["name"], "人行道")

    def test_story_shape(self):
        self.assertEqual(self.story("I06-US01"), {
            "id": "I06-US01", "stakeholder": "I06",
            "want": {"text": "清潔箱不要擋住人行道與導盲磚", "tag": "AI模擬", "pending": False},
            "group": "W08",
            "soThat": {"text": "安全通行，不會撞到", "tag": "AI模擬", "pending": False},
            "source": "可詢問身障團體", "priority": "M", "priorityTag": "AI模擬", "needGroup": "N07"})
        o0402 = self.story("O01-US02")
        self.assertIsNone(o0402["group"])
        self.assertIsNone(o0402["source"])

    # ---------- the needs-based format (#1, #2 and #8) ----------
    def test_format(self):
        self.assertEqual(self.issue["format"], "needs")
        for folder in ("1-trees", "8-smokefree"):
            with open(os.path.join(self.out, "issues", f"{folder}.json"), encoding="utf-8") as f:
                other = json.load(f)
            self.assertEqual(other["format"], "needs", folder)
            self.assertTrue(other["needGroups"] and other["needs"], folder)

    def test_need_groups(self):
        groups = self.issue["needGroups"]
        self.assertEqual([g["id"] for g in groups], [f"N{n:02d}" for n in range(1, 11)])
        n07 = next(g for g in groups if g["id"] == "N07")
        self.assertEqual(n07, {"id": "N07", "summary": "在人行道上安全通行", "tag": "AI模擬",
                               "stories": ["I06-US01", "I07-US02"]})
        for g in groups:
            self.assertGreaterEqual(len(g["stories"]), 2)

    def test_needs_have_one_priority_each(self):
        needs = self.issue["needs"]
        ids = [n["id"] for n in needs]
        self.assertEqual(len(ids), len(set(ids)))
        # Every story is in exactly one need.
        stories = [s for n in needs for s in n["stories"]]
        self.assertEqual(sorted(stories), sorted(s["id"] for s in self.issue["stories"]))
        n01 = next(n for n in needs if n["id"] == "N01")
        self.assertEqual((n01["kind"], n01["priority"], n01["priorityTag"]), ("group", "M", "AI模擬"))
        solo = next(n for n in needs if n["id"] == "O09-US01")
        self.assertEqual((solo["kind"], solo["stories"], solo["priority"]), ("story", ["O09-US01"], "W"))
        self.assertEqual(solo["reason"]["tag"], "AI模擬")
        self.assertEqual(list(n01), ["id", "kind", "summary", "stories", "priority", "priorityTag", "reason"])

    def test_story_priority_is_the_need_priority(self):
        by_need = {n["id"]: n for n in self.issue["needs"]}
        for s in self.issue["stories"]:
            self.assertEqual(s["priority"], by_need[s["needGroup"] or s["id"]]["priority"], s["id"])
        self.assertEqual(self.story("I01-US03")["priority"], "M")  # N01

    def test_solution_needs_and_stories(self):
        a = self.solution("A")
        self.assertEqual(a["needs"], {"must": ["N01", "N04", "N05", "N07", "O04-US02", "O12-US01"],
                                      "shouldCould": ["N02", "O04-US04", "I01-US09"]})
        # stories: the stories whose need the solution covers (the old field).
        n07 = next(g for g in self.issue["needGroups"] if g["id"] == "N07")
        for sid in n07["stories"] + ["O04-US02", "I01-US09"]:
            self.assertIn(sid, a["stories"])
        self.assertEqual(len(a["stories"]), len(set(a["stories"])))
        e = self.solution("E")
        self.assertEqual(e["needs"]["shouldCould"], [])

    def test_conflict_way_out(self):
        c = {x["id"]: x for x in self.issue["conflicts"]}
        self.assertEqual(c["C1"]["wayOutSolutions"], ["A", "B", "D"])
        self.assertEqual((c["C1"]["needsA"], c["C1"]["needsB"]), (["N01"], ["N06"]))
        self.assertEqual(c["C3"]["wayOutSolutions"], [])
        self.assertTrue(c["C3"]["wayOut"]["text"].startswith("未找到"))
        self.assertEqual(c["C3"]["method"]["tag"], "AI模擬")
        self.assertEqual(list(c["C1"]), ["id", "text", "sideA", "sideB", "method", "result",
                                         "needsA", "needsB", "wayOut", "wayOutSolutions"])

    def test_pending_cell(self):
        so = self.story("O04-US04")["soThat"]
        self.assertEqual(so, {"text": "【待補：題目原文沒有說明理由，需環保局確認】", "tag": None, "pending": True})
        evidence = [s["id"] for s in self.issue["stories"] if s["want"]["tag"] == "實證"]
        self.assertEqual(len(evidence), 8)

    def test_groups(self):
        w08 = next(g for g in self.issue["groups"] if g["id"] == "W08")
        self.assertEqual(w08, {"id": "W08", "summary": "清潔箱不擋住人行道", "tag": "AI模擬",
                               "stories": ["O12-US01", "I06-US01", "I07-US02"]})

    def test_stakeholders_and_input_sources(self):
        first = self.issue["stakeholders"][0]
        self.assertEqual(first["id"], "O01")
        self.assertEqual(first["relation"]["tag"], "AI模擬")
        src = self.issue["inputSources"][0]
        self.assertTrue(src["source"].startswith("黑客松題目原文（[題目 #2]("))
        self.assertEqual(src["stakeholders"], ["O03", "O04", "I01", "O01", "I09"])
        self.assertEqual(src["fit"]["tag"], "AI模擬")
        self.assertEqual(len(self.issue["inputSources"]), 12)

    def test_stakeholder_added_date(self):
        # 新增日期 in stakeholders.csv becomes "added" (YYYY-MM-DD), also for moved IDs.
        by_id = {s["id"]: s for s in self.index["stakeholders"]}
        self.assertEqual(by_id["O01"]["added"], "2026-10-18")
        self.assertEqual(by_id["O02"]["added"], "2026-10-18")
        for s in self.index["stakeholders"]:
            self.assertRegex(s["added"], r"^\d{4}-\d\d-\d\d$")
            self.assertEqual(list(s), ["id", "name", "path", "focus", "issues", "movedTo", "added", "updated"])

    def test_solution_added_date(self):
        # 新增日期 in 6.1 becomes "added".
        added = {s["id"]: s["added"] for s in self.issue["solutions"]}
        self.assertEqual(added, {"A": "2026-10-16", "B": "2026-10-16", "C": "2026-10-16",
                                 "D": "2026-10-16", "E": "2026-10-18"})

    def test_open_data(self):
        # open-data.csv becomes "openData" in index.json, in file order.
        rows = self.index["openData"]
        self.assertEqual(len(rows), 21)
        smoke = next(r for r in rows if r["url"] == "https://data.gov.tw/dataset/177504")
        self.assertEqual(smoke, {"name": "臺北市指定吸菸區", "url": "https://data.gov.tw/dataset/177504",
                                 "agency": "臺北市政府衛生局", "license": "政府資料開放授權條款第 1 版",
                                 "issues": [8]})
        petition = next(r for r in rows if "cb423c17" in r["url"])
        self.assertEqual(petition["issues"], [2, 3, 4, 5, 8])

    def test_updated_is_date_or_null(self):
        for i in [self.issue] + self.index["issues"]:
            u = i["updated"]
            self.assertTrue(u is None or re.fullmatch(r"\d{4}-\d\d-\d\d", u), u)


    # ---------- 分析摘要 ----------

    def summary_item(self, topic, item):
        t = next(x for x in self.issue["summary"] if x["topic"] == topic)
        return next(i for i in t["items"] if i["item"] == item)

    def test_summary_topics_in_fixed_order(self):
        self.assertEqual([t["topic"] for t in self.issue["summary"]],
                         ["難以取捨的決定", "可能的爭議", "受影響較大的弱勢族群", "法規上的障礙", "相依事項與現行政策的關係"])
        for t in self.issue["summary"]:
            self.assertEqual(list(t), ["topic", "items"])
            self.assertTrue(t["items"])
            for i in t["items"]:
                self.assertEqual(list(i), ["item", "text", "refs"])

    def test_summary_item(self):
        self.assertEqual(self.summary_item("可能的爭議", "選址討論的速度與代表性"), {
            "item": "選址討論的速度與代表性",
            "text": {"text": "解法 D 的里民討論會讓設置變慢；常出席的人聲音比較大；討論結果如果不被採用，可能傷害信任。",
                     "tag": "AI模擬", "pending": False},
            "refs": ["解法 D", "N05", "O05-US01"]})

    def test_summary_pending_row(self):
        item = self.summary_item("受影響較大的弱勢族群", "呼吸道疾病（尚未納入）")
        self.assertEqual(item["text"], {"text": "【待補：本議題是否需要納入過敏或呼吸道疾病者的觀點】",
                                        "tag": None, "pending": True})
        self.assertEqual(item["refs"], [])

    def test_summary_cross_refs_stay_as_written(self):
        item = self.summary_item("相依事項與現行政策的關係", "和 #1、#8 共用人行道")
        self.assertEqual(item["refs"], ["C6", "#1 C7", "#8 C3"])

    def test_summary_pending_item_not_listed_twice(self):
        # The summary repeats the 1.3 item. The 待補 list keeps one copy, under 1.3.
        text = "【待補：本議題是否需要納入過敏或呼吸道疾病者的觀點】"
        found = [p for p in self.issue["pending"] if p["text"] == text]
        self.assertEqual([p["section"] for p in found], ["1.3 特別關注族群檢查"])

class BuildJsonOldFormatTest(unittest.TestCase):
    """Build with the old-format fixture in place of #8 and look at its JSON."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.dir = make_copy(cls._tmp.name)
        use_old_format(cls.dir)
        out = os.path.join(cls._tmp.name, "out")
        code, output = run_build(cls.dir, out)
        if code != 0:
            raise AssertionError(f"build failed ({code}): {output}")
        with open(os.path.join(out, "issues", "8-smokefree.json"), encoding="utf-8") as f:
            cls.old = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_format(self):
        old = self.old
        self.assertEqual(old["format"], "stories")
        self.assertEqual((old["needGroups"], old["needs"]), ([], []))
        self.assertTrue(all(s["needGroup"] is None for s in old["stories"]))
        self.assertTrue(all(s["needs"] is None for s in old["solutions"]))
        self.assertTrue(all(c["wayOut"] is None and c["wayOutSolutions"] == [] for c in old["conflicts"]))


class BuildJsonUnitTest(unittest.TestCase):
    def setUp(self):
        self.mod = load_module()

    def test_cell_with_tag(self):
        self.assertEqual(self.mod.parse_cell("`[AI模擬]` 文字"), {"text": "文字", "tag": "AI模擬", "pending": False})
        self.assertEqual(self.mod.parse_cell("`[實證]` 文字"), {"text": "文字", "tag": "實證", "pending": False})
        self.assertEqual(self.mod.parse_cell("`[AI整理]` 文字"), {"text": "文字", "tag": "AI整理", "pending": False})

    def test_cell_pending(self):
        self.assertEqual(self.mod.parse_cell("【待補】"), {"text": "【待補】", "tag": None, "pending": True})

    def test_cell_with_two_tags_is_an_error(self):
        # Only step 7 cells may hold more than one tag; they use parse_parts.
        with self.assertRaises(ValueError):
            self.mod.parse_cell("`[實證]` 官方資料 `[AI模擬]` 推想")

    def test_parts_of_a_mixed_step_7_cell(self):
        # Each part starts with its own tag (ETBlue, 2026-10-22).
        self.assertEqual(
            self.mod.parse_parts("`[AI模擬]` 推想。 `[實證]` 官方資料（見附錄）【待補：查證】； `[AI整理]` 新聞報導指出…，需真人查證"),
            [{"text": "推想。", "tag": "AI模擬", "pending": False},
             {"text": "官方資料（見附錄）【待補：查證】；", "tag": "實證", "pending": False},
             {"text": "新聞報導指出…，需真人查證", "tag": "AI整理", "pending": False}])

    def test_parts_of_a_cell_with_one_tag(self):
        # One tag, or none: a list of one Cell, the same as parse_cell.
        self.assertEqual(self.mod.parse_parts("`[AI模擬]` 文字"), [{"text": "文字", "tag": "AI模擬", "pending": False}])
        self.assertEqual(self.mod.parse_parts("【待補：法務確認】"),
                         [{"text": "【待補：法務確認】", "tag": None, "pending": True}])

    def test_parts_need_a_tag_first_and_text_after_each_tag(self):
        for s in ("前言 `[實證]` 官方 `[AI模擬]` 推想", "`[實證]` 官方 `[AI模擬]`", "`[實證]` `[AI模擬]` 推想"):
            with self.subTest(s=s), self.assertRaises(ValueError):
                self.mod.parse_parts(s)

    def test_cell_basis_counts_want_and_so_that(self):
        def c(tag):
            return {"text": "x", "tag": tag, "pending": tag is None}
        stories = [
            {"want": c("實證"), "soThat": c("AI模擬"), "priorityTag": "實證"},
            {"want": c("AI整理"), "soThat": c(None), "priorityTag": "AI整理"},
            {"want": c("AI模擬"), "soThat": c("AI整理"), "priorityTag": "AI模擬"},
        ]
        # The priority tag is not counted.
        self.assertEqual(self.mod.cell_basis(stories),
                         {"evidence": 1, "aiSummary": 2, "aiSimulated": 2, "pending": 1})

    def test_cell_basis_keeps_fixed_order_and_zeros(self):
        self.assertEqual(list(self.mod.cell_basis([]).items()),
                         [("evidence", 0), ("aiSummary", 0), ("aiSimulated", 0), ("pending", 0)])

    def test_git_date_of_real_folder(self):
        u = self.mod.git_updated(os.path.join(ANALYSIS, ISSUE))
        self.assertRegex(u, r"^\d{4}-\d\d-\d\d$")

    def test_git_date_outside_repo_is_null(self):
        with tempfile.TemporaryDirectory() as t:
            self.assertIsNone(self.mod.git_updated(t))


class BuildJsonErrorTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = make_copy(self._tmp.name)
        self.out = os.path.join(self._tmp.name, "out")

    def tearDown(self):
        self._tmp.cleanup()

    def edit(self, old, new, rel=None):
        """Replace one exact piece of text in a copied file (default: the issue file)."""
        path = os.path.join(self.dir, rel or os.path.join(ISSUE, "issue-analysis.md"))
        enc = "utf-8-sig" if path.endswith(".csv") else "utf-8"
        with open(path, encoding=enc) as f:
            text = f.read()
        self.assertEqual(text.count(old), 1, f"{old!r} must occur once")
        with open(path, "w", encoding=enc, newline="") as f:
            f.write(text.replace(old, new))

    def assertFails(self, *needles):
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertNotIn("Traceback", out)
        for n in needles:
            self.assertIn(n, out)
        self.assertFalse(os.path.exists(os.path.join(self.out, "index.json")))

    # ---------- 6.1 practice tables ----------
    PRACTICE = "| 美國紐約：新設計的清潔箱（Better Bin） |"

    def test_practice_without_place(self):
        self.edit(self.PRACTICE, "| 新設計的清潔箱（Better Bin） |")
        self.assertFails("2-trashcans: 6.1:", "「新設計的清潔箱（Better Bin）」", "must start with its place")

    def test_practice_unknown_solution(self):
        self.edit("| `[AI模擬]` 解法 B 在被丟家用垃圾的點", "| `[AI模擬]` 解法 Z 在被丟家用垃圾的點")
        self.assertFails("2-trashcans: 6.1:", "解法 Z is not in 6.1")

    def test_practice_step7_section_of_no_solution(self):
        self.edit("（N04、7.2）", "（N04、7.6）")
        self.assertFails("2-trashcans: 6.1:", "7.6 is not a step 7 section of a solution")

    # ---------- 分析摘要 ----------
    SUMMARY_ROW = ("| 選址討論的速度與代表性 | `[AI模擬]` 解法 D 的里民討論會讓設置變慢；常出席的人聲音比較大；"
                   "討論結果如果不被採用，可能傷害信任。 | 解法 D、N05、O05-US01 |")

    def test_summary_missing(self):
        self.edit("## 分析摘要\n", "## 摘要\n")
        self.assertFails("2-trashcans: 分析摘要:", "no heading")

    def test_summary_topics_out_of_order(self):
        self.edit("### 難以取捨的決定\n", "### TMP\n")
        self.edit("### 可能的爭議\n", "### 難以取捨的決定\n")
        self.edit("### TMP\n", "### 可能的爭議\n")
        self.assertFails("2-trashcans: 分析摘要:", "難以取捨的決定、可能的爭議")

    def test_summary_unknown_local_ref(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("解法 D、N05", "C99、N05"))
        self.assertFails("2-trashcans: 分析摘要:", "選址討論的速度與代表性", "C99")

    def test_summary_bad_ref(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("解法 D、N05", "解法 D，N05"))
        self.assertFails("2-trashcans: 分析摘要:", "選址討論的速度與代表性", "is not a reference")

    def test_summary_cross_ref_not_in_other_issue(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("解法 D、N05", "#8 解法 Z、N05"))
        self.assertFails("2-trashcans: 分析摘要:", "#8 解法 Z")

    def test_summary_row_without_tag(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("`[AI模擬]` ", ""))
        self.assertFails("2-trashcans: 分析摘要:", "選址討論的速度與代表性", "tag")

    FOCUS_FOREIGN = "| 外籍 | I03、I04 | — |"

    def test_focus_section_missing(self):
        self.edit("### 1.3 特別關注族群檢查", "### 1.3 其他")
        self.assertFails("2-trashcans: 特別關注族群檢查:", "no heading")

    def test_focus_groups_out_of_order(self):
        self.edit("| 高齡 | I05、I11 | — |\n| 身心障礙 | I06 | — |", "| 身心障礙 | I06 | — |\n| 高齡 | I05、I11 | — |")
        self.assertFails("2-trashcans: 特別關注族群檢查:", "高齡")

    def test_focus_id_not_in_step_1(self):
        self.edit(self.FOCUS_FOREIGN, "| 外籍 | I03、I04、I19 | — |")
        self.assertFails("2-trashcans: 特別關注族群檢查:", "I19")

    def test_focus_id_without_that_tag_in_stakeholders_csv(self):
        self.edit(self.FOCUS_FOREIGN, "| 外籍 | I01、I03、I04 | — |")
        self.assertFails("2-trashcans: 特別關注族群檢查:", "I01")

    def test_focus_missing_id(self):
        self.edit(self.FOCUS_FOREIGN, "| 外籍 | I03 | — |")
        self.assertFails("2-trashcans: 特別關注族群檢查:", "I04")

    def test_moved_id_without_space(self):
        self.edit("已改為 I12", "已改為I 12", "data/stakeholders.csv")
        self.assertFails("stakeholders.csv: O02:")

    def test_unknown_story_in_group(self):
        self.edit("| O12-US01、I06-US01、I07-US02 |", "| O12-US09、I06-US01、I07-US02 |")
        self.assertFails("2-trashcans: 相同訴求群組:", "O12-US09")

    def test_story_group_without_group_row(self):
        self.edit("| W08 | `[AI模擬]` 安全通行，不會撞到 |", "| W99 | `[AI模擬]` 安全通行，不會撞到 |")
        self.assertFails("2-trashcans: 步驟 4:", "W99")

    def test_duplicate_story_id(self):
        self.edit("| I13-US02 | 清潔隊員 |", "| I13-US01 | 清潔隊員 |")
        self.assertFails("2-trashcans: 步驟 4:", "I13-US01", "twice")

    def test_missing_6_2_row(self):
        path = os.path.join(self.dir, ISSUE, "issue-analysis.md")
        with open(path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        kept = [l for l in lines if not l.startswith("| D | 參與式選址流程 |")]
        self.assertEqual(len(kept), len(lines) - 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(kept))
        self.assertFails("2-trashcans: 6.2:", "D")

    def test_6_2_code_not_in_6_1(self):
        self.edit("| D | 參與式選址流程 |", "| F | 參與式選址流程 |")
        self.assertFails("2-trashcans: 6.2:", "「F」 is not in 6.1")

    def test_6_2_code_must_be_one_letter(self):
        self.edit("| D | 參與式選址流程 |", "| D 參與式選址流程 | 參與式選址流程 |")
        self.assertFails("2-trashcans: 6.2:", "bad solution code")

    def test_unknown_space_code_in_title_line(self):
        self.edit("`park`、`mrt-exit`\n", "`park`、`mrt-exit`、`moon`\n")
        self.assertFails("2-trashcans: 空間類型:", "moon")

    def test_unknown_space_code_in_solution(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` |",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`moon` |")
        self.assertFails("2-trashcans: 6.1:", "moon")

    def make_no_space(self):
        """Turn the copied #2 into an issue with no city space (「空間類型：無」, 「—」 in 6.1)."""
        path = os.path.join(self.dir, ISSUE, "issue-analysis.md")
        with open(path, encoding="utf-8") as f:
            text = f.read()
        text = text.replace("空間類型：`sidewalk`、`arcade`、`park`、`mrt-exit`\n", "空間類型：無\n", 1)
        sec = text.split("### 6.1", 1)[1].split("### 6.2", 1)[0]
        new_sec = re.sub(r"^(\| [A-Z] \| [^|]+ \| )`[^|]+` \|", r"\1— |", sec, flags=re.M)
        self.assertEqual(new_sec.count("| — |"), 5)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(sec, new_sec))

    def test_no_space_issue_gives_empty_lists(self):
        self.make_no_space()
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 0, out)
        with open(os.path.join(self.out, "index.json"), encoding="utf-8") as f:
            item = next(i for i in json.load(f)["issues"] if i["folder"] == ISSUE)
        with open(os.path.join(self.out, "issues", f"{ISSUE}.json"), encoding="utf-8") as f:
            issue = json.load(f)
        self.assertEqual(item["spaces"], [])
        self.assertEqual(issue["spaces"], [])
        self.assertEqual([s["spaces"] for s in issue["solutions"]], [[]] * 5)

    def test_no_space_issue_with_solution_space_fails(self):
        self.make_no_space()
        self.edit("| D | `[AI模擬]` 參與式選址流程 | — |", "| D | `[AI模擬]` 參與式選址流程 | `park` |")
        self.assertFails("2-trashcans: 6.1:", "solution D", "無")

    def test_dash_solution_space_in_issue_with_spaces_fails(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` |", "| D | `[AI模擬]` 參與式選址流程 | — |")
        self.assertFails("2-trashcans: 6.1:", "solution D", "無")

    def test_two_tables_with_step_4_header(self):
        self.edit("\n### 相同訴求群組\n",
                  "\n| 故事編號 | 身為… | 我想要… | 相同訴求編號 | 以便… | 相同需求編號 | 來源 | 優先順序 |\n"
                  "|---|---|---|---|---|---|---|---|\n\n### 相同訴求群組\n")
        self.assertFails("2-trashcans: 步驟 4:", "2 tables")

    def test_cell_with_two_tags(self):
        self.edit("| `[AI模擬]` 安全通行，不會撞到 |", "| `[AI模擬]` `[實證]` 安全通行，不會撞到 |")
        self.assertFails("2-trashcans: 步驟 4:", "I06-US01")

    def test_heading_prefix_needs_space(self):
        self.edit("### 6.1 候選解法", "### 6.10 候選解法")
        self.assertFails("2-trashcans: 6.1:")

    def test_unknown_issue_source(self):
        self.edit("8,8-smokefree,無菸城市,參加者補充", "8,8-smokefree,無菸城市,其他", "data/issues.csv")
        self.assertFails("issues.csv: row 8:", "來源", "其他")

    def test_missing_issue_source_column(self):
        self.edit("編號,資料夾,題目,來源", "編號,資料夾,題目,出處", "data/issues.csv")
        self.assertFails("issues.csv: header: no column 來源")

    def test_bad_issue_value_in_csv(self):
        self.edit("I05,高齡者,res,高齡,1 2 3 4 5 8 9,", "I05,高齡者,res,高齡,1、2、3、4、5、8、9,", "data/stakeholders.csv")
        self.assertFails("stakeholders.csv: I05:")

    def test_bad_stakeholder_date(self):
        self.edit("I05,高齡者,res,高齡,1 2 3 4 5 8 9,,2026-10-18", "I05,高齡者,res,高齡,1 2 3 4 5 8 9,,2026/10/18", "data/stakeholders.csv")
        self.assertFails("stakeholders.csv: I05:", "新增日期")

    def test_missing_stakeholder_date_column(self):
        self.edit("議題,備註,新增日期", "議題,備註,日期", "data/stakeholders.csv")
        self.assertFails("stakeholders.csv: header: no column 新增日期")

    def test_bad_solution_date(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` | 2026-10-16 |",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` | 10/16 |")
        self.assertFails("2-trashcans: 6.1:", "solution D", "新增日期")

    def test_open_data_bad_issue_value(self):
        self.edit("臺北市政府衛生局,政府資料開放授權條款第 1 版,8\n", "臺北市政府衛生局,政府資料開放授權條款第 1 版,8、2\n", "data/open-data.csv")
        self.assertFails("open-data.csv:", "議題")

    def test_open_data_missing_file(self):
        os.remove(os.path.join(self.dir, "data", "open-data.csv"))
        self.assertFails("open-data.csv")

    def test_missing_csv_file(self):
        os.remove(os.path.join(self.dir, "data", "space-types.csv"))
        self.assertFails("space-types.csv")

    def test_broken_conflict_row(self):
        self.edit("`[AI模擬]` I11-US01 vs I09-US01", "`[AI模擬]` I11-US01、I09-US01")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-trashcans: 6.4", out)
        self.assertIn("C7", out)
        self.assertFalse(os.path.exists(os.path.join(self.out, "index.json")))

    def test_cross_issue_reference_in_conflict(self):
        # 6.4 相關故事 holds stories of this issue only.
        self.edit("`[AI模擬]` I11-US01 vs I09-US01", "`[AI模擬]` I11-US01 vs I09-US01、#1 I06-US02")
        self.assertFails("2-trashcans: 6.4", "C7", "#1 I06-US02")

    def test_cross_issue_reference_in_old_format_conflict(self):
        # In the old format (the fixture in place of #8), the conflicts are in 5.4.
        use_old_format(self.dir)
        path = os.path.join(self.dir, "8-smokefree", "issue-analysis.md")
        with open(path, encoding="utf-8") as f:
            text = f.read()
        m = re.search(r"^\| C1 \| .*? \| `\[AI模擬\]` ([OI]\d\d-US\d\d)", text, re.M)
        self.assertIsNotNone(m)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text[:m.start(1)] + "#1 I06-US02、" + text[m.start(1):])
        self.assertFails("8-smokefree: 5.4", "C1", "#1 I06-US02")

    def test_cross_issue_reference_in_group(self):
        self.edit("| O12-US01、I06-US01、I07-US02 |", "| O12-US01、I06-US01、I07-US02、#1 I06-US02 |")
        self.assertFails("2-trashcans: 相同訴求群組", "#1 I06-US02")

    def test_cross_issue_reference_in_6_2(self):
        self.edit("| D | 參與式選址流程 | `[AI模擬]` N04", "| D | 參與式選址流程 | `[AI模擬]` #1 O01-US01、N04")
        self.assertFails("2-trashcans: 6.2", "#1 O01-US01")

    def test_missing_section(self):
        self.edit("### 6.2 解法與需求對照", "### 解法與需求對照")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-trashcans: 6.2", out)

    def test_bad_priority_cell(self):
        self.edit("；也可用短問卷或站外現場觀察驗證 | `[AI模擬]` M |", "；也可用短問卷或站外現場觀察驗證 | M |")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-trashcans: 步驟 4", out)
        self.assertIn("I01-US01", out)

    def test_6_3_codes_with_comma(self):
        # Codes in a 6.3 解法 cell are separated by 「、」, the same as other lists.
        self.edit("| A、D | 家用垃圾違規棄置件數（試點區） |", "| A, D | 家用垃圾違規棄置件數（試點區） |")
        self.assertFails("2-trashcans: 6.3:", "「A, D」", "separated by 「、」")

    def test_6_3_code_not_in_6_1(self):
        self.edit("| E | 試辦收集點的數量與每日使用量 |", "| F | 試辦收集點的數量與每日使用量 |")
        self.assertFails("2-trashcans: 6.3:", "F", "not in 6.1")

    def test_missing_step_7_section(self):
        self.edit("### 7.4 解法 D：參與式選址流程", "### 7.4 參與式選址流程")
        self.assertFails("2-trashcans: 步驟 7:", "solution D", "7.n 解法 D")

    def test_step_7_section_for_unknown_code(self):
        self.edit("### 7.4 解法 D：參與式選址流程", "### 7.4 解法 F：參與式選址流程")
        self.assertFails("2-trashcans: 步驟 7:", "F")

    def test_missing_overview_row(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | 中 | 中 | 流程變慢、代表性不足 | 環保局、民政局 |\n", "")
        self.assertFails("2-trashcans: 總覽:", "solution D has no row")

    def test_overview_row_with_unknown_code(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | 中 | 中 |", "| F | `[AI模擬]` 參與式選址流程 | 中 | 中 |")
        self.assertFails("2-trashcans: 總覽:", "代號 「F」 is not a solution code from 6.1")

    def test_overview_row_with_tag_in_code_cell(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | 中 | 中 |", "| `[AI模擬]` D | 參與式選址流程 | 中 | 中 |")
        self.assertFails("2-trashcans: 總覽:", "is not a solution code from 6.1")

    def test_overview_old_header(self):
        self.edit("| 代號 | 解法 | 成本 | 可行性 | 主要風險 | 主責單位 |\n|---|---|---|---|---|---|",
                  "| 解法 | 成本 | 可行性 | 主要風險 | 主責單位 |\n|---|---|---|---|---|")
        self.assertFails("2-trashcans: 總覽")

    def test_idea_names_unknown_solution(self):
        self.edit("| `[AI模擬]` 併入解法 B，作為可選的試點項目", "| `[AI模擬]` 併入解法 F，作為可選的試點項目")
        self.assertFails("2-trashcans: 6.1:", "F")

    def test_stale_issue_file_is_removed(self):
        os.makedirs(os.path.join(self.out, "issues"))
        stale = os.path.join(self.out, "issues", "9-old.json")
        with open(stale, "w") as f:
            f.write("{}")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 0, out)
        self.assertFalse(os.path.exists(stale))
        self.assertTrue(os.path.exists(os.path.join(self.out, "issues", f"{ISSUE}.json")))


    def test_ai_summary_tag(self):
        # [AI整理] is the third source tag. JSON writes it without brackets.
        row = ("| O01-US01 | 商圈店家與攤商 | `[AI模擬]` 商圈有足夠的清潔箱 | — | "
               "`[AI模擬]` 店門口與花台保持乾淨，不必替客人收拾垃圾 | N02 | 可詢問商圈發展協會；市民留言約 118 則提到同樣訴求"
               "（「市長，你給我聽好了」資料，關鍵字估算） | `[AI模擬]` S |")
        self.edit(row, row.replace("[AI模擬]", "[AI整理]"))
        self.edit("| `[AI模擬]` W01 |", "| `[AI整理]` W01 |")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 0, out)
        with open(os.path.join(self.out, "issues", f"{ISSUE}.json"), encoding="utf-8") as f:
            issue = json.load(f)
        with open(os.path.join(self.out, "index.json"), encoding="utf-8") as f:
            index = json.load(f)
        s = next(x for x in issue["stories"] if x["id"] == "O01-US01")
        self.assertEqual(s["want"], {"text": "商圈有足夠的清潔箱", "tag": "AI整理", "pending": False})
        self.assertEqual(s["soThat"]["tag"], "AI整理")
        self.assertEqual(s["priorityTag"], "AI整理")
        self.assertEqual(next(g for g in issue["groups"] if g["id"] == "W01")["tag"], "AI整理")
        counts = next(i for i in index["issues"] if i["number"] == 2)["counts"]
        # O01-US01 had AI模擬 in both cells. Now both are AI整理.
        self.assertEqual(counts["cells"], {"evidence": 9, "aiSummary": 26, "aiSimulated": 70, "pending": 1})

    # ---------- the needs-based format ----------
    def test_story_priority_differs_from_need(self):
        self.edit("（關鍵字估算） | `[AI模擬]` M |\n| I01-US04 |", "（關鍵字估算） | `[AI模擬]` S |\n| I01-US04 |")
        self.assertFails("2-trashcans: 步驟 4:", "I01-US03", "N01")

    def test_need_group_with_one_story(self):
        self.edit("| `[AI模擬]` 安全通行，不會撞到 | N07 |", "| `[AI模擬]` 安全通行，不會撞到 | N11 |")
        self.assertFails("2-trashcans:", "N11")

    def test_6_2_unknown_need(self):
        self.edit("| C | 找桶指引與開放資料 | `[AI模擬]` N01 |", "| C | 找桶指引與開放資料 | `[AI模擬]` N01、N99 |")
        self.assertFails("2-trashcans: 6.2:", "N99")

    def test_way_out_without_code_or_not_found(self):
        self.edit("| `[AI模擬]` 未找到：本文件的解法沒有處理源頭減量", "| `[AI模擬]` 本文件的解法沒有處理源頭減量")
        self.assertFails("2-trashcans: 6.4:", "C3", "未找到")

    def test_conflict_need_not_in_5_2(self):
        self.edit("| N01 vs O08-US02 |", "| N01 vs N99 |")
        self.assertFails("2-trashcans: 6.4:", "C3", "N99")

    def test_cell_with_ai_summary_and_another_tag(self):
        self.edit("| `[AI模擬]` 安全通行，不會撞到 |", "| `[AI模擬]` `[AI整理]` 安全通行，不會撞到 |")
        self.assertFails("2-trashcans: 步驟 4:", "I06-US01")


if __name__ == "__main__":
    unittest.main()
