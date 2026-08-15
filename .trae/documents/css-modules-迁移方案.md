# CSS Modules 迁移方案（增量分期）

## 摘要

将项目样式从「14 个全局级联 CSS 文件（约 8100 行）+ 全局类名」迁移为「组件旁 `.module.css` + 精简全局层」的架构，用编译期作用域隔离消灭跨层覆盖问题。**不新建任何组件类型**，现有 34 个 React 组件原样保留，仅改变样式的存放位置与引用方式。按组件分批迁移、每批构建验证，最终把全局 CSS 收敛为 3 个文件（tokens / base / shared）。

## 现状分析

- 样式入口 `src/styles.css` 按编号导入 14 个全局文件（00→80），**后加载覆盖先加载**是唯一优先级规则。
- `50-theme-overrides.css` 整个文件是覆盖补丁（如 `.resource-rail` 在 00、50 中被定义 4+ 次；`.bottom-tabs`、`.diplomatic-letter.event-modal` 多次重定义），选择器胜负取决于文件顺序，难以推理。
- 34 个组件、约 218 个唯一类名，全部为全局字符串，无法归属到具体组件；跨文件后代选择器（如 `.resource-bundle .resource-atom`）耦合了本应独立的组件。
- 单文件膨胀：`62-settings-modal.css` 2062 行；响应式断点（1100/900/760/680）在各文件重复定义。
- 设计令牌（`--ui-*`、`--font-*`）集中在 `40-layout-components.css` 的 `:root`，模块化后仍可经 `var()` 引用，无需迁移。
- `.design_library/MOON` 存在另一套 `--moon-*` 令牌（旧 hex、Orbitron 字体），与 app 已脱节，本次不处理，仅记录为后续事项。

## 目标架构

样式分三类，归属规则固定：

| 类别 | 去向 | 判定标准 |
|---|---|---|
| 组件私有类 | 组件旁 `<Component>.module.css` | 只被该组件使用 |
| 跨组件共享类 | 全局 `shared.css` | 被 ≥2 个组件或 App.tsx 引用（如 `resource-atom`、`section-heading` 基础类） |
| 全局 shell / 令牌 / 重置 | 全局 `tokens.css` + `base.css` | `:root` 令牌、`app-shell`、`site-header`、`page-content`、媒体查询基线 |

**不迁移、保留全局的**：App.tsx 中的 shell 结构类（`app-shell`、`site-header`、`brand-block`、`resource-rail`、`letter-*`、`event-modal`、`save-toast` 等）及所有 CSS 变量。

**最终全局文件**：`styles.css` 只保留 3 行 import：`tokens.css`、`base.css`、`shared.css`。

## 迁移规则（每批组件统一遵循）

1. **先 grep 引用面**：对该组件的全部 className 统计引用次数，判定私有/共享。
2. 新建 `<Component>.module.css`，迁入私有类样式（含该类的 `@media` 断点规则）。
3. TSX 改为 `import styles from './X.module.css'`，类名替换为 `styles.xxx`；`className` 拼接时注意保留条件类。
4. **动态类名处理**：`tone-${meta.tone}` 这类模板字符串不能直接哈希化。`resourceMeta.ts` 中 tone 为已知枚举（gold/cyan/green/ochre/slate/violet/coral），在模块中显式定义 `tone-gold` 等类，TSX 用 `styles['tone-' + meta.tone]` 或映射对象取值。
5. **跨组件后代选择器**：若父模块需要命中子组件的共享类（如 `.resource-rail :global(.resource-atom)`），使用 `:global()`；子组件私有哈希类不对外引用。
6. **状态类**（active/selected/compact/negative 等）：单组件内使用则迁入模块；跨组件共享则保留全局 `shared.css`。
7. 从全局 CSS 中**删除已迁移类的全部规则**（含 50-theme-overrides 中的补丁）。
8. 每批完成后 `npm run build` + `npm run dev` 目检相关页面，再进入下一批。

## 分阶段实施

### Phase 1 — 资源系统（边界最清晰，先做模板）
- 新建 8 个模块文件：`ResourceAtom`、`ResourceBundle`、`CostResourceList`、`FacilityNetRow`、`ProductionFlow`、`ResourceDeltaRows`、`ResourceSymbolStrip`、`ConstructionDaysPill`（均位于 `src/components/resources/`）。
- `resource-atom` 系列整体迁入 `ResourceAtom.module.css`（基础 + compact 变体 + tone 枚举类）。
- 全局中 `.resource-rail > .resource-atom` 等后代规则改写为 `.resource-rail :global(.resource-atom)` 留在 shared；`.resource-bundle .resource-atom` 同理。
- 删除来源：`00-base-shell.css`「Unified resource display system」段、`50-theme-overrides.css` 资源相关补丁、`45-typography.css` 中 `.resource-atom small` 等字体规则。
- 注意 `ResourceSymbolStrip` 的 `.symbol-*` 类、`TutorialOverlay.tsx` 中 `targetSelector: '.resource-rail'`（字符串选择器，resource-rail 保留全局，不受影响）。

### Phase 2 — UI / 布局基础组件
- 新建：`Panel`、`Button`、`IconButton`、`ProgressLine`、`PortraitSlot`（ui/）；`SectionHeading`、`TabNav`、`Modal`、`LetterActions`（layout/）共 9 个模块文件。
- `Button.tsx` 复用全局 `primary-action` 并通过 `--action-hue` 变色：将 `primary-action` 迁移进 `Button.module.css`，但需先 grep 确认 App.tsx 是否也直接用该类；若被 App 引用则保留全局 shared。
- `45-typography.css` 中成组的字体规则（`button, .primary-action, ...` 等），按组件拆分进各模块；无法归属的全局字体基线留在 base。
- 迁移 `70-components.css`（ui-panel 系列）→ `Panel.module.css`。

### Phase 3 — 业务组件（按依赖量从小到大）
- 小件（一并处理）：`InfoToggle`、`TechnologyTags`、`TechnologyImagePlaceholder`、`FacilityOrderGlyph`、`TechnologyCard`、`TrendChart`、`Visitors`、`SpecialFacilityPanel`。
- 中件：`FacilityList`、`PlanetFacilities`、`ReignReportModal`、`VictoryModal`、`TutorialOverlay`、`StartGate`。
- 大件（每件单独一批）：`FacilityDetailPanel`（61-facility-detail.css）、`SpecialBlocks`（30-special-systems.css）、`SettingsPanel`（拆解 2062 行的 62-settings-modal.css）。
- 大件迁移时同步拆分对应大 CSS 文件，避免留下大量孤儿规则。

### Phase 4 — 全局 CSS 收敛
- 删除所有已迁移类的规则（重点清理 `50-theme-overrides.css` 的补丁块）。
- 重排剩余内容为 3 个文件：
  - `tokens.css`：`:root` 中 `--ui-*` / `--font-*` 令牌（从 40-layout-components.css 与 70-components.css 抽出）。
  - `base.css`：重置、字体基线、`app-shell`/`site-header`/`page-content`/`planet-stage` 等 shell 布局、全局媒体查询基线。
  - `shared.css`：跨组件共享类（`resource-atom` 基础、`section-heading`、`event-modal`、`letter-*`、状态工具类等）。
- 删除 00/10/20/30/40/45/50/61/62/63/64/65/80 等旧文件（内容已归入上述 3 文件或组件模块），`styles.css` 仅剩 3 行 import。
- 统一断点语义（1100/900/760/680）写入项目记忆，后续新样式以此为基线。

### Phase 5 — 验证与收尾
- `npm run build`（tsc + vite，须 0 错误）。
- `npm run dev` 目检全部页面与弹窗：星球（含资源栏/轨道工作台）、设施树与详情、宫殿/政策、访客/臣属、科技、事件信函、设置、执政报告、胜利、新手教程。
- grep 检查无残留死类名（TSX 引用了但全局与模块均无定义，或反之）。
- 将「样式归属三类规则 + 断点基线」追加写入 `project_memory.md`。

## 假设与决策

- **不新增组件类型**：仅新增 `.module.css` 样式文件，组件结构与数量不变。
- **动态类名显式枚举**：不用 `styles[`tone-${x}`]` 之外的花样，枚举映射保证类型安全。
- **共享类不强行迁移**：以「引用面 ≥2」为判据留在全局 shared，避免为迁移而迁移导致后代选择器断裂。
- **App.tsx 的 shell 类保持全局**：App 是单体入口，不拆分为模块。
- **`--moon-*` 双轨令牌本次不动**，仅记录；若后续要统一，需单独评估颜色值差异。

## 验证命令

- 每批：`npm run build`
- 目检：`npm run dev`（人工逐页核对视觉无回归）
- 收尾：`npm test`
