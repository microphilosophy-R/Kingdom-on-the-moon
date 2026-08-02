# 1000-day simulation findings

Scenario: `default-no-random-events-crown-steward`

## Findings
- Without random events, final population is 552/552, meeting the 500 target.
- Built facilities: E1, C1, K, B, E2, C2, F, P, R, L, H, M, S. Opening S exists, and the optimizer can use starport trade to cover alloy and complete the first expansion wave.
- The optimizer started 138 projects and completed 137.
- Minimum life-support stocks: water 12, oxygen 7.21, biomass 10.
- The main bottleneck is now the designed housing cap: life support remains positive, and population fills 552 capacity.
- Capacity-full days: 435; strained life-support days: 0.
- Completed techs: TE1-0, TE1-1, TE1-2, TE2-0, TE3-0, TC1-0, TC1-1, TC2-0, TC2-1, TC2-2, TB-0, TB-1, TB-2, TF-0, TF-1, TP-0, TP-1, TR-0, TS-0, TK-0, TL-0, TL-1, TL-2, TL-3, TH-0, TM-0, TS-1, TS-2, TS-3, TG-1, TG-2, TG-3, TG-4.
- Diagnosable expansion candidates: E1 {"regolith":121.6,"alloy":60.8}; C1 {"regolith":121.6,"alloy":60.8}; K {"regolith":91.19999999999999,"alloy":60.8}; B {"water":182.39999999999998,"regolith":182.39999999999998,"alloy":121.6}; E2 {"regolith":148.2,"alloy":148.2,"currency":98.8}; C2 {"alloy":148.2,"currency":148.2}; F {"regolith":197.6,"alloy":148.2,"currency":98.8}; P {"water":197.6,"regolith":148.2,"alloy":98.8}; R {"water":45.599999999999994,"biomass":45.599999999999994,"alloy":45.599999999999994}; L {"alloy":159.6,"currency":159.6}; H {"biomass":247,"alloy":296.4}; M {"water":501.5999999999999,"regolith":1003.1999999999998,"alloy":1128.6}; S {"alloy":45.599999999999994,"currency":136.79999999999998}; E3 {"alloy":30.4,"quantumCore":7.6,"currency":22.799999999999997}.

## Final Snapshot

```json
{
  "day": 1000,
  "resources": {
    "power": 403683.06,
    "water": 56856.3,
    "oxygen": 173338.43,
    "biomass": 164317.67,
    "regolith": 308113.97,
    "alloy": 149122.22,
    "quantumCore": 2,
    "currency": 11.57,
    "population": 552,
    "knowledge": 73938.31,
    "luxury": 2262.41
  },
  "dailyNet": {
    "power": 820.7,
    "water": 108.46,
    "oxygen": 268.58,
    "biomass": 264.04,
    "regolith": 573.23,
    "alloy": 401.45,
    "quantumCore": 0,
    "currency": 4.8,
    "population": 0,
    "knowledge": 280.38,
    "luxury": 4.8
  },
  "population": {
    "total": 552,
    "capacity": 552,
    "availableCapacity": 0,
    "net": 0,
    "growthPotential": 2.62,
    "lifeSupportRatio": 1,
    "pressureDays": 434,
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
    "R": 1,
    "L": 6,
    "H": 12,
    "M": 10,
    "S": 5,
    "E3": 0,
    "D": 0
  },
  "staffing": {
    "E1": 12,
    "C1": 49,
    "K": 0,
    "B": 19,
    "E2": 48,
    "C2": 48,
    "F": 48,
    "P": 48,
    "R": 2,
    "L": 24,
    "H": 0,
    "M": 0,
    "S": 20,
    "E3": 0,
    "D": 0
  },
  "construction": {
    "S": {
      "startedDay": 999,
      "completeDay": 1016,
      "fromLevel": 5,
      "toLevel": 6,
      "cost": {
        "alloy": 45.599999999999994,
        "currency": 136.79999999999998
      }
    }
  },
  "cumulative": {
    "started": 138,
    "completed": 137,
    "skippedForCost": 0,
    "maxPopulation": 552,
    "minWater": 12,
    "minOxygen": 7.207499999999994,
    "minBiomass": 10,
    "capacityFullDays": 435,
    "strainedDays": 0
  }
}
```

Structured snapshots: `C:\Kingdom on the moon\docs\simulation\latest-1000d.json`
