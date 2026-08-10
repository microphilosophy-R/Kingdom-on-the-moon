# 1000 御日自动经济模拟

场景：`default-no-random-events-crown-steward`

## 假设
- 使用默认初始资源、默认科技、默认配给基线。
- 不触发随机访客事件，不手动切换生产方式。
- 每天运行 Crown Steward 优化器；每座建筑有独立施工状态。
- 开启自动购入保护，生命维持与建设物资（含合金/月壤）低于储备底线时由星港信贷采购。
- 每 50 御日记录一次结构化快照。

## 主要发现
- Without random events, final population is 552/552, meeting the 500 target.
- Built facilities: E1, C1, K, B, E2, C2, F, P, R, L, H, M, S, E3, D. Auto-purchase protection is on; starport buys alloy/regolith on credit when below reserve floors.
- The optimizer started 160 projects and completed 160.
- Minimum life-support stocks: water 12, oxygen 7.44, biomass 10.
- The main bottleneck is now the designed housing cap: life support remains positive, and population fills 552 capacity.
- Capacity-full days: 376; strained life-support days: 0.
- Completed techs: TE1-0, TE1-1, TE1-2, TE2-0, TE3-0, TC1-0, TC1-1, TC2-0, TC2-1, TC2-2, TB-0, TB-1, TB-2, TF-0, TF-1, TP-0, TP-1, TR-0, TS-0, TK-0, TL-0, TL-1, TL-2, TL-3, TH-0, TM-0, TD-0, TD-1, TS-1, TS-2, TS-3, TG-1, TG-2, TG-3, TG-4.
- Diagnosable expansion candidates: E1 {"regolith":121.6,"alloy":60.8}; C1 {"regolith":121.6,"alloy":60.8}; K {"regolith":91.19999999999999,"alloy":60.8}; B {"water":182.39999999999998,"regolith":182.39999999999998,"alloy":121.6}; E2 {"regolith":148.2,"alloy":148.2,"currency":98.8}; C2 {"alloy":148.2,"currency":148.2}; F {"regolith":197.6,"alloy":148.2,"currency":98.8}; P {"water":197.6,"regolith":148.2,"alloy":98.8}; R {"water":212.79999999999998,"biomass":212.79999999999998,"alloy":319.2}; L {"alloy":364.79999999999995,"currency":364.79999999999995}; H {"biomass":247,"alloy":296.4}; M {"water":501.5999999999999,"regolith":1003.1999999999998,"alloy":1128.6,"quantumCore":62.69999999999999}; S {}; E3 {"alloy":167.2,"quantumCore":41.8,"currency":125.39999999999999}; D {"alloy":1216,"quantumCore":30.4,"currency":30.4}.

## 最终快照

```json
{
  "day": 1000,
  "resources": {
    "power": 321.23,
    "water": 11962.06,
    "oxygen": 54041.36,
    "biomass": 34081.23,
    "regolith": 39573.37,
    "alloy": -48301.16,
    "quantumCore": 8098.77,
    "currency": -20348.12,
    "population": 552,
    "knowledge": 263255.7,
    "luxury": 2194.6
  },
  "dailyNet": {
    "power": 321.23,
    "water": -22.6,
    "oxygen": -29.34,
    "biomass": -21.86,
    "regolith": 1.17,
    "alloy": -136.79,
    "quantumCore": 19.2,
    "currency": 35.11,
    "population": 0,
    "knowledge": 587.46,
    "luxury": 4.8
  },
  "population": {
    "total": 552,
    "capacity": 552,
    "availableCapacity": 0,
    "net": 0,
    "growthPotential": 2.62,
    "lifeSupportRatio": 1,
    "pressureDays": 375,
    "status": "full"
  },
  "levels": {
    "E1": 15,
    "C1": 15,
    "K": 15,
    "B": 15,
    "E2": 12,
    "C2": 12,
    "F": 12,
    "P": 12,
    "R": 6,
    "L": 15,
    "H": 12,
    "M": 10,
    "S": 1,
    "E3": 10,
    "D": 3
  },
  "staffing": {
    "E1": 23,
    "C1": 42,
    "K": 0,
    "B": 30,
    "E2": 48,
    "C2": 48,
    "F": 46,
    "P": 46,
    "R": 23,
    "L": 60,
    "H": 0,
    "M": 0,
    "S": 0,
    "E3": 40,
    "D": 12
  },
  "construction": {},
  "cumulative": {
    "started": 160,
    "completed": 160,
    "skippedForCost": 0,
    "maxPopulation": 552,
    "minWater": 12,
    "minOxygen": 7.4399999999999995,
    "minBiomass": 10,
    "capacityFullDays": 376,
    "strainedDays": 0
  }
}
```

结构化快照：`C:\Kingdom on the moon\test-results\simulation\latest-1000d.json`
