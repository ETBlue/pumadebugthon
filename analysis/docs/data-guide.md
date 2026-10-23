# 資料說明：整理好的資料表

本頁說明網站「關於本站 → 下載資料」裡的「整理好的資料表」。每一種有編號的項目（議題、利害關係人、使用者故事、需求、解法等）都有一個檔案。每一列是一個項目。歡迎在授權範圍內再利用（見「[授權](#授權)」）。

- 本專案是一位個人參加者用 AI 協助製作的模擬，與主辦單位無關。
- 標記 `AI模擬` 的內容**不是真實訪談**，也**不是真實市民的話**。請不要把它當成市民意見引用。標記的意思見「[標記](#標記)」。
- 怎麼讀分析的內容（編號、優先順序、步驟），見[如何閱讀議題分析](method.md)。

## 檔案在哪裡

網站的 `data/flat/` 資料夾。每一種項目有兩個檔案，內容相同：

- `<類型>.csv`：給試算表用（Excel、Google 試算表、LibreOffice）。
- `<類型>.json`：給程式用。

例如使用者故事：`https://etblue.github.io/pumadebugthon/data/flat/stories.csv` 和 `stories.json`。網站的「關於本站」頁有每個檔案的連結。

這些檔案由 `analysis/scripts/build_flat.py` 產生。`analysis/scripts/build_all.sh` 每次都會重新產生它們，資料來自網站讀取的同一份 JSON（`index.json`、`issues/<資料夾>.json`、`cross-issue.json`）。所以它們和網站的內容一致。請不要手動修改：下次產生時會被覆蓋。要改內容，請改各議題的 `issue-analysis.md`。

這些檔案不放在 repo 裡（不 commit）。repo 已經有原始的 Markdown 和 CSV，再放一份產生的檔案，兩份可能不一致。網站每次部署時都會重新產生。

## 共同規則

### 格式

| 項目 | CSV | JSON |
|---|---|---|
| 編碼 | UTF-8，開頭有 BOM，讓 Excel 正確顯示中文（和 `analysis/data/*.csv` 相同） | UTF-8 |
| 欄位 | 第一列是欄位名稱 | 一個陣列，每一列是一個物件，key 和 CSV 的欄位名稱相同 |
| 多個值 | 用一個半形空格隔開，例如 `2-N01 2-N04` | 陣列，例如 `["2-N01", "2-N04"]` |
| 空值 | 空白 | `null`（多個值的欄位是 `[]`） |
| 是與否 | `true`、`false` | `true`、`false` |

欄位名稱用英文，和網站的 JSON 一樣，方便寫程式。下面的表格寫出每個欄位的中文意思。文字欄位可能有 Markdown（例如 `**粗體**` 和連結）。

### 編號

每個檔案的 `id` 欄在該檔案中不重複。

- **全站共用的編號**：利害關係人（`O01`、`I06`）、空間類型（`sidewalk`）、跨議題分析的編號（`X-N01`、`X-C1`、`X-A`）。它們的 `id` 就是原本的編號。
- **議題的編號**：故事（`O01-US01`）、相同訴求群組（`W01`）、相同需求群組（`N01`）、衝突（`C1`）、解法（`A`）只在一個議題裡不重複。例如 #1 和 #2 都有 `N01`。所以 `id` 是「議題編號-原本的編號」，例如 `2-N01`、`2-O01-US01`、`2-W01`、`2-C1`、`2-A`。這和網站解法網址的寫法相同（`#/solutions/2-A`）。
- 議題的編號另外有兩欄：`issue`（議題編號，例如 `2`）和 `local_id`（原本的編號，例如 `N01`）。
- 議題的 `id` 是議題編號，例如 `2`。

### 連結

指向其他項目的欄位，寫的是那個項目在它的檔案裡的 `id`。所以可以用 `id` 把兩個檔案接起來（例如試算表的 `XLOOKUP`，或資料庫的 join）。每個欄位指向哪個檔案，寫在下面的表格。

### 標記

有標記的文字欄位，後面有一欄 `<欄位名稱>_tag`，例如 `want` 和 `want_tag`。標記不放在文字裡。

| `_tag` 的值 | 意思 |
|---|---|
| `實證` | 有來源連結或可查證的出處，或 AI 整理的內容已經由真人抽查確認。 |
| `AI整理` | 由 AI 從真實的來源整理：「市長，你給我聽好了」的資料（附有件數），或新聞報導。**還沒有經過真人查核**。件數是用關鍵字比對算出的估計。 |
| `AI模擬` | 由 AI 推想，背後沒有資料。**不是真實訪談**，也**不是真實市民的話**。 |
| `待補` | 這一格是 `【待補：…】`：需要真人提供的資訊。文字欄寫缺少什麼。 |
| 空白 | 原本的格子沒有標記。 |

完整的說明見[如何閱讀議題分析的「標記」](method.md#標記)。

### 日期

`added`（新增日期）和 `updated`（更新日期）的格式是 `YYYY-MM-DD`。規則見[如何閱讀議題分析的「新增日期與更新日期」](method.md#新增日期與更新日期)。沒有這個日期時是空值。

## 檔案與欄位

### issues：議題

一列是一個議題。

| 欄位 | 意思 |
|---|---|
| `id` | 議題編號，例如 `2` |
| `folder` | `analysis/` 裡的資料夾名稱，例如 `2-trashcans` |
| `title` | 題目 |
| `source` | `主辦單位` 或 `參加者補充` |
| `available` | `true`：已經有分析。`false`：製作中，其他檔案沒有它的資料 |
| `spaces` | 空間類型 → `space-types` |
| `added`、`updated` | 新增日期、更新日期 |

### stakeholders：利害關係人

一列是一個利害關係人編號。全站共用：同一個編號在不同議題是同一個利害關係人。

| 欄位 | 意思 |
|---|---|
| `id` | 利害關係人編號：`O`（組織）或 `I`（個人），例如 `O04` |
| `name` | 名稱 |
| `path` | 分類路徑，例如 `gov-local-taipei-epb`（見[分類路徑與特別關注](method.md#分類路徑與特別關注)） |
| `focus` | 特別關注族群，例如 `高齡` |
| `issues` | 出現在哪些議題 → `issues` |
| `moved_to` | 這個編號改成別的編號時，新的編號 → `stakeholders`。這種列沒有議題 |
| `added`、`updated` | 新增日期、更新日期 |

### issue-stakeholders：各議題的利害關係人

一列是「一個議題裡的一個利害關係人」（步驟 1 的表格）。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `2-O01` |
| `issue` | 議題 → `issues` |
| `stakeholder` | 利害關係人 → `stakeholders` |
| `relation`、`relation_tag` | 與本題的關係 |

### stories：使用者故事

一列是一則使用者故事（步驟 4 的總表）。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `2-O01-US01` |
| `issue`、`local_id` | 議題編號、原本的故事編號 |
| `stakeholder` | 利害關係人 → `stakeholders` |
| `want`、`want_tag` | 我想要… |
| `want_group` | 相同訴求群組 → `wants`。沒有群組時是空值 |
| `so_that`、`so_that_tag` | 以便… |
| `need` | 這則故事的需求 → `needs`：它的相同需求群組（例如 `2-N01`），或它自己（例如 `2-O04-US02`，一則故事自己是一個需求） |
| `priority`、`priority_tag` | 需求的優先順序（MoSCoW：`M`、`S`、`C`、`W`）和它的標記 |
| `source` | 來源 |
| `added`、`updated` | 新增日期、更新日期 |

### wants：相同訴求群組（W）

一列是一個相同訴求群組：「我想要…」相同的故事。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `2-W01` |
| `issue`、`local_id` | 議題編號、原本的編號 |
| `summary`、`summary_tag` | 我想要（摘要） |
| `stories` | 故事 → `stories` |

### needs：需求

一列是一個需求（步驟 5.2 的表格）。一個需求是一個相同需求群組（N），或不在任何群組裡的一則故事。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `2-N01`，或 `2-O04-US02`（一則故事） |
| `issue`、`local_id` | 議題編號、原本的編號 |
| `kind` | `group`：相同需求群組。`story`：一則故事 |
| `summary`、`summary_tag` | 以便（摘要）。只有 `group` 有標記；`story` 的標記見那則故事的 `so_that_tag` |
| `stories` | 故事 → `stories` |
| `priority`、`priority_tag` | 優先順序（MoSCoW）和它的標記 |
| `reason`、`reason_tag` | 理由 |

### conflicts：衝突（C）

一列是一個衝突（步驟 6.4）。衝突有兩邊：A 和 B。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `2-C1` |
| `issue`、`local_id` | 議題編號、原本的編號 |
| `text`、`text_tag` | 衝突 |
| `stories_a`、`stories_b` | 兩邊的故事 → `stories` |
| `needs_a`、`needs_b` | 兩邊的需求 → `needs` |
| `way_out`、`way_out_tag` | 以需求為本的解方 |
| `way_out_solutions` | 解方用到的解法 → `solutions` |
| `method`、`method_tag` | 可能的審議方法 |
| `result`、`result_tag` | 模擬結果 |

### solutions：解法

一列是一個議題的解法（步驟 6 和步驟 7 的總覽）。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `2-A` |
| `issue`、`local_id` | 議題編號、原本的代號（例如 `A`） |
| `name`、`name_tag` | 解法名稱 |
| `summary` | 一句話說明 |
| `spaces` | 空間類型 → `space-types` |
| `needs_must` | 涵蓋的 Must 需求 → `needs` |
| `needs_should_could` | 涵蓋的 Should／Could 需求 → `needs` |
| `stories` | 涵蓋的故事 → `stories` |
| `cost`、`cost_tag` | 成本（步驟 7 總覽） |
| `feasibility`、`feasibility_tag` | 可行性（步驟 7 總覽） |
| `risk`、`risk_tag` | 主要風險（步驟 7 總覽） |
| `owner`、`owner_tag` | 主責單位（步驟 7 總覽） |
| `added`、`updated` | 新增日期、更新日期 |

步驟 7 的評估表與執行計畫表（相關法規、隱私、執行步驟等）一個格子可以有多個標記，所以不放在這個檔案。它們在網站的議題 JSON（`data/issues/<資料夾>.json` 的 `solutions[].evaluation` 和 `solutions[].plan`）。成效衡量也在那裡（`solutions[].measures`）。

### cross-need-groups：跨議題的共同需求（X-N）

一列是一個跨議題的共同需求：不同議題裡相同的需求。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `X-N01` |
| `summary`、`summary_tag` | 需求的摘要 |
| `needs` | 各議題的需求 → `needs` |
| `stories` | 各議題的故事 → `stories` |
| `stakeholders` | 利害關係人 → `stakeholders` |
| `priority`、`priority_tag` | 共同的優先順序。各議題的優先順序不同時是空值 |
| `priorities_differ` | `true`：各議題的優先順序不同 |
| `reason`、`reason_tag` | 理由 |

### cross-conflicts：跨議題的衝突（X-C）

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `X-C1` |
| `text`、`text_tag` | 衝突 |
| `issue_conflicts` | 它合併的各議題衝突 → `conflicts` |
| `stories_a`、`stories_b` | 兩邊的故事 → `stories` |
| `needs_a`、`needs_b` | 兩邊的需求 → `needs`，或跨議題的共同需求 → `cross-need-groups`（以 `X-N` 開頭） |
| `way_out`、`way_out_tag` | 以需求為本的解方 |
| `way_out_solutions` | 解方用到的合併解法 → `cross-solutions` |
| `method`、`method_tag` | 可能的審議方法 |
| `result`、`result_tag` | 模擬結果 |

### cross-solutions：合併的解法（X-A…）

一列是一個合併的解法：它由幾個議題的解法組成，不取代各議題的解法。

| 欄位 | 意思 |
|---|---|
| `id` | 例如 `X-A` |
| `name`、`name_tag` | 名稱 |
| `summary` | 說明 |
| `parts` | 它合併的各議題解法 → `solutions`，例如 `1-C 2-D 8-A` |
| `spaces` | 空間類型 → `space-types` |
| `needs_must`、`needs_should_could` | 涵蓋的 Must、Should／Could 需求 → `needs`（或 `cross-need-groups`） |
| `cross_need_groups` | 涵蓋的跨議題共同需求 → `cross-need-groups` |
| `added`、`updated` | 新增日期、更新日期 |

### space-types：空間類型

| 欄位 | 意思 |
|---|---|
| `id` | 代碼，例如 `sidewalk` |
| `name` | 名稱，例如 `人行道` |
| `group` | 分組，例如 `道路` |
| `description` | 說明 |
| `added`、`updated` | 新增日期、更新日期 |

## 沒有放進這些檔案的資料

這些資料沒有自己的編號，所以沒有自己的檔案。它們都在網站的 JSON 裡：

- 分析摘要、可能的輸入來源（步驟 1.2）、特別關注族群檢查、【待補】清單：`data/issues/<資料夾>.json`。
- 步驟 7 的評估表、執行計畫表、成效衡量、相關政策：`data/issues/<資料夾>.json` 的 `solutions[]`，以及 `data/cross-issue.json` 的 `solutions[]`。
- 分類路徑的名稱：`data/index.json` 的 `pathLabels`，或 `analysis/data/path-labels.csv`。
- 分析引用的開放資料集：`data/index.json` 的 `openData`，或 `analysis/data/open-data.csv`。

## 個人資料與市民資料

- 這些檔案只有分析檔案裡已經有的內容。
- 「市長，你給我聽好了」資料只用來整理件數和改寫的摘要（標記 `AI整理`）。檔案裡沒有原始留言，也不辨認任何個人。

## 授權

和 repo 的 [`LICENSE-CONTENT.md`](../../LICENSE-CONTENT.md) 相同：

- 作者 ETBlue 製作的內容：[創用 CC 姓名標示 4.0 國際（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/)。姓名標示請寫：ETBlue，並附上 <https://github.com/ETBlue/pumadebugthon>。
- **主辦單位的內容**：分析引用的題目原文（例如題目名稱、標記為 `實證` 的題目內容），著作權屬於市政 debug 松的主辦單位，依主辦單位的規定使用，不適用 CC BY 4.0。
- **開放資料**：從開放資料算出的數字，依各資料集的授權使用。多數使用「政府資料開放授權條款第 1 版」。
- **主辦單位的保密資料**：從「市長，你給我聽好了」資料整理的件數和改寫的摘要（標記 `AI整理`，或經真人查核後的 `實證`），依活動規則僅限於此黑客松活動使用，不適用 CC BY 4.0。
