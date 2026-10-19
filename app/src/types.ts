// Types for the JSON written by analysis/build_json.py.
// build_json.py is the source of truth. When it changes, change these types.

/** A tag on analysis text (see analysis/method.md, section 標記).
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

/** 來源 in analysis/issues.csv: the hackathon host's issue, or an issue a
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
  updated: null
  counts: null
  focusGaps: null
}

export type IssueSummary = AvailableIssueSummary | UnavailableIssueSummary

/** A row of analysis/stakeholders.csv. */
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
}

/** A row of analysis/space-types.csv. */
export interface SpaceType {
  code: string
  name: string
  group: string
  description: string
}

/** A row of analysis/open-data.csv: an open dataset that an issue's appendix
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
  priority: Priority
  priorityTag: PriorityTag
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

/** A row of 5.4. 相關故事 is split on 「 vs 」 into two sides. */
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
  /** Story IDs from the 涵蓋的 Must and 涵蓋的 Should / Could columns of 6.2. */
  stories: string[]
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
  /** 分析摘要: 5 topics, in the fixed order (SUMMARY_TOPICS). The summary
   * adds no new facts; each item lists where it comes from. */
  summary: SummaryTopic[]
  stakeholders: IssueStakeholder[]
  inputSources: InputSource[]
  /** The 特別關注族群檢查 table: 6 groups, in the fixed order. */
  focusGroups: FocusGroup[]
  stories: Story[]
  groups: Group[]
  conflicts: Conflict[]
  solutions: Solution[]
  pending: Pending[]
}
