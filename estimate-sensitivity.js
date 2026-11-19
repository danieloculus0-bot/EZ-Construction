#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const {validate} = require('./compare-estimates.js');

function rate(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -100 || value > 1000)
    throw new Error(label + ' must be a finite percentage from -100 to 1000');
  return value / 100;
}
function money(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function sensitivity(snapshot, scenario) {
  const result = validate(snapshot).result;
  const materialRate = rate(scenario.materialPercent, 'Material change');
  const laborRate = rate(scenario.laborPercent, 'Labor change');
  const material = result.materialSubtotal;
  const labor = result.laborSubtotal;
  // Refuse inconsistent exports rather than constructing an unreliable bid.
  if (Math.abs(material + labor - result.grandTotal) > 0.011)
    throw new Error('Estimate subtotals do not reconcile with grand total');
  const materialAfter = money(material * (1 + materialRate));
  const laborAfter = money(labor * (1 + laborRate));
  const totalAfter = money(materialAfter + laborAfter);
  const base = money(result.grandTotal);
  const delta = money(totalAfter - base);
  return {
    format: 'ez-construction-sensitivity.v1',
    description: snapshot.description,
    scenario: {materialPercent: scenario.materialPercent, laborPercent: scenario.laborPercent},
    baseline: {material: money(material), labor: money(labor), total: base},
    adjusted: {material: materialAfter, labor: laborAfter, total: totalAfter},
    delta,
    deltaPercent: base === 0 ? null : money(delta / base * 100),
    assumptions: ['Applies percentage changes to exported material and labor subtotals; quantities remain fixed.', 'No tax, overhead, markup, schedule escalation, or structural analysis is inferred.']
  };
}
function main(args) {
  if (args.length !== 3) throw new Error('Usage: node estimate-sensitivity.js estimate.json material-change-percent labor-change-percent');
  const snap = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const parse = (s, name) => {
    if (!/^[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)$/.test(s)) throw new Error('Invalid ' + name + ' percentage');
    return Number(s);
  };
  const report = sensitivity(snap, {materialPercent: parse(args[1], 'material'), laborPercent: parse(args[2], 'labor')});
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
if (require.main === module) { try {main(process.argv.slice(2));} catch(e) {console.error(e.message);process.exitCode=1;} }
module.exports = {sensitivity};
