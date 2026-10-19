"""Tests for analysis/build_json.py.

The tests copy every issue folder that has an issue-analysis.md, and the
shared files, into a temp dir and run the
script there as a subprocess. Every copied file comes from the last commit
(git archive HEAD), not from the working tree. Another agent may edit the
shared CSV files or the issue files at the same time; their edits that are
not committed yet must not change the results of these tests.
Run from the repo root: python3 -I -m unittest discover -s analysis/tests -t .
"""
import importlib.util, json, os, re, subprocess, sys, tempfile, unittest

ANALYSIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ANALYSIS)
SCRIPT = os.path.join(ANALYSIS, "build_json.py")
SHARED = ("issues.csv", "stakeholders.csv", "path-labels.csv", "space-types.csv", "open-data.csv")
ISSUE = "2-trashcans"


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
        self.assertEqual(len(self.issue["stories"]), 52)
        self.assertEqual(len(self.issue["conflicts"]), 9)
        self.assertEqual(len(self.issue["solutions"]), 5)
        self.assertEqual(len(self.issue["groups"]), 11)
        self.assertEqual(len(self.issue["stakeholders"]), 27)

    def test_index_counts(self):
        item = next(i for i in self.index["issues"] if i["number"] == 2)
        # cells: want + soThat. 實證 7+3, AI整理 11+10, AI模擬 34+38, 待補 0+1.
        self.assertEqual(item["counts"], {"stakeholdersO": 12, "stakeholdersI": 15, "stories": 52,
                                          "conflicts": 9, "solutions": 5,
                                          "cells": {"evidence": 10, "aiSummary": 21, "aiSimulated": 72,
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
                         ["需要的資料／API", "相關法規", "隱私", "其他顧慮", "主責單位", "成本／可行性／風險"])
        self.assertEqual(a["detail"][4]["content"],
                         {"text": "環保局（環境清潔管理科）；協作：資訊局、工務局新工處、交通局",
                          "tag": "AI模擬", "pending": False})

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
                         ["id", "name", "summary", "spaces", "added", "stories",
                          "measures", "detail", "overview", "ideas", "pending"])

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
            self.assertEqual(len(s["detail"]), 6, s["id"])
            self.assertTrue(s["measures"], s["id"])
        self.assertEqual([s["ideas"] for s in smoke["solutions"]], [[]] * 5)
        b8 = self.solution("B", smoke)
        self.assertEqual(b8["detail"][1]["content"]["tag"], "AI模擬")
        self.assertEqual(self.solution("A", smoke)["detail"][1]["content"]["tag"], "實證")

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
        # #7 (自由題) has no topic, so it is not in issues.csv. #8 is an extra issue.
        self.assertEqual([i["number"] for i in issues], [1, 2, 3, 4, 5, 6, 8])
        available = [i["number"] for i in issues if i["available"]]
        self.assertTrue({1, 2} <= set(available))
        self.assertFalse({3, 4, 5, 6} & set(available))
        three = issues[2]
        self.assertEqual((three["counts"], three["spaces"], three["updated"]), (None, [], None))

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
        self.assertEqual(gaps, {1: ["呼吸道疾病", "外籍"], 2: ["呼吸道疾病"], 3: None, 4: None,
                                5: None, 6: None, 8: []})

    def test_index_issue_source(self):
        # 來源 in issues.csv becomes "source": 主辦單位 for the host's issues,
        # 參加者補充 for an issue a participant added.
        source = {i["number"]: i["source"] for i in self.index["issues"]}
        self.assertEqual(source, {1: "主辦單位", 2: "主辦單位", 3: "主辦單位", 4: "主辦單位",
                                  5: "主辦單位", 6: "主辦單位", 8: "參加者補充"})

    def test_moved_and_active_stakeholders(self):
        by_id = {s["id"]: s for s in self.index["stakeholders"]}
        self.assertEqual(by_id["O02"]["movedTo"], "I12")
        self.assertEqual(by_id["O02"]["issues"], [])
        for sid, issues in (("I12", [2]), ("I13", [1, 2])):
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
            "source": "可詢問身障團體", "priority": "M", "priorityTag": "AI模擬"})
        o0402 = self.story("O01-US02")
        self.assertIsNone(o0402["group"])
        self.assertIsNone(o0402["source"])

    def test_pending_cell(self):
        so = self.story("O04-US04")["soThat"]
        self.assertEqual(so, {"text": "【待補：題目原文沒有說明理由，需環保局確認】", "tag": None, "pending": True})
        evidence = [s["id"] for s in self.issue["stories"] if s["want"]["tag"] == "實證"]
        self.assertEqual(len(evidence), 7)

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
            self.assertEqual(list(s), ["id", "name", "path", "focus", "issues", "movedTo", "added"])

    def test_solution_added_date(self):
        # 新增日期 in 6.1 becomes "added".
        added = {s["id"]: s["added"] for s in self.issue["solutions"]}
        self.assertEqual(added, {"A": "2026-10-16", "B": "2026-10-16", "C": "2026-10-16",
                                 "D": "2026-10-16", "E": "2026-10-18"})

    def test_open_data(self):
        # open-data.csv becomes "openData" in index.json, in file order.
        rows = self.index["openData"]
        self.assertEqual(len(rows), 8)
        smoke = next(r for r in rows if r["url"] == "https://data.gov.tw/dataset/177504")
        self.assertEqual(smoke, {"name": "臺北市指定吸菸區", "url": "https://data.gov.tw/dataset/177504",
                                 "agency": "臺北市政府衛生局", "license": "政府資料開放授權條款第 1 版",
                                 "issues": [8]})
        petition = next(r for r in rows if "cb423c17" in r["url"])
        self.assertEqual(petition["issues"], [2, 8])

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
        self.assertEqual(self.summary_item("可能的爭議", "誰負責清理"), {
            "item": "誰負責清理",
            "text": {"text": "店家希望不要預設由店家清理清潔箱；住戶與便利商店店員希望周邊保持乾淨。",
                     "tag": "AI模擬", "pending": False},
            "refs": ["C5", "O01-US02", "I09-US02", "I12-US01"]})

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

class BuildJsonUnitTest(unittest.TestCase):
    def setUp(self):
        self.mod = load_module()

    def test_cell_with_tag(self):
        self.assertEqual(self.mod.parse_cell("`[AI模擬]` 文字"), {"text": "文字", "tag": "AI模擬", "pending": False})
        self.assertEqual(self.mod.parse_cell("`[實證]` 文字"), {"text": "文字", "tag": "實證", "pending": False})
        self.assertEqual(self.mod.parse_cell("`[AI整理]` 文字"), {"text": "文字", "tag": "AI整理", "pending": False})

    def test_cell_pending(self):
        self.assertEqual(self.mod.parse_cell("【待補】"), {"text": "【待補】", "tag": None, "pending": True})

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

    # ---------- 分析摘要 ----------
    SUMMARY_ROW = "| 誰負責清理 | `[AI模擬]` 店家希望不要預設由店家清理清潔箱；住戶與便利商店店員希望周邊保持乾淨。 | C5、O01-US02、I09-US02、I12-US01 |"

    def test_summary_missing(self):
        self.edit("## 分析摘要\n", "## 摘要\n")
        self.assertFails("2-trashcans: 分析摘要:", "no heading")

    def test_summary_topics_out_of_order(self):
        self.edit("### 難以取捨的決定\n", "### TMP\n")
        self.edit("### 可能的爭議\n", "### 難以取捨的決定\n")
        self.edit("### TMP\n", "### 可能的爭議\n")
        self.assertFails("2-trashcans: 分析摘要:", "難以取捨的決定、可能的爭議")

    def test_summary_unknown_local_ref(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("C5、", "C99、"))
        self.assertFails("2-trashcans: 分析摘要:", "誰負責清理", "C99")

    def test_summary_bad_ref(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("C5、", "C5，"))
        self.assertFails("2-trashcans: 分析摘要:", "誰負責清理", "is not a reference")

    def test_summary_cross_ref_not_in_other_issue(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("C5、", "#8 解法 Z、"))
        self.assertFails("2-trashcans: 分析摘要:", "#8 解法 Z")

    def test_summary_row_without_tag(self):
        self.edit(self.SUMMARY_ROW, self.SUMMARY_ROW.replace("`[AI模擬]` ", ""))
        self.assertFails("2-trashcans: 分析摘要:", "誰負責清理", "tag")

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
        self.edit("已改為 I12", "已改為I 12", "stakeholders.csv")
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

    def test_two_tables_with_step_4_header(self):
        self.edit("\n### 相同訴求群組\n",
                  "\n| 故事編號 | 身為… | 我想要… | 相同訴求編號 | 以便… | 來源 | 優先順序 |\n"
                  "|---|---|---|---|---|---|---|\n\n### 相同訴求群組\n")
        self.assertFails("2-trashcans: 步驟 4:", "2 tables")

    def test_cell_with_two_tags(self):
        self.edit("| `[AI模擬]` 安全通行，不會撞到 |", "| `[AI模擬]` `[實證]` 安全通行，不會撞到 |")
        self.assertFails("2-trashcans: 步驟 4:", "I06-US01")

    def test_heading_prefix_needs_space(self):
        self.edit("### 6.1 候選解法", "### 6.10 候選解法")
        self.assertFails("2-trashcans: 6.1:")

    def test_unknown_issue_source(self):
        self.edit("8,8-smokefree,無菸城市,參加者補充", "8,8-smokefree,無菸城市,其他", "issues.csv")
        self.assertFails("issues.csv: row 8:", "來源", "其他")

    def test_missing_issue_source_column(self):
        self.edit("編號,資料夾,題目,來源", "編號,資料夾,題目,出處", "issues.csv")
        self.assertFails("issues.csv: header: no column 來源")

    def test_bad_issue_value_in_csv(self):
        self.edit("I05,高齡者,res,高齡,1 2 8,", "I05,高齡者,res,高齡,1、2、8,", "stakeholders.csv")
        self.assertFails("stakeholders.csv: I05:")

    def test_bad_stakeholder_date(self):
        self.edit("I05,高齡者,res,高齡,1 2 8,,2026-10-18", "I05,高齡者,res,高齡,1 2 8,,2026/10/18", "stakeholders.csv")
        self.assertFails("stakeholders.csv: I05:", "新增日期")

    def test_missing_stakeholder_date_column(self):
        self.edit("議題,備註,新增日期", "議題,備註,日期", "stakeholders.csv")
        self.assertFails("stakeholders.csv: header: no column 新增日期")

    def test_bad_solution_date(self):
        self.edit("| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` | 2026-10-16 |",
                  "| D | `[AI模擬]` 參與式選址流程 | `sidewalk`、`arcade`、`park` | 10/16 |")
        self.assertFails("2-trashcans: 6.1:", "solution D", "新增日期")

    def test_open_data_bad_issue_value(self):
        self.edit("政府資料開放授權條款第 1 版,8\n", "政府資料開放授權條款第 1 版,8、2\n", "open-data.csv")
        self.assertFails("open-data.csv:", "議題")

    def test_open_data_missing_file(self):
        os.remove(os.path.join(self.dir, "open-data.csv"))
        self.assertFails("open-data.csv")

    def test_missing_csv_file(self):
        os.remove(os.path.join(self.dir, "space-types.csv"))
        self.assertFails("space-types.csv")

    def test_broken_conflict_row(self):
        self.edit("`[AI模擬]` I11-US01 vs I09-US01", "`[AI模擬]` I11-US01、I09-US01")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-trashcans: 5.4", out)
        self.assertIn("C7", out)
        self.assertFalse(os.path.exists(os.path.join(self.out, "index.json")))

    def test_cross_issue_reference_in_conflict(self):
        # 5.4 相關故事 holds stories of this issue only.
        self.edit("`[AI模擬]` I11-US01 vs I09-US01", "`[AI模擬]` I11-US01 vs I09-US01、#1 I06-US02")
        self.assertFails("2-trashcans: 5.4", "C7", "#1 I06-US02")

    def test_cross_issue_reference_in_group(self):
        self.edit("| O12-US01、I06-US01、I07-US02 |", "| O12-US01、I06-US01、I07-US02、#1 I06-US02 |")
        self.assertFails("2-trashcans: 相同訴求群組", "#1 I06-US02")

    def test_cross_issue_reference_in_6_2(self):
        self.edit("| D | 參與式選址流程 | `[AI模擬]` O04-US01", "| D | 參與式選址流程 | `[AI模擬]` #1 O01-US01、O04-US01")
        self.assertFails("2-trashcans: 6.2", "#1 O01-US01")

    def test_missing_section(self):
        self.edit("### 6.2 解法與故事對照", "### 解法與故事對照")
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
               "`[AI模擬]` 客人不會把垃圾放在店門口或花台 | 可詢問商圈發展協會；市民留言約 118 則提到同樣訴求"
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
        self.assertEqual(counts["cells"], {"evidence": 10, "aiSummary": 23, "aiSimulated": 70, "pending": 1})

    def test_cell_with_ai_summary_and_another_tag(self):
        self.edit("| `[AI模擬]` 安全通行，不會撞到 |", "| `[AI模擬]` `[AI整理]` 安全通行，不會撞到 |")
        self.assertFails("2-trashcans: 步驟 4:", "I06-US01")


if __name__ == "__main__":
    unittest.main()
