# AI 代理人行為約束與指令 (AGENTS.md)

## 核心設計準則 (Ref: Steve Schoger / Tailwind CSS)

### 1. 陰影與邊框處理 (Shadows & Borders)
- **Outer Ring 取代 Solid Border**: 避免陰影與實色邊框產生混濁感。對於有陰影的元素（按鈕、卡片、導覽列），改用 `gray-950` 且 `opacity 10%` 的 outer ring。
- **Inset Ring 邊緣定義**: 在淡色背景容器上，使用 `5% opacity` 的 inset ring 取代傳統 border，使邊緣定義更微妙且不搶戲。
- **Concentric Radius (同心圓角)**: 內層圓角半徑應等於外層半徑減去 padding (`inner_radius = outer_radius - padding`)。

### 2. 字體排版 (Typography)
- **Inter Variable Font**: 優先使用 Inter variable 版本，利用中間字重（如 550）。關閉 `ss02` (帶尾巴的小寫 L) 特性。
- **大字體 Tracking**: 24px 以上字體需收緊字距（如 `tracking-tight`）。
- **Eyebrow 文字**: 使用 `Geist Mono`、全大寫 (`uppercase`)、加寬字距 (`tracking-wider`)、小字體 (`text-xs`)、灰色 (`gray-600`)。
- **文字排版優化**: 根據情境切換 `text-pretty` (避免孤字) 與 `text-balance` (均勻分布)。
- **小字體行高**: 14px (`text-sm`) 文字可嘗試設定雙倍行高 (28px) 以增加呼吸感。

### 3. 版面佈局 (Layout)
- **左對齊優先**: 避免過度使用 AI 預設的置中對齊。Hero 區塊建議採用 Split Headline (標題 3/5 寬居左，描述 2/5 寬居右)。
- **Inline Section Heading**: 標題與副標放在同一行，用深色粗體 (`neutral-950`) 與灰色中等字重 (`neutral-600`) 區分。
- **ch 單位控制寬度**: 使用 `ch` 單位限制文字區塊最大寬度（如 `max-w-[40ch]`），確保閱讀舒適度。

### 4. 元素細節 (Elements)
- **按鈕規範**: 高度維持在 36-38px，使用全圓角 (`rounded-full`)，字體 `text-sm`。移除不必要的 icon。
- **視覺對齊魔法**: 當有 ring 的按鈕與無 ring 的按鈕並排時，使用 `span` 包裹並設定 `inline-flex + p-px` 補償 2px 的高度差。
- **Well-styled Container**: 截圖容器使用極淡背景 (`gray-950` at 2.5-5% opacity)，移除邊框，截圖底部零 padding 營造「坐落感」，並加上 inset ring。
- **高解析截圖**: 視覺元素優先使用 3x 高解析度 App 截圖。

### 5. 裝飾與收尾 (Finishing Touches)
- **Canvas Grid**: 在 section 之間加入裝飾性線條。水平線全寬，垂直線限制在容器內。
- **Testimonial Card**: 使用人像照片作為背景，底部加暗色漸層 (`gradient shim`) 搭配白色文字。
- **Logo Cloud**: 使用真實 SVG，移除透明度（直接用 `gray-950`），不需標題。

## 溝通策略
- 使用設計語言而非單純程式碼指令。
- 優先問「這個是怎麼做的？」來檢查實作邏輯。
- 要求全站同步樣式。
- 必要時建立臨時視覺化工具進行微調。
