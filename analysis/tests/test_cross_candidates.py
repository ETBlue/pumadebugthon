"""Tests for analysis/scripts/cross_candidates.py (rule R3, the candidate list).

The tests use small in-memory inputs. They do not read any file.
Run from the repo root:
python3 -I -m unittest discover -s analysis/tests -t . -p 'test_cross_candidates.py' -v
"""
import importlib.util, os, sys, unittest

SCRIPTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")


def load_module():
    sys.path.insert(0, SCRIPTS)
    spec = importlib.util.spec_from_file_location("cross_candidates", os.path.join(SCRIPTS, "cross_candidates.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


cc = load_module()


def sol(code, types, domains=(), spaces=(), needs=(), stories=()):
    """One issue solution with only the fields the rule reads."""
    return {"id": code, "solutionTypes": list(types), "domains": list(domains), "spaces": list(spaces),
            "stories": list(stories), "needs": {"must": list(needs), "shouldCould": []}}


def issue(num, *solutions):
    return {"number": num, "solutions": list(solutions)}


def group(gid, *refs):
    """An X-N group. refs are (issue, need ID) pairs."""
    return {"id": gid, "needs": [{"issue": n, "id": i} for n, i in refs], "stories": []}


def cross(groups=(), repeated=(), solutions=()):
    return {"needGroups": list(groups), "repeatedNeeds": list(repeated), "solutions": list(solutions)}


def pairs(rows):
    return [f"{r['a']}~{r['b']}" for r in rows]


class CandidateTest(unittest.TestCase):
    def test_same_issue_is_never_a_pair(self):
        issues = [issue(1, sol("A", ["facility"], ["environment"], needs=["N01"]),
                        sol("B", ["facility"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N01", (1, "N01"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_type_domain_and_need_make_one_pair_lower_issue_first(self):
        # The higher issue comes first in the input on purpose.
        issues = [issue(3, sol("A", ["facility"], ["environment"], needs=["N02"])),
                  issue(1, sol("D", ["facility", "planning"], ["environment"], needs=["N05"]))]
        c = cross([group("X-N02", (1, "N05"), (3, "N02"))])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-D~3-A"])
        r = rows[0]
        self.assertEqual(r["types"], ["facility"])
        self.assertEqual(r["domains"], ["environment"])
        self.assertEqual(r["spaces"], [])
        self.assertEqual(r["needs"], ["X-N02"])
        self.assertEqual(r["crossSolutions"], [])

    def test_type_and_need_without_domain_or_space_is_no_pair(self):
        issues = [issue(1, sol("A", ["facility"], ["environment"], ["park"], needs=["N01"])),
                  issue(4, sol("C", ["facility"], ["transport"], ["car-lane"], needs=["N03"]))]
        c = cross([group("X-N01", (1, "N01"), (4, "N03"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_platform_type_needs_no_domain_or_space(self):
        for platform in ("open-data", "intake"):
            issues = [issue(1, sol("A", [platform], ["environment"], ["park"], needs=["N01"])),
                      issue(4, sol("C", [platform], ["transport"], ["car-lane"], needs=["N03"]))]
            c = cross([group("X-N01", (1, "N01"), (4, "N03"))])
            self.assertEqual(pairs(cc.candidates(issues, c)), ["1-A~4-C"], platform)

    def test_domain_and_need_without_shared_type_is_no_pair(self):
        issues = [issue(1, sol("A", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("B", ["planning"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N01", (1, "N01"), (2, "N01"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_type_and_domain_without_shared_need_is_no_pair(self):
        issues = [issue(1, sol("A", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("B", ["facility"], ["environment"], needs=["N02"]))]
        # Each need is in a group, but not in the same group.
        c = cross([group("X-N01", (1, "N01"), (3, "N01")), group("X-N02", (2, "N02"), (3, "N02"))])
        self.assertEqual(cc.candidates(issues, c), [])

    def test_need_by_story_and_by_repeated_need_row(self):
        # A solution is in a group through one of its stories too, and a 1.2
        # row counts as a shared need.
        issues = [issue(1, sol("A", ["facility"], ["environment"], stories=["O12-US01"])),
                  issue(2, sol("A", ["facility"], ["environment"], stories=["O12-US01", "I09-US04"]))]
        c = cross([{"id": "X-N01", "needs": [], "stories": [{"issue": 1, "id": "O12-US01"}, {"issue": 2, "id": "I09-US04"}]}],
                  [{"stakeholder": "O12", "needs": [{"issue": 1, "id": "O12-US01"}, {"issue": 2, "id": "O12-US01"}]}])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-A~2-A"])
        self.assertEqual(rows[0]["needs"], ["X-N01", "1.2 O12"])

    def test_pair_inside_a_combined_solution(self):
        issues = [issue(1, sol("A", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("A", ["facility"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N01", (1, "N01"), (2, "N01"))],
                  solutions=[{"code": "X-B", "parts": [{"issue": 1, "code": "A"}, {"issue": 2, "code": "A"}]},
                             {"code": "X-A", "parts": [{"issue": 1, "code": "A"}, {"issue": 3, "code": "A"}]}])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-A~2-A"])
        self.assertEqual(rows[0]["crossSolutions"], ["X-B"])

    def test_order_is_issue_number_then_letter(self):
        # The input is in reverse order on purpose. 10-A and 10-C are in
        # different groups, so 10-A ~ 2-A and 10-C ~ 12-B are not pairs.
        issues = [issue(12, sol("B", ["facility"], ["transport"], needs=["N01"])),
                  issue(10, sol("A", ["facility"], ["transport"], needs=["N01"]),
                        sol("C", ["facility"], ["transport"], needs=["N03"])),
                  issue(3, sol("B", ["facility"], ["transport"], needs=["N02"])),
                  issue(2, sol("A", ["facility"], ["transport"], needs=["N02"]))]
        c = cross([group("X-N01", (10, "N01"), (12, "N01")),
                   group("X-N02", (2, "N02"), (3, "N02"), (10, "N03"))])
        rows = cc.candidates(issues, c)
        # 3-B ~ 10-C also shares X-N02.
        self.assertEqual(pairs(rows), ["2-A~3-B", "2-A~10-C", "3-B~10-C", "10-A~12-B"])
        # Same result for any input order.
        self.assertEqual(pairs(cc.candidates(list(reversed(issues)), c)), pairs(rows))

    def test_each_pair_once(self):
        issues = [issue(1, sol("A", ["facility"], ["environment"], needs=["N01"])),
                  issue(2, sol("A", ["facility"], ["environment"], needs=["N01"]))]
        c = cross([group("X-N01", (1, "N01"), (2, "N01")), group("X-N02", (1, "N01"), (2, "N01"))])
        rows = cc.candidates(issues, c)
        self.assertEqual(pairs(rows), ["1-A~2-A"])
        self.assertEqual(rows[0]["needs"], ["X-N01", "X-N02"])

    def test_csv_text(self):
        issues = [issue(1, sol("A", ["facility", "planning"], ["environment"], ["park", "arcade"], needs=["N01"])),
                  issue(2, sol("A", ["planning", "facility"], ["environment"], ["arcade", "park"], needs=["N01"]))]
        c = cross([group("X-N01", (1, "N01"), (2, "N01"))])
        text = cc.csv_text(cc.candidates(issues, c))
        self.assertEqual(text.splitlines(), [
            "解法甲,解法乙,共同解法類型,共同領域,共同空間類型,共同需求,已在跨議題解法",
            "1-A,2-A,facility、planning,environment,park、arcade,X-N01,",
        ])


if __name__ == "__main__":
    unittest.main()
