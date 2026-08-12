const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '..', 'test-results', 'simulation', 'run-010.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Extract essential compact data
const compact = {
  days: data.snapshots.map(s => s.day),
  pop_total: data.snapshots.map(s => s.resources.population),
  pop_capacity: data.snapshots.map(s => s.population.capacity),
  pop_net: data.snapshots.map(s => s.population.net),
  levels: {},
  resources_alloy: data.snapshots.map(s => s.resources.alloy),
  resources_regolith: data.snapshots.map(s => s.resources.regolith),
  resources_currency: data.snapshots.map(s => s.resources.currency),
  resources_water: data.snapshots.map(s => s.resources.water),
  resources_oxygen: data.snapshots.map(s => s.resources.oxygen),
  resources_biomass: data.snapshots.map(s => s.resources.biomass),
  resources_knowledge: data.snapshots.map(s => s.resources.knowledge),
  resources_power: data.snapshots.map(s => s.resources.power),
  resources_luxury: data.snapshots.map(s => s.resources.luxury),
  resources_quantumCore: data.snapshots.map(s => s.resources.quantumCore),
  dailyNet_alloy: data.snapshots.map(s => s.dailyNet.alloy),
  dailyNet_knowledge: data.snapshots.map(s => s.dailyNet.knowledge),
  dailyNet_power: data.snapshots.map(s => s.dailyNet.power),
  dailyNet_currency: data.snapshots.map(s => s.dailyNet.currency),
  dailyNet_water: data.snapshots.map(s => s.dailyNet.water),
  dailyNet_oxygen: data.snapshots.map(s => s.dailyNet.oxygen),
  dailyNet_biomass: data.snapshots.map(s => s.dailyNet.biomass),
  cumulative_started: data.snapshots.map(s => s.cumulative.started),
  cumulative_completed: data.snapshots.map(s => s.cumulative.completed),
  cumulative_capacityFullDays: data.snapshots.map(s => s.cumulative.capacityFullDays),
  pressureDays: data.snapshots.map(s => s.population.pressureDays),
};

// Extract facility levels
const facilities = ['E1','C1','K','B','E2','C2','F','P','R','L','H','M'];
facilities.forEach(fac => {
  compact.levels[fac] = data.snapshots.map(s => s.levels[fac]);
});

const htmlTemplate = fs.readFileSync(path.resolve(__dirname, 'plot-resource-curves.html'), 'utf8');

// Replace the fetch logic with embedded data
const embeddedHtml = htmlTemplate.replace(
  /\/\/ Load embedded data or fetch[\s\S]*?createCharts\(data\);\s*\}\)\(\);/,
  `// Embedded data
const DATA = ${JSON.stringify(compact)};
function expandData(compact) {
  return {
    snapshots: compact.days.map((day, i) => ({
      day,
      resources: {
        population: compact.pop_total[i],
        alloy: compact.resources_alloy[i],
        regolith: compact.resources_regolith[i],
        currency: compact.resources_currency[i],
        water: compact.resources_water[i],
        oxygen: compact.resources_oxygen[i],
        biomass: compact.resources_biomass[i],
        knowledge: compact.resources_knowledge[i],
        power: compact.resources_power[i],
        luxury: compact.resources_luxury[i],
        quantumCore: compact.resources_quantumCore[i],
      },
      dailyNet: {
        alloy: compact.dailyNet_alloy[i],
        knowledge: compact.dailyNet_knowledge[i],
        power: compact.dailyNet_power[i],
        currency: compact.dailyNet_currency[i],
        water: compact.dailyNet_water[i],
        oxygen: compact.dailyNet_oxygen[i],
        biomass: compact.dailyNet_biomass[i],
      },
      population: {
        total: compact.pop_total[i],
        capacity: compact.pop_capacity[i],
        net: compact.pop_net[i],
        pressureDays: compact.pressureDays[i],
        status: compact.pop_total[i] >= compact.pop_capacity[i] ? 'full' : 'stable',
      },
      levels: Object.fromEntries(${JSON.stringify(facilities)}.map(f => [f, compact.levels[f][i]])),
      cumulative: {
        started: compact.cumulative_started[i],
        completed: compact.cumulative_completed[i],
        capacityFullDays: compact.cumulative_capacityFullDays[i],
      },
    }))
  };
}
const data = expandData(DATA);
createCharts(data);`
);

const outPath = path.resolve(__dirname, '..', 'test-results', 'resource-curves.html');
fs.writeFileSync(outPath, embeddedHtml, 'utf8');
console.log('Generated:', outPath);
