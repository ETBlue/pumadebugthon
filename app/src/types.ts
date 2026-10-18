// Types for the JSON written by analysis/build_json.py.
// build_json.py is the source of truth. When it changes, change these types.

/** A tag on analysis text (see analysis/method.md, section 標記).
 * 實證: a person can check the source, or a person checked the AI summary.
 * AI整理: AI summarized it from real data, with counts; not checked by a person yet.
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
  /** Stories whose 我想要… cell has the 實證 tag. */
  wantsEvidence: number
  /** Stories whose 我想要… cell has the AI整理 tag. */
  wantsAiSummary: number
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
}

/** An issue without an analysis yet (shown as 製作中). */
export interface UnavailableIssueSummary extends IssueSummaryBase {
  available: false
  spaces: []
  updated: null
  counts: null
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
}

/** A row of analysis/space-types.csv. */
export interface SpaceType {
  code: string
  name: string
  group: string
  description: string
}

export interface IndexFile {
  issues: IssueSummary[]
  stakeholders: Stakeholder[]
  /** 分類路徑 prefix -> name, for example "gov" -> "政府". */
  pathLabels: Record<string, string>
  spaceTypes: SpaceType[]
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
  /** Story IDs from the 涵蓋的 Must and 涵蓋的 Should / Could columns of 6.2. */
  stories: string[]
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
  stakeholders: IssueStakeholder[]
  inputSources: InputSource[]
  stories: Story[]
  groups: Group[]
  conflicts: Conflict[]
  solutions: Solution[]
  pending: Pending[]
}
