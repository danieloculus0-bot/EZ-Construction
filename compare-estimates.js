#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const FIELDS = ['grossAreaSqFt','openingAreaSqFt','netAreaSqFt','totalStuds','sheets4x8','sheets4x8Independent','plateStockIndependent','materialSubtotal','laborSubtotal','grandTotal'];
function validate(snapshot) {
  if (!snapshot || snapshot.format !== 'ez-construction-estimate.v1' || typeof snapshot.description !== 'string' || !snapshot.result || typeof snapshot.result !== 'object') throw new Error('Expected an EZ Construction v1 estimate export');
  for (const field of FIELDS) if (typeof snapshot.result[field] !== 'number' || !Number.isFinite(snapshot.result[field]) || snapshot.result[field] < 0) throw new Error('Invalid result field: ' + field);
  return snapshot;
}
function compare(before, after) {
  const a = validate(before).result, b = validate(after).result;
  return {format:'ez-construction-comparison.v1', changes:FIELDS.map(field=>({field,before:a[field],after:b[field],delta:Number((b[field]-a[field]).toFixed(8))})), assumptionsChanged:JSON.stringify(a.options)!==JSON.stringify(b.options), descriptionChanged:before.description!==after.description};
}
function main(args) {
  if (args.length !== 2) throw new Error('Usage: node compare-estimates.js old.json new.json');
  const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
  process.stdout.write(JSON.stringify(compare(read(args[0]),read(args[1])),null,2)+'\n');
}
if (require.main === module) { try {main(process.argv.slice(2));} catch(e) {console.error(e.message);process.exitCode=1;} }
module.exports={compare,validate};
