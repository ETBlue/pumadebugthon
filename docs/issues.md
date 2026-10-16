# 市政 debug 松 — 7 Issues

Source: https://puma.taipei/hackathon#issues
Saved: 2026-10-15. Text is copied as-is from the website (Traditional Chinese).

## Notes from the organizers (apply to all issues)

> 以下是市政痛點，不是市政解答。題目來自「市長，你給我聽好了」蒐集的市民意見，由政策組整理。每隊選一題，也可跨題整合。每題附上可用的開放資料，作為起手參考。

> 「市長，你給我聽好了」資料（已去識別化）即將於此釋出。

**可以用模擬的資料 (mock data is allowed)**

> 作品重點是解法和可操作的介面，不必真的串接 API。資料不存在、沒開放或太難取得，就自己產生模擬資料，在 README 和 Demo 時說明哪些是真實資料、哪些是模擬的資料。不得使用任何真實個資。

Key points:
- Pick one issue, or combine several.
- Mock data is OK. The README and the Demo must say which data is real and which is mock.
- No real personal data.
- The de-identified "市長，你給我聽好了" citizen data is "coming soon" on the website (not released on 2026-10-15).

## Summary

| # | Title | Tags | Data gap (use mock data) |
|---|---|---|---|
| 1 | 把三千棵樹種回來 | 環境 · 樹蔭公平 Shade Equity · GIS | 逐年移除紀錄與原因未完整開放 |
| 2 | 找回消失的垃圾桶 | 市容 · IoT · 佈建最佳化 | 垃圾桶滿溢偵測資料不存在 |
| 3 | 鼠患四處跑，衛生安全怎麼辦 | 衛生 · GIS · 風險模型 | 逐筆餐飲業者位置、清運排程未完整開放 |
| 4 | 內湖尖峰車流好比停車場 | 交通 · 即時資料 · 儀表板 | 歷史 15 分鐘 VD 序列需自行累積 |
| 5 | 公車路網如何即時反應需求 | 交通 · 最佳化 · 勞動條件 | 各站上下車刷卡人次未開放 |
| 6 | 危老耐震如何查，風險評級怎麼找 | 居住安全 · 加權模型 · 都更 | 逐棟屋齡、結構類型未開放 |
| 7 | 自由題：你看見的市政 bug | 自選 | — |

---

## #1 把三千棵樹種回來

Tags: 環境 · 樹蔭公平 Shade Equity · GIS

> 2025 年台北有 3,164 棵樹被移除。市府說明多為病蟲害或自然死亡，但東門市場附近一棵約 40 年、原本計畫移植保留的茄苳樹，卻遭到「誤砍」。台北一年移除三千棵樹，我們要如何找出城市空間把樹種回來，達到樹蔭公平？可參考新加坡「見縫插樹」。

Open data:

| Dataset | Source | Format |
|---|---|---|
| [臺北市行道樹及公園樹木分布圖](https://data.gov.tw/dataset/128274) | data.gov.tw | CSV/JSON |
| [臺北市人行道固定設施物＿樹穴](https://data.gov.tw/dataset/134908) | data.gov.tw | |
| [臺北市人行道範圍圖](https://data.taipei/dataset/detail?id=715d3a83-8445-4496-b6bf-b0900538b7e7) | data.taipei | JSON |
| [臺北市公園基本資料](https://data.taipei/dataset/detail?id=ea732fb5-4bec-4be7-93f2-8ab91e74a6c6) | data.taipei | JSON |
| [臺北市行道樹路燈資訊網（含移樹履歷查詢）](https://geopkl.gov.taipei/) | 公園處 | |

Data gap: 逐年移除紀錄與原因未完整開放 → 可用模擬資料

---

## #2 找回消失的垃圾桶

Tags: 市容 · IoT · 佈建最佳化

> 台北行人專用垃圾桶從全盛時期近 3,000 組，縮減到約 800 組。環保局依家戶垃圾違規棄置量評估裁撤或復設，但我們能不能結合行人流量、商圈分佈與民眾通報熱點，打造動態清理和智慧化的垃圾桶佈建建議？

> 沈伯洋說：垃圾桶很容易滿，可以設偵測系統。有些國家偵測到垃圾桶滿了才派人去收，不用一直定時巡邏；也有智慧垃圾桶，滿的時候裡面的機器會往下壓。 ([新聞](https://tw.news.yahoo.com/share/82b4237f-1c4e-3d4f-9540-bf9c81c16b4e))

Open data:

| Dataset | Source | Format |
|---|---|---|
| [臺北市行人專用清潔箱（位置）](https://data.gov.tw/dataset/121355) | data.gov.tw | |
| [臺北捷運各站分時進出量（行人流量參考）](https://data.taipei/dataset/detail?id=63f31c7e-7fc3-418b-bd82-b95158755b4d) | data.taipei | CSV |
| [臺北市陳情系統類別資料](https://data.taipei/dataset/detail?id=cb423c17-88eb-4231-a725-f1b93247d1bf) | data.taipei | CSV |
| [臺北市公車站牌位置圖](https://data.taipei/dataset/detail?id=48aa5bca-2a4f-4fb7-a658-43cba51d5d56) | data.taipei | SHP |

Data gap: 垃圾桶滿溢偵測資料不存在 → 可用模擬資料

---

## #3 鼠患四處跑，衛生安全怎麼辦

Tags: 衛生 · GIS · 風險模型

> 傳統市場、夜市與餐飲聚落周邊的鼠患長年困擾市民，現行做法多停留在投藥與被動稽查。我們要如何整合餐飲登記密度、下水道管網分布、清潔隊清運排程與歷史通報，畫出「鼠患風險傳播地圖」，讓源頭治理精準到位？

> 沈伯洋說：老鼠要有食物和管道才能持續，錯過繁殖期就要等下一次才能處理。要做好垃圾與廚餘焚燒前的密封管理、確認垃圾車是否足夠、翻修管道與地下水道，並在繁殖期投放藥物，把前端預防做好。 ([新聞](https://www.cna.com.tw/news/aloc/202605010231.aspx))

Open data:

| Dataset | Source | Format |
|---|---|---|
| [臺北市陳情系統類別資料（含病媒通報）](https://data.taipei/dataset/detail?id=cb423c17-88eb-4231-a725-f1b93247d1bf) | data.taipei | CSV |
| [臺北市污水下水道管線](https://data.taipei/dataset/detail?id=af1e6e42-5ffc-4be0-983f-51c03d5d1b17) | data.taipei | CSV |
| [臺北市雨水下水道人孔資料](https://data.taipei/dataset/detail?id=3e62c860-0753-4c79-8fe1-bcb3e0243534) | data.taipei | CSV |
| [臺北市食品業者登錄數（分區）](https://data.taipei/dataset/detail?id=9431f450-57d6-4c23-aca6-0ff50de49f0d) | data.taipei | CSV |
| [臺北市食材登錄平台：夜市專區](https://foodtracer.taipei.gov.tw/Front/Nightmarket) | 衛生局 | |
| [見鼠地圖 Rat Radar：民眾通報（可匯出 CSV）](https://ratdar.taipei/reports) | 民間 | CSV export |

Data gap: 逐筆餐飲業者位置、清運排程未完整開放 → 可用模擬資料

---

## #4 內湖尖峰車流好比停車場

Tags: 交通 · 即時資料 · 儀表板

> 平日 07:00–09:30，數萬輛汽機車擠進成美橋、民權大橋與堤頂大道。如果把每 15 分鐘湧入內湖的車流熱點攤在陽光下，就能替企業算出「分批上班、彈性工時」對通勤與營運的好處。我們要如何整合高快速道路、聯外橋樑的 VD 流量與即時路況，做出「平日晨尖峰內科車流熱力儀表板」，作為市府與企業協商彈性工時的數據後盾？

Open data:

| Dataset | Source | Format |
|---|---|---|
| [臺北市車輛偵測器（VD）靜態資料](https://data.taipei/dataset/detail?id=47cb9090-e1c9-4b1d-b299-b11c375c5ee2) | data.taipei | |
| [縣市即時路況（VD 每 5 分鐘統計）](https://data.gov.tw/dataset/166031) | data.gov.tw | API |
| [TDX 運輸資料流通服務平臺（需申請金鑰）](https://tdx.transportdata.tw/) | 交通部 | API (key needed) |
| [臺北捷運各站分時進出量（文湖線）](https://data.taipei/dataset/detail?id=63f31c7e-7fc3-418b-bd82-b95158755b4d) | data.taipei | CSV |

Data gap: 歷史 15 分鐘 VD 序列需自行累積 → 可用模擬資料

---

## #5 公車路網如何即時反應需求

Tags: 交通 · 最佳化 · 勞動條件

> 台北公車路線長年疊床架屋，許多幹道路線與捷運高度重疊、互相競逐。我們要如何用站點上下車刷卡資料，算出各站真實的搭乘熱區與冷區，重劃捷運接駁與離峰低運量區塊，設計適合導入 DRTS 或小型巴士的動態路網？加分方向：把駕駛長過勞納入考量，例如盤點折返點的休息與大車暫停空間，把休息時間排進班表。

Open data:

| Dataset | Source | Format |
|---|---|---|
| [臺北市公車路線軌跡](https://data.taipei/dataset/detail?id=efad90af-4bbe-4c6a-ac60-06f3e52d8a97) | data.taipei | JSON |
| [臺北市公車站牌位置圖](https://data.taipei/dataset/detail?id=48aa5bca-2a4f-4fb7-a658-43cba51d5d56) | data.taipei | SHP |
| [臺北市預估到站時間（公車）](https://data.taipei/dataset/detail?id=f11a5af0-7b37-48ef-98cc-f6f102ed43c6) | data.taipei | JSON |
| [臺北市聯營公共汽車客運業務統計](https://data.taipei/dataset/detail?id=90dd063e-2aca-49aa-a7fb-73130610313c) | data.taipei | CSV |
| [TDX 運輸資料流通服務平臺](https://tdx.transportdata.tw/) | 交通部 | API |

Data gap: 各站上下車刷卡人次未開放 → 可用模擬資料

---

## #6 危老耐震如何查，風險評級怎麼找

Tags: 居住安全 · 加權模型 · 都更

> 台北面臨「人老＋屋老」的雙老困境。50 年以上老屋在 2025 年突破 20%，2035 年將破 50%，2045 年超過 65%，代表多數房屋是在 921 地震修正耐震法規之前興建。我們要如何整合屋齡、建築結構、高齡人口、土壤液化潛勢與狹小巷弄消防搶救困難圖資，建立「危老耐震風險加權評級模型」，讓市府科學化排出老屋健檢與公辦都更的優先順序？

Open data:

| Dataset | Source | Format |
|---|---|---|
| [臺北市土壤液化潛勢圖](https://data.taipei/dataset/detail?id=ec40e067-930f-4058-b7dc-71399d5f3147) | data.taipei | GeoJSON |
| [臺北市各里人口數按年齡分](https://data.taipei/dataset/detail?id=a6394e3f-3514-4542-87bd-de4310a40db3) | data.taipei | CSV |
| [臺北市現有營造建築物棟數（含屋齡別）](https://data.taipei/dataset/detail?id=7889e8a0-a71e-44e0-95c7-2213a7db1474) | data.taipei | CSV |
| [臺北市消防通道清冊（搶救困難地區）](https://data.taipei/dataset/detail?id=7a800e92-eb22-461f-b29d-8def2127a1bc) | data.taipei | CSV |
| [臺北市政府土壤液化潛勢查詢系統](https://soil.taipei/) | 工務局 | |

Data gap: 逐棟屋齡、結構類型未開放 → 可用模擬資料

---

## #7 自由題：你看見的市政 bug

Tags: 自選

> 你也可以自己找題目。以下是政策組的備選方向和起手資料：

| Direction | Dataset | Source | Format |
|---|---|---|---|
| 颱風、豪雨、淹水預警 | [雨量站即時資料](https://data.taipei/dataset/detail?id=6f03a0b8-7b98-4eea-8bb9-ba6bfcdc2b8b) | data.taipei | API |
| 淹水預警 | [雨水下水道水位監測站](https://data.taipei/dataset/detail?id=b3648c5d-15c8-416a-a603-fda7a9ac1b0d) | data.taipei | CSV |
| 捷運總體檢 | [各站分時進出量](https://data.taipei/dataset/detail?id=63f31c7e-7fc3-418b-bd82-b95158755b4d) | data.taipei | CSV |
| 幼兒園不適任人員查核透明化 | [教育局專區](https://www.doe.gov.taipei/News_Link.aspx?n=9E714C7EB1702778&sms=10FAB7D5E5149055) | 教育局 | |
| (all) | [臺北市資料大平臺（全部資料集）](https://data.taipei) | data.taipei | |

---

## Datasets used by more than one issue

| Dataset | Issues |
|---|---|
| 臺北捷運各站分時進出量 | #2, #4, #7 |
| 臺北市陳情系統類別資料 | #2, #3 |
| 臺北市公車站牌位置圖 | #2, #5 |
| TDX 運輸資料流通服務平臺 | #4, #5 |
