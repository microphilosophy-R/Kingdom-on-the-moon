# 资源栏溢出/重叠修复方案

## 现状分析

### 问题根源

资源栏（`.resource-rail`）当前使用 `grid-template-columns: repeat(auto-fit, 112px)`（[60-settings-reports.css#L1356](file:///c:/Kingdom on the moon/src/styles/60-settings-reports.css#L1356)），每个资源列固定 **112px**。

但每个 `.resource-atom` 内部的**实际内容最小宽度远大于 112px**：

| 元素 | 宽度 |
|------|------|
| SVG 图标 | 20px |
| gap (图标→内容) | .24rem ≈ 3.8px |
| 标签文字 (`.resource-label`) | min 3.2rem ≈ 51.2px |
| gap (标签→数值) | .2rem ≈ 3.2px |
| 主数值 (`<strong>`, 4.7ch@14px) | ≈ 39.5px |
| 子数值 (`/-342`, 4-6字符@14px) | ≈ 33-50px |
| **合计（无截断）** | **≈ 151-168px** |

同时，[50-theme-overrides.css#L60-65](file:///c:/Kingdom on the moon/src/styles/50-theme-overrides.css#L60-L65) 已将 `.resource-atom small` 的文本截断全部关闭：
```css
.resource-atom small,
.facility-ledger-list small {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}
```

**结果：112px 列宽装不下 150px+ 的内容，文本溢出到相邻列，造成重叠。**

### 涉及文件及样式层级

CSS 加载顺序（后加载覆盖前加载）：

| 优先级 | 文件 | 资源相关关键规则 |
|--------|------|-----------------|
| 低 | [00-base-shell.css](file:///c:/Kingdom on the moon/src/styles/00-base-shell.css) | 基础 `.resource-rail` 网格、`.resource-atom` 样式（带 `overflow: hidden`） |
| ↓ | [10-resources-events.css](file:///c:/Kingdom on the moon/src/styles/10-resources-events.css) | 响应式 `1100px/680px` 列宽覆盖、`.resource-symbol-item` |
| ↓ | [30-special-systems.css](file:///c:/Kingdom on the moon/src/styles/30-special-systems.css) | `overflow: visible`, 透明背景 |
| ↓ | [40-layout-components.css](file:///c:/Kingdom on the moon/src/styles/40-layout-components.css) | 极窄屏 2 列回退 |
| ↓ | [50-theme-overrides.css](file:///c:/Kingdom on the moon/src/styles/50-theme-overrides.css) | `text-overflow: clip; white-space: normal`（**禁用截断**）、`minmax(112px, 1fr)` |
| 高 | [60-settings-reports.css](file:///c:/Kingdom on the moon/src/styles/60-settings-reports.css) | **最终列宽 `repeat(auto-fit, 112px)`**、atom 内部网格重写、色调变量 |

当前 `.resource-rail > .resource-atom` 最终布局（[60-settings-reports.css#L1462-1473](file:///c:/Kingdom on the moon/src/styles/60-settings-reports.css#L1462-L1473)）：
```css
.resource-rail > .resource-atom {
  width: 100%;
  grid-template-columns: 20px minmax(0, 1fr);  /* 图标20px + 弹性内容 */
  overflow: visible;                            /* 不裁剪溢出 */
  border: 0;
  padding: .08rem .12rem;
}
```

### 11 种资源内容特征

在 [App.tsx#L1467-1488](file:///c:/Kingdom on the moon/src/App.tsx#L1467-L1488) 中，每个资源显示：
- 图标 + 标签（如"电力""水源"等中文2字标签）
- 主数值（4位数字或1.2K格式，`fmtCompactAmount`）
- 子数值（如 `/-342`、`/+1.2K`，`fmtSignedCompactAmount`）
- 可选的 inline 动作按钮（"停购"）

---

## 修改方案

### 策略：适度增加列宽 + 恢复截断保护 + 统一 CSS 规则

核心原则：
1. **列宽从 112px → 132px**（`repeat(auto-fit, minmax(132px, 1fr))`），让内容有足够呼吸空间
2. **恢复关键文本的溢出截断**，作为安全网
3. **精简跨文件的冗余覆盖**，减少维护成本

### 具体变更

#### 变更 1：[60-settings-reports.css](file:///c:/Kingdom on the moon/src/styles/60-settings-reports.css) — 主控文件

**1a. 调整 `.resource-rail` 列宽（第 1355-1364 行）**

将固定 112px 改为弹性最小宽度，让列在宽屏上自然填满空间：
```css
.resource-rail {
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  justify-content: start;
  gap: .46rem;
  overflow: visible;
  border: 0;
  border-radius: 0;
  padding: .18rem 0;
  background: transparent;
}
```

**1b. 为 `.resource-rail .resource-label` 添加截断（第 1479-1483 行）**

在现有样式后追加 overflow 保护：
```css
.resource-rail .resource-label {
  color: color-mix(in oklab, var(--resource-tone) 58%, var(--ui-ink));
  font-size: var(--font-label);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**1c. 为 `.resource-rail .resource-sub-value` 添加截断（第 1497-1499 行）**

```css
.resource-rail .resource-sub-value {
  color: color-mix(in oklab, var(--resource-tone) 54%, var(--ui-ink));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**1d. 为 `.resource-rail > .resource-atom` 添加溢出保护（第 1462-1473 行）**

将 `overflow: visible` 改为 `overflow: hidden`（在 rail 上下文中用 hidden 更安全）：
```css
.resource-rail > .resource-atom {
  --resource-icon-size: 20px;
  --resource-number-size: var(--font-body);
  width: 100%;
  min-height: 52px;
  grid-template-columns: 20px minmax(0, 1fr);
  overflow: hidden;
  border: 0;
  border-radius: 0;
  padding: .08rem .12rem;
  background: transparent;
}
```

**1e. 为 `.resource-rail > .resource-atom > span`（内容区）添加截断（第 616-621 行）**

```css
.resource-rail > .resource-atom > span {
  display: grid;
  grid-template-columns: minmax(3.2rem, 1fr) minmax(4.7ch, auto);
  align-items: baseline;
  gap: .2rem;
  min-width: 0;
}
```
（补充 `min-width: 0` 允许 grid 子元素缩小到内容以下）

#### 变更 2：[10-resources-events.css](file:///c:/Kingdom on the moon/src/styles/10-resources-events.css) — 响应式断点

**2a. 1100px 断点（第 5-6 行）**

将最小列宽与主控文件保持一致：
```css
@media (max-width: 1100px) {
  .resource-rail { grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); }
  ...
}
```

**2b. 680px 断点（第 20-27 行）** — 保持不变（已是 4 列等分）

#### 变更 3：[50-theme-overrides.css](file:///c:/Kingdom on the moon/src/styles/50-theme-overrides.css) — 清理冲突规则

**3a. 移除 `text-overflow: clip; white-space: normal` 覆盖（第 60-65 行）**

删除这两行，因为主控文件已正确设置截断：
```css
/* 删除以下两行： */
/* overflow: visible; */
/* text-overflow: clip; */
/* white-space: normal; */

/* 改为只保留原有 small 样式，不覆盖 overflow/text-overflow/white-space */
```

具体改动：
```css
.resource-atom small,
.facility-ledger-list small {
  /* 移除 overflow: visible; text-overflow: clip; white-space: normal; */
}
```

**3b. 更新列宽声明（第 56-58 行）**

与主控文件对齐：
```css
.resource-rail {
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
}
```

#### 变更 4：[60-settings-reports.css](file:///c:/Kingdom on the moon/src/styles/60-settings-reports.css) — `resource-atom.compact` 宽度

**4a. compact 变体（第 1444-1451 行）**

```css
.resource-atom.compact {
  --resource-icon-size: 18px;
  --resource-number-size: var(--font-data);
  width: 5rem;  /* 从 4.8rem → 5rem，给 compact 模式多一点空间 */
  min-height: 28px;
  gap: .22rem;
  padding: 0;
}
```

---

### 宽度计算验证

**新列宽 132px 下的内容分布：**

| 元素 | 宽度 |
|------|------|
| 图标 | 20px |
| gap (.24rem) | 3.8px |
| 内容区可用宽度 (132 - 20 - 3.8 - 3.8内边距) | 104.4px |
| 标签 (截断后 ≤ 2.8rem) | ≤ 44.8px |
| gap (.2rem) | 3.2px |
| 主数值 (4.7ch@14px) | 39.5px |
| 子数值剩余空间 | 104.4 - 44.8 - 3.2 - 39.5 = 16.9px |
| 子数值显示 | 约 2 字符（如"/0"），更长则 `ellipsis` 截断 |

- 短子数值（"/0"、"/+1"）：完整显示
- 长子数值（"/+1.2K"、"自产盈余，可停购"）：用省略号截断
- 宽屏上列自动扩展（`1fr`），子数值获得更多空间

**列数分布：**
- 1366px 屏：~9 列（2 行显示 11 项）
- 1440px 屏：~10 列（2 行）
- 1920px 屏：~13 列（1 行全部显示）

---

## 假设与决策

1. **132px 是最小列宽的合理平衡点**：不会太挤导致频繁截断，也不会太宽导致小屏上列数过少
2. **使用 `minmax(132px, 1fr)` 而非固定 `132px`**：宽屏上列自动扩展开，充分利用空间
3. **截断是安全网而非主要手段**：132px 能容纳大多数正常值，截断仅在极端情况触发
4. **保持现有 responsive 回退逻辑**（680px 4列、900px 4列等分）不改变基础布局策略

## 验证步骤

1. 在宽屏（1920px）下检查资源栏是否单行显示全部 11 项，无溢出
2. 在中屏（1366px）下检查两行显示是否正常，无文字重叠
3. 在窄屏（≤680px）下检查 4 列布局是否正确
4. 确认不同资源值的展示：小值（0、1）、中值（999）、大值（1.2K、99M）
5. 确认子数值截断后的省略号显示正常
6. 确认"停购"按钮仍正常显示
7. 确认折叠/展开功能正常
