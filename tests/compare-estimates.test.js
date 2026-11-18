'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {compare}=require('../compare-estimates.js');
const result={grossAreaSqFt:100,openingAreaSqFt:20,netAreaSqFt:80,totalStuds:10,sheets4x8:3,sheets4x8Independent:4,plateStockIndependent:5,materialSubtotal:120,laborSubtotal:80,grandTotal:200,options:{hourlyRate:50}};
const snap=(r=result,description='wall 10 x 10')=>({format:'ez-construction-estimate.v1',description,result:r});
const changed=snap({...result,grandTotal:220,materialSubtotal:140,options:{hourlyRate:55}});
assert.equal(compare(snap(),changed).changes.find(x=>x.field==='grandTotal').delta,20);
assert.equal(compare(snap(),changed).assumptionsChanged,true);
assert.equal(compare(snap(),snap()).descriptionChanged,false);
assert.throws(()=>compare({format:'other'},snap()),/v1 estimate/);
assert.throws(()=>compare(snap({...result,grandTotal:NaN}),snap()),/grandTotal/);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ez-compare-'));
try {
 const a=path.join(dir,'a.json'),b=path.join(dir,'b.json');
 fs.writeFileSync(a,JSON.stringify(snap()));fs.writeFileSync(b,JSON.stringify(changed));
 const run=spawnSync(process.execPath,[path.join(__dirname,'../compare-estimates.js'),a,b],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(JSON.parse(run.stdout).changes.find(x=>x.field==='materialSubtotal').delta,20);
 const bad=spawnSync(process.execPath,[path.join(__dirname,'../compare-estimates.js'),a],{encoding:'utf8'});
 assert.notEqual(bad.status,0);
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log('Estimate comparison unit and CLI acceptance passed');
