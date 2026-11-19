#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const {calculate} = require('./estimator.js');

function close(a,b) { return Math.abs(a-b) <= 1e-7 * Math.max(1,Math.abs(a),Math.abs(b)); }
function procurement(snapshot, mode = 'independent') {
  if (!snapshot || snapshot.format !== 'ez-construction-estimate.v1' ||
      typeof snapshot.description !== 'string' || !snapshot.result ||
      !snapshot.result.options || !['independent','pooled'].includes(mode))
    throw new Error('Expected an EZ Construction v1 estimate with valid options and mode');
  // Recalculate from source inputs: exported totals are not trusted procurement quantities.
  const r = calculate(snapshot.description, snapshot.result.options);
  for (const field of ['grossAreaSqFt','openingAreaSqFt','netAreaSqFt','totalStuds',
    'sheets4x8','sheets4x8Independent','plateStockIndependent','materialSubtotal',
    'laborSubtotal','grandTotal']) {
    if (typeof snapshot.result[field] !== 'number' || !close(snapshot.result[field],r[field]))
      throw new Error('Snapshot does not reconcile: ' + field);
  }
  const o = r.options;
  const sheets = mode === 'independent' ? r.sheets4x8Independent : r.sheets4x8;
  const plates = mode === 'independent' ? r.plateStockIndependent : r.plateStockPooled;
  const items = [
    {sku:'framing-studs',unit:'each',quantity:r.totalStuds,unitCost:o.pricePerStud},
    {sku:'sheathing-4x8',unit:'sheet',quantity:sheets,unitCost:o.pricePerSheet},
    {sku:'plate-stock',unit:'piece',stockLengthFt:o.plateStockLengthFt,quantity:plates,unitCost:o.pricePerPlate}
  ].map(item => ({...item, extendedCost:Math.round(item.quantity*item.unitCost*100)/100}));
  const materialCost = Math.round(items.reduce((s,item)=>s+item.extendedCost,0)*100)/100;
  return {
    format:'ez-construction-procurement.v1', mode, description:snapshot.description,
    items, materialCost, laborHours:r.laborHours, laborCost:r.laborSubtotal,
    estimateTotal:Math.round((materialCost+r.laborSubtotal)*100)/100,
    assumptions:[
      mode === 'pooled' ? 'Pooled quantities assume offcut reuse across walls; not a verified cutting or nesting plan.' :
        'Independent quantities round sheet and plate purchases for each wall separately.',
      'Stud count is indicative, not a structural framing or opening cut list.',
      'Plate stock assumes selected courses and waste; no splice or cut optimization.',
      'User-supplied unit prices only; no taxes, delivery, or live inventory.'
    ]
  };
}
function main(args) {
  if (args.length < 1 || args.length > 2 || (args[1] && !['independent','pooled'].includes(args[1])))
    throw new Error('Usage: node procurement.js estimate.json [independent|pooled]');
  const snapshot=JSON.parse(fs.readFileSync(args[0],'utf8'));
  process.stdout.write(JSON.stringify(procurement(snapshot,args[1] || 'independent'),null,2)+'\n');
}
if (require.main===module) {try {main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={procurement};
