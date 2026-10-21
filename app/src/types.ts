// Types for the JSON written by analysis/scripts/build_json.py.
// build_json.py is the source of truth. When it changes, change these types.

/** A tag on analysis text (see analysis/docs/method.md, section 標記).
 * 實證: a person can check the source, or a person checked the AI summary.
 * AI整理: AI summarized it from a real source (the citizen data, with counts, or
 *   a news report); not checked by a person yet.
 * AI模擬: AI made it up as a likely view; no data behind it.
 * null means no tag (for example a 【待補】 cell). */
export type Tag = '實證' | 'AI整理' | 'AI模擬' | null

/** The tag on a story's priority. build_json.py always finds one. */
export type PriorityTag = Exclude<Tag, null>

/** MoSCoW letters. The app shows zh-TW labels for them. */
export type Priority = 'M' | 'S' | 'C' | 'W'

/** A table cell. The tag is removed from text. pending is true only for a
 * 【待補…】 cell with no tag. text can contain Markdown (bold, links). */
export interface Cell {
  text: string
  tag: Tag
  pending: boolean
}

// ---------- index.json ----------

export interface IssueCounts {
  stakeholdersO: number
  stakeholdersI: number
  stories: number
  conflicts: number
  solutions: number
  /** 資料根據: the story cells by tag. */
  cells: CellCounts
}

/** 資料根據 of an issue: how many story cells have each tag. build_json.py
 * counts the 我想要… and the 以便… cell of every story, so the total is
 * 2 x stories. The priority tag is not counted. The key order is the fixed
 * order of the parts: 實證, AI整理, AI模擬, 待補. */
export interface CellCounts {
  /** 實證 */
  evidence: number
  /** AI整理 */
  aiSummary: number
  /** AI模擬 */
  aiSimulated: number
  /** 待補: a cell with no tag. */
  pending: number
}

/** 來源 in analysis/data/issues.csv: the hackathon host's issue, or an issue a
 * participant added (for example #8). */
export type IssueSource = '主辦單位' | '參加者補充'

interface IssueSummaryBase {
  number: number
  /** Folder name in analysis/, for example "2-trashcans". */
  folder: string
  title: string
  source: IssueSource
}

/** An issue with an analysis. */
export interface AvailableIssueSummary extends IssueSummaryBase {
  available: true
  /** Space type codes, for example "sidewalk". */
  spaces: string[]
  /** 新增日期 in issues.csv: the day the issue's analysis was first committed
   * (YYYY-MM-DD). Optional in the type so test data and older JSON still fit (design 3.23.8). */
  added?: string | null
  /** Date of the last git commit (YYYY-MM-DD), or null without git history. */
  updated: string | null
  counts: IssueCounts
  /** 特別關注 groups with no stakeholder in this issue, in the fixed order
   * (FOCUS_ORDER). Empty when every group is included. For the issue card.
   * Never sort, rank or filter issues by it (design 13). */
  focusGaps: string[]
}

/** An issue without an analysis yet (shown as 製作中). */
export interface UnavailableIssueSummary extends IssueSummaryBase {
  available: false
  spaces: []
  added?: null
  updated: null
  counts: null
  focusGaps: null
}

export type IssueSummary = AvailableIssueSummary | UnavailableIssueSummary

/** A row of analysis/data/stakeholders.csv. */
export interface Stakeholder {
  /** Global ID, for example "O04" or "I06". */
  id: string
  name: string
  /** 分類路徑 code, for example "gov-local-taipei-epb". null for a moved ID. */
  path: string | null
  /** 特別關注 values, for example ["高齡"]. */
  focus: string[]
  /** Issue numbers. Empty for a moved ID. */
  issues: number[]
  /** The new ID when this ID was moved (備註 「已改為 I12」), else null. */
  movedTo: string | null
  /** 新增日期: the date the ID was added to stakeholders.csv (YYYY-MM-DD).
   * For the "recent" lists. Moved IDs keep their date. */
  added: string
  /** 更新日期 from analysis/data/updated-dates.csv (update_dates.py): the last
   * day its own content changed (YYYY-MM-DD). null for a moved ID (design 3.23.8). */
  updated?: string | null
}

/** A row of analysis/data/space-types.csv. */
export interface SpaceType {
  code: string
  name: string
  group: string
  description: string
}

/** A row of analysis/data/open-data.csv: an open dataset that an issue's appendix
 * cites (data.gov.tw or data.taipei). For the footer. */
export interface OpenDataset {
  /** 名稱 */
  name: string
  /** 網址 */
  url: string
  /** 提供機關 */
  agency: string
  /** 授權, for example "政府資料開放授權條款第 1 版". */
  license: string
  /** 議題: the issues whose appendix cites this dataset. */
  issues: number[]
}

export interface IndexFile {
  issues: IssueSummary[]
  stakeholders: Stakeholder[]
  /** 分類路徑 prefix -> name, for example "gov" -> "政府". */
  pathLabels: Record<string, string>
  spaceTypes: SpaceType[]
  openData: OpenDataset[]
}

// ---------- issues/<folder>.json ----------

/** A stakeholder of one issue (step 1). The name and path are in IndexFile. */
export interface IssueStakeholder {
  id: string
  /** 與本題的關係 */
  relation: Cell
}

/** A row of 1.2 (可能的輸入來源). */
export interface InputSource {
  source: string
  /** Stakeholder IDs found in the 適合的利害關係人 cell. */
  stakeholders: string[]
  fit: Cell
  /** 注意事項. null when the cell is empty or 「—」. */
  note: string | null
}

/** A row of the 特別關注族群檢查 table (step 1, 「### 1.n 特別關注族群檢查」).
 * build_json.py writes all 6 groups, in the fixed order (FOCUS_ORDER). */
export interface FocusGroup {
  /** 特別關注, for example 「高齡」. */
  tag: string
  /** 納入的利害關係人: the stakeholder IDs of this issue that have the group.
   * Empty when the table says 「（無）」. */
  stakeholders: string[]
  /** 說明. null for 「—」. For a group with no stakeholder, a 【待補】 cell
   * that asks a person to decide if the group should be included. */
  note: Cell | null
}

/** A row of the step 4 table. */
export interface Story {
  /** For example "O01-US01". */
  id: string
  /** Stakeholder ID, the part of id before "-". */
  stakeholder: string
  /** 我想要… */
  want: Cell
  /** 相同訴求編號, for example "W01", or null. */
  group: string | null
  /** 以便… */
  soThat: Cell
  /** 來源. null when the cell is empty or 「—」. */
  source: string | null
  /** The priority of the story's need (needs format), or of the story itself
   * (old format). */
  priority: Priority
  priorityTag: PriorityTag
  /** 相同需求編號, for example "N01", or null. Always null in the old format. */
  needGroup: string | null
}

/** A row of the 相同訴求群組 table. */
export interface Group {
  /** For example "W01". */
  id: string
  /** 我想要（摘要） */
  summary: string
  tag: Tag
  /** Story IDs. */
  stories: string[]
}

/** A row of the 相同需求群組 table (needs format only). */
export interface NeedGroup {
  /** For example "N01". */
  id: string
  /** 以便（摘要） */
  summary: string
  tag: Tag
  /** Story IDs. */
  stories: string[]
}

/** A row of 5.2: one need. A need is an N group, or one story in no group. */
export interface Need {
  /** "N01" for a group, or the story ID (for example "I06-US01"). */
  id: string
  kind: 'group' | 'story'
  /** 以便（摘要） */
  summary: string
  /** Story IDs. */
  stories: string[]
  priority: Priority
  priorityTag: PriorityTag
  /** 理由 */
  reason: Cell
}

/** A row of 6.4 (needs format) or 5.4 (old format). 相關故事 is split on
 * 「 vs 」 into two sides. */
export interface Conflict {
  /** For example "C1". */
  id: string
  text: Cell
  sideA: string[]
  sideB: string[]
  /** 可能的審議方法 */
  method: Cell
  /** 模擬結果 */
  result: Cell
  /** 雙方的需求, split on 「 vs 」: need IDs. [] in the old format. */
  needsA: string[]
  needsB: string[]
  /** 以需求為本的解方. null in the old format. */
  wayOut: Cell | null
  /** The solution codes in wayOut. [] for 「未找到」 and in the old format. */
  wayOutSolutions: string[]
}

/** A row of 6.1, with its stories from 6.2. */
export interface Solution {
  /** One capital letter, for example "A". */
  id: string
  name: Cell
  /** 一句話說明 */
  summary: string
  /** Space type codes. */
  spaces: string[]
  /** 新增日期: the date the solution was added to 6.1 (YYYY-MM-DD). */
  added: string
  /** 更新日期 from analysis/data/updated-dates.csv (YYYY-MM-DD), or null when
   * the file has no row for it (design 3.23.8). */
  updated?: string | null
  /** The stories whose need the solution covers in 6.2 (needs format), or
   * the stories of the 6.2 row (old format). */
  stories: string[]
  /** The need IDs of the 6.2 row: 涵蓋的 Must and 涵蓋的 Should / Could.
   * null in the old format. */
  needs: { must: string[]; shouldCould: string[] } | null
  /** 6.3 rows whose 解法 cell lists this solution, in file order. */
  measures: Measure[]
  /** The rows of its step 7 section (「### 7.n 解法 X：…」), in file order. */
  detail: DetailRow[]
  /** Its row of the step 7 總覽 table. Every field has the row's tag. */
  overview: SolutionOverview
  /** Rows of the 6.1 構想 table whose 本文件的處理 cell names this solution. */
  ideas: SolutionIdea[]
  /** The 【待補】 items of its step 7 section and of its 6.3 rows. The same
   * items are also in IssueFile.pending. */
  pending: Pending[]
}

/** A row of 6.3 (成效衡量). */
export interface Measure {
  /** 指標 */
  metric: string
  /** 目前數值（基準值） */
  baseline: Cell
  /** 資料來源 */
  source: string
}

/** A row of a step 7 section, for example 相關法規. */
export interface DetailRow {
  /** 項目, for example 「需要的資料／API」 or 「隱私」. */
  item: string
  /** 內容 */
  content: Cell
}

/** A row of the step 7 總覽 table. */
export interface SolutionOverview {
  /** 成本 */
  cost: Cell
  /** 可行性 */
  feasibility: Cell
  /** 主要風險 */
  risk: Cell
  /** 主責單位 */
  owner: Cell
}

/** A row of the 6.1 構想 table: an idea from the issue text or a source. */
export interface SolutionIdea {
  /** 構想 */
  idea: Cell
  /** 本文件的處理 */
  handling: Cell
}

/** A row of a 分析摘要 topic table (項目 | 說明 | 相關編號). */
export interface SummaryItem {
  /** 項目 */
  item: string
  /** 說明: a tag and the text, or a 【待補】 cell. */
  text: Cell
  /** 相關編號 as written, for example "C5", "I01-US09", "解法 A" or
   * "#8 解法 B" (another issue). Empty for 「—」. build_json.py checks
   * that each one exists. */
  refs: string[]
}

/** One topic of the 分析摘要 (a 「### 」 subsection). */
export interface SummaryTopic {
  /** For example 「難以取捨的決定」. */
  topic: string
  items: SummaryItem[]
}

/** A 【待補…】 item anywhere in the issue file. */
export interface Pending {
  /** The nearest ## or ### heading above the item, for example "6.3 成效衡量".
   * build_json.py writes null when no heading is above the item. */
  section: string | null
  /** The item, for example "【待補：環保局稽查資料】". */
  text: string
  /** For an item in a table row: the first other cell of the row that has
   * content. null when the item is not in a table, or no cell fits. */
  context: string | null
}

export interface IssueFile {
  number: number
  folder: string
  title: string
  spaces: string[]
  updated: string | null
  /** "needs": the needs-based format (has 相同需求群組). "stories": the old
   * format. #1, #2 and #8 use "needs". */
  format: 'needs' | 'stories'
  /** 分析摘要: 5 topics, in the fixed order (SUMMARY_TOPICS). The summary
   * adds no new facts; each item lists where it comes from. */
  summary: SummaryTopic[]
  stakeholders: IssueStakeholder[]
  inputSources: InputSource[]
  /** The 特別關注族群檢查 table: 6 groups, in the fixed order. */
  focusGroups: FocusGroup[]
  stories: Story[]
  groups: Group[]
  /** 相同需求群組. [] in the old format. */
  needGroups: NeedGroup[]
  /** 5.2: one item per need, in file order. [] in the old format. */
  needs: Need[]
  conflicts: Conflict[]
  solutions: Solution[]
  pending: Pending[]
}

// ---------- cross-issue.json ----------
// Written by build_json.py from analysis/cross-issue/cross-issue-analysis.md
// (design 3.18). The file does not exist when the Markdown file does not exist.

/** A reference to an ID of one issue, for example { issue: 2, id: "N05" }.
 * issue is null for the file's own IDs (an X-N group, for example "X-N02"). */
export interface CrossRef {
  issue: number | null
  id: string
}

/** A reference to a solution of one issue, for example { issue: 1, code: "C" }. */
export interface CrossPart {
  issue: number
  code: string
}

/** A stakeholder that is in more than one issue. */
export interface CrossSharedStakeholder {
  id: string
  name: string
  focus: string[]
  issues: number[]
  stories: CrossRef[]
}

/** The same need of one stakeholder in several issues. */
export interface CrossRepeatedNeed {
  stakeholder: string
  summary: string
  needs: CrossRef[]
  note: Cell
}

/** A row of the 特別關注族群檢查 table over the issues. */
export interface CrossFocusGroup {
  tag: string
  stakeholders: string[]
  note: Cell | null
}

/** One issue need inside an X-N group, with its priority in that issue. */
export interface CrossGroupNeed {
  issue: number
  /** The need ID of the issue (N05, or a story ID for a need with no group). */
  id: string
  priority: Priority
}

/** An X-N group: the same need in several issues. It has no page. */
export interface CrossNeedGroup {
  /** For example "X-N01". */
  id: string
  tag: Tag
  summary: string
  needs: CrossGroupNeed[]
  stories: CrossRef[]
  stakeholders: string[]
  /** The shared priority, or null when the issues give different ones. */
  priority: Priority | null
  priorityTag: Tag
  prioritiesDiffer: boolean
  reason: Cell
}

/** A conflict across issues. */
export interface CrossConflict {
  /** For example "X-C1". */
  id: string
  text: Cell
  /** The conflicts of the issues that this conflict joins. */
  issueConflicts: CrossRef[]
  /** Story IDs of each side. */
  sideA: CrossRef[]
  sideB: CrossRef[]
  /** Need IDs of each side. An X-N group has issue null. */
  needsA: CrossRef[]
  needsB: CrossRef[]
  /** 以需求為本的解方 */
  wayOut: Cell
  /** The cross-issue solution codes in wayOut, for example ["X-B", "X-A"]. */
  wayOutSolutions: string[]
  method: Cell
  result: Cell
}

/** A row of 成效衡量 of a cross-issue solution. */
export interface CrossMeasure {
  indicator: string
  baseline: Cell
  source: string
  /** The issue solutions that the indicator comes from. */
  from: CrossPart[]
  /** true: a new indicator, not from an issue solution. */
  isNew: boolean
}

/** A cross-issue solution: it combines solutions of several issues. */
export interface CrossSolution {
  /** For example "X-A". */
  code: string
  name: string
  tag: Tag
  /** The issue solutions it combines. */
  parts: CrossPart[]
  spaces: string[]
  /** 新增日期 (YYYY-MM-DD). */
  added: string
  /** 更新日期 from analysis/data/updated-dates.csv (YYYY-MM-DD), or null when
   * the file has no row for it (design 3.23.8). */
  updated?: string | null
  summary: string
  needs: {
    must: CrossRef[]
    shouldCould: CrossRef[]
    /** X-N group IDs. */
    crossIssue: string[]
  }
  measures: CrossMeasure[]
  detail: { owner: Cell; laws: Cell; privacy: Cell; risks: Cell }
}

/** A 特別關注族群 note on some cross-issue solutions. */
export interface CrossSolutionFocus {
  tag: string
  /** Cross-issue solution codes. */
  solutions: string[]
  note: Cell
}

export interface CrossPending {
  text: string
  section: string
}

export interface CrossIssueFile {
  title: string
  updated: string
  /** The issues the file covers, for example [1, 2, 8]. */
  issues: number[]
  spaces: string[]
  summary: SummaryTopic[]
  sharedStakeholders: CrossSharedStakeholder[]
  repeatedNeeds: CrossRepeatedNeed[]
  focusGroups: CrossFocusGroup[]
  needGroups: CrossNeedGroup[]
  conflicts: CrossConflict[]
  /** In code order (X-A, X-B, …). */
  solutions: CrossSolution[]
  solutionFocus: CrossSolutionFocus[]
  pending: CrossPending[]
}
