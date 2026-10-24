# 市政 debug 松：議題分析與市政提案小幫手

看見各方利害關係人，打造更體貼周到的市政規劃。

> 本專案由一位個人參加者用 AI 協助製作，與主辦單位無關，也不代表主辦單位或市府的立場。`[AI模擬]` 的內容不是真實訪談，也不是真實市民的話；`[AI整理]` 的內容由 AI 從真實資料整理，還沒有經過真人查核；`[實證]` 的內容有可查證的出處，或已經由真人查核；`【待補：…】` 需要真人提供。

- 網站：https://etblue.github.io/pumadebugthon/
- 原始碼：<https://github.com/ETBlue/pumadebugthon>

## 這是什麼

這是市政 debug 松（市政黑客松）的一份個人參加作品。它有兩個部分：

| 部分 | 內容 | 說明 |
|---|---|---|
| 議題分析 | 把商業界常用的需求分析方法，套用到黑客松的議題：列出利害關係人、寫下使用者故事、找出真正的需求、排出優先順序、發想並評估解法 | [`analysis/README.md`](analysis/README.md) |
| 市政提案小幫手（網站） | 把議題分析整理成可以瀏覽的網頁 | [`app/README.md`](app/README.md) |

## 為什麼要做這個

黑客松的時間很短，參加者容易直接從題目裡的資料和舉例開始動手。這個專案想補上一個步驟：在動手做之前，先看見各方利害關係人的多樣與衝突。這樣做出來的提案，比較容易說明「為什麼」。

分析都用同一種格式，所以結果是結構化資料。市民、公務員與公民科技社群可以依利害關係人或城市空間，找到相關議題的分析，再拿來使用。

## Repo 的結構

| 路徑 | 內容 |
|---|---|
| [`analysis/`](analysis/) | 各議題的分析（`<編號>-<名稱>/issue-analysis.md`、`user-stories.csv`）、跨議題分析（`cross-issue/`）、共用的資料表（`data/`）、說明文件（`docs/`）、檢查與轉換程式（`scripts/`）與測試（`tests/`） |
| [`app/`](app/) | 網站「市政提案小幫手」的原始碼（React、Vite）。推送到 `main` 之後，GitHub Actions 會自動檢查、建置並發布到 GitHub Pages |
| [`LICENSE`](LICENSE) | 原始碼的授權（MIT） |
| [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md) | 內容的授權（CC BY 4.0）與例外 |

## 議題清單

#1–#6 是主辦單位的題目。#8、#9、#10、#11、#12 是本專案自行新增的議題。題目名稱來自 [`analysis/data/issues.csv`](analysis/data/issues.csv)。

| 編號 | 題目 | 來源 | 議題分析 | 網站 |
|---|---|---|---|---|
| #1 | 把三千棵樹種回來 | 主辦單位題目 | [議題分析](analysis/1-trees/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/1) |
| #2 | 找回消失的垃圾桶 | 主辦單位題目 | [議題分析](analysis/2-trashcans/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/2) |
| #3 | 鼠患四處跑，衛生安全怎麼辦 | 主辦單位題目 | [議題分析](analysis/3-mice/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/3) |
| #4 | 內湖尖峰車流好比停車場 | 主辦單位題目 | [議題分析](analysis/4-neihutraffic/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/4) |
| #5 | 公車路網如何即時反應需求 | 主辦單位題目 | [議題分析](analysis/5-busroutes/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/5) |
| #6 | 危老耐震如何查，風險評級怎麼找 | 主辦單位題目 | [議題分析](analysis/6-oldbuildings/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/6) |
| #8 | 無菸城市 | 自行新增 | [議題分析](analysis/8-smokefree/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/8) |
| #9 | 將產品探索技巧運用到政策前期研究 | 自行新增 | [議題分析](analysis/9-policydiscovery/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/9) |
| #10 | 噪音 | 自行新增 | [議題分析](analysis/10-noise/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/10) |
| #11 | 大型廢棄物清運 | 自行新增 | [議題分析](analysis/11-bulkywaste/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/11) |
| #12 | 行人安全／高齡行人 | 自行新增 | [議題分析](analysis/12-pedestrian/issue-analysis.md) | [議題頁](https://etblue.github.io/pumadebugthon/#/issues/12) |

**跨議題分析：** [`analysis/cross-issue/cross-issue-analysis.md`](analysis/cross-issue/cross-issue-analysis.md) 比較 #1、#2、#3、#4、#5、#6、#8、#9、#10、#11、#12。它列出共用的利害關係人、跨議題的共同需求與衝突，以及合併的解法。合併的解法在網站上也有自己的頁面，例如 [`#/solutions/X-A`](https://etblue.github.io/pumadebugthon/#/solutions/X-A)。

## 再利用資料

- 每一種有編號的項目（議題、利害關係人、故事、訴求、需求、衝突、解法、跨議題的編號、空間類型等）都有一個 CSV 檔和一個 JSON 檔，內容相同。
- 網址的格式是 `https://etblue.github.io/pumadebugthon/data/flat/<種類>.csv` 和 `.json`，例如 <https://etblue.github.io/pumadebugthon/data/flat/stories.csv>。網站的「關於本站」頁有每個檔案的連結。
- 欄位、編號、標記與授權的說明：[資料說明](analysis/docs/data-guide.md)。
- 這些檔案由 `analysis/scripts/build_flat.py` 從議題分析產生，沒有放在 repo 裡。要在本機產生，請執行下一節的 `build_all.sh`，結果在 `<輸出資料夾>/flat/`。
- 方法說明與閱讀方式：[如何閱讀議題分析](analysis/docs/method.md)。

## 在本機執行檢查

需要 Python 3 與 Node 22。以下指令在 repo 根目錄執行，除非另外寫明。

檢查議題分析並產生資料（任何一步失敗就會停止）：

```
CI=true analysis/scripts/build_all.sh <輸出資料夾>
```

- `CI=true` 時，如果重新產生的檔案和最後一次提交不同，指令會失敗，也不會更新日期。不加 `CI=true` 時，指令會更新這些檔案，並提醒你提交。
- 不寫輸出資料夾時，預設是 `app/public/data`。

只執行 Python 的單元測試：

```
python3 -I -m unittest discover -s analysis/tests -t . -p 'test_*.py'
```

網站（在 `app/` 資料夾執行）：

| 指令 | 用途 |
|---|---|
| `npm install` | 安裝套件 |
| `npm run data` | 從 `analysis/` 產生網站用的資料（寫到 `app/public/data`） |
| `npx vitest run` | 網站的測試（同 `npm test`） |
| `npx tsc -b` | 型別檢查 |
| `npx vite build` | 建置網站，結果在 `app/dist`（`npm run build` 會依序執行 `tsc -b` 與 `vite build`） |
| `npm run dev` | 開發用伺服器，網址為 <http://localhost:5173/pumadebugthon/> |

## 活動資料的使用規則

「市長，你給我聽好了」資料已去識別化，不得嘗試反推陳情人身分，也不得使用真實個資。「市長，你給我聽好了」資料僅限於此黑客松活動使用。

- 原始資料沒有放在本 repo。
- 本專案只用這份資料整理件數和改寫的摘要（標記 `[AI整理]`），不引用原始留言，也不辨認任何個人。

## 授權

| 內容 | 授權 |
|---|---|
| 原始碼（`app/` 的程式、`analysis/scripts/`、`analysis/tests/`） | MIT，見 [`LICENSE`](LICENSE) |
| 作者 ETBlue 製作的內容（議題分析、CSV 檔、說明文件、網站發布的資料檔、網站的介面文字等） | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。姓名標示請寫：ETBlue，並附上 <https://github.com/ETBlue/pumadebugthon> |
| 題目原文 | 著作權屬於主辦單位，依主辦單位的規定使用 |
| 開放資料的數字 | 依各資料集的授權使用（data.gov.tw 與 data.taipei 多數為「政府資料開放授權條款第 1 版」） |
| 從「市長，你給我聽好了」資料整理的件數與摘要 | 依活動規則，僅限於此黑客松活動使用，不適用 CC BY 4.0 |

詳細範圍與例外見 [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md)。

## 相關連結

- 作者的文章：[台北市政 debug 松議題的模擬分析](https://etblue.blogspot.com/2026/10/puma-taipei-debug-hackathon-issue-analysis.html)
- 黑客松的展示簡報：[Google 簡報](https://docs.google.com/presentation/d/1HC_7ajRGpkBqUxn-nwBCaCWixWJHvudiaeranYaBLiM/edit?usp=sharing)

## 回饋

歡迎在 [GitHub issues](https://github.com/ETBlue/pumadebugthon/issues) 留言。
