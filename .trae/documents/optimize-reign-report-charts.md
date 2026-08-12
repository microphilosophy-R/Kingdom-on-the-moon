# 优化王月报告：用资源曲线替代表格

## 摘要

将王月报告中枯燥的"每日产消"数字表格替换为基于 SVG 的折线曲线图，用更生动直观的方式展示当前王月周期内的资源变化趋势。同时在宫殿摘要区块中以迷你趋势卡片替代表格预览。

---

## 现状分析

### 当前报告结构

1. **`ReignReportModal.tsx`**（完整报告弹窗）:
   - 上半部分：KPIs（人口变化、GDP、阶段长度）
   - 阶段指引卡片 (`phaseGuidance`)
   - 下半部分：**"每日产消"表格** + "下个王月方向"建议列表
   - 表格每行显示：资源名 / 产量 / 消耗量 / 净额（纯数字，缺乏直观感受）

2. **`SpecialBlocks.tsx` > `PalaceReportBlock`**（宫殿摘要区块）:
   - KPI 卡片 + 进度条
   - **产消表格预览**（前 6 条资源行）
   - 建议列表预览
   - "打开完整报告"按钮

3. **数据模型** (`types/game.ts`):
   - `ReignReport.resourceRows` 只存储了当前报告日的瞬时 `dailyProduction`/`dailyConsumption` 快照
   - **不存在每日趋势追踪机制**——这是当前无法生成曲线的根本原因

### 参考实现

`test-results/resource-curves.html` 使用 Chart.js 展示了 6 张折线图：
- 人口增长 (Population)
- 建筑等级演进 (Facility Levels)
- 核心资源库存 (Key Resources - log scale)
- 日产净额 (Daily Net Production)
- 合金-月壤-货币 (Alloy-Regolith-Currency)
- 生命维持资源 (Life Support)

---

## 方案决策

### 图表库选择：纯 SVG 实现（不引入 Chart.js）

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Chart.js** (如 resource-curves.html) | 功能丰富、交互好 | 包体积大(~200KB)、需额外依赖、风格难与游戏统一 |
| **Recharts / 其他 React 库** | React 原生集成 | 包体积大、依赖链重 |
| **纯 SVG 自绘** ✅ | 零依赖、完全控制样式、轻量、与游戏风格统一 | 需手写渲染逻辑、无交互 |

**选择纯 SVG**，理由：
- 报告中的曲线仅需展示 50 个数据点，不需要复杂交互
- 可以完全匹配游戏的 oklch 色彩体系
- 不增加构建体积
- 可以嵌入到现有 CSS 布局中无缝展示

---

## 实施计划

### 步骤 1：扩展数据模型 — 添加王月每日趋势追踪

**文件：`src/types/game.ts`**

在 `ReignReport` 类型中新增 `trendPoints` 字段：

```typescript
export type TrendPoint = {
  day: number           // 相对该王月的天数 (1~50)
  population: number
  resources: Pick<Resources, 
    'alloy' | 'currency' | 'water' | 'oxygen' | 'biomass' | 
    'regolith' | 'knowledge' | 'power' | 'luxury'
  >
  gdp: number
  netAlloy: number
  netKnowledge: number
  netCurrency: number
}

export type ReignReport = {
  // ... 现有字段保持不变
  trendPoints: TrendPoint[]  // 每日趋势数据，长度 = endDay - startDay + 1
}
```

**文件：`src/App.tsx`**

新增状态和逻辑：
- 新增 state: `reignTrendPoints: TrendPoint[]`（重置于每个王月开始时）
- 在每日循环中（`processNextDay` 执行后），追加一条 `TrendPoint`：
  ```typescript
  setReignTrendPoints(prev => [...prev, {
    day: nextDay - latestReportDay,
    population: finalResources.population,
    resources: { alloy, currency, water, oxygen, biomass, regolith, knowledge, power, luxury },
    gdp,
    netAlloy: dailyNet.alloy,
    netKnowledge: dailyNet.knowledge,
    netCurrency: dailyNet.currency,
  }])
  ```
- 在 `createReignReport()` 中，将趋势数据写入报告：
  ```typescript
  trendPoints: reignTrendPoints,
  ```
- 报告生成后重置 `reignTrendPoints` 为空数组

加载存档时：由于 `trendPoints` 不存入存档（历史报告数据量太大），已归档的报告不带趋势数据，但最新一份报告会带。如果 `trendPoints` 为空则回退到表格式展示（向后兼容）。

### 步骤 2：创建 SVG 趋势图组件

**新建文件：`src/components/business/TrendChart.tsx`**

```typescript
export interface TrendChartProps {
  data: TrendPoint[]
  series: {
    key: string
    label: string
    color: string         // oklch 颜色
    accessor: (p: TrendPoint) => number
    yAxis?: 'left' | 'right'
  }[]
  width?: number
  height?: number
  title?: string
  /** 当 trendPoints 为空时，回退显示的资源行数据 */
  fallback?: { label: string; produced: string; consumed: string; net: string; negative: boolean }[]
}
```

核心渲染逻辑：
1. 解析所有 series 的 Y 值范围，计算 padding
2. 将数据点映射到 SVG 坐标空间（x = 基于 day 的线性映射，y = 基于 value 的线性映射）
3. 绘制坐标轴（底部 X 轴显示御日刻度，左侧 Y 轴显示数值）
4. 对每条 series 绘制 `<polyline>` 折线
5. 支持双 Y 轴（如货币使用右侧 Y 轴）
6. 当数据为空时渲染 fallback 表格

### 步骤 3：更新 `ReignReportModal.tsx` — 用图表替换表格

**文件：`src/components/business/ReignReportModal.tsx`**

将原来的 `reign-resource-table` 区域替换为三张趋势图：

1. **人口与 GDP 趋势** — 显示人口增长曲线 + GDP 变化
2. **核心资源库存** — alloy / currency / regolith / knowledge 四条曲线
3. **日净产趋势** — alloy / knowledge / currency 三条 net production 曲线

保留"下个王月方向"建议列表不变。

布局调整：将原来的 `grid-template-columns: 1.4fr 0.8fr`（表格 + 建议）改为两列：
- 左列：三张趋势图纵向排列
- 右列：建议列表（可跟随滚动）

### 步骤 4：更新 `SpecialBlocks.tsx` > `PalaceReportBlock` — 迷你趋势卡片

**文件：`src/components/business/SpecialBlocks.tsx`**

将原来 `palace-report-preview` 中的产消表格替换为：
- 一张**迷你趋势卡片**：显示 selected key resource（如 alloy + currency）的 50 天趋势迷你折线
- 高度约 100px，只显示线条不显示坐标轴（sparkline 风格）
- 保留建议列表预览不变

### 步骤 5：添加 CSS 样式

**文件：`src/styles/62-settings-modal.css`**

新增样式：
```css
.reign-trend-chart {
  border: 1px solid oklch(75% .03 80);
  border-radius: 7px;
  padding: .75rem;
  background: oklch(99% .01 86 / .78);
}

.reign-trend-chart h3 {
  font-size: var(--font-card);
  margin: 0 0 .3rem;
  color: oklch(28% .035 250);
}

.reign-trend-chart svg {
  width: 100%;
  height: auto;
}

/* 图例 */
.reign-trend-legend {
  display: flex;
  gap: .8rem;
  margin-bottom: .3rem;
  font-size: var(--font-micro);
}

.reign-trend-legend span {
  display: flex;
  align-items: center;
  gap: .3rem;
  color: oklch(47% .026 250);
}

.reign-trend-legend i {
  display: inline-block;
  width: 10px;
  height: 2px;
  border-radius: 1px;
}

/* 宫殿迷你图表 */
.palace-trend-mini {
  height: 100px;
  overflow: hidden;
}

.palace-trend-mini svg {
  width: 100%;
  height: 100%;
}

/* 报告图表区域 */
.reign-charts-panel {
  display: flex;
  flex-direction: column;
  gap: .8rem;
}

/* 响应式：移动端保持单列 */
@media (max-width: 900px) {
  .reign-report-grid {
    grid-template-columns: 1fr;
  }
}
```

### 步骤 6：修改 `ReignReportModal` 布局

将报告弹窗的 grid 区域从 `(表格 + 建议)` 改为 `(图表面板 + 建议)`。

### 步骤 7：验证

1. `npm run build` 确保零 TypeScript 错误、零 CSS 错误
2. 在游戏中运行至少 1 个王月（50 御日），打开报告验证曲线渲染正确
3. 确认关闭报告后正常继续游戏
4. 确认宫殿摘要区块正常显示迷你趋势
5. 确认存档加载后旧报告（无趋势数据）回退到表格式展示

---

## 假设与决策

1. **不引入 Chart.js 等第三方图表库**，使用纯 SVG 实现以保持零依赖
2. 每王月最多 50 个数据点，内存开销极小（约 5KB/报告）
3. `trendPoints` 仅在运行时追踪，**不写入存档**（避免存档膨胀）。这意味着从存档恢复后，上一份报告的趋势数据会丢失，回退到表格展示
4. 趋势图配色沿用游戏现有 oklch 色彩体系
5. 图表的 X 轴使用 `day` 偏移量而非绝对天数，强调王月周期内的变化
