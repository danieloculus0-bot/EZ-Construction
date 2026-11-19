'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {sensitivity} = require('../estimate-sensitivity.js');
const snapshot = {format:'ez-construction-estimate.v1',description:'wall 10 x 10',result:{
grossAreaSqFt:100,openingAreaSqFt:20,netAreaSqFt:80,totalStuds:10,
sheets4x8:3,sheets4x8Independent:4,plateStockIndependent:5,
materialSubtotal:120,laborSubtotal:80,grandTotal:200}};
const report = sensitivity(snapshot,{materialPercent:10,laborPercent:25});
assert.deepEqual(report.adjusted,{material:132,labor:100,total:232});
assert.equal(report.delta,32);
assert.equal(report.deltaPercent,16);
assert.equal(sensitivity(snapshot,{materialPercent:0,laborPercent:0}).delta,0);
assert.equal(sensitivity(snapshot,{materialPercent:-100,laborPercent:-100}).adjusted.total,0);
assert.throws(()=>sensitivity(snapshot,{materialPercent:NaN,laborPercent:0}),/finite percentage/);
assert.throws(()=>sensitivity(snapshot,{materialPercent:1001,laborPercent:0}),/finite percentage/);
assert.throws(()=>sensitivity({...snapshot,result:{...snapshot.result,grandTotal:199}},{materialPercent:0,laborPercent:0}),/reconcile/);
const zero={...snapshot,result:{...snapshot.result,materialSubtotal:0,laborSubtotal:0,grandTotal:0}};
assert.equal(sensitivity(zero,{materialPercent:10,laborPercent:10}).deltaPercent,null);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ez-sensitivity-'));
try {
 const file=path.join(dir,'estimate.json');fs.writeFileSync(file,JSON.stringify(snapshot));
 const run=spawnSync(process.execPath,[path.join(__dirname,'../estimate-sensitivity.js'),file,'10','25'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(JSON.parse(run.stdout).adjusted.total,232);
 const invalid=spawnSync(process.execPath,[path.join(__dirname,'../estimate-sensitivity.js'),file,'foo','25'],{encoding:'utf8'});
 assert.notEqual(invalid.status,0);
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log('Estimate cost sensitivity acceptance passed');
