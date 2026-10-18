# 內容授權 / Content license

本 repo 有三種授權。

| 內容 | 授權 |
|---|---|
| 原始碼（`app/` 的程式、`analysis/*.py`、`analysis/*.sh`、`analysis/tests/`） | MIT，見 [`LICENSE`](LICENSE) |
| 作者 ETBlue 製作的內容（見下方） | [創用 CC 姓名標示 4.0 國際（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/) |
| 主辦單位的內容、開放資料 | 不適用上面兩種授權，見下方的例外 |

## CC BY 4.0 的範圍

除了下方的例外，以下內容使用 CC BY 4.0：

- `analysis/` 的議題分析：`*/issue-analysis.md`、`*/user-stories.csv`、`method.md`、`README.md`、共用的 CSV 檔（`stakeholders.csv`、`path-labels.csv`、`space-types.csv`、`issues.csv`）
- `app/` 的文件：`README.md`、`design.md`、`plan.md`
- 網站的介面文字（`app/src/i18n/`），以及網站顯示的分析內容
- `human-inputs.md`、`ai-inputs.md` 等筆記

姓名標示請寫：ETBlue，並附上 <https://github.com/ETBlue/pumadebugthon>。

## 例外

- **主辦單位的內容：** 議題分析引用的題目原文（例如題目名稱、標記為 `[實證]` 的題目內容），著作權屬於市政 debug 松的主辦單位，依主辦單位的規定使用，不適用 CC BY 4.0。
- **開放資料：** 從開放資料算出的數字，依各資料集的授權使用。data.gov.tw 與 data.taipei 的資料集多數使用「政府資料開放授權條款第 1 版」。各資料集列在各議題檔案的附錄。
- **主辦單位的保密資料：** 主辦單位提供給參加者、不公開的資料，沒有放在本 repo。

---

## English

This repo uses three licenses.

| Content | License |
|---|---|
| Source code (the code in `app/`, `analysis/*.py`, `analysis/*.sh`, `analysis/tests/`) | MIT, see [`LICENSE`](LICENSE) |
| Content made by the author, ETBlue (listed above) | [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) |
| Content from the hackathon host, and open data | Not covered by the two licenses above. See the exceptions. |

The CC BY 4.0 content includes the issue analysis in `analysis/` (issue files, user story CSV files, `method.md`, `README.md`, and the shared CSV files), the documents in `app/` (`README.md`, `design.md`, `plan.md`), the UI text in `app/src/i18n/`, and the notes (`human-inputs.md`, `ai-inputs.md`). Attribution: ETBlue, with a link to <https://github.com/ETBlue/pumadebugthon>.

Exceptions:

- **Host content:** The issue text from the hackathon host that the analysis quotes (for example the issue titles and the issue text marked `[實證]`) belongs to the host. Its use follows the host's terms. It is not under CC BY 4.0.
- **Open data:** Numbers computed from open data follow each dataset's license. Most datasets on data.gov.tw and data.taipei use the Open Government Data License, version 1.0 (政府資料開放授權條款第 1 版). The appendix of each issue file lists the datasets.
- **Host confidential data:** Data that the host gave to participants and that is not public is not in this repo.
