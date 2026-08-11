# 计划：游戏开始引导、终局提醒与胜利界面

## 摘要

为「月冠纪元」添加三项功能：
1. **新手引导浮层**：首次开局后显示5步引导，指向关键 UI 区域，支持「下一步/跳过」
2. **终局阶段日志提醒**：在剩余200/100/50御日时通过日志提示玩家冲刺
3. **胜利评分界面**：1000御日到期后弹出全屏结算面板，展示国祚评分、评级称号与维度明细

---

## 当前状态分析

### 现有机制
- **开始界面**：[StartGate.tsx](file:///c:/Kingdom%20on%20the%20moon/src/components/business/StartGate.tsx) — 3D行星 + 标题 + "开始执政"按钮
- **游戏结束**：`day >= 1000` 时 `completed` 标志位为 `true`，仅禁用暂停按钮 + 写一条日志，无任何视觉反馈
- **现有弹窗模式**：[ReignReportModal.tsx](file:///c:/Kingdom%20on%20the%20moon/src/components/business/ReignReportModal.tsx) — scrim + panel 全屏弹窗；[Modal.tsx](file:///c:/Kingdom%20on%20the%20moon/src/components/layout/Modal.tsx) — 通用弹窗容器
- **现有工具提示**：[InfoToggle.tsx](file:///c:/Kingdom%20on%20the%20moon/src/components/business/InfoToggle.tsx) — 可展开的信息图标
- **评分公式**（[App.tsx L480-L481](file:///c:/Kingdom%20on%20the%20moon/src/App.tsx#L480-L481)）：`score = shipProgress*8 + 设施总等级*12 + 角色数*25 + knowledge*2`
- **持久化**：使用 `localStorage`（已有音量、存档等先例）
- **导出口**：[index.ts](file:///c:/Kingdom%20on%20the%20moon/src/components/business/index.ts) 统一导出业务组件

### 样式文件结构
| 文件 | 用途 |
|---|---|
| `00-base-shell.css` | 基础布局、start-gate、brand-seal |
| `40-layout-components.css` | 响应式 + start-gate 媒体查询 |
| `60-settings-reports.css` | reign-report 弹窗样式 |
| `30-special-systems.css` | 事件弹窗样式 |

---

## 拟议变更

### 变更 1：新建 TudorOverlay 新手引导组件

**文件**：`src/components/business/TutorialOverlay.tsx`（新建）

**是什么**：首次开局后自动显示的5步引导浮层，用高亮框 + 文字提示指向关键 UI 区域。

**为什么**：当前游戏无任何引导，新玩家面对设施列表和资源栏可能不知从何下手。

**怎么做**：

- 组件接口：
  ```ts
  interface TutorialOverlayProps {
    onComplete: () => void
  }
  ```
- 内部定义5个引导步骤，每步包含：
  - `targetSelector`: CSS 选择器，定位目标元素
  - `title`: 步骤标题
  - `body`: 步骤说明文字
  - `placement`: 提示框相对目标的位置（top/bottom/left/right）
- 使用 `document.querySelector(targetSelector)` + `getBoundingClientRect()` 计算高亮框和提示框位置
- 使用 `ReactDOM.createPortal` 渲染到 `document.body`
- 高亮效果：在目标元素上叠加一个带金色边框的半透明遮罩区域
- 底部按钮：「跳过」（直接完成）、「下一步」（共 N 步时显示）/「开始执政」（最后一步显示）
- 监听 `Escape` 键关闭，点击遮罩区域不关闭（防止误触）
- 渲染期间游戏主体仍可见但不可交互（overlay 遮挡）

**5个引导步骤**：

| 步骤 | 目标选择器 | 标题 | 说明 |
|---|---|---|---|
| 1 | `.bottom-tabs` | 底部导航栏 | 切换设施、王城、科技、生态、星海贸易、星舰进度和异客名录七个视图。 |
| 2 | `.resource-rail` | 资源库存栏 | 监控11种资源的实时库存与每日净变化。点击可展开/收起的三角形按钮可隐藏此栏。 |
| 3 | `.page-content` | 设施名录 | 点击"展开设施名录"查看全部建筑卡片。每位执政官可从15座设施中选择扩建方向。 |
| 4 | `.time-dock` | 时间控制 | 暂停以从容决策，恢复则日历自动推进。点击可切换正常/加速。1000御日后试验终止。 |
| 5 | `.scoreline:nth-child(2)` | 国祚评分 | 右侧实时显示当前评分。最终国祚由星舰完成度、设施规模、招募角色和知识储量共同决定。 |

**样式**：新建 `src/styles/80-tutorial-victory.css`

- `.tutorial-overlay` — 全屏固定定位、半透明暗色背景
- `.tutorial-highlight` — 绝对定位的高亮框，带金色发光边框 `oklch(55% .1 76 / .7)`，border-radius 匹配目标
- `.tutorial-tooltip` — 提示卡片，使用面板风格（`oklch(98% .011 86)` 渐变背景 + 边框），含标题、正文、按钮行
- `.tutorial-tooltip::before` — 三角形箭头指向目标元素
- 响应式：小屏时 tooltip 固定在底部区域

---

### 变更 2：新建 VictoryModal 胜利结算组件

**文件**：`src/components/business/VictoryModal.tsx`（新建）

**是什么**：1000御日到期后弹出的全屏结算面板，展示最终评分、评级称号和维度得分。

**为什么**：当前游戏在1000天后悄悄停止，玩家不知道自己成绩如何，缺乏成就感和结束仪式感。

**怎么做**：

- 组件接口：
  ```ts
  interface VictoryModalProps {
    score: number
    shipProgress: number
    facilityTotalLevel: number
    roleCount: number
    knowledge: number
    day: number
    onRestart: () => void
  }
  ```
- 评分维度明细：
  - 御座号星舰完成度 × 8 = `shipProgress * 8`
  - 设施总等级 × 12 = `facilityTotalLevel * 12`
  - 招募异客角色 × 25 = `roleCount * 25`
  - 知识储量 × 2 = `knowledge * 2`
- 评级称号（基于总分阈值）：

| 评分区间 | 称号 |
|---|---|
| ≥ 2000 | 星海传奇 |
| ≥ 1500 | 月面霸主 |
| ≥ 1000 | 御座使徒 |
| ≥ 500 | 殖民地总督 |
| < 500 | 月面先驱 |

- 布局结构（参考 ReignReportModal 的 scrim + panel 模式）：
  - 顶部：王冠图标 + "千日试验终结" eyebrow + "国祚评定" 标题
  - 中央：大号评分数字 + 评级称号
  - 下方：4维度得分明细卡片网格
  - 底部：「重返起点」按钮（调用 onRestart → exitGame）
- 禁止点击遮罩关闭（防止误关），只能通过按钮退出

**样式**（追加到 `src/styles/80-tutorial-victory.css`）：

- `.victory-scrim` — 全屏固定定位，深色背景 `oklch(15% .025 250 / .72)` + backdrop-blur
- `.victory-modal` — 居中面板，最大宽度 620px，渐变背景，金色边框
- `.victory-score` — 大号评分数字（48px+），rating badge 为特殊金色标签
- `.victory-breakdown` — 2×2 网格展示维度明细

---

### 变更 3：App.tsx 集成修改

**文件**：`src/App.tsx`

**3a. 新手引导触发**

- 新增状态：`const [tutorialOpen, setTutorialOpen] = useState(false)`
- 新增 localStorage key：`const tutorialSeenKey = 'lunar-crown-tutorial-seen'`
- 在 `startGame()` 函数中：检查 `localStorage.getItem(tutorialSeenKey)`，如果为 null 则 `setTutorialOpen(true)`
- 标记已读：当 tutorial 完成/跳过时，`localStorage.setItem(tutorialSeenKey, '1')` 并 `setTutorialOpen(false)`
- 渲染位置：在 `!gameStarted` 分支之外，`return <main className="app-shell">` 之前，添加：
  ```tsx
  {tutorialOpen && <TutorialOverlay onComplete={() => { localStorage.setItem(tutorialSeenKey, '1'); setTutorialOpen(false); }} />}
  ```

**3b. 全程阶段性日志提醒**

- 在 `advanceDay()` 函数末尾（L925 附近），`if (nextDay >= gameCalendar.finalDay)` 之前，添加覆盖全程的阶段提醒。每约 100 御日触发一次，引导玩家关注当前阶段的核心目标：

| 御日 | 阶段 | 日志内容 |
|---|---|---|
| 100 | 百日筑基 | `百日已过，月面设施初具规模。关注资源盈余，规划科技方向。` |
| 200 | 成长期 | `二百御日，殖民地进入成长期。星海贸易港可补充稀缺资源，异客来访值得留意。` |
| 300 | 规模期 | `三百御日，检查各设施等级是否均衡。御座号星舰坞应已启动建造。` |
| 400 | 爬升期 | `四百御日，千日试验已过五分之二。科技树的中层突破将解锁关键生产方式。` |
| 500 | 半程 | `五百御日过半。评估 GDP 增速与人口承载力是否匹配星舰需求。` |
| 600 | 后半程 | `六百御日，试验进入后半程。确保星舰三阶段物资储备进度。` |
| 700 | 压力期 | `七百御日，时间紧迫。审视王月报告中的优化建议，补齐短板。` |
| 800 | 终局提醒 | `八百御日，距试验到期仅剩二百御日。御座号完成度应过半。` |
| 900 | 冲刺 | `九百御日，最后百御日冲刺。将所有资源向星舰倾斜。` |
| 950 | 倒计时 | `九百五十御日，仅剩五十御日。检查是否有遗漏的科技或设施可瞬间提升国祚。` |

- 实现方式：使用一个 `Map<number, string>` 查找表，而非多个 if 语句：
  ```ts
  const milestones: Record<number, string> = {
    100: '百日已过，月面设施初具规模。关注资源盈余，规划科技方向。',
    200: '二百御日，殖民地进入成长期。星海贸易港可补充稀缺资源，异客来访值得留意。',
    300: '三百御日，检查各设施等级是否均衡。御座号星舰坞应已启动建造。',
    400: '四百御日，千日试验已过五分之二。科技树的中层突破将解锁关键生产方式。',
    500: '五百御日过半。评估 GDP 增速与人口承载力是否匹配星舰需求。',
    600: '六百御日，试验进入后半程。确保星舰三阶段物资储备进度。',
    700: '七百御日，时间紧迫。审视王月报告中的优化建议，补齐短板。',
    800: '八百御日，距试验到期仅剩二百御日。御座号完成度应过半。',
    900: '九百御日，最后百御日冲刺。将所有资源向星舰倾斜。',
    950: '九百五十御日，仅剩五十御日。检查是否有遗漏的科技或设施可瞬间提升国祚。',
  }
  // 在 advanceDay 末尾添加：
  if (milestones[nextDay]) writeLog(`${formatDay(nextDay)}：${milestones[nextDay]}`)
  ```
- 保持 L925 已有的最终日志 `千日试验到期` 不变

**3c. 胜利界面触发**

- 新增状态：`const [showVictory, setShowVictory] = useState(false)`
- 在 `advanceDay()` 中 `nextDay === gameCalendar.finalDay` 分支：追加 `setShowVictory(true)`（让结算面板弹出）
- 在 `startGame()` 中重置：`setShowVictory(false)`
- 在 `exitGame()` 中重置：`setShowVictory(false)`
- 渲染位置：在 `activeReignReport && <ReignReportModal ...>` 之后，添加：
  ```tsx
  {showVictory && (
    <VictoryModal
      score={score}
      shipProgress={shipProgress}
      facilityTotalLevel={regions.reduce((sum, r) => sum + r.level, 0)}
      roleCount={roster.length}
      knowledge={resources.knowledge}
      day={day}
      onRestart={exitGame}
    />
  )}
  ```
- VictoryModal 的 z-index 需高于 ReignReportModal（z-index: 10 vs 9），确保胜利界面覆盖一切
- `completed` 状态下暂停按钮已 disabled，无需额外处理

---

### 变更 4：导出口更新

**文件**：`src/components/business/index.ts`

- 追加两行导出：
  ```ts
  export * from './TutorialOverlay'
  export * from './VictoryModal'
  ```

---

### 变更 5：App.tsx 导入更新

**文件**：`src/App.tsx`

- 在 business 组件导入行（第80-85行）中，确保 `TutorialOverlay` 和 `VictoryModal` 已被 barrel export 覆盖（由于 index.ts 已更新，现有 `from './components/business'` 导入自动生效，无需手动更改 import 语句）

---

### 变更 6：CSS 入口引入

**文件**：`src/styles.css`

- 在末尾追加新行：
  ```css
  @import './styles/80-tutorial-victory.css';
  ```
- 该项目使用 `src/styles.css` 作为统一入口，通过 `@import` 聚合所有样式文件

---

## 假设与决策

- **新手引导仅在首次开局显示**：通过 localStorage 持久化标记，读档/重开不计为"首次"
- **引导不干涉游戏状态**：引导显示期间日历保持暂停（游戏开局默认暂停），用户跳过引导后自行恢复
- **引导步骤顺序固定**：不根据玩家操作动态调整，保持线性流程
- **胜利界面的设施总等级**：在弹窗打开时刻快照计算（非响应式更新）
- **评分公式不变**：完全复用 App.tsx 中现有的 `score` 计算逻辑，仅在 VictoryModal 中展示分解
- **胜利界面不可跳过**：必须点击"重返起点"回到开始界面，防止玩家误关

---

## 验证步骤

1. **新手引导**（需要清除 localStorage 的 `lunar-crown-tutorial-seen`）：
   - 点击"开始执政" → 引导浮层自动出现
   - 点击"下一步"5次，每次指向正确的 UI 区域
   - 点击"跳过"（任意步骤）→ 引导消失，游戏暂停在初始状态
   - 再点"开始执政" → 引导不再出现（localStorage 已标记）
2. **终局提醒**（需要修改初始 day 为 799/899/949 快速测试）：
   - day 到达 800 → 日志显示"距离千日试验到期还有200御日"
   - day 到达 900/950 → 类似日志
3. **胜利界面**（修改 `finalDay` 为较小值如 30）：
   - 日历推进到 finalDay → 暂停按钮变灰，胜利弹窗出现
   - 弹窗展示评分/评级/维度明细，数值与底部栏评分一致
   - 点击"重返起点" → 回到 StartGate，开始界面正常可操作
4. **构建**：`npm run build` 无 TS/CSS 错误
