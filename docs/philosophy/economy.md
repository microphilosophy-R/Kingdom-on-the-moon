# 1. 经济系统

> 本文档是对 `src/economy/` 代码实现的说明。文档可能滞后，若与代码不一致，以代码为准。

## 1.1 资源与价值

所有资源的价值由 `resourceWeights`（`src/economy/resources.ts`）统一定义，是加权价值、优化器评分、GDP、贸易价格的共同基准。

| 代码 key | 名称 | 权重 | 可存储 | 储备下限 | 主要来源 | 说明 |
| --- | --- | ---: | --- | ---: | --- | --- |
| power | 电力 | 1.0 | 否 | 12 | E1 / E2 / E3 | 不可交易、不进入库存；缺电按优先级降载 |
| water | 水 | 3.0 | 是 | 8 | C1 / C2 / R / S | 生命维持核心 |
| oxygen | 氧气 | 3.0 | 是 | 10 | B / F / E1 / P / R / S | 生命维持核心 |
| biomass | 生物质 | 5.0 | 是 | 8 | B / P / R / S | 控制人口增长的关键 |
| regolith | 月壤 | 2.0 | 是 | 12 | C1 / C2 / S | 初级工业品 |
| alloy | 合金 | 8.0 | 是 | 10 | F / C2 / P / S | 中级工业品、星舰与高级设施材料 |
| quantumCore | 量子计算核心 | 150.0 | 是 | 2 | L / S | 高级工业品、星舰核心 |
| currency | 星海货币 | 1.0 | 是 | 6 | K 税收 / F 重原子炼金 | 结算货币；赤字时暂停自动购买 |
| population | 人口 | 200.0 | 是 | 10 | K / H / M / S | 劳动力总量，非普通库存 |
| knowledge | 知识 | 8.0 | 是 | 0 | L / S | 科技解锁资源 |
| luxury | 艺术奢侈品 | 10.0 | 是 | 0 | H / S | 外交与贸易资源 |

说明：

- 代码中 `biomass` 的显示名称为「生物」，本文沿用「生物质」表述。
- 储备下限（`defaultReserveFloors`）用于自动化、优化器与贸易保护的安全线判断。

## 1.2 时间与结算

`gameCalendar`（`src/economy/calendar.ts`）：

- 最小时间单位「御日」；正常速度 1600ms/御日，加速 1000ms/御日。
- 每 50 御日为一个「王月」（`reignMonthDays = 50`）。
- 游戏在第 1000 御日结束（`finalDay = 1000`）。
- 内置优化器（Crown Steward）在每次王月报告时评估并执行扩建 / 科技 / 生产方式决策。

每日结算顺序（`App.tsx` 的 `advanceDay`）：

1. 设施按当前岗位、等级、生产方式与修正结算净产出（`projectDailyFlow`）。
2. 人口系统结算入住、生命维持消耗、增长 / 流失（`projectPopulationSystem`）。
3. 自动贸易补入低于目标的资源（`planAutoTradesForDeficits`）。
4. 结算库存并推进研究进度。

## 1.3 人口、住房与人力

- 人口建筑 K / H / M 提供住房容量，每级容量为 K=8、H=16、M=24（`housingCapacityPerLevel`）。
- 非住房、非固定设施每级提供 `jobsPerFacilityLevel = 4` 个岗位（`getFacilityWorkCapacity`）。
- 人力由优先级自动分配；启用优化器后由 `rebalanceStaffing` 按「基础价值 + 赤字溢价」贪心分配，否则使用系统默认分配 + 债务纠偏（`autoCorrectStaffing`）。
- 人口增长与政策、住房等级、TS-1 / TC2-2 科技及生命维持供给相关；连续压力会触发流失（`projectPopulationSystem`）。

## 1.4 债务与信贷

- 物资债务上限（`resourceDebtLimits`）：水 / 氧 / 生物质 −1000，月壤 −3000，合金 −3000，艺术奢侈品 −500。资源跌破上限会被优化器与自动纠偏视为硬约束。
- 货币信贷下限（`emergencyCreditDebtLimit`）为 −2000；货币为负时按日计息（`calculateCurrencyDebtInterest`，利率 0.002）。

## 1.5 贸易

贸易由 S 星海交易港承载（`src/economy/trade.ts` 的 `starportTradeOffers`）：

| 解锁 | 品类 | 方向 |
| --- | --- | --- |
| TS-0 | 水 / 氧气 / 生物质 / 月壤 / 合金 | 买卖 |
| TS-1 | 人口（星际劳工） | 仅买入 |
| TS-2 | 知识、量子计算核心 | 买卖 |
| TS-3 | 艺术奢侈品 | 买卖 |

买卖价 = 权重 ×（1 ± 溢价 / 折价），具体见各 offer 的 `buyPremium` / `sellDiscount`。

## 1.6 生产方式与配方

各建筑的输入 / 输出配方、解锁科技与阶段规则见 [建筑系统](buildings.md)。
