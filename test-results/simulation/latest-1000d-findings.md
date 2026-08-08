# 1000-day simulation findings

Scenario: `default-no-random-events-crown-steward`

## Findings
- Without random events, final population is 552/552, meeting the 500 target.
- Built facilities: E1, C1, K, B, E2, C2, F, P, R, L, H, M, S, D. Opening S exists; deficit auto-purchase protection is off, while planned starport trades remain available to the optimizer.
- The optimizer started 140 projects and completed 140.
- Minimum life-support stocks: water 12, oxygen 7.44, biomass 10.
- The main bottleneck is now the designed housing cap: life support remains positive, and population fills 552 capacity.
- Capacity-full days: 385; strained life-support days: 0.
- Completed techs: TE1-0, TE1-1, TE1-2, TE2-0, TE3-0, TC1-0, TC1-1, TC2-0, TC2-1, TC2-2, TB-0, TB-1, TB-2, TF-0, TF-1, TP-0, TP-1, TR-0, TS-0, TK-0, TL-0, TL-1, TL-2, TL-3, TH-0, TM-0, TD-0, TD-1, TS-1, TS-2, TS-3, TG-1, TG-2, TG-3, TG-4.
- Diagnosable expansion candidates: E1 {"regolith":121.6,"alloy":60.8}; C1 {"regolith":121.6,"alloy":60.8}; K {"regolith":91.19999999999999,"alloy":60.8}; B {"water":182.39999999999998,"regolith":182.39999999999998,"alloy":121.6}; E2 {"regolith":148.2,"alloy":148.2,"currency":98.8}; C2 {"alloy":148.2,"currency":148.2}; F {"regolith":197.6,"alloy":148.2,"currency":98.8}; P {"water":197.6,"regolith":148.2,"alloy":98.8}; R {"water":212.79999999999998,"biomass":212.79999999999998,"alloy":319.2}; L {"alloy":182.39999999999998,"currency":182.39999999999998}; H {"biomass":247,"alloy":296.4}; M {"water":501.5999999999999,"regolith":1003.1999999999998,"alloy":1128.6}; S {}; E3 {"alloy":30.4,"quantumCore":7.6,"currency":22.799999999999997}; D {"alloy":608,"currency":15.2}.

## Final Snapshot

```json
{
  "day": 1000,
  "resources": {
    "power": 253.58,
    "water": 18322.45,
    "oxygen": 103118.53,
    "biomass": 89728.55,
    "regolith": 69085.83,
    "alloy": 38878.42,
    "quantumCore": 2,
    "currency": 94.44,
    "population": 552,
    "knowledge": 62254.81,
    "luxury": 2143.75
  },
  "dailyNet": {
    "power": 253.58,
    "water": 46.24,
    "oxygen": 113.02,
    "biomass": 110,
    "regolith": 142.22,
    "alloy": 163.09,
    "quantumCore": 0,
    "currency": 4.8,
    "population": 0,
    "knowledge": 274.15,
    "luxury": 4.8
  },
  "population": {
    "total": 552,
    "capacity": 552,
    "availableCapacity": 0,
    "net": 0,
    "growthPotential": 2.62,
    "lifeSupportRatio": 1,
    "pressureDays": 384,
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
    "L": 7,
    "H": 12,
    "M": 10,
    "S": 1,
    "E3": 0,
    "D": 1
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
    "R": 24,
    "L": 28,
    "H": 0,
    "M": 0,
    "S": 0,
    "E3": 0,
    "D": 4
  },
  "construction": {},
  "cumulative": {
    "started": 140,
    "completed": 140,
    "skippedForCost": 0,
    "maxPopulation": 552,
    "minWater": 12,
    "minOxygen": 7.4399999999999995,
    "minBiomass": 10,
    "capacityFullDays": 385,
    "strainedDays": 0
  }
}
```

Structured snapshots: `C:\Kingdom on the moon\test-results\simulation\latest-1000d.json`
