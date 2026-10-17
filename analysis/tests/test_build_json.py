"""Tests for analysis/build_json.py.

The tests copy issue #2 and the shared files into a temp dir and run the
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
SHARED = ("issues.csv", "stakeholders.csv", "path-labels.csv", "space-types.csv")
ISSUE = "2-trashcans"


def make_copy(root):
    """Copy issue #2 and the shared files from HEAD into root/analysis. Return that dir."""
    paths = [f"analysis/{n}" for n in SHARED] + [f"analysis/{ISSUE}"]
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
        self.assertEqual(len(self.issue["stories"]), 45)
        self.assertEqual(len(self.issue["conflicts"]), 7)
        self.assertEqual(len(self.issue["solutions"]), 4)
        self.assertEqual(len(self.issue["groups"]), 11)
        self.assertEqual(len(self.issue["stakeholders"]), 25)

    def test_index_counts(self):
        item = next(i for i in self.index["issues"] if i["number"] == 2)
        self.assertEqual(item["counts"], {"stakeholdersO": 12, "stakeholdersI": 13, "stories": 45,
                                          "conflicts": 7, "solutions": 4, "wantsEvidence": 6})
        self.assertEqual(item["spaces"], ["sidewalk", "arcade", "park", "mrt-exit"])
        self.assertEqual(item["title"], "找回消失的垃圾桶")
        self.assertEqual(item["folder"], ISSUE)

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

    def test_pending_has_6_3_and_step_7(self):
        sections = [p["section"] for p in self.issue["pending"]]
        self.assertIn("6.3 成效衡量", sections)
        step7 = {"解法 A：清潔箱佈建建議地圖", "解法 B：滿溢回報與動態清運",
                 "解法 C：找桶指引與開放資料更新", "解法 D：參與式選址流程"}
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
        self.assertEqual(ctx("【待補：法務確認】", "解法 A：清潔箱佈建建議地圖"), "相關法規")
        self.assertEqual(ctx("【待補：政策組安排】"), "訪談清潔隊與環保局")
        self.assertIsNone(ctx("【待補：環保局確認目前實際數量與兩份表的關係】"))
        for p in self.issue["pending"]:
            self.assertEqual(list(p), ["section", "text", "context"])

    def test_input_source_note_dash_is_null(self):
        self.assertIsNone(self.issue["inputSources"][-1]["note"])
        self.assertEqual(self.issue["inputSources"][0]["note"], "題目原文整理自市民意見，不是單一利害關係人的話")

    def test_index_issue_list(self):
        issues = self.index["issues"]
        self.assertEqual([i["number"] for i in issues], [1, 2, 3, 4, 5, 6])
        self.assertEqual([i["number"] for i in issues if i["available"]], [2])
        one = issues[0]
        self.assertEqual((one["counts"], one["spaces"], one["updated"]), (None, [], None))

    def test_moved_and_active_stakeholders(self):
        by_id = {s["id"]: s for s in self.index["stakeholders"]}
        self.assertEqual(by_id["O02"]["movedTo"], "I12")
        self.assertEqual(by_id["O02"]["issues"], [])
        for sid in ("I12", "I13"):
            self.assertIsNone(by_id[sid]["movedTo"])
            self.assertEqual(by_id[sid]["issues"], [2])
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
        self.assertEqual(len(evidence), 6)

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
        self.assertEqual(len(self.issue["inputSources"]), 11)

    def test_updated_is_date_or_null(self):
        for i in [self.issue] + self.index["issues"]:
            u = i["updated"]
            self.assertTrue(u is None or re.fullmatch(r"\d{4}-\d\d-\d\d", u), u)


class BuildJsonUnitTest(unittest.TestCase):
    def setUp(self):
        self.mod = load_module()

    def test_cell_with_tag(self):
        self.assertEqual(self.mod.parse_cell("`[AI模擬]` 文字"), {"text": "文字", "tag": "AI模擬", "pending": False})
        self.assertEqual(self.mod.parse_cell("`[實證]` 文字"), {"text": "文字", "tag": "實證", "pending": False})

    def test_cell_pending(self):
        self.assertEqual(self.mod.parse_cell("【待補】"), {"text": "【待補】", "tag": None, "pending": True})

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
        kept = [l for l in lines if not l.startswith("| D 參與式選址流程 |")]
        self.assertEqual(len(kept), len(lines) - 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(kept))
        self.assertFails("2-trashcans: 6.2:", "D")

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

    def test_bad_issue_value_in_csv(self):
        self.edit("I05,高齡者,res,高齡,2,", "I05,高齡者,res,高齡,2、3,", "stakeholders.csv")
        self.assertFails("stakeholders.csv: I05:")

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

    def test_missing_section(self):
        self.edit("### 6.2 解法與故事對照", "### 解法與故事對照")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-trashcans: 6.2", out)

    def test_bad_priority_cell(self):
        self.edit("| 可用短問卷或站外現場觀察驗證 | `[AI模擬]` M |", "| 可用短問卷或站外現場觀察驗證 | M |")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 1, out)
        self.assertIn("2-trashcans: 步驟 4", out)
        self.assertIn("I01-US01", out)

    def test_stale_issue_file_is_removed(self):
        os.makedirs(os.path.join(self.out, "issues"))
        stale = os.path.join(self.out, "issues", "9-old.json")
        with open(stale, "w") as f:
            f.write("{}")
        code, out = run_build(self.dir, self.out)
        self.assertEqual(code, 0, out)
        self.assertFalse(os.path.exists(stale))
        self.assertTrue(os.path.exists(os.path.join(self.out, "issues", f"{ISSUE}.json")))


if __name__ == "__main__":
    unittest.main()
