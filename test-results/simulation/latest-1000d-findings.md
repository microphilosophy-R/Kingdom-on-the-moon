# 1000-day simulation findings

Scenario: `default-no-random-events-crown-steward`

## Findings
- Without random events, final population is 511.14/552, meeting the 500 target.
- Built facilities: E1, C1, K, B, E2, C2, F, P, R, L, H, M, S. Auto-purchase protection is on; starport buys alloy/regolith on credit when below reserve floors.
- The optimizer started 149 projects and completed 147.
- Minimum life-support stocks: water 12, oxygen 12.64, biomass 10.
- Population is still growing at day 1000: net 2.62/day with 40.86 spare housing capacity.
- Capacity-full days: 630; strained life-support days: 0.
- Completed techs: TE1-0, TE1-1, TE1-2, TE2-0, TE3-0, TC1-0, TC1-1, TC2-0, TC2-1, TC2-2, TB-0, TB-1, TB-2, TF-0, TF-1, TP-0, TP-1, TR-0, TS-0, TK-0, TL-0, TL-1, TL-2, TL-3, TH-0, TM-0, TD-0, TD-1, TD-2, TS-1, TS-2, TS-3, TG-1, TG-2, TG-3, TG-4.
- Diagnosable expansion candidates: E1 {"regolith":121.6,"alloy":60.8}; C1 {"regolith":121.6,"alloy":60.8}; K {"regolith":91.19999999999999,"alloy":60.8}; B {"water":182.39999999999998,"regolith":182.39999999999998,"alloy":121.6}; E2 {"regolith":148.2,"alloy":148.2,"currency":98.8}; C2 {"alloy":148.2,"currency":148.2}; F {"regolith":197.6,"alloy":148.2,"currency":98.8}; P {"water":197.6,"regolith":148.2,"alloy":98.8}; R {"water":273.59999999999997,"biomass":273.59999999999997,"alloy":410.4}; L {"alloy":342,"currency":342}; H {"biomass":247,"alloy":296.4}; M {"water":501.5999999999999,"regolith":1003.1999999999998,"alloy":1128.6}; S {}; E3 {"alloy":15.2,"quantumCore":3.8,"currency":11.399999999999999}; D {"alloy":304,"quantumCore":7.6,"currency":7.6}.

## Final Snapshot

```json
{
  "day": 1000,
  "resources": {
    "power": 620.35,
    "water": 21602.34,
    "oxygen": 83455.89,
    "biomass": 43425.55,
    "regolith": 51194.86,
    "alloy": 24608.93,
    "quantumCore": 2,
    "currency": 10248.11,
    "population": 511.14,
    "knowledge": 85038.13,
    "luxury": 109.13
  },
  "dailyNet": {
    "power": 620.35,
    "water": 108.79,
    "oxygen": 513.34,
    "biomass": 281.99,
    "regolith": 211.74,
    "alloy": 217.9,
    "quantumCore": 0,
    "currency": 99.19,
    "population": 2.62,
    "knowledge": 788.18,
    "luxury": 3.7
  },
  "population": {
    "total": 511.14,
    "capacity": 552,
    "availableCapacity": 40.86,
    "net": 2.62,
    "growthPotential": 2.62,
    "lifeSupportRatio": 1,
    "pressureDays": 0,
    "status": "stable"
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
    "R": 8,
    "L": 14,
    "H": 12,
    "M": 10,
    "S": 1,
    "E3": 0,
    "D": 0
  },
  "staffing": {
    "E1": 60,
    "C1": 60,
    "K": 0,
    "B": 60,
    "E2": 48,
    "C2": 48,
    "F": 48,
    "P": 48,
    "R": 40,
    "L": 60,
    "H": 0,
    "M": 0,
    "S": 0,
    "E3": 0,
    "D": 0
  },
  "construction": {
    "R": {
      "startedDay": 991,
      "completeDay": 1008,
      "fromLevel": 8,
      "toLevel": 9,
      "cost": {
        "water": 273.59999999999997,
        "biomass": 273.59999999999997,
        "alloy": 410.4
      }
    },
    "L": {
      "startedDay": 990,
      "completeDay": 1007,
      "fromLevel": 14,
      "toLevel": 15,
      "cost": {
        "alloy": 342,
        "currency": 342
      }
    }
  },
  "cumulative": {
    "started": 149,
    "completed": 147,
    "skippedForCost": 0,
    "maxPopulation": 511.1364999999998,
    "minWater": 12,
    "minOxygen": 12.640000000000004,
    "minBiomass": 10,
    "capacityFullDays": 630,
    "strainedDays": 0
  }
}
```

Structured snapshots: `C:\Kingdom on the moon\test-results\simulation\latest-1000d.json`
