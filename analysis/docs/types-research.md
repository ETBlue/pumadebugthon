# Draft: domain types (領域) and solution types (解法類型)

Status: draft for ETBlue's review. Round 1 and round 2: 2026-10-30. Round 3 (nested types): 2026-10-31. The newest round is at the top.

Note on IDs (2026-10-31): this draft is a record and keeps the old IDs. Since then the IDs changed (`app/docs/design.md`, decision on the new ID format):

| Old ID in this draft | New ID |
|---|---|
| Issue solution `A`, `B` … (full ID `1-A`) | `S1`, `S2` … (full ID `1-S1`) |
| Cross-issue solution `X-A` … `X-M` | `X-S1` … `X-S13` |
| Cross-issue need group `X-N01` … `X-N20` | `X-N1` … `X-N20` |

Rules used in this draft:

- Types are labels only. They are not scores, weights or ranks. An item can have more than one type.
- Counts in this draft only show how well a list works. They never change MoSCoW and are never used to sort.
- Lists are sorted by issue number and solution ID.

---

# Round 3 (2026-10-31): nested types

ETBlue's decisions for this round:

1. Spaces and domains have 2 levels. Level 1 is a parent. Level 2 is a child.
2. Only level 2 codes are put on issues and solutions. Level 1 comes from the parent.
3. The candidate rule (R3) matches on level 2 only. Level 1 is too wide for matching.
4. Domains use the official 政事別 list: 大分類 is level 1 and 中分類 is level 2. The list is copied in full, also the items with no issue yet. Items that only the central government can use are left out.

Round 3 replaces the lists in R2.1. The solution types, the space tags of each solution, and the R3 rule are the same as in Round 2.

## R3.1 Space types (4 parents, 19 children)

The column `分組` in `space-types.csv` becomes `上層`. It holds the parent code. A parent row has an empty `上層`.

| 上層 (level 1) | 子類型 (level 2) |
|---|---|
| `road` 道路 | `sidewalk-walkway` 人行道通行帶、`sidewalk-furniture` 人行道設施帶、`crossing` 路口與行人穿越道、`alley` 巷弄、`arcade` 騎樓、`bike-lane` 單車道、`scooter-lane` 機車道、`car-lane` 汽車道、`bus-stop` 公車站與候車亭 |
| `underground` 地下 | `sewer` 下水道、`utility` 地下管線 |
| `public-space` 公共空間 | `park` 公園綠地、`mrt-exit` 捷運站出口與周邊、`parking` 停車場 |
| `building` 建築 | `indoor-home` 住家、`indoor-common` 公寓共用空間、`indoor-business` 營業場所、`indoor-public` 公共設施室內、`building-shell` 建築物外牆與結構 |

Notes:

- The 4 parents are the 4 groups that `space-types.csv` has today. They only get codes.
- The new groups 「人行道」 and 「室內」 from R2.1 are dropped. The sidewalk codes are under `road`, and the indoor codes are under `building`.
- The definitions and tests of the 8 new codes are in R2.1. They do not change.

## R3.2 Domain types (8 parents, 28 children)

### Sources

1. **The national standard:** 「歲出政事別科目歸類原則與範圍」 by 行政院主計總處 (the copy on the 主計總處 site). It gives the full list of 大分類 and 中分類, with the scope of each one. This is the main source for the list and for the meaning of each code.
2. **An older local copy of the same standard**, for 縣（市）, from 臺中市政府主計處. It has the same scope texts for the items below. It still has 警政支出 as its own 大分類 and 「政權行使支出」 for the city council, as Taipei did up to 107年度.
3. **Taipei's own budget data** on the open data platform:
   - 「臺北市總預決算歲出按政事別」 (data.gov.tw dataset 138491): the full list of every year from 95年度 to 107年度.
   - 「臺北市追加減預算總表歲出政事別追加減預算總表」 (data.gov.tw dataset 132970): 17 tables from 107年度 to 115年度.

   These show which items Taipei uses and in which order. From 108年度 on, Taipei uses the same structure as the national standard: 警政支出 and 立法支出 are under 一般政務支出, and 環境保護支出 and 社區發展支出 are under one 大分類.

### The list

The national standard also has items that only the central government uses: 國防支出, and under 一般政務支出 also 國務、司法、考試、監察、外交、僑務. A city has none of these duties, so they are left out. Every other item is in the list, also items with no issue yet.

| 上層 (大分類, level 1) | 子類型 (中分類, level 2) |
|---|---|
| `general-affairs` 一般政務 | `administration` 行政、`legislature` 立法、`civil-affairs` 民政、`police` 警政、`finance` 財務 |
| `education-culture` 教育科學文化 | `education` 教育、`science` 科學、`culture` 文化 |
| `economic-development` 經濟發展 | `agriculture` 農業、`industry` 工業、`transport` 交通、`other-economic` 其他經濟服務 |
| `social-welfare` 社會福利 | `social-insurance` 社會保險、`social-assistance` 社會救助、`welfare-services` 福利服務、`employment` 國民就業、`health` 醫療保健 |
| `community-environment` 社區發展及環境保護 | `environment` 環境保護、`community-development` 社區發展 |
| `pension` 退休撫卹 | `pension-payments` 退休撫卹給付、`pension-admin` 退休撫卹業務 |
| `debt` 債務 | `debt-interest` 債務付息、`debt-admin` 還本付息事務 |
| `other-expenses` 補助及其他 | `project-grants` 專案補助、`balancing-grants` 平衡預算補助、`assistance` 協助、`reserve` 第二預備金、`other` 其他 |

Notes:

- The names leave out the word 「支出」. The CSV keeps the full official name in a `政事別` column (for example 「交通支出」). The 說明 of each code is a short version of the scope text in the national standard.
- 科學支出 is in the standard but Taipei has never used it in 95–115年度. It stays in the list because the list is copied in full.

### What the scope texts settle

The 【待查】 items of the first Round 3 draft are now answered by the standard:

| Question | Answer in the standard |
|---|---|
| Where is 消防? | 民政支出: 「凡辦理選舉、民政、戶政、役政、地政、消防等業務有關之支出」. **Not** 警政支出. |
| Where is 建管? | 工業支出: 「凡辦理工、礦、營造、建管、水電等業務」. |
| What is 社區發展? | 國民住宅輔助興建、公共建設管線、新市鎮、社區開發. |
| Where is 都市計畫? | Not named in any scope text. 【待查】 It is not needed for the current tags. |

## R3.3 Tags that change

Only the domain tags change. All other tags stay as in R2.2.

| Where | Round 2 | Round 3 | Why |
|---|---|---|---|
| #1, #2, #10, #11 | `environment` | `environment` | |
| #3 | `environment`、`health` | `environment`、`health` | |
| #4, #5, #12 | `transport` | `transport` | |
| #6 | `urban-housing`、`public-safety` | `industry`、`community-development`、`civil-affairs` | 建管 and building safety are 工業; housing and rebuilding are 社區發展; 消防 is 民政 |
| #8 | `health`、`environment` | `health`、`environment` | |
| #9 | `governance` | `administration`、`civil-affairs` | 研考 and 資訊 are 行政; citizen participation and 區政 are 民政 |
| 4-B, 5-C (own domain) | `economy-labour` | `employment` | work hours and workers |
| 4-C (own domain) | `public-safety` | `civil-affairs` | priority for fire engines and ambulances, which the 消防局 runs |
| 6-C, 11-D (own domain) | `social-welfare` | `welfare-services` | help for older and low-income people |
| 10-E (own domain) | `governance` | `civil-affairs` | 調解委員會 is 民政 |

Note: the name 「工業」 for building safety reads strangely, but it is the official grouping. The app can show the scope text next to the name.

## R3.4 R3 results with the new codes

I ran the R3 rule again with the level 2 domain codes.

- 47 related issue pairs, **139** candidates (was 138), **69** new (was 68).
- The X- check is the same as Round 2 (9 found, 3 partly found, 1 missed).
- No pair was lost. One pair was added:

| 解法甲 | 解法乙 | 共同解法類型 | 共同領域 | 共同需求 |
|---|---|---|---|---|
| 6-B 老屋健檢與公辦都更的排序方法 | 9-A 小規模試辦與獨立評估 | `planning` | `civil-affairs` | X-N04 |

The other 68 new pairs are the same as in the Round 2 list below.

---

# Round 2 (2026-10-30)

This round uses ETBlue's decisions on round 1:

1. Domains are based on 政事別 中分類.
2. `greenery` is dropped. #1 is `environment`. The list has 9 domains.
3. The 13 solution types stay.
4. A solution has at most 3 solution types (1-B, 5-A, 6-D and 12-A stay at 3).
5. A single solution gets its own domain only when it differs from its issue's domains.
6. `sidewalk` and `indoor` are split into more exact space types.
7. `open-data` and `intake` solutions may combine across all issues.
8. Rule: B1 (shared domain, or shared solution-level space type), and the two issues also share a stakeholder or a need.

Round 1 is below this section. It is not changed, except that its title is now 「Round 1」.

## R2.1 Final lists

### Domains (9)

| 代碼 | 名稱 | 政事別 (大分類 > 中分類) | 陳情系統 主類別 |
|---|---|---|---|
| `transport` | 交通 | 經濟發展支出 > 交通支出 | 交通運輸；道路、山坡地、路樹及路燈（道路、人行道）；警消、法務及政風（交通事故、違規停車） |
| `environment` | 環境保護 | 社區發展及環境保護支出 > 環境保護支出 | 垃圾、噪音、污染及資源回收；公園、排水溝、下水道及自來水；道路、山坡地、路樹及路燈（路樹） |
| `health` | 醫療保健 | 社會福利支出 > 醫療保健支出 | 衛福、勞動、民政、區政及動保（疾病防治、菸害防制、食品衛生） |
| `social-welfare` | 社會福利 | 社會福利支出 > 福利服務支出、社會救助支出 | 衛福、勞動、民政、區政及動保（社會救助、福利服務、長照、街友） |
| `urban-housing` | 都市發展與住宅 | 社區發展及環境保護支出 > 社區發展支出【待查】 | 都市發展、建管、產業、財稅及地政 |
| `public-safety` | 治安與防災 | 一般政務支出 > 警政支出（消防【待查】） | 警消、法務及政風 |
| `education-culture` | 教育與文化 | 教育科學文化支出 | 文教、體育、資訊、觀光及媒體 |
| `economy-labour` | 產業與勞動 | 經濟發展支出 > 農業、工業、其他經濟服務支出；社會福利支出 > 國民就業支出 | 都市發展、建管、產業、財稅及地政（產業發展）；衛福、勞動、民政、區政及動保（勞工、就業） |
| `governance` | 市政治理與參與 | 一般政務支出 > 民政支出、行政支出 | 衛福、勞動、民政、區政及動保（民政、區政）；文教、體育、資訊、觀光及媒體（資訊服務） |

The meanings are the same as in round 1 (section 1.3). Parks and street trees are now part of `environment`.

### Solution types (13)

The same as round 1 (section 2.2): `digital-tool` 數位工具, `open-data` 資料公開, `outreach` 宣導與教育, `participation` 參與與協商, `intake` 受理與派工, `procedure` 作業流程, `regulation` 法規與規則, `enforcement` 稽查與執法, `facility` 設施與工程, `service` 直接服務, `subsidy` 補助與獎勵, `resources` 人力與預算, `planning` 調查與規劃.

### New space types (replace `sidewalk` and `indoor`)

How the app uses space types today (I read `app/src`):

- `#/spaces` lists every space type and filters by 分組 (`listFilter.ts`, decision 122).
- `#/spaces/<code>/<tab>` is one page per code, with tabs for issues, solutions and stakeholders (`Space.tsx`, `spaceTabs.ts`, `lib/spaces.ts`).
- The issue page shows 「使用相同空間的議題」 (`sameSpaceIssues`).
- `#/issues` and `#/solutions` filter by space code (`listFilter.ts`, `solutionList.ts`).
- Issue cards and solution cards link each code to its space page (`SpaceLinks.tsx`).
- The app reads the codes from the data. No code in `app/src` depends on the names `sidewalk` or `indoor`. They are only in comments, tests and test fixtures.

Proposal: 8 new codes. The old codes `sidewalk` and `indoor` are removed. The parent is kept as a **分組**, so `#/spaces` can still show "all sidewalk types" or "all indoor types" with the existing group filter. The new codes start with the old code (`sidewalk-…`, `indoor-…`), so the link is also visible in the code.

| 代碼 | 名稱 | 分組 | 說明 (one line) | Test: a solution uses this space if … |
|---|---|---|---|---|
| `sidewalk-walkway` | 人行道通行帶 | 人行道 (new) | The part of the sidewalk kept clear for walking, with its surface and ramps | … it changes, protects or checks the walking path (clear width, surface, ramps), or it sets rules for people who walk or stand there |
| `sidewalk-furniture` | 人行道設施帶 | 人行道 (new) | The strip of the sidewalk where trees, tree pits, bins, poles, boxes, signs, bus stop poles and smoking areas stand | … it places, moves, removes or looks after an object on the sidewalk |
| `crossing` | 路口與行人穿越道 | 道路 | Junctions, crosswalks, refuge islands and pedestrian signals | … it is about how people or vehicles cross or turn at a junction, or about a crosswalk or its signal |
| `alley` | 巷弄 | 道路 | Narrow lanes, usually with no separate sidewalk, shared by people and vehicles | … it is about 巷弄 or 巷道, or about streets with no sidewalk |
| `indoor-home` | 住家 | 室內 (new) | Inside a home | … the work is done inside a home, or the problem starts there (furniture to throw out, a neighbour's noise, smoke into a home, a home's earthquake check) |
| `indoor-common` | 公寓共用空間 | 室內 (new) | Stairs, corridors, entrances, lobbies and lifts of a residential building | … it is about the shared parts that residents or a 管委會 manage |
| `indoor-business` | 營業場所 | 室內 (new) | Inside shops, restaurants, markets, offices and other workplaces | … a business or employer must act inside its own premises |
| `indoor-public` | 公共設施室內 | 室內 (new) | Inside schools, public buildings and staff rooms of public services | … it is inside a building run by the government or a public service |

Notes:

- `crossing` and `alley` were not separate before. Junctions were tagged `sidewalk` or `car-lane`, and lanes were tagged `sidewalk` or `car-lane`. I added them because the split of `sidewalk` showed that several solutions are really about junctions (#4 C, #10 F, #12 A) or lanes (#6 B, #6 F, #12 C).
- The new group 「室內」 holds the four `indoor-…` codes. `building-shell` stays in 「建築」. If ETBlue prefers, the four codes can stay in 「建築」 too.
- The space-type list grows from 13 to 19.

## R2.2 Tagging tables

### Issues

The header line 「空間類型：」 is the union of the issue's 6.1 spaces. The table shows the new header.

| 議題 | 領域 | 空間類型 (new header = union of its solutions) |
|---|---|---|
| #1 | `environment` | `sidewalk-walkway`、`sidewalk-furniture`、`crossing`、`bike-lane`、`utility`、`park` |
| #2 | `environment` | `sidewalk-furniture`、`arcade`、`park`、`mrt-exit` |
| #3 | `environment`、`health` | `sidewalk-furniture`、`arcade`、`sewer`、`park`、`mrt-exit`、`indoor-home`、`indoor-business`、`indoor-public` |
| #4 | `transport` | `sidewalk-walkway`、`crossing`、`alley`、`bike-lane`、`scooter-lane`、`car-lane`、`bus-stop`、`mrt-exit`、`parking`、`indoor-business` |
| #5 | `transport` | `sidewalk-furniture`、`scooter-lane`、`car-lane`、`bus-stop`、`mrt-exit`、`parking`、`indoor-public` |
| #6 | `urban-housing`、`public-safety` | `sidewalk-walkway`、`arcade`、`alley`、`indoor-home`、`indoor-common`、`building-shell` |
| #8 | `health`、`environment` | `sidewalk-walkway`、`sidewalk-furniture`、`arcade`、`bus-stop`、`park`、`mrt-exit`、`indoor-home`、`indoor-common` |
| #9 | `governance` | 無 |
| #10 | `environment` | `sidewalk-walkway`、`crossing`、`scooter-lane`、`car-lane`、`park`、`indoor-home`、`indoor-common`、`indoor-business`、`building-shell` |
| #11 | `environment` | `sidewalk-walkway`、`sidewalk-furniture`、`arcade`、`indoor-home`、`indoor-common` |
| #12 | `transport` | `sidewalk-walkway`、`sidewalk-furniture`、`arcade`、`crossing`、`alley`、`scooter-lane`、`car-lane`、`parking` |

### Solutions (63)

Old and new space types, solution types (no change from round 1), and the solution's own domain when it differs from the issue.

| 解法 | 名稱 | 空間類型 (old) | 空間類型 (new) | 解法類型 | 領域 (only if different) |
|---|---|---|---|---|---|
| 1-A | 樹蔭缺口與補植候選地圖（見縫插樹） | `sidewalk`、`bike-lane`、`utility`、`park` | `sidewalk-furniture`、`bike-lane`、`utility`、`park` | `digital-tool`、`planning` |  |
| 1-B | 保留樹清單與移除紀錄公開 | `sidewalk`、`park` | `sidewalk-furniture`、`crossing`、`park` | `intake`、`open-data`、`regulation` |  |
| 1-C | 參與式補植與移樹公告流程 | `sidewalk`、`park` | `sidewalk-furniture`、`park` | `participation`、`procedure` |  |
| 1-D | 人行道、樹穴與管線共同設計規範 | `sidewalk`、`bike-lane`、`utility` | `sidewalk-walkway`、`sidewalk-furniture`、`bike-lane`、`utility` | `facility`、`regulation` |  |
| 1-E | 市民提名重要樹木 | `sidewalk`、`park` | `sidewalk-furniture`、`park` | `participation`、`procedure` |  |
| 1-F | 長期養護經費、人力與採購 | `sidewalk`、`park` | `sidewalk-furniture`、`park` | `procedure`、`resources` |  |
| 2-A | 清潔箱佈建建議地圖 | `sidewalk`、`mrt-exit` | `sidewalk-furniture`、`mrt-exit` | `digital-tool`、`planning` |  |
| 2-B | 滿溢回報與動態清運 | `sidewalk`、`park`、`mrt-exit` | `sidewalk-furniture`、`park`、`mrt-exit` | `digital-tool`、`intake` |  |
| 2-C | 找桶指引與開放資料更新 | `sidewalk`、`arcade`、`park`、`mrt-exit` | `sidewalk-furniture`、`arcade`、`park`、`mrt-exit` | `digital-tool`、`open-data` |  |
| 2-D | 參與式選址流程 | `sidewalk`、`arcade`、`park` | `sidewalk-furniture`、`arcade`、`park` | `participation` |  |
| 2-E | 家用垃圾的彈性收集點（題目外的配套） | `sidewalk`、`park` | `sidewalk-furniture`、`park` | `facility`、`service` |  |
| 3-A | 鼠患風險地圖與防治排序 | `sidewalk`、`arcade`、`sewer`、`park`、`mrt-exit` | `sidewalk-furniture`、`arcade`、`sewer`、`park`、`mrt-exit` | `planning` |  |
| 3-B | 垃圾與廚餘的密封收集與收運調整 | `sidewalk`、`arcade`、`indoor` | `sidewalk-furniture`、`arcade`、`indoor-business` | `facility`、`procedure` |  |
| 3-C | 下水道與側溝的修補、清淤與接管 | `sidewalk`、`sewer` | `sidewalk-furniture`、`sewer` | `enforcement`、`facility` |  |
| 3-D | 分區同步防治與安全投藥 | `sidewalk`、`arcade`、`sewer`、`park`、`mrt-exit` | `sidewalk-furniture`、`arcade`、`sewer`、`park`、`mrt-exit` | `procedure`、`service` |  |
| 3-E | 社區、店家與學校的防鼠診斷與輔導 | `arcade`、`indoor` | `arcade`、`indoor-home`、`indoor-business`、`indoor-public` | `enforcement`、`service`、`subsidy` |  |
| 3-F | 鼠患通報與防治進度公開 | `sidewalk`、`arcade`、`park`、`mrt-exit` | `sidewalk-furniture`、`arcade`、`park`、`mrt-exit` | `intake`、`open-data` |  |
| 4-A | 晨尖峰內科車流熱力儀表板與歷史資料保存 | `scooter-lane`、`car-lane`、`mrt-exit` | `scooter-lane`、`car-lane`、`mrt-exit` | `digital-tool`、`open-data` |  |
| 4-B | 企業分批上班、彈性工時與交通車的協商 | `car-lane`、`bus-stop`、`indoor` | `car-lane`、`bus-stop`、`indoor-business` | `participation`、`subsidy` | `economy-labour` |
| 4-C | 主要路廊的號誌調整與路口改善 | `sidewalk`、`scooter-lane`、`car-lane` | `crossing`、`scooter-lane`、`car-lane` | `facility` | `public-safety` |
| 4-D | 大眾運輸、接駁與跨市路線的加強 | `car-lane`、`bus-stop`、`mrt-exit` | `car-lane`、`bus-stop`、`mrt-exit` | `planning`、`service` |  |
| 4-E | 學校周邊、住宅巷弄與自行車通勤的安全 | `sidewalk`、`bike-lane`、`car-lane`、`indoor` | `sidewalk-walkway`、`alley`、`bike-lane`、`car-lane`、`indoor-business` | `facility` |  |
| 4-F | 違規停車、臨停與貨車裝卸的管理 | `sidewalk`、`car-lane`、`parking` | `sidewalk-walkway`、`car-lane`、`parking` | `enforcement`、`regulation` |  |
| 4-G | 聯外橋梁、匝道與道路的評估 | `scooter-lane`、`car-lane` | `scooter-lane`、`car-lane` | `participation`、`planning` |  |
| 5-A | 平穩駕駛與乘客安全 | `car-lane`、`bus-stop` | `car-lane`、`bus-stop` | `procedure`、`resources` |  |
| 5-B | 用上下車資料重劃路網與捷運接駁 | `car-lane`、`bus-stop`、`mrt-exit` | `car-lane`、`bus-stop`、`mrt-exit` | `open-data`、`planning` |  |
| 5-C | 駕駛的休息與班表 | `bus-stop`、`parking`、`indoor` | `bus-stop`、`parking`、`indoor-public` | `facility`、`procedure`、`resources` | `economy-labour` |
| 5-D | 社區與離峰的小巴、預約式公車（DRTS） | `car-lane`、`bus-stop`、`mrt-exit` | `car-lane`、`bus-stop`、`mrt-exit` | `service` |  |
| 5-E | 站位、候車與無障礙 | `sidewalk`、`scooter-lane`、`car-lane`、`bus-stop` | `sidewalk-furniture`、`scooter-lane`、`car-lane`、`bus-stop` | `facility` |  |
| 5-F | 準點、班距與即時資訊 | `bus-stop`、`mrt-exit` | `bus-stop`、`mrt-exit` | `digital-tool`、`procedure` |  |
| 6-A | 建物耐震資訊的查詢與白話說明 | `indoor`、`building-shell` | `indoor-home`、`building-shell` | `digital-tool`、`open-data`、`outreach` |  |
| 6-B | 老屋健檢與公辦都更的排序方法 | `car-lane`、`building-shell` | `alley`、`building-shell` | `planning` |  |
| 6-C | 耐震評估與補強的補助與到府協助 | `indoor`、`building-shell` | `indoor-home`、`building-shell` | `service`、`subsidy` | `social-welfare` |
| 6-D | 重建與更新的多種路徑與程序協助 | `indoor`、`building-shell` | `indoor-home`、`building-shell` | `open-data`、`outreach`、`service` |  |
| 6-E | 外牆、施工損鄰與違建的安全管理 | `sidewalk`、`arcade`、`building-shell` | `sidewalk-walkway`、`arcade`、`building-shell` | `enforcement`、`procedure` |  |
| 6-F | 老公寓的電梯、逃生與消防通道 | `car-lane`、`indoor`、`building-shell` | `alley`、`indoor-common`、`building-shell` | `facility`、`subsidy` |  |
| 8-A | 吸菸區選址檢查與參與式選址 | `sidewalk`、`arcade`、`bus-stop`、`park`、`mrt-exit` | `sidewalk-furniture`、`arcade`、`bus-stop`、`park`、`mrt-exit` | `participation`、`regulation` |  |
| 8-B | 吸菸區設計改善試點 | `sidewalk`、`park`、`mrt-exit` | `sidewalk-furniture`、`park`、`mrt-exit` | `facility`、`intake` |  |
| 8-C | 禁菸範圍的公告、標示與開放資料 | `sidewalk`、`arcade`、`bus-stop`、`park`、`mrt-exit` | `sidewalk-walkway`、`arcade`、`bus-stop`、`park`、`mrt-exit` | `open-data`、`outreach` |  |
| 8-D | 通報、勸導與稽查流程 | `sidewalk`、`arcade`、`bus-stop`、`park`、`mrt-exit` | `sidewalk-walkway`、`arcade`、`bus-stop`、`park`、`mrt-exit` | `enforcement`、`intake` |  |
| 8-E | 住家二手菸與戒菸支援 | `arcade`、`indoor` | `arcade`、`indoor-home`、`indoor-common` | `regulation`、`service` |  |
| 9-A | 小規模試辦與獨立評估 | — | — | `planning` |  |
| 9-B | 內容標記、查證與追溯的規則 | — | — | `procedure`、`regulation` |  |
| 9-C | 和現有參與管道銜接，並有期限地回覆參與者 | — | — | `participation`、`procedure` |  |
| 9-D | 資料治理與個資保護 | — | — | `open-data`、`regulation` |  |
| 9-E | 多元與無障礙的參與方式 | — | — | `participation` |  |
| 10-A | 噪音陳情的分流、派工與回覆 | `indoor` | `indoor-home`、`indoor-business` | `intake` |  |
| 10-B | 高噪音車輛的聲音照相與聯合稽查 | `scooter-lane`、`car-lane` | `scooter-lane`、`car-lane` | `enforcement`、`outreach` |  |
| 10-C | 施工與夜間維修的噪音管理 | `car-lane`、`building-shell` | `car-lane`、`building-shell` | `open-data`、`procedure` |  |
| 10-D | 公園、活動與營業場所的音量規則與事前協調 | `sidewalk`、`park`、`indoor` | `sidewalk-walkway`、`park`、`indoor-business` | `outreach`、`participation`、`regulation` |  |
| 10-E | 鄰里噪音的調解與規約範本 | `indoor` | `indoor-home`、`indoor-common` | `outreach`、`regulation`、`service` | `governance` |
| 10-F | 交通噪音與住家隔音 | `sidewalk`、`car-lane`、`building-shell` | `crossing`、`car-lane`、`building-shell` | `facility`、`subsidy` |  |
| 11-A | 預約管道的擴充 | `indoor` | `indoor-home` | `digital-tool`、`intake` |  |
| 11-B | 收運時程與放置規則的公開 | `sidewalk`、`arcade` | `sidewalk-walkway`、`arcade` | `outreach`、`procedure` |  |
| 11-C | 堪用家具的分流與再利用 | `indoor` | `indoor-home` | `procedure`、`regulation` |  |
| 11-D | 搬不動的人的搬運協助 | `indoor` | `indoor-home`、`indoor-common` | `service` | `social-welfare` |
| 11-E | 社區與里的放置點 | `sidewalk`、`arcade`、`indoor` | `sidewalk-furniture`、`arcade`、`indoor-common` | `facility`、`participation` |  |
| 12-A | 路口的行人安全：停讓、時相與秒數 | `sidewalk`、`scooter-lane`、`car-lane` | `crossing`、`scooter-lane`、`car-lane` | `enforcement`、`facility`、`outreach` |  |
| 12-B | 連續、平整、無障礙的人行道與騎樓 | `sidewalk`、`arcade`、`parking` | `sidewalk-walkway`、`sidewalk-furniture`、`arcade`、`parking` | `facility`、`regulation` |  |
| 12-C | 學校、長者常去的地方與巷弄的行人友善區 | `sidewalk`、`car-lane` | `sidewalk-walkway`、`crossing`、`alley`、`car-lane` | `facility`、`participation`、`regulation` |  |
| 12-D | 違停、占用與設施損壞的檢舉與回覆 | `indoor` | `sidewalk-walkway`、`arcade`、`parking` | `intake` |  |
| 12-E | 行人穿越道與步行路線的照明 | `sidewalk`、`car-lane` | `sidewalk-walkway`、`crossing`、`alley`、`car-lane` | `facility`、`participation` |  |
| 12-F | 步行環境調查與公開的改善計畫 | `sidewalk`、`arcade` | `sidewalk-walkway`、`arcade` | `open-data`、`participation`、`planning` |  |

Changes that are more than a plain split (please check):

| 解法 | Change | Why |
|---|---|---|
| 6-B | `car-lane` → `alley` | The text is about 搶救困難的巷弄, not main roads |
| 6-F | `car-lane` → `alley` | The text is about 狹小巷弄 |
| 12-D | `indoor` → `sidewalk-walkway`、`arcade`、`parking` | The reports are about parking, blocked arcades and sidewalks, and broken ramps. `indoor` probably meant the office that handles the reports, but the 6.1 column is about where the solution acts |
| 1-B | adds `crossing` | The text keeps the sight lines to signals and signs at junctions |
| 10-F | `sidewalk` → `crossing` | The sidewalk part is the sound signal for blind people at junctions |

Other notes:

- 10-A and 11-A are reporting or booking channels. Their old tag `indoor` became `indoor-home` (and `indoor-business` for 10-A), because the problems start there (noise from neighbours and venues; furniture at home).
- The solution-level domains are: 4-B and 5-C `economy-labour` (employers' work hours, drivers' work hours); 4-C `public-safety` (ambulance and fire priority at signals); 6-C and 11-D `social-welfare` (help for older and low-income owners; carrying help); 10-E `governance` (調解委員會 is 民政).
- Space use after the split: `sidewalk-furniture` 21, `sidewalk-walkway` 13, `indoor-home` 10, `indoor-business` 6, `indoor-common` 5, `crossing` 6, `alley` 5, `indoor-public` 2. Before, `sidewalk` was on 34 solutions and `indoor` on 18.

## R2.3 How "share a stakeholder or a need" is decided

I tested this at two levels. The data comes from a fresh `build_json.py` run into the scratchpad (each solution's `stories` and `needs` from 6.2).

- **Issue level (literal reading):** two issues share a stakeholder ID in `stakeholders.csv` (議題 column). **All 55 of 55 issue pairs share at least one stakeholder.** So this condition removes nothing.
- **Solution level, stakeholder:** the two solutions serve stories of the same stakeholder ID. This is also very wide: I01 is behind 34 solutions, I05 behind 29, I06 behind 27, O05 behind 23.
- **Solution level, need:** two needs match when they are in the **same cross-issue group**. That means one of these:
  - the same X-N group in cross-issue 2.1 (a solution is in a group when one of its 6.2 needs or stories is listed in that group for its issue), or
  - the same row in cross-issue 1.2 「同一位利害關係人在幾個議題的相同需求」 (O12 and I11 today).

  These groups were made by a person (with AI help) and already checked. So the rule does not invent a new judgement of "same need". 59 of 63 solutions are in at least one group.

## R2.4 Results

Each variant needs: different issues, at least one shared solution type, and the conditions in the table. "Platform" means: a pair that shares `open-data` or `intake` does not need a shared domain or space (decision 7).

| Variant | Conditions | Related issue pairs (of 55) | Combine candidates | New (not in any X-) |
|---|---|---|---|---|
| Round 1 B1 (old spaces) | domain or space | — | 321 | 260 |
| R1 = decision 8, literal | (domain or space or platform) and issues share a stakeholder or need | 53 | 304 | 220 |
| R2 | (domain or space or platform) and **the two solutions** share a stakeholder or need | 51 | 278 | 195 |
| **R3 (recommended)** | (domain or space or platform) and the two solutions share a need (X-N or 1.2) | 47 | 138 | **68** |
| R4 | R3, but platform pairs also need a shared domain or space | 33 | 120 | 68 |
| R5 | same type and shared need, and both a shared domain **and** a shared space (platform pairs: shared need only) | 42 | 95 | 29 |

"Related issue pairs" = issue pairs with at least one candidate.

Other variants I tried (not recommended): R3 or (shared space and shared stakeholder): 156 new. R3 or (shared domain and shared stakeholder): 135 new. Any variant that uses a shared stakeholder becomes too wide, because a few stakeholders (I01, I05, I06, O05) are in most issues.

The split of `sidewalk` and `indoor` alone lowers B1 from 321 to 271 candidates (without the platform rule).

### X- check

"Found" = every part is in at least one found pair. "Partly" = some parts are found. "Missed" = no pair is found.

| X- | R1 | R2 | R3 | R4 | R5 | Why parts are missed (R3) |
|---|---|---|---|---|---|---|
| X-A | found 3/3 | found 3/3 | found 3/3 | found 3/3 | found 3/3 | — |
| X-B | found 6/14 | found 6/14 | found 5/14 | found 5/14 | found 3/14 | — (1-A and 2-A are found through the 1.2 row for O12) |
| X-C | found 21/21 | found 21/21 | found 17/21 | found 16/21 | found 17/21 | — |
| X-D | found 37/44 | found 36/44 | found 32/44 | partly 16/44 (6-A, 9-D) | found 32/44 | — (9-D is found through the platform rule and X-N04) |
| X-E | partly 1/2 | partly 1/2 | partly 1/2 | partly 1/2 | partly 1/2 | 2-A: its types (`planning`, `digital-tool`) are not shared with 2-B or 8-B |
| X-F | found 4/5 | found 4/5 | found 3/5 | found 3/5 | found 3/5 | — |
| X-G | found 3/3 | found 3/3 | partly 1/3 | partly 1/3 | missed | 11-D: it shares `service` with 3-E and 6-C, but it is in no X-N group with them. X-G was built from shared stakeholders (I37, I05), not from a shared need |
| X-H | partly 1/2 | partly 1/2 | partly 1/2 | partly 1/2 | partly 1/2 | 5-F: its types (`digital-tool`, `procedure`) are not shared with 4-D |
| X-I | found 1/1 | found 1/1 | found 1/1 | found 1/1 | missed | — |
| X-J | found 1/1 | found 1/1 | found 1/1 | missed | found 1/1 | — (found through `open-data` and X-N15) |
| X-K | found 5/5 | found 5/5 | found 5/5 | found 5/5 | found 5/5 | — |
| X-L | found 1/1 | found 1/1 | missed | missed | missed | 6-E and 10-C share `procedure` and `building-shell`, but no X-N group. X-L was built from the shared stakeholder I49, who has **different** needs in #6 (house damage) and #10 (sleep) |
| X-M | found 1/1 | found 1/1 | found 1/1 | found 1/1 | found 1/1 | — |

Summary for R3: 9 found (X-A, X-B, X-C, X-D, X-F, X-I, X-J, X-K, X-M), 3 partly found (X-E, X-G, X-H), 1 missed (X-L).

### Recommended rule: R3

- It is the only variant near 60 new candidates (68) that still finds 12 of 13 X- solutions at least in part (9 in full).
- It uses only conditions that already exist: the 13 solution types, the domains, the space types, and the cross-issue need groups that a person made.
- R5 gives 29 new pairs, but it misses X-G, X-I and X-L. It is too strict.
- X-L and part of X-G are missed because they come from a shared stakeholder, not a shared need. A person can still add such a combination by hand, as today. The rule only makes a list of candidates; it does not decide.

The 68 new pairs by shared type: `facility` 28, `participation` 11, `enforcement` 7, `regulation` 7, `planning` 5, `procedure` 4, `outreach` 3, `service` 3, `digital-tool` 2, `open-data` 2. (A pair can share more than one type.) The groups that link the most pairs are X-N09 and X-N13 (19 pairs each; #4, #5, #12 and others) and X-N03 (12 pairs).

### R3 candidate list (68 new pairs)

Sorted by issue number, then solution ID. Not inside any current X- solution.

| Pair | Shared type | Shared domain | Shared space | Shared need |
|---|---|---|---|---|
| #1 A ~ #3 A | `planning` | `environment` | `sidewalk-furniture`、`park` | X-N04 |
| #1 B ~ #10 C | `open-data` | `environment` | — | X-N03 |
| #1 B ~ #10 D | `regulation` | `environment` | `park` | X-N03 |
| #1 D ~ #3 B | `facility` | `environment` | `sidewalk-furniture` | X-N02 |
| #1 D ~ #11 E | `facility` | `environment` | `sidewalk-furniture` | X-N02 |
| #1 D ~ #12 C | `facility`、`regulation` | — | `sidewalk-walkway` | X-N02 |
| #1 E ~ #2 D | `participation` | `environment` | `sidewalk-furniture`、`park` | X-N01 |
| #1 E ~ #8 A | `participation` | `environment` | `sidewalk-furniture`、`park` | X-N01 |
| #2 C ~ #5 F | `digital-tool` | — | `mrt-exit` | X-N04 |
| #2 D ~ #11 E | `participation` | `environment` | `sidewalk-furniture`、`arcade` | X-N06 |
| #3 A ~ #5 B | `planning` | — | `mrt-exit` | X-N04 |
| #3 B ~ #10 C | `procedure` | `environment` | — | X-N03 |
| #3 B ~ #10 F | `facility` | `environment` | — | X-N03 |
| #3 B ~ #12 B | `facility` | — | `sidewalk-furniture`、`arcade` | X-N02 |
| #3 C ~ #8 D | `enforcement` | `environment`、`health` | — | X-N03 |
| #3 C ~ #10 B | `enforcement` | `environment` | — | X-N03 |
| #3 C ~ #10 F | `facility` | `environment` | — | X-N03 |
| #3 D ~ #4 D | `service` | — | `mrt-exit` | X-N11 |
| #3 D ~ #11 B | `procedure` | `environment` | `arcade` | X-N02 |
| #3 E ~ #6 D | `service` | — | `indoor-home` | X-N12 |
| #3 F ~ #10 C | `open-data` | `environment` | — | X-N03 |
| #4 A ~ #5 F | `digital-tool` | `transport` | `mrt-exit` | X-N04、X-N10 |
| #4 B ~ #8 A | `participation` | — | `bus-stop` | X-N11 |
| #4 C ~ #5 C | `facility` | `transport` | — | X-N09、X-N10 |
| #4 C ~ #5 E | `facility` | `transport` | `scooter-lane`、`car-lane` | X-N13 |
| #4 C ~ #10 F | `facility` | — | `crossing`、`car-lane` | X-N13 |
| #4 C ~ #12 A | `facility` | `transport` | `crossing`、`scooter-lane`、`car-lane` | X-N09、X-N13 |
| #4 C ~ #12 B | `facility` | `transport` | — | X-N09、X-N13 |
| #4 C ~ #12 C | `facility` | `transport` | `crossing`、`car-lane` | X-N09、X-N13 |
| #4 C ~ #12 E | `facility` | `transport` | `crossing`、`car-lane` | X-N09、X-N13 |
| #4 D ~ #5 D | `service` | `transport` | `car-lane`、`bus-stop`、`mrt-exit` | X-N09 |
| #4 D ~ #12 F | `planning` | `transport` | — | X-N09 |
| #4 E ~ #5 C | `facility` | `transport` | — | X-N10 |
| #4 E ~ #10 F | `facility` | — | `car-lane` | X-N13 |
| #4 E ~ #12 B | `facility` | `transport` | `sidewalk-walkway` | X-N13 |
| #4 E ~ #12 E | `facility` | `transport` | `sidewalk-walkway`、`alley`、`car-lane` | X-N13 |
| #4 F ~ #6 E | `enforcement` | — | `sidewalk-walkway` | X-N09 |
| #4 F ~ #10 B | `enforcement` | — | `car-lane` | X-N13 |
| #4 F ~ #12 A | `enforcement` | `transport` | `car-lane` | X-N09、X-N13 |
| #4 F ~ #12 B | `regulation` | `transport` | `sidewalk-walkway`、`parking` | X-N09、X-N13 |
| #4 F ~ #12 C | `regulation` | `transport` | `sidewalk-walkway`、`car-lane` | X-N09、X-N13 |
| #4 G ~ #5 B | `planning` | `transport` | `car-lane` | X-N09、X-N10 |
| #4 G ~ #12 C | `participation` | `transport` | `car-lane` | X-N09 |
| #4 G ~ #12 E | `participation` | `transport` | `car-lane` | X-N09 |
| #4 G ~ #12 F | `participation`、`planning` | `transport` | — | X-N09 |
| #5 C ~ #12 A | `facility` | `transport` | — | X-N09 |
| #5 C ~ #12 B | `facility` | `transport` | `parking` | X-N09 |
| #5 C ~ #12 C | `facility` | `transport` | — | X-N09 |
| #5 C ~ #12 E | `facility` | `transport` | — | X-N09 |
| #5 E ~ #10 F | `facility` | — | `car-lane` | X-N13 |
| #5 E ~ #12 E | `facility` | `transport` | `car-lane` | X-N13 |
| #8 A ~ #11 E | `participation` | `environment` | `sidewalk-furniture`、`arcade` | X-N02 |
| #8 A ~ #12 F | `participation` | — | `arcade` | X-N02 |
| #8 B ~ #11 E | `facility` | `environment` | `sidewalk-furniture` | X-N06 |
| #8 D ~ #10 B | `enforcement` | `environment` | — | X-N03 |
| #10 B ~ #11 B | `outreach` | `environment` | — | X-N03 |
| #10 B ~ #12 A | `enforcement`、`outreach` | — | `scooter-lane`、`car-lane` | X-N13 |
| #10 C ~ #11 B | `procedure` | `environment` | — | X-N03 |
| #10 C ~ #11 C | `procedure` | `environment` | — | X-N19 |
| #10 D ~ #11 B | `outreach` | `environment` | `sidewalk-walkway` | X-N03 |
| #10 D ~ #11 C | `regulation` | `environment` | — | X-N19 |
| #10 D ~ #12 B | `regulation` | — | `sidewalk-walkway` | X-N19 |
| #10 D ~ #12 C | `participation`、`regulation` | — | `sidewalk-walkway` | X-N19 |
| #10 F ~ #12 A | `facility` | — | `crossing`、`car-lane` | X-N13 |
| #10 F ~ #12 C | `facility` | — | `crossing`、`car-lane` | X-N13 |
| #10 F ~ #12 E | `facility` | — | `crossing`、`car-lane` | X-N13 |
| #11 E ~ #12 B | `facility` | — | `sidewalk-furniture`、`arcade` | X-N02 |
| #11 E ~ #12 F | `participation` | — | `arcade` | X-N02 |

## R2.5 Storage plan

Files that change:

| File | Change |
|---|---|
| `analysis/data/domain-types.csv` (new) | 代碼, 名稱, 說明, 政事別, 陳情系統主類別 (9 rows) |
| `analysis/data/solution-types.csv` (new) | 代碼, 名稱, 說明, 判斷方式, 政策工具 (13 rows) |
| `analysis/data/space-types.csv` | Remove `sidewalk` and `indoor`. Add 8 rows. New 分組 「人行道」 and 「室內」 |
| `analysis/data/updated-dates.csv` | New 新增日期 for the 8 space types and the new type rows. The rows of `sidewalk` and `indoor` go away. Every retagged solution gets a new 更新日期, because `spaces` is part of a solution's content (`update_dates.py`, `SOLUTION_KEYS`). This is 49 of 63 solutions |
| Each `analysis/<n>-…/issue-analysis.md` | New line 「領域：」 under 「空間類型：」; new 空間類型 header; 6.1 gets 「解法類型」 after 「空間類型」, and an optional 「領域」 column (empty unless different) |
| `analysis/0-template/issue-analysis.md` | Same new line and columns |
| `analysis/cross-issue/cross-issue-analysis.md` | 4.1 空間類型 of each X- recomputed with the new codes; add 「解法類型」 |
| `analysis/docs/method.md`, `analysis/docs/data-guide.md` | Rules and examples (`sidewalk` is the example code today) |
| `analysis/scripts/*` | `check_analysis.py`, `check_cross_issue.py` (fixed 6.1 and 4.1 headers, `XS_HEADER`), `build_json.py` (read the new line and columns), `build_flat.py`, `update_dates.py`; tests in `analysis/tests/` and their fixtures |

App parts that use space types and would need changes:

- No logic change is needed for the split itself. The app reads codes, names and 分組 from the data.
- **Links:** `#/spaces/sidewalk` and `#/spaces/indoor` stop working. They will show the "unknown space" page. The repo rule says no redirects, so old links (for example on Discord) will not move to the new pages. ETBlue should decide if this is OK.
- Tests and fixtures that use `sidewalk` or `indoor`: `app/src/test/fixtures/*.json` and about 15 test files (`spaces.test.ts`, `Space.test.tsx`, `Spaces.test.tsx`, `listFilter.test.ts`, `solutionList.test.ts`, `entityPaths.test.ts` and others).
- Comments with `sidewalk` as the example: `types.ts`, `entityPaths.ts`.
- `app/docs/design.md` uses `#/spaces/sidewalk` as an example. A new numbered design entry is needed.
- The new domain and solution-type tags need new UI (labels in `app/src/i18n/zh-TW.ts`, filters, maybe pages like `#/spaces`). That is separate design work.

What happens to the old keys:

| Old key | What happens |
|---|---|
| `sidewalk` | Split into `sidewalk-walkway` and `sidewalk-furniture`. Some uses move to `crossing` or `alley`. The old code is removed. The parent stays as the new 分組 「人行道」 |
| `indoor` | Split into `indoor-home`, `indoor-common`, `indoor-business`, `indoor-public`. The old code is removed. The parent stays as the new 分組 「室內」 |
| `car-lane` | Kept. Two solutions (6-B, 6-F) move to `alley` |
| All other codes | Kept with no change |

## R2.6 Open questions

1. Is it OK to add `crossing` and `alley`? They were not asked for, but the split showed the need.
2. New 分組 「人行道」 and 「室內」, or keep the indoor codes in 「建築」?
3. Old links `#/spaces/sidewalk` and `#/spaces/indoor` will break (no redirects). OK?
4. Please check the 5 retags that are more than a plain split (6-B, 6-F, 12-D, 1-B, 10-F).
5. Decision 8 at issue level removes nothing (55 of 55 issue pairs share a stakeholder). Is the solution-level need check (R3) the meaning you want?
6. X-L is missed by R3. Should a shared stakeholder with **different** needs count? If yes, the list grows to about 150 or more.
7. With R3, 9-D joins X-D only through the platform rule. Is that as intended?

---

# Round 1

## 1. Domain types (領域)

### 1.1 Official classifications compared

| Source | Who publishes it | What it classifies | Levels and size | Good for us | Problems for us |
|---|---|---|---|---|---|
| [臺北市陳情系統類別資料](https://data.taipei/dataset/detail?id=cb423c17-88eb-4231-a725-f1b93247d1bf) (already in `analysis/data/open-data.csv`) | 臺北市政府研究發展考核委員會 | Citizen petitions, by 案件主類別 and 案件次類別 | 9 main categories with content, plus 「非屬前述各類之其他事項」 and 「員工事件通報」; about 140 sub-categories (115 年 9 月 file) | Taipei-specific. Uses words that citizens use. Our issues already cite it, so a domain could link to petition counts | Main categories are grouped by **which agency answers**, not by policy field. One category holds very different fields: 「衛福、勞動、民政、區政及動保」 has health, welfare, labour, civil affairs and animals. Trees sit in two places (「道路、山坡地、路樹及路燈」 and 文化事務「樹木保護」). Rats and pedestrians have no category. The list can change from month to month |
| 政事別 (government function classification of the budget) | 行政院主計總處 (central rules, [歲出政事別科目歸類原則與範圍](https://ws.dgbas.gov.tw/001/Upload/461/relfile/10693/234944/6-%E6%94%BF%E4%BA%8B%E5%88%A5%E7%A7%91%E7%9B%AE%E6%AD%B8%E9%A1%9E%E5%8E%9F%E5%89%87%E8%88%87%E7%AF%84%E5%9C%8D.pdf)); used in every local budget, including 臺北市總預算 | Spending, by the **function** of the spending | 大分類 (about 9) → 中分類 (about 25) → 業務計畫. Local 中分類 are listed in the NDC open data [地方財政支出之預決算](https://data.gov.tw/dataset/113777): 民政、財務、教育、科學、文化、農業、工業、交通、其他經濟服務、社會保險、社會救助、福利服務、國民就業、醫療保健、社區發展、環境保護、警政、退休撫卹、債務 and others | Official and stable for many years. Same in every city and county. Sorted by function, which is what a "domain" means. The 中分類 level is close to the size we need. Lines up with the UN [COFOG](https://unstats.un.org/unsd/classifications/cofog/revision) (10 divisions) | Has items we do not need (債務、退休撫卹、立法). No "parks and trees" item. Some places are not clear without the full PDF (for example: is 下水道 in 環境保護 or 社區發展; is 消防 in 警政) |
| 臺北市政府 局處 list ([組織架構](https://www.gov.taipei/cp.aspx?n=8ABE1F397F219F70)) | 臺北市政府 | Agencies | About 30 一級機關 | Shows who is responsible | An agency is not a field. One issue needs many agencies (#3 mice: 環保局、衛生局、工務局). Agency names change when the city reorganises |

Checks I could not finish:

- I could not read the text of the 主計總處 PDF (no PDF tool on this computer). The 大分類 names (一般政務、國防、教育科學文化、經濟發展、社會福利、社區發展及環境保護、退休撫卹、債務、補助及其他) come from a search summary of that PDF and from the 主計總處 page [115年度中央政府總預算案編列情形](https://www.dgbas.gov.tw/News_Content.aspx?n=3602&s=235226). The 中分類 names come from the NDC dataset page. A person should check the PDF.
- I could not find the 臺北市 115 年度 歲出政事別總表 online. The mapping below uses the local 中分類 names, not the Taipei table.

### 1.2 Recommendation

Use **政事別 中分類** as the base. Keep a second mapping column to the **陳情系統 主類別**.

Why:

- 政事別 sorts by function. A domain is a policy field, so this is the right kind of list.
- It is official, national and stable. The petition list is grouped by agency, and it can change.
- The 中分類 level gives about the right size (8–15 domains) after we leave out items with no city issue (債務、退休撫卹、立法).
- The petition mapping is still useful. It tells an issue writer which petition data to look at.

### 1.3 Draft domain list (10 domains)

| 代碼 | 名稱 | Meaning (one line) | 政事別 (大分類 > 中分類) | 陳情系統 主類別 | COFOG |
|---|---|---|---|---|---|
| `transport` | 交通 | Roads, sidewalks, signals, buses, MRT, parking and road safety | 經濟發展支出 > 交通支出 | 交通運輸；道路、山坡地、路樹及路燈（道路、人行道）；警消、法務及政風（交通事故、違規停車） | 04.5 Transport |
| `environment` | 環境保護 | Waste and recycling, street cleaning, pollution, noise, pests, sewers | 社區發展及環境保護支出 > 環境保護支出 | 垃圾、噪音、污染及資源回收；公園、排水溝、下水道及自來水（下水道、側溝） | 05 Environmental protection |
| `greenery` | 公園綠地與樹木 | Parks, street trees and city greening | No own 中分類. Probably 社區發展支出 or 環境保護支出【待查】 | 公園、排水溝、下水道及自來水（公園）；道路、山坡地、路樹及路燈（路樹）；文教、體育、資訊、觀光及媒體（樹木保護） | 05.4 / 06.2 |
| `health` | 醫療保健 | Disease control, tobacco control, food safety and medical care | 社會福利支出 > 醫療保健支出 | 衛福、勞動、民政、區政及動保（疾病防治、菸害防制、食品衛生） | 07 Health |
| `social-welfare` | 社會福利 | Welfare services, social assistance and long-term care for older people, people with disabilities and low-income households | 社會福利支出 > 福利服務支出、社會救助支出 | 衛福、勞動、民政、區政及動保（社會救助、福利服務、長照、街友） | 10 Social protection |
| `urban-housing` | 都市發展與住宅 | Urban planning, building control, urban renewal and rebuilding, housing | 社區發展及環境保護支出 > 社區發展支出【待查：建管 may be elsewhere】 | 都市發展、建管、產業、財稅及地政 | 06 Housing and community amenities |
| `public-safety` | 治安與防災 | Police, fire, rescue and disaster prevention | 一般政務支出 > 警政支出（消防【待查】） | 警消、法務及政風 | 03 Public order and safety |
| `education-culture` | 教育與文化 | Schools, culture, sports and tourism | 教育科學文化支出 > 教育、科學、文化支出 | 文教、體育、資訊、觀光及媒體 | 08, 09 |
| `economy-labour` | 產業與勞動 | Business, markets, farming, jobs and workers' rights | 經濟發展支出 > 農業、工業、其他經濟服務支出；社會福利支出 > 國民就業支出 | 都市發展、建管、產業、財稅及地政（產業發展）；衛福、勞動、民政、區政及動保（勞工、就業） | 04 (not 04.5) |
| `governance` | 市政治理與參與 | Civil affairs, district offices, citizen participation, government data and administration | 一般政務支出 > 民政支出、行政支出 | 衛福、勞動、民政、區政及動保（民政、區政）；文教、體育、資訊、觀光及媒體（資訊服務） | 01 General public services |

Notes:

- `greenery` is the only domain that is not a 政事別 中分類. I kept it because #1 is a host issue about trees, and putting it in `environment` would link #1 to five issues only by the word "environment". ETBlue should decide (see open questions).
- ETBlue's example 「環境衛生」 is split here into `environment` (cleaning, waste, pests) and `health` (disease, tobacco, food). This follows 政事別. An issue like #3 (rats) gets both.
- `education-culture` and `economy-labour` have no issue yet. I kept them so the list is complete for new issues.
- The population group (older people, children) is **not** a domain. It is already covered by 特別關注族群 in each issue. So #12 (older pedestrians) is `transport`, not `social-welfare`.

---

## 2. Solution types (解法類型)

### 2.1 Established classification used

The most common public-policy classification of policy tools is Christopher Hood's **NATO** model:

- **N**odality: the government gives or collects information.
- **A**uthority: the government sets rules and makes people follow them.
- **T**reasure: the government uses money (grants, subsidies, budget).
- **O**rganisation: the government acts itself, with its staff, buildings and services.

Sources: Hood, C. (1983) *The Tools of Government*, Macmillan; Hood, C. and Margetts, H. (2007) *The Tools of Government in the Digital Age*, Palgrave Macmillan. A shorter, similar model is Vedung's "carrots, sticks and sermons" (economic tools, regulation, information): Bemelmans-Videc, M.-L., Rist, R. and Vedung, E. (eds.) (1998) *Carrots, Sticks & Sermons*, Transaction. These are academic books, so they are neutral sources. I did not open them online for this draft; the names and years are from my own knowledge and a person should check them.

NATO is too coarse for us (4 types). Our list splits each NATO type into the actions that the issue files actually use.

### 2.2 Draft solution type list (13 types)

| 代碼 | 名稱 | Meaning (one line) | Test: a solution is this type if … | NATO | ETBlue draft item |
|---|---|---|---|---|---|
| `digital-tool` | 數位工具 | An app, website, map, dashboard, online form or sensor system | … it needs a software system to be built or changed | Nodality / Organisation | 數位工具 |
| `open-data` | 資料公開 | Public data, records, progress and results | … its main output is data or records that anyone can read (open data, API, published counts or progress) | Nodality | 資料公開 |
| `outreach` | 宣導與教育 | Signs, guides, plain-language rules, campaigns | … it changes what people do only by giving them information, without a new duty or money | Nodality | 宣導與教育 |
| `participation` | 參與與協商 | Workshops, comment periods, nomination, consultation with residents or businesses | … residents, users or businesses take part in a decision before it is made | Nodality (two-way) | 活動與參與 |
| `intake` | 受理與派工 | Reporting channels, booking, sending a case to the right unit, replying | … it changes how a report or request from the public comes in, goes to a unit and gets an answer | Organisation | 作業流程 (split) |
| `procedure` | 作業流程 | Internal steps, notices, review order, timetables, coordination between agencies | … it changes how government staff do their own work (steps, order, timing, who does what), not counting `intake` | Organisation | 作業流程 (split) |
| `regulation` | 法規與規則 | Laws, rules, standards, design codes, checklists, model rules (規約範本) | … it writes or changes a rule, standard or template that others must follow or are asked to adopt | Authority | 法規 |
| `enforcement` | 稽查與執法 | Inspections, fines, removal of violations, warnings | … it checks if people follow a rule and acts when they do not | Authority | (new) |
| `facility` | 設施與工程 | Building, repairing or changing physical things | … it changes the physical space or equipment (roads, signals, bins, sewers, lights) | Organisation | 設施與工程 |
| `service` | 直接服務 | Help given to a person or household by staff or a contractor | … staff deliver a service to people (home visits, carrying, buses, mediation, quit-smoking help) | Organisation | (new) |
| `subsidy` | 補助與獎勵 | Money, discounts, labels or rewards that encourage an action | … it gives money or another benefit to people or businesses so they act | Treasure | 補助與獎勵 |
| `resources` | 人力與預算 | The government's own budget, staff, training and procurement | … it changes how much money or staff the government has, or how it buys services | Treasure / Organisation | 人力與預算 |
| `planning` | 調查與規劃 | Surveys, priority lists, evaluations, pilots with evaluation | … its main output is a basis for a government decision (plan, priority order, evaluation), not the action itself | Nodality (collect) | (new) |

Changes from ETBlue's draft:

- 活動與參與 → `participation` 參與與協商. Most solutions in our files are workshops and consultation, not events. Events (for example tree planting in #1 C) also fit here.
- 作業流程 is split into `intake` 受理與派工 and `procedure` 作業流程. Without the split, 作業流程 was on 22 of 63 solutions and gave 149 new combine candidates by itself (Rule A in section 4). After the split: `intake` 8, `procedure` 14 solutions. X-C (共用的通報入口與派工) is still found in full with Rule A (21 of 21 pairs).
- New: `enforcement`, `service`, `planning`. Each one is used by 7–10 solutions, and none fit the old types well.
- The list has **13 types, one more than the 8–12 asked for**. Two ways to get to 12 (ETBlue to choose):
  - Merge `enforcement` into `regulation` (法規與執法). Both are NATO "Authority".
  - Do not split 作業流程. This gives more noise in step 4.

Pilots (試辦) are not a type. Almost every solution has a pilot step.

---

## 3. Test on real data

### 3.1 Issue domains

| 議題 | 題目 | 領域 | 空間類型 (current, from the file header) |
|---|---|---|---|
| #1 | 把三千棵樹種回來 | `greenery` | `sidewalk`、`park`、`utility`、`bike-lane` |
| #2 | 找回消失的垃圾桶 | `environment` | `sidewalk`、`arcade`、`park`、`mrt-exit` |
| #3 | 鼠患四處跑，衛生安全怎麼辦 | `environment`、`health` | `sidewalk`、`arcade`、`sewer`、`park`、`mrt-exit`、`indoor` |
| #4 | 內湖尖峰車流好比停車場 | `transport` | `car-lane`、`scooter-lane`、`bike-lane`、`bus-stop`、`sidewalk`、`mrt-exit`、`parking`、`indoor` |
| #5 | 公車路網如何即時反應需求 | `transport` | `car-lane`、`scooter-lane`、`bus-stop`、`sidewalk`、`mrt-exit`、`parking`、`indoor` |
| #6 | 危老耐震如何查，風險評級怎麼找 | `urban-housing`、`public-safety` | `building-shell`、`indoor`、`sidewalk`、`arcade`、`car-lane` |
| #8 | 無菸城市 | `health`、`environment` | `sidewalk`、`arcade`、`bus-stop`、`park`、`mrt-exit`、`indoor` |
| #9 | 將產品探索技巧運用到政策前期研究 | `governance` | 無 |
| #10 | 噪音 | `environment` | `indoor`、`building-shell`、`sidewalk`、`park`、`car-lane`、`scooter-lane` |
| #11 | 大型廢棄物清運 | `environment` | `indoor`、`sidewalk`、`arcade` |
| #12 | 行人安全／高齡行人 | `transport` | `sidewalk`、`arcade`、`car-lane`、`scooter-lane`、`parking`、`indoor` |

Every issue gets 1 or 2 domains. No issue needed 3.

Optional: a solution can have its own domain when it is clearly in another field. Two cases in the current files: #6 C (補助與到府協助) and #11 D (搬運協助) are also `social-welfare`. With that, #6 C and #11 D become a combine candidate (both `service`), which helps find X-G.

### 3.2 Solution types (63 solutions)

| 解法 | 名稱 | 空間類型 | 解法類型 |
|---|---|---|---|
| 1-A | 樹蔭缺口與補植候選地圖（見縫插樹） | sidewalk、park、utility、bike-lane | `digital-tool`、`planning` |
| 1-B | 保留樹清單與移除紀錄公開 | sidewalk、park | `open-data`、`intake`、`regulation` |
| 1-C | 參與式補植與移樹公告流程 | sidewalk、park | `participation`、`procedure` |
| 1-D | 人行道、樹穴與管線共同設計規範 | sidewalk、utility、bike-lane | `regulation`、`facility` |
| 1-E | 市民提名重要樹木 | sidewalk、park | `participation`、`procedure` |
| 1-F | 長期養護經費、人力與採購 | sidewalk、park | `resources`、`procedure` |
| 2-A | 清潔箱佈建建議地圖 | sidewalk、mrt-exit | `planning`、`digital-tool` |
| 2-B | 滿溢回報與動態清運 | sidewalk、mrt-exit、park | `digital-tool`、`intake` |
| 2-C | 找桶指引與開放資料更新 | sidewalk、mrt-exit、park、arcade | `open-data`、`digital-tool` |
| 2-D | 參與式選址流程 | sidewalk、arcade、park | `participation` |
| 2-E | 家用垃圾的彈性收集點（題目外的配套） | sidewalk、park | `facility`、`service` |
| 3-A | 鼠患風險地圖與防治排序 | sidewalk、arcade、sewer、park、mrt-exit | `planning` |
| 3-B | 垃圾與廚餘的密封收集與收運調整 | sidewalk、arcade、indoor | `facility`、`procedure` |
| 3-C | 下水道與側溝的修補、清淤與接管 | sewer、sidewalk | `facility`、`enforcement` |
| 3-D | 分區同步防治與安全投藥 | sidewalk、arcade、park、mrt-exit、sewer | `service`、`procedure` |
| 3-E | 社區、店家與學校的防鼠診斷與輔導 | indoor、arcade | `service`、`enforcement`、`subsidy` |
| 3-F | 鼠患通報與防治進度公開 | sidewalk、arcade、park、mrt-exit | `intake`、`open-data` |
| 4-A | 晨尖峰內科車流熱力儀表板與歷史資料保存 | car-lane、scooter-lane、mrt-exit | `digital-tool`、`open-data` |
| 4-B | 企業分批上班、彈性工時與交通車的協商 | car-lane、bus-stop、indoor | `participation`、`subsidy` |
| 4-C | 主要路廊的號誌調整與路口改善 | car-lane、scooter-lane、sidewalk | `facility` |
| 4-D | 大眾運輸、接駁與跨市路線的加強 | bus-stop、mrt-exit、car-lane | `service`、`planning` |
| 4-E | 學校周邊、住宅巷弄與自行車通勤的安全 | sidewalk、bike-lane、car-lane、indoor | `facility` |
| 4-F | 違規停車、臨停與貨車裝卸的管理 | parking、car-lane、sidewalk | `enforcement`、`regulation` |
| 4-G | 聯外橋梁、匝道與道路的評估 | car-lane、scooter-lane | `planning`、`participation` |
| 5-A | 平穩駕駛與乘客安全 | car-lane、bus-stop | `resources`、`procedure` |
| 5-B | 用上下車資料重劃路網與捷運接駁 | bus-stop、car-lane、mrt-exit | `planning`、`open-data` |
| 5-C | 駕駛的休息與班表 | bus-stop、parking、indoor | `procedure`、`facility`、`resources` |
| 5-D | 社區與離峰的小巴、預約式公車（DRTS） | bus-stop、car-lane、mrt-exit | `service` |
| 5-E | 站位、候車與無障礙 | bus-stop、sidewalk、car-lane、scooter-lane | `facility` |
| 5-F | 準點、班距與即時資訊 | bus-stop、mrt-exit | `digital-tool`、`procedure` |
| 6-A | 建物耐震資訊的查詢與白話說明 | building-shell、indoor | `outreach`、`digital-tool`、`open-data` |
| 6-B | 老屋健檢與公辦都更的排序方法 | building-shell、car-lane | `planning` |
| 6-C | 耐震評估與補強的補助與到府協助 | building-shell、indoor | `subsidy`、`service` |
| 6-D | 重建與更新的多種路徑與程序協助 | building-shell、indoor | `outreach`、`service`、`open-data` |
| 6-E | 外牆、施工損鄰與違建的安全管理 | building-shell、sidewalk、arcade | `enforcement`、`procedure` |
| 6-F | 老公寓的電梯、逃生與消防通道 | building-shell、indoor、car-lane | `subsidy`、`facility` |
| 8-A | 吸菸區選址檢查與參與式選址 | sidewalk、arcade、bus-stop、park、mrt-exit | `participation`、`regulation` |
| 8-B | 吸菸區設計改善試點 | sidewalk、park、mrt-exit | `facility`、`intake` |
| 8-C | 禁菸範圍的公告、標示與開放資料 | sidewalk、arcade、bus-stop、park、mrt-exit | `outreach`、`open-data` |
| 8-D | 通報、勸導與稽查流程 | sidewalk、arcade、bus-stop、park、mrt-exit | `enforcement`、`intake` |
| 8-E | 住家二手菸與戒菸支援 | indoor、arcade | `regulation`、`service` |
| 9-A | 小規模試辦與獨立評估 | — | `planning` |
| 9-B | 內容標記、查證與追溯的規則 | — | `procedure`、`regulation` |
| 9-C | 和現有參與管道銜接，並有期限地回覆參與者 | — | `participation`、`procedure` |
| 9-D | 資料治理與個資保護 | — | `regulation`、`open-data` |
| 9-E | 多元與無障礙的參與方式 | — | `participation` |
| 10-A | 噪音陳情的分流、派工與回覆 | indoor | `intake` |
| 10-B | 高噪音車輛的聲音照相與聯合稽查 | car-lane、scooter-lane | `enforcement`、`outreach` |
| 10-C | 施工與夜間維修的噪音管理 | car-lane、building-shell | `procedure`、`open-data` |
| 10-D | 公園、活動與營業場所的音量規則與事前協調 | park、sidewalk、indoor | `regulation`、`participation`、`outreach` |
| 10-E | 鄰里噪音的調解與規約範本 | indoor | `service`、`regulation`、`outreach` |
| 10-F | 交通噪音與住家隔音 | car-lane、building-shell、sidewalk | `facility`、`subsidy` |
| 11-A | 預約管道的擴充 | indoor | `digital-tool`、`intake` |
| 11-B | 收運時程與放置規則的公開 | sidewalk、arcade | `outreach`、`procedure` |
| 11-C | 堪用家具的分流與再利用 | indoor | `procedure`、`regulation` |
| 11-D | 搬不動的人的搬運協助 | indoor | `service` |
| 11-E | 社區與里的放置點 | indoor、sidewalk、arcade | `participation`、`facility` |
| 12-A | 路口的行人安全：停讓、時相與秒數 | car-lane、scooter-lane、sidewalk | `facility`、`enforcement`、`outreach` |
| 12-B | 連續、平整、無障礙的人行道與騎樓 | sidewalk、arcade、parking | `facility`、`regulation` |
| 12-C | 學校、長者常去的地方與巷弄的行人友善區 | sidewalk、car-lane | `facility`、`regulation`、`participation` |
| 12-D | 違停、占用與設施損壞的檢舉與回覆 | indoor | `intake` |
| 12-E | 行人穿越道與步行路線的照明 | sidewalk、car-lane | `facility`、`participation` |
| 12-F | 步行環境調查與公開的改善計畫 | sidewalk、arcade | `planning`、`open-data`、`participation` |

The current cross-issue solutions, tagged the same way (for reference):

| 解法 | 解法類型 |
|---|---|
| X-A 同一段人行道的共同參與式選址 | `participation` |
| X-B 人行道設施帶的共同檢查清單 | `regulation`、`facility` |
| X-C 共用的通報入口與派工 | `intake`、`digital-tool` |
| X-D 共同開放資料與地圖 | `open-data`、`digital-tool` |
| X-E 清潔箱與吸菸區分開設置、一起清運 | `facility`、`intake` |
| X-F 收集點與放置點 | `facility`、`procedure` |
| X-G 老舊公寓的到府診斷與協助 | `service` |
| X-H 通勤公車、接駁與跨市路線的共同規劃 | `planning`、`service` |
| X-I 消防與救護路線的共同檢查 | `procedure`、`planning` |
| X-J 重建與更新案的樹木規則與審查時程 | `procedure`、`regulation` |
| X-K 道路與路口的共同設計 | `facility` |
| X-L 鄰近工地的事先通知與施工噪音管理 | `procedure`、`outreach` |
| X-M 菸味與噪音糾紛的規約範本與調解 | `regulation`、`service` |

### 3.3 What the test found

Summary of the tags:

- 63 solutions: 12 have 1 type, 41 have 2 types, 10 have 3 types. I set a limit of 3.
- Use of each type: `procedure` 14, `facility` 16, `participation` 13, `regulation` 12, `open-data` 11, `service` 10, `planning` 9, `digital-tool` 8, `intake` 8, `outreach` 8, `enforcement` 7, `subsidy` 5, `resources` 3.

No solution fits no type.

Solutions that needed more than 3 types (I kept the 3 main ones):

| 解法 | Types kept | Type left out | Why |
|---|---|---|---|
| 1-B | `open-data`、`intake`、`regulation` | `procedure` | It also adds a diagnosis step before a tree is removed |
| 5-A | `resources`、`procedure` | `digital-tool` | Phone sensors are a small part |
| 6-D | `outreach`、`service`、`open-data` | `digital-tool` | The interactive guide is one part of many |
| 12-A | `facility`、`enforcement`、`outreach` | `regulation` | 路口淨空 is also a rule |

These solutions are bundles of several actions. This is a problem with the solution, not with the list. If ETBlue wants, a writer can split such a solution into two.

Boundaries that were hard to decide:

- `planning` or `digital-tool`: maps that rank places for internal use (#2 A, #3 A). Rule used: if the output is a priority list for staff, it is `planning`. If people use it, it is `digital-tool`.
- `regulation` or `outreach`: model rules (規約範本) in #8 E and #10 E. They are not binding. Rule used: a template that others are asked to adopt is `regulation`.
- `intake` or `procedure`: #8 B puts cigarette-butt bins into the cleaning route. Rule used: sending work to a crew (派工) is `intake`.
- `participation` for businesses: #4 B is a negotiation with companies. The test says "residents, users or businesses", so it fits.
- #1 B: `intake` is based on X-C, which says tree reports go into the tree's record (#1 解法 B). The 6.1 sentence is long; a person should check this.

Tag changes I made during the test (so the lists fit the existing X- solutions better):

- #4 D: added `planning` (it changes routes based on travel data).
- #8 B: added `intake` (butts go into the cleaning route).
- #6 E: `procedure`, not `intake` (it is a fixed handling process for damage).
- #6 D: `open-data` instead of `digital-tool` (it publishes review progress).

---

## 4. Cross-issue preview

The rule tested: two solutions are a **combine candidate** if they are in different issues, they share a solution type, and their issues are **related**. I tested two ways to decide "related".

### 4.1 Rule A: issues share a domain or an issue-level space type

Related issue pairs: **45 of 55**.

Only these 10 pairs are not related: #1–#9, #2–#9, #3–#9, #4–#9, #5–#9, #6–#9, #8–#9, #9–#10, #9–#11, #9–#12. In other words, every issue is related to every other issue, except #9.

Why: **`sidewalk` is in the header of 10 of 11 issues** (all except #9). `indoor` is in 8 of 11. These two space types link almost every issue, so they are too broad to be useful at issue level.

- By domain alone, there are only 13 related pairs. `environment` links #2, #3, #8, #10, #11 (10 pairs). `transport` links #4, #5, #12 (3 pairs). `health` links #3 and #8.
- If `sidewalk` and `indoor` do not count, Rule A still links 39 of 55 pairs. `arcade` (6 issues), `park`, `mrt-exit` and `car-lane` (5 issues each) are also wide.

Combine candidates with Rule A: 455 solution pairs. 375 of them are not part of any current X- solution.

### 4.2 Rule B (suggested): same domain, or the two solutions share a space type

This rule uses the space types in the 6.1 column of each solution, not the issue header.

| Variant | Candidate pairs | New pairs (not in any X-) |
|---|---|---|
| B1: all space types count | 321 | 260 |
| B2: `sidewalk` and `indoor` do not count | 204 | 153 |

### 4.3 Which current X- solutions are found

"Pairs found" = pairs of component solutions from different issues that the rule finds. "Parts reached" = component solutions that are in at least one found pair.

| X- | Rule A: pairs found | Rule A: parts missed | Rule B1: pairs found | Rule B1: parts missed | Rule B2: pairs found | Rule B2: parts missed |
|---|---|---|---|---|---|---|
| X-A | 3/3 | — | 3/3 | — | 3/3 | — |
| X-B | 6/14 | — | 6/14 | — | 2/14 | #1 A、#1 D、#2 A |
| X-C | 21/21 | — | 15/21 | — | 13/21 | #12 D |
| X-D | 33/44 | #9 D | 21/44 | #6 A、#9 D | 19/44 | #6 A、#9 D |
| X-E | 1/2 | #2 A | 1/2 | #2 A | 1/2 | #2 A |
| X-F | 4/5 | — | 4/5 | — | 4/5 | — |
| X-G | 3/3 | — | 3/3 | — | 1/3 | #6 C |
| X-H | 1/2 | #5 F | 1/2 | #5 F | 1/2 | #5 F |
| X-I | 1/1 | — | 1/1 | — | 1/1 | — |
| X-J | 1/1 | — | 0/1 | #1 B、#6 D | 0/1 | #1 B、#6 D |
| X-K | 5/5 | — | 5/5 | — | 5/5 | — |
| X-L | 1/1 | — | 1/1 | — | 1/1 | — |
| X-M | 1/1 | — | 1/1 | — | 1/1 | — |

What this shows:

- With Rule A, all 13 X- solutions are found at least in part. But Rule A also finds 375 new pairs, so it does not filter much.
- **X-B is about the sidewalk.** If `sidewalk` does not count (B2), X-B is mostly lost. So simply removing `sidewalk` is not a good fix.
- **#9 D is always missed.** #9 has no space type and no shared domain. X-D joined #9 D because all parts publish data on the same platform. A rule based on domain and space cannot find this.
- **#2 A** (建議地圖) is missed in X-E, because its types (`planning`, `digital-tool`) are not the types of the other parts. X-E joins it for the distance check between bins and smoking areas. That is a small part of #2 A.
- **#5 F** is missed in X-H. Its types are `digital-tool`、`procedure`; #4 D is `service`、`planning`.
- **X-J** (#1 B and #6 D) is found only by Rule A. #1 and #6 share no domain, and the two solutions share no space type (#1 B: `sidewalk`、`park`; #6 D: `building-shell`、`indoor`).
- **#6 C in X-G** is lost in B2 because it is `indoor` only. With the optional solution-level domain `social-welfare` (section 3.1), it is found again.

### 4.4 New candidates

Rule B2 gives 153 new pairs. By shared type: `procedure` 15, `facility` 40, `participation` 19, `service` 15, `planning` 13, `regulation` 12, `enforcement` 10, `digital-tool` 9, `outreach` 8, `open-data` 7, `subsidy` 5, `intake` 4. (Some pairs share more than one type.)

Examples that look useful (my reading, for ETBlue to judge):

| Pair | Shared type | Shared link | Why it may be worth combining |
|---|---|---|---|
| #4 C ~ #12 A | `facility` | `transport`; `car-lane`、`scooter-lane` | Both change signals at junctions. #4 C already says the pedestrian green time must not be cut |
| #10 B ~ #12 A | `enforcement` | `car-lane`、`scooter-lane` | Both are traffic police checks on the same roads |
| #2 E ~ #11 D | `service` | `environment` | Both help households that cannot use the normal waste pickup |
| #8 A ~ #11 E | `participation` | `environment`; `arcade` | Both choose a place on the street with neighbours |
| #6 F ~ #12 C | `facility` | `car-lane` | Narrow lanes: fire access and pedestrian space in the same lane |

Examples that look like noise:

| Pair | Shared type | Why it is noise |
|---|---|---|
| #10 F ~ #12 A | `facility` | Noise walls and junction signals only share "road" |
| #3 A ~ #12 F | `planning` | A rat risk map and a walking survey share only "survey" |
| #3 D ~ #11 B | `procedure` | Rat bait schedules and bulky-waste pickup times are unrelated steps |

The full list of the 153 pairs is in the appendix.

### 4.5 Suggested fixes

1. **Use solution-level space types, not the issue header** (Rule B). The header is a union of all solutions, so it is always wide.
2. **Make `sidewalk` and `indoor` more exact** instead of dropping them. For example, split `sidewalk` into `sidewalk-furniture` (人行道設施帶) and `crossing` (路口與行人穿越道), and split `indoor` into `home` (住家與公寓公共空間) and `business` (營業場所). X-B uses the furniture zone, and X-G and X-M use homes, so the links would stay. This is a change to `space-types.csv`, so ETBlue must decide.
3. **Show candidates as a list for a person to review**, not as automatic combinations. The rule finds 150–450 pairs, but there are 13 X- solutions today. The list would be sorted by issue number and solution ID, never by count.
4. **For "platform" types (`open-data`, `intake`), allow candidates across all issues.** This is how X-C and X-D were made: one data platform and one reporting channel for every issue. This rule is the same for every issue, so it is not a special case for #9. But it adds many pairs, so ETBlue should decide.

---

## 5. Where to store

Files (same format as `analysis/data/space-types.csv`: 代碼, 名稱, 分組, 說明):

| File | Columns |
|---|---|
| `analysis/data/domain-types.csv` | 代碼, 名稱, 說明, 政事別, 陳情系統主類別 |
| `analysis/data/solution-types.csv` | 代碼, 名稱, 說明, 判斷方式, 政策工具 (NATO) |

Where the tags go (follow how space types work today):

- **Issue domain**: one header line under the title, next to 「空間類型：」. For example 「領域：`environment`、`health`」. This is how space types are stored today; they are **not** in `issues.csv`. If a column in `issues.csv` is wanted (for the app), the build script can copy it from the header, so there is one source only.
- **Solution type**: a new 6.1 column 「解法類型」 right after 「空間類型」, before 「新增日期」. Codes only, like the 空間類型 column.
- **Optional solution domain**: a 6.1 column 「領域」 that is empty when the solution has the issue's domain. Only fill it when it differs (for example #6 C, #11 D: `social-welfare`).
- **Cross-issue 4.1**: add 「解法類型」 after 「空間類型」, for the X- solutions.
- Other work that follows: `analysis/docs/method.md` (rules), `check_analysis.py` (codes must be in the CSV), `update_dates.py` (dates for the new CSV rows), the build scripts, `app/` and a new numbered entry in `app/docs/design.md`.

---

## 6. Open questions for ETBlue

1. Base for domains: is 政事別 中分類 OK, with the petition 主類別 as a second column?
2. `greenery`: keep it as its own domain, or put #1 under `environment`?
3. Solution types: 13 types, or merge to 12 (merge `enforcement` into `regulation`, or do not split 作業流程)?
4. Limit of 3 solution types per solution: OK? Or should bundles like #1 B and #6 D be split?
5. Solution-level domain (only when different from the issue): wanted or not?
6. Space types: refine `sidewalk` and `indoor` (fix 2 in 4.5)?
7. "Platform" types (`open-data`, `intake`) across all issues (fix 4 in 4.5): wanted or not?
8. Which rule for "related" should the cross-issue step use: A, B1 or B2?

---

## Appendix: the 153 new candidate pairs (Rule B2)

Sorted by issue number, then solution ID. Each pair shares at least one solution type, and either a domain or a solution-level space type other than `sidewalk` and `indoor`. The pair is not inside any current X- solution.

| Pair | Shared type | Shared domain or space |
|---|---|---|
| #1 A ~ #2 B | `digital-tool` | `park` |
| #1 A ~ #3 A | `planning` | `park` |
| #1 B ~ #8 A | `regulation` | `park` |
| #1 B ~ #8 B | `intake` | `park` |
| #1 B ~ #10 D | `regulation` | `park` |
| #1 C ~ #3 D | `procedure` | `park` |
| #1 C ~ #10 D | `participation` | `park` |
| #1 D ~ #4 E | `facility` | `bike-lane` |
| #1 E ~ #2 D | `participation` | `park` |
| #1 E ~ #3 D | `procedure` | `park` |
| #1 E ~ #8 A | `participation` | `park` |
| #1 E ~ #10 D | `participation` | `park` |
| #1 F ~ #3 D | `procedure` | `park` |
| #2 A ~ #3 A | `planning` | `environment`、`mrt-exit` |
| #2 A ~ #4 A | `digital-tool` | `mrt-exit` |
| #2 A ~ #4 D | `planning` | `mrt-exit` |
| #2 A ~ #5 B | `planning` | `mrt-exit` |
| #2 A ~ #5 F | `digital-tool` | `mrt-exit` |
| #2 A ~ #11 A | `digital-tool` | `environment` |
| #2 B ~ #4 A | `digital-tool` | `mrt-exit` |
| #2 B ~ #5 F | `digital-tool` | `mrt-exit` |
| #2 C ~ #5 F | `digital-tool` | `mrt-exit` |
| #2 C ~ #10 C | `open-data` | `environment` |
| #2 C ~ #11 A | `digital-tool` | `environment` |
| #2 D ~ #10 D | `participation` | `environment`、`park` |
| #2 D ~ #11 E | `participation` | `environment`、`arcade` |
| #2 D ~ #12 F | `participation` | `arcade` |
| #2 E ~ #3 C | `facility` | `environment` |
| #2 E ~ #3 D | `service` | `environment`、`park` |
| #2 E ~ #3 E | `service` | `environment` |
| #2 E ~ #8 B | `facility` | `environment`、`park` |
| #2 E ~ #8 E | `service` | `environment` |
| #2 E ~ #10 E | `service` | `environment` |
| #2 E ~ #10 F | `facility` | `environment` |
| #2 E ~ #11 D | `service` | `environment` |
| #3 A ~ #4 D | `planning` | `mrt-exit` |
| #3 A ~ #5 B | `planning` | `mrt-exit` |
| #3 A ~ #12 F | `planning` | `arcade` |
| #3 B ~ #6 E | `procedure` | `arcade` |
| #3 B ~ #8 B | `facility` | `environment`、`health` |
| #3 B ~ #10 C | `procedure` | `environment` |
| #3 B ~ #10 F | `facility` | `environment` |
| #3 B ~ #11 C | `procedure` | `environment` |
| #3 B ~ #12 B | `facility` | `arcade` |
| #3 C ~ #8 B | `facility` | `environment`、`health` |
| #3 C ~ #8 D | `enforcement` | `environment`、`health` |
| #3 C ~ #10 B | `enforcement` | `environment` |
| #3 C ~ #10 F | `facility` | `environment` |
| #3 C ~ #11 E | `facility` | `environment` |
| #3 D ~ #4 D | `service` | `mrt-exit` |
| #3 D ~ #5 D | `service` | `mrt-exit` |
| #3 D ~ #5 F | `procedure` | `mrt-exit` |
| #3 D ~ #6 E | `procedure` | `arcade` |
| #3 D ~ #8 E | `service` | `environment`、`health`、`arcade` |
| #3 D ~ #10 C | `procedure` | `environment` |
| #3 D ~ #10 E | `service` | `environment` |
| #3 D ~ #11 B | `procedure` | `environment`、`arcade` |
| #3 D ~ #11 C | `procedure` | `environment` |
| #3 D ~ #11 D | `service` | `environment` |
| #3 E ~ #6 E | `enforcement` | `arcade` |
| #3 E ~ #8 D | `enforcement` | `environment`、`health`、`arcade` |
| #3 E ~ #8 E | `service` | `environment`、`health`、`arcade` |
| #3 E ~ #10 B | `enforcement` | `environment` |
| #3 E ~ #10 E | `service` | `environment` |
| #3 E ~ #10 F | `subsidy` | `environment` |
| #3 F ~ #8 B | `intake` | `environment`、`health`、`mrt-exit`、`park` |
| #3 F ~ #10 C | `open-data` | `environment` |
| #4 A ~ #5 F | `digital-tool` | `transport`、`mrt-exit` |
| #4 A ~ #10 C | `open-data` | `car-lane` |
| #4 B ~ #6 F | `subsidy` | `car-lane` |
| #4 B ~ #8 A | `participation` | `bus-stop` |
| #4 B ~ #10 F | `subsidy` | `car-lane` |
| #4 B ~ #12 C | `participation` | `transport`、`car-lane` |
| #4 B ~ #12 E | `participation` | `transport`、`car-lane` |
| #4 B ~ #12 F | `participation` | `transport` |
| #4 C ~ #5 C | `facility` | `transport` |
| #4 C ~ #5 E | `facility` | `transport`、`car-lane`、`scooter-lane` |
| #4 C ~ #10 F | `facility` | `car-lane` |
| #4 C ~ #12 A | `facility` | `transport`、`car-lane`、`scooter-lane` |
| #4 C ~ #12 B | `facility` | `transport` |
| #4 C ~ #12 C | `facility` | `transport`、`car-lane` |
| #4 C ~ #12 E | `facility` | `transport`、`car-lane` |
| #4 D ~ #5 D | `service` | `transport`、`bus-stop`、`car-lane`、`mrt-exit` |
| #4 D ~ #6 B | `planning` | `car-lane` |
| #4 D ~ #12 F | `planning` | `transport` |
| #4 E ~ #5 C | `facility` | `transport` |
| #4 E ~ #6 F | `facility` | `car-lane` |
| #4 E ~ #10 F | `facility` | `car-lane` |
| #4 E ~ #12 B | `facility` | `transport` |
| #4 E ~ #12 E | `facility` | `transport`、`car-lane` |
| #4 F ~ #10 B | `enforcement` | `car-lane` |
| #4 F ~ #12 A | `enforcement` | `transport`、`car-lane` |
| #4 F ~ #12 B | `regulation` | `transport`、`parking` |
| #4 F ~ #12 C | `regulation` | `transport`、`car-lane` |
| #4 G ~ #5 B | `planning` | `transport`、`car-lane` |
| #4 G ~ #6 B | `planning` | `car-lane` |
| #4 G ~ #12 C | `participation` | `transport`、`car-lane` |
| #4 G ~ #12 E | `participation` | `transport`、`car-lane` |
| #4 G ~ #12 F | `participation`、`planning` | `transport` |
| #5 A ~ #10 C | `procedure` | `car-lane` |
| #5 B ~ #6 B | `planning` | `car-lane` |
| #5 B ~ #10 C | `open-data` | `car-lane` |
| #5 C ~ #12 A | `facility` | `transport` |
| #5 C ~ #12 B | `facility` | `transport`、`parking` |
| #5 C ~ #12 C | `facility` | `transport` |
| #5 C ~ #12 E | `facility` | `transport` |
| #5 E ~ #6 F | `facility` | `car-lane` |
| #5 E ~ #10 F | `facility` | `car-lane` |
| #5 E ~ #12 E | `facility` | `transport`、`car-lane` |
| #6 A ~ #10 C | `open-data` | `building-shell` |
| #6 C ~ #10 F | `subsidy` | `building-shell` |
| #6 D ~ #10 C | `open-data` | `building-shell` |
| #6 E ~ #8 D | `enforcement` | `arcade` |
| #6 E ~ #11 B | `procedure` | `arcade` |
| #6 F ~ #10 F | `facility`、`subsidy` | `building-shell`、`car-lane` |
| #6 F ~ #12 A | `facility` | `car-lane` |
| #6 F ~ #12 C | `facility` | `car-lane` |
| #6 F ~ #12 E | `facility` | `car-lane` |
| #8 A ~ #10 D | `participation`、`regulation` | `environment`、`park` |
| #8 A ~ #10 E | `regulation` | `environment` |
| #8 A ~ #11 C | `regulation` | `environment` |
| #8 A ~ #11 E | `participation` | `environment`、`arcade` |
| #8 A ~ #12 F | `participation` | `arcade` |
| #8 B ~ #10 A | `intake` | `environment` |
| #8 B ~ #10 F | `facility` | `environment` |
| #8 B ~ #11 A | `intake` | `environment` |
| #8 B ~ #11 E | `facility` | `environment` |
| #8 C ~ #10 B | `outreach` | `environment` |
| #8 C ~ #10 C | `open-data` | `environment` |
| #8 C ~ #10 D | `outreach` | `environment`、`park` |
| #8 C ~ #10 E | `outreach` | `environment` |
| #8 C ~ #11 B | `outreach` | `environment`、`arcade` |
| #8 D ~ #10 B | `enforcement` | `environment` |
| #8 E ~ #10 D | `regulation` | `environment` |
| #8 E ~ #11 C | `regulation` | `environment` |
| #8 E ~ #11 D | `service` | `environment` |
| #8 E ~ #12 B | `regulation` | `arcade` |
| #10 B ~ #11 B | `outreach` | `environment` |
| #10 B ~ #12 A | `enforcement`、`outreach` | `car-lane`、`scooter-lane` |
| #10 C ~ #11 B | `procedure` | `environment` |
| #10 C ~ #11 C | `procedure` | `environment` |
| #10 D ~ #11 B | `outreach` | `environment` |
| #10 D ~ #11 C | `regulation` | `environment` |
| #10 D ~ #11 E | `participation` | `environment` |
| #10 E ~ #11 B | `outreach` | `environment` |
| #10 E ~ #11 C | `regulation` | `environment` |
| #10 E ~ #11 D | `service` | `environment` |
| #10 F ~ #11 E | `facility` | `environment` |
| #10 F ~ #12 A | `facility` | `car-lane` |
| #10 F ~ #12 C | `facility` | `car-lane` |
| #10 F ~ #12 E | `facility` | `car-lane` |
| #11 E ~ #12 B | `facility` | `arcade` |
| #11 E ~ #12 F | `participation` | `arcade` |

